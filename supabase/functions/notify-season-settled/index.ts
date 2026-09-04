// Edge Function: optionale E-Mail bei Abrechnung der Gesamtwertung einer
// Saison. Analog zu notify-matchday-settled, aber ohne Push (dafür gibt es
// keinen bestehenden Auslöser) und mit season_participants als
// Empfängerkreis statt matchday_entries. Aufgerufen direkt nach dem
// "Abrechnen"-Klick der Gesamtwertung (doSetGesamtwertungStatus in
// SeasonDetailPage.tsx), wenn seasons.gesamtwertung_status bereits
// 'abgerechnet' ist.
//
// Bewusst KEIN generisches "sende an beliebige IDs"-Interface: nimmt nur
// eine season_id entgegen, ermittelt Empfänger + Inhalt komplett selbst
// serverseitig (gleiches Muster wie notify-matchday-settled/send-bulk-email).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, EmailSendError } from '../_shared/email.ts'
import { archiveManyToSentFolder } from '../_shared/mailArchive.ts'
import { logAppError } from '../_shared/logging.ts'
import { corsHeadersForOrigin } from '../_shared/cors.ts'

type JsonResponder = (body: unknown, status?: number) => Response

const EMAIL_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
const APP_SETTINGS_ID = '00000000-0000-0000-0000-000000000002'
const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForOrigin(req.headers.get('Origin'))
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin nicht erlaubt.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const jsonResponse: JsonResponder = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    return await handle(req, supabaseUrl, serviceRoleKey, jsonResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'notify-season-settled', message)
    return jsonResponse({ error: `Unerwarteter Fehler: ${message}` }, 500)
  }
})

async function handle(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
  jsonResponse: JsonResponder,
): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401)
  }
  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: callerUser },
    error: callerError,
  } = await callerClient.auth.getUser()
  if (callerError || !callerUser) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401)
  }

  let body: { season_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }
  const seasonId = body.season_id
  if (!seasonId) {
    return jsonResponse({ error: 'season_id ist erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: season, error: seasonError } = await adminClient
    .from('seasons')
    .select('id, name, gesamtwertung_status')
    .eq('id', seasonId)
    .maybeSingle()
  if (seasonError || !season || season.gesamtwertung_status !== 'abgerechnet') {
    return jsonResponse({ ok: false }, 200)
  }

  const { data: emailSettings } = await adminClient
    .from('email_settings')
    .select('*')
    .eq('id', EMAIL_SETTINGS_ID)
    .maybeSingle()
  if (!emailSettings?.auto_send_settlement_emails) {
    return jsonResponse({ ok: true, email: false })
  }

  const { data: participants } = await adminClient.from('season_participants').select('player_id').eq('season_id', seasonId)
  const playerIds = [...new Set((participants ?? []).map((p) => p.player_id))]
  if (playerIds.length === 0) {
    return jsonResponse({ ok: true, email: false })
  }

  const [{ data: payoutTransactions }, { data: players }, { data: links }, { data: appSettings }, { data: template }] =
    await Promise.all([
      adminClient.from('transactions').select('player_id, betrag').eq('season_id', seasonId).eq('typ', 'gewinn_gesamt'),
      adminClient.from('players').select('id, name, kicktipp_name').in('id', playerIds),
      adminClient.from('player_profile_links').select('player_id, profile_id').in('player_id', playerIds),
      adminClient.from('app_settings').select('app_name').eq('id', APP_SETTINGS_ID).maybeSingle(),
      adminClient.from('email_templates').select('subject, body_text').eq('system_key', 'season_settled').maybeSingle(),
    ])
  if (!template) {
    await logAppError(supabaseUrl, serviceRoleKey, 'notify-season-settled', 'Keine Vorlage für season_settled hinterlegt.')
    return jsonResponse({ ok: true, email: false })
  }
  const payoutByPlayer = new Map<string, number>((payoutTransactions ?? []).map((t) => [t.player_id, t.betrag]))

  const profileIds = [...new Set((links ?? []).map((l) => l.profile_id))]
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, email, is_active')
    .in('id', profileIds.length > 0 ? profileIds : ['00000000-0000-0000-0000-000000000000'])
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
  const linksByPlayer = new Map<string, string[]>()
  for (const l of links ?? []) {
    linksByPlayer.set(l.player_id, [...(linksByPlayer.get(l.player_id) ?? []), l.profile_id])
  }

  const appName = appSettings?.app_name ?? 'Kicktipp Spielrunde'
  const failures: { to: string; error: string }[] = []
  const sentRawMessages: string[] = []

  for (const player of players ?? []) {
    const linkedProfiles = (linksByPlayer.get(player.id) ?? [])
      .map((id) => profileById.get(id))
      .filter((p): p is { id: string; email: string | null; is_active: boolean } => !!p)
    const profile = linkedProfiles.find((p) => p.is_active && p.email) ?? null
    if (!profile?.email) continue

    const vars = {
      spielername: player.name,
      kicktippname: player.kicktipp_name ?? '',
      saisonname: season.name,
      gewinne: currencyFormatter.format(payoutByPlayer.get(player.id) ?? 0),
      appname: appName,
    }
    const subject = renderTemplate(template.subject, vars)
    const html = renderTemplateHtml(template.body_text, vars)

    try {
      const sent = await sendEmail(emailSettings, {
        fromEmail: emailSettings.sender_email,
        fromName: emailSettings.sender_name,
        to: profile.email,
        subject,
        html,
      })
      sentRawMessages.push(sent.raw)
    } catch (err) {
      const message = err instanceof EmailSendError ? err.message : err instanceof Error ? err.message : String(err)
      failures.push({ to: profile.email, error: message })
    }
  }

  await archiveManyToSentFolder(supabaseUrl, serviceRoleKey, 'notify-season-settled', emailSettings, sentRawMessages, {
    season_id: seasonId,
    count: sentRawMessages.length,
  })
  if (failures.length > 0) {
    await logAppError(
      supabaseUrl,
      serviceRoleKey,
      'notify-season-settled',
      `${failures.length} Abrechnungs-E-Mails fehlgeschlagen`,
      { season_id: seasonId, failures },
    )
  }

  return jsonResponse({ ok: true, email: true, sent: sentRawMessages.length, failed: failures.length })
}

interface TemplateVars {
  spielername: string
  kicktippname: string
  saisonname: string
  gewinne: string
  appname: string
}

function renderTemplate(text: string, vars: TemplateVars): string {
  return text
    .replaceAll('{{Spielername}}', vars.spielername)
    .replaceAll('{{Kicktippname}}', vars.kicktippname)
    .replaceAll('{{SaisonName}}', vars.saisonname)
    .replaceAll('{{Gewinne}}', vars.gewinne)
    .replaceAll('{{AppName}}', vars.appname)
}

function renderTemplateHtml(bodyText: string, vars: TemplateVars): string {
  const escapedVars: TemplateVars = {
    spielername: escapeHtml(vars.spielername),
    kicktippname: escapeHtml(vars.kicktippname),
    saisonname: escapeHtml(vars.saisonname),
    gewinne: escapeHtml(vars.gewinne),
    appname: escapeHtml(vars.appname),
  }
  const withBreaks = escapeHtml(bodyText).replace(/\n/g, '<br>')
  return `<p>${renderTemplate(withBreaks, escapedVars)}</p>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

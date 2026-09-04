// Edge Function: Auslöser Push + optionale E-Mail bei Spieltag-Abrechnung.
// Ersetzt die frühere send-push-notification/-Function, deren einziger
// Aufrufer calculateMatchdayPayout() war - das ist aber nur aufrufbar,
// während matchday.status noch 'offen' ist (siehe locked-Logik in
// MatchdayDetailPage.tsx), während diese Function serverseitig
// status === 'abgerechnet' voraussetzt. Der alte Trigger feuerte dadurch in
// der Praxis nie. Jetzt direkt nach dem "Abrechnen"-Klick
// (doSetMatchdayStatus in SeasonDetailPage.tsx) aufgerufen, wenn der Status
// tatsächlich schon auf 'abgerechnet' steht.
//
// Bewusst KEIN generisches "sende an beliebige IDs"-Interface: nimmt nur
// eine matchday_id entgegen, ermittelt Empfänger + Inhalt komplett selbst
// serverseitig - ein authentifizierter Client kann weder Inhalt noch
// Empfänger beeinflussen (gleiches Muster wie send-bulk-email).
//
// Push nutzt wie zuvor die Spieler mit einer Gewinn-Buchung
// (transactions, typ = gewinn_spieltag) als Empfängerkreis. Die E-Mail
// (nur falls email_settings.auto_send_settlement_emails = true) nutzt
// bewusst einen anderen, admin-bestätigten Empfängerkreis: alle Spieler mit
// einem Einsatz-Eintrag für genau diesen Spieltag (matchday_entries) - das
// schließt auch Spieler ohne Gewinn (Gewinn 0) mit ein, die trotzdem über
// die Abrechnung informiert werden sollen.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail, EmailSendError } from '../_shared/email.ts'
import { archiveManyToSentFolder } from '../_shared/mailArchive.ts'
import { logAppError } from '../_shared/logging.ts'
import { corsHeadersForOrigin } from '../_shared/cors.ts'
import { sendPushToProfiles } from '../_shared/push.ts'

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
    await logAppError(supabaseUrl, serviceRoleKey, 'notify-matchday-settled', message)
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

  let body: { matchday_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }
  const matchdayId = body.matchday_id
  if (!matchdayId) {
    return jsonResponse({ error: 'matchday_id ist erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: matchday, error: matchdayError } = await adminClient
    .from('matchdays')
    .select('id, nummer, status, season_id')
    .eq('id', matchdayId)
    .maybeSingle()
  if (matchdayError || !matchday || matchday.status !== 'abgerechnet') {
    // Kein Fehler-Response mit Details nach außen - der Aufrufer bekommt nur
    // "ok" bzw. eine generische Ablehnung, keine Bestätigung, ob eine
    // matchday_id existiert (kein Enumerations-Vektor).
    return jsonResponse({ ok: false }, 200)
  }

  const { data: payoutTransactions } = await adminClient
    .from('transactions')
    .select('player_id, betrag')
    .eq('matchday_id', matchdayId)
    .eq('typ', 'gewinn_spieltag')
  const payoutByPlayer = new Map<string, number>((payoutTransactions ?? []).map((t) => [t.player_id, t.betrag]))

  // Push: unverändert aus der früheren send-push-notification-Function
  // übernommene Logik/Empfängerkreis (Spieler mit einer Gewinn-Buchung).
  if (payoutByPlayer.size > 0) {
    const { data: pushLinks } = await adminClient
      .from('player_profile_links')
      .select('profile_id')
      .in('player_id', [...payoutByPlayer.keys()])
    const pushProfileIds = [...new Set((pushLinks ?? []).map((l) => l.profile_id))]
    await sendPushToProfiles(
      supabaseUrl,
      serviceRoleKey,
      'notify-matchday-settled',
      pushProfileIds,
      'Gewinnberechnung abgeschlossen',
      `Dein Gewinn für Spieltag ${matchday.nummer} steht fest.`,
      { type: 'matchday_payout', season_id: matchday.season_id, matchday_id: matchdayId, supabase_url: supabaseUrl },
    )
  }

  const { data: emailSettings } = await adminClient
    .from('email_settings')
    .select('*')
    .eq('id', EMAIL_SETTINGS_ID)
    .maybeSingle()
  if (!emailSettings?.auto_send_settlement_emails) {
    return jsonResponse({ ok: true, email: false })
  }

  const { data: entries } = await adminClient.from('matchday_entries').select('player_id').eq('matchday_id', matchdayId)
  const playerIds = [...new Set((entries ?? []).map((e) => e.player_id))]
  if (playerIds.length === 0) {
    return jsonResponse({ ok: true, email: false })
  }

  const [{ data: players }, { data: links }, { data: appSettings }, { data: template }] = await Promise.all([
    adminClient.from('players').select('id, name, kicktipp_name').in('id', playerIds),
    adminClient.from('player_profile_links').select('player_id, profile_id').in('player_id', playerIds),
    adminClient.from('app_settings').select('app_name').eq('id', APP_SETTINGS_ID).maybeSingle(),
    adminClient.from('email_templates').select('subject, body_text').eq('system_key', 'matchday_settled').maybeSingle(),
  ])
  if (!template) {
    await logAppError(supabaseUrl, serviceRoleKey, 'notify-matchday-settled', 'Keine Vorlage für matchday_settled hinterlegt.')
    return jsonResponse({ ok: true, email: false })
  }

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
      spieltagnummer: String(matchday.nummer),
      spieltaggewinn: currencyFormatter.format(payoutByPlayer.get(player.id) ?? 0),
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

  await archiveManyToSentFolder(supabaseUrl, serviceRoleKey, 'notify-matchday-settled', emailSettings, sentRawMessages, {
    matchday_id: matchdayId,
    count: sentRawMessages.length,
  })
  if (failures.length > 0) {
    await logAppError(
      supabaseUrl,
      serviceRoleKey,
      'notify-matchday-settled',
      `${failures.length} Abrechnungs-E-Mails fehlgeschlagen`,
      { matchday_id: matchdayId, failures },
    )
  }

  return jsonResponse({ ok: true, email: true, sent: sentRawMessages.length, failed: failures.length })
}

interface TemplateVars {
  spielername: string
  kicktippname: string
  spieltagnummer: string
  spieltaggewinn: string
  appname: string
}

function renderTemplate(text: string, vars: TemplateVars): string {
  return text
    .replaceAll('{{Spielername}}', vars.spielername)
    .replaceAll('{{Kicktippname}}', vars.kicktippname)
    .replaceAll('{{SpieltagNummer}}', vars.spieltagnummer)
    .replaceAll('{{SpieltagGewinn}}', vars.spieltaggewinn)
    .replaceAll('{{AppName}}', vars.appname)
}

// Erst den admin-editierbaren Vorlagentext escapen (verhindert HTML-Injection
// über den Vorlagentext selbst), erst danach die Tokens durch bereits
// escapte Werte ersetzen (gleiches Muster wie send-password-reset/index.ts).
function renderTemplateHtml(bodyText: string, vars: TemplateVars): string {
  const escapedVars: TemplateVars = {
    spielername: escapeHtml(vars.spielername),
    kicktippname: escapeHtml(vars.kicktippname),
    spieltagnummer: escapeHtml(vars.spieltagnummer),
    spieltaggewinn: escapeHtml(vars.spieltaggewinn),
    appname: escapeHtml(vars.appname),
  }
  const withBreaks = escapeHtml(bodyText).replace(/\n/g, '<br>')
  return `<p>${renderTemplate(withBreaks, escapedVars)}</p>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

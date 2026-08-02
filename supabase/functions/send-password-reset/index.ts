// Edge Function: verschickt den Passwort-Reset-Link über die eigene
// SMTP-Konfiguration (email_settings, siehe /admin/email) statt über
// Supabase Auths eingebautem Mail-System – damit kommt die Mail garantiert
// von derselben Absenderadresse wie Testmails/Massenversand, statt von einer
// separaten, nur im Supabase-Dashboard konfigurierbaren Adresse.
//
// Läuft absichtlich ohne Auth-Check (öffentlich aufrufbar, auch von der
// Login-Seite vor der Anmeldung) und liefert IMMER dieselbe generische
// Erfolgsantwort – unabhängig davon, ob die E-Mail zu einem Konto gehört
// oder gerade gedrosselt wird (kein Enumeration-Leck, siehe LoginPage.tsx).
//
// auth.admin.generateLink() ist eine privilegierte API ohne Supabase's
// eingebaute Abuse-Schranken für resetPasswordForEmail – die
// password_reset_throttle-Tabelle übernimmt das hier selbst.
//
// purpose unterscheidet "echtes" Passwort-vergessen (Login-Seite,
// AdminUsersPage-Reset eines Bestandskontos) von der Willkommens-Mail bei
// Benutzer-Neuanlage (CreateUserForm/TipperImportPage) – beide nutzen
// denselben Recovery-Link-Mechanismus, aber unterschiedliche, über
// email_templates.system_key admin-editierbare Texte (siehe
// 0061_email_system_templates.sql). Fehlt die Vorlagen-Zeile aus
// irgendeinem Grund, greift als Verteidigung in der Tiefe der frühere
// hartkodierte Reset-Text.
//
// Ist ein Gesendet-Ordner konfiguriert (_shared/imap.ts), landet danach
// zusätzlich eine Kopie dort (_shared/mailArchive.ts).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendSmtpMail, SmtpError } from '../_shared/smtp.ts'
import { archiveToSentFolder } from '../_shared/mailArchive.ts'
import { logAppError } from '../_shared/logging.ts'
import { corsHeadersForOrigin } from '../_shared/cors.ts'

const THROTTLE_MS = 5 * 60_000

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForOrigin(req.headers.get('Origin'))
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin nicht erlaubt.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const jsonResponse = (body: unknown, status = 200) =>
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
    await handle(req, supabaseUrl, serviceRoleKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-password-reset', message)
  }

  // Immer dieselbe Antwort, unabhängig vom tatsächlichen Ausgang.
  return jsonResponse({ ok: true })
})

async function handle(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<void> {
  let body: { email?: string; redirectTo?: string; purpose?: string }
  try {
    body = await req.json()
  } catch {
    return
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return
  const purpose = body.purpose === 'invite' ? 'invite' : 'reset'
  const systemKey = purpose === 'invite' ? 'new_user_invite' : 'password_reset'

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: throttleRow } = await adminClient
    .from('password_reset_throttle')
    .select('requested_at')
    .eq('email', email)
    .maybeSingle()
  if (throttleRow && Date.now() - new Date(throttleRow.requested_at).getTime() < THROTTLE_MS) {
    return
  }
  await adminClient.from('password_reset_throttle').upsert({ email, requested_at: new Date().toISOString() })

  const { data: settings, error: settingsError } = await adminClient
    .from('email_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle()
  if (settingsError || !settings) {
    await logAppError(supabaseUrl, serviceRoleKey, 'send-password-reset', 'E-Mail-Versand ist nicht konfiguriert.')
    return
  }

  const { data: appSettings } = await adminClient
    .from('app_settings')
    .select('app_name')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .maybeSingle()
  const appName = appSettings?.app_name ?? 'Kicktipp Spielrunde'

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: body.redirectTo ? { redirectTo: body.redirectTo } : undefined,
  })

  // Kein Konto zu dieser Adresse (oder anderer Fehler) -> still abbrechen,
  // Antwort bleibt trotzdem generisch erfolgreich (siehe oben).
  const actionLink = linkData?.properties?.action_link
  if (linkError || !actionLink) return

  const metadataName = linkData.user?.user_metadata?.name
  let name = typeof metadataName === 'string' && metadataName ? metadataName : null
  if (!name) {
    const { data: profileRow } = await adminClient.from('profiles').select('name').eq('email', email).maybeSingle()
    name = profileRow?.name ?? email
  }

  const { data: template } = await adminClient
    .from('email_templates')
    .select('subject, body_text')
    .eq('system_key', systemKey)
    .maybeSingle()

  const vars = { link: actionLink, appName, name }
  let subject: string
  let html: string
  if (template) {
    subject = renderSystemTemplateSubject(template.subject, vars)
    html = renderSystemTemplateHtml(template.body_text, vars)
  } else {
    // Der genaue Link enthält mehrere &-getrennte Query-Parameter (token, type,
    // redirect_to) – roh in HTML eingesetzt interpretieren manche Mail-Clients
    // "&xyz..." als (unvollständige) HTML-Entity und schneiden den Link genau
    // dort ab oder verändern ihn. Sowohl im href-Attribut als auch im
    // sichtbaren Linktext muss & als &amp; escaped werden.
    const escapedActionLink = escapeHtml(actionLink)
    subject = `Passwort zurücksetzen – ${appName}`
    html = [
      '<p>Hallo,</p>',
      `<p>über diesen Link kannst du dein Passwort für ${escapeHtml(appName)} zurücksetzen:</p>`,
      `<p><a href="${escapedActionLink}">${escapedActionLink}</a></p>`,
      '<p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>',
    ].join('\n')
  }

  let rawMessage: string
  try {
    const sent = await sendSmtpMail(
      {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        encryption: settings.smtp_encryption,
        username: settings.smtp_username,
        password: settings.smtp_password,
      },
      {
        fromEmail: settings.sender_email,
        fromName: settings.sender_name,
        to: email,
        subject,
        html,
      },
    )
    rawMessage = sent.raw
  } catch (err) {
    const message = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-password-reset', message, { email, purpose })
    return
  }

  await archiveToSentFolder(supabaseUrl, serviceRoleKey, 'send-password-reset', settings, rawMessage, { email, purpose })
}

interface SystemTemplateVars {
  link: string
  appName: string
  name: string
}

// Betreff ist ein SMTP-Header, kein HTML – rohe Werte einsetzen reicht
// (Header-Injection über CR/LF wird bereits in buildRawEmail() über
// stripHeaderInjection() abgefangen, siehe _shared/smtp.ts).
function renderSystemTemplateSubject(subject: string, vars: SystemTemplateVars): string {
  return subject.replaceAll('{{Link}}', vars.link).replaceAll('{{AppName}}', vars.appName).replaceAll('{{Name}}', vars.name)
}

// Erst den admin-editierbaren Vorlagentext escapen (verhindert HTML-
// Injection über den Vorlagentext selbst) und in <br>-Zeilenumbrüche
// umwandeln, danach die Tokens durch bereits escapte Werte ersetzen –
// {{Link}} wird dabei zu einem klickbaren <a>-Tag statt reinem Linktext.
function renderSystemTemplateHtml(bodyText: string, vars: SystemTemplateVars): string {
  const withBreaks = escapeHtml(bodyText).replace(/\n/g, '<br>')
  const escapedLink = escapeHtml(vars.link)
  const withTokens = withBreaks
    .replaceAll('{{Link}}', `<a href="${escapedLink}">${escapedLink}</a>`)
    .replaceAll('{{AppName}}', escapeHtml(vars.appName))
    .replaceAll('{{Name}}', escapeHtml(vars.name))
  return `<p>${withTokens}</p>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

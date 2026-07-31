// Edge Function: verschickt eine Kontaktanfrage eines beliebigen aktiven
// Users an den Spielleiter. Ziel-Adresse ist bewusst dieselbe wie die
// Absender-Adresse aus /admin/email (email_settings.sender_email) – diese
// Adresse wird bereits als tatsächlich überwachtes Postfach behandelt (von
// dort kommen z. B. auch Passwort-Reset-Mails), eine eigene Konfiguration
// dafür wäre unnötig. Läuft serverseitig mit dem service_role-Key, da der
// SMTP-Versand die dort hinterlegten Zugangsdaten braucht.
//
// Anders als admin-create-user/admin-update-user KEINE Rollen-/Rechteprüfung
// über die Admin-Rolle hinaus – jeder aktive User darf eine Nachricht senden,
// das ist der ganze Zweck dieser Function.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendSmtpMail, SmtpError } from './smtp.ts'
import { corsHeadersForOrigin } from '../_shared/cors.ts'

type JsonResponder = (body: unknown, status?: number) => Response

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
    await logAppError(supabaseUrl, serviceRoleKey, 'send-contact-message', message)
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

  const { data: callerProfile, error: profileError } = await callerClient
    .from('profiles')
    .select('name, email, is_active')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile || !callerProfile.is_active) {
    return jsonResponse({ error: 'Konto ist nicht aktiv.' }, 403)
  }

  let body: { subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const subject = body.subject?.trim()
  const message = body.message?.trim()
  if (!subject || !message) {
    return jsonResponse({ error: 'Betreff und Nachricht sind erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: settings, error: settingsError } = await adminClient
    .from('email_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle()
  if (settingsError || !settings) {
    return jsonResponse({ error: 'E-Mail-Versand ist nicht konfiguriert.' }, 500)
  }

  const { data: appSettings } = await adminClient
    .from('app_settings')
    .select('app_name')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .maybeSingle()
  const appName = appSettings?.app_name ?? 'Kicktipp Spielrunde'

  const senderName = callerProfile.name
  const senderEmail = callerProfile.email ?? callerUser.email ?? ''

  try {
    await sendSmtpMail(
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
        to: settings.sender_email,
        replyTo: senderEmail || undefined,
        subject: `Kontaktanfrage über ${appName}: ${subject}`,
        html: [
          `<p>Nachricht von <strong>${escapeHtml(senderName)}</strong>` +
            (senderEmail ? ` (${escapeHtml(senderEmail)})` : '') +
            ':</p>',
          `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
        ].join('\n'),
      },
    )
  } catch (err) {
    const errMessage = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-contact-message', errMessage, { senderEmail })
    return jsonResponse({ error: 'Nachricht konnte nicht verschickt werden.' }, 500)
  }

  return jsonResponse({ ok: true })
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function logAppError(
  supabaseUrl: string,
  serviceRoleKey: string,
  source: string,
  message: string,
  details?: Record<string, unknown>,
) {
  try {
    const client = createClient(supabaseUrl, serviceRoleKey)
    await client.from('app_logs').insert({ level: 'error', source, message, details: details ?? null })
  } catch {
    // Logging darf den eigentlichen Response-Pfad nicht zusätzlich zum Absturz bringen.
  }
}

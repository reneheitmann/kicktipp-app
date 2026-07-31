// Edge Function: stößt eine E-Mail-Änderung des angemeldeten Users an.
// Ändert auth.users.email NICHT direkt, sondern legt eine Anfrage in
// email_change_requests an und verschickt einen Bestätigungslink an die NEUE
// Adresse (per eigener SMTP-Konfiguration, siehe send-password-reset für die
// Begründung) – erst der Klick auf den Link (confirm-email-change) übernimmt
// die Änderung wirklich. So ist sichergestellt, dass die neue Adresse
// tatsächlich dem User gehört und erreichbar ist, statt sich vertippen zu
// können oder fremde Postfächer als eigenes Login zu kapern.

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
    await logAppError(supabaseUrl, serviceRoleKey, 'update-own-email', message)
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
    .select('is_active')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile || !callerProfile.is_active) {
    return jsonResponse({ error: 'Konto ist nicht aktiv.' }, 403)
  }

  let body: { email?: string; redirectTo?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const email = body.email?.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }, 400)
  }
  if (!body.redirectTo) {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
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

  const rawToken = randomToken()
  const tokenHash = await sha256Hex(rawToken)

  const { error: upsertError } = await adminClient
    .from('email_change_requests')
    .upsert({ profile_id: callerUser.id, new_email: email, token_hash: tokenHash, requested_at: new Date().toISOString() })
  if (upsertError) {
    return jsonResponse({ error: upsertError.message }, 500)
  }

  const confirmLink = `${body.redirectTo.replace(/\/+$/, '')}/email-bestaetigen?token=${rawToken}`
  const escapedConfirmLink = escapeHtml(confirmLink)

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
        to: email,
        subject: `E-Mail-Adresse bestätigen – ${appName}`,
        html: [
          '<p>Hallo,</p>',
          `<p>bitte bestätige über diesen Link deine neue E-Mail-Adresse für ${escapeHtml(appName)}:</p>`,
          `<p><a href="${escapedConfirmLink}">${escapedConfirmLink}</a></p>`,
          '<p>Der Link ist 24 Stunden gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>',
        ].join('\n'),
      },
    )
  } catch (err) {
    const message = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'update-own-email', message, { email })
    return jsonResponse({ error: 'Bestätigungsmail konnte nicht verschickt werden.' }, 500)
  }

  return jsonResponse({ ok: true })
}

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
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

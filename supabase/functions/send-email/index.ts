// Edge Function: verschickt eine E-Mail über die in `email_settings` hinterlegte
// SMTP-Konfiguration (Admin-Seite "/admin/email"). Läuft serverseitig mit dem
// service_role-Key, da `email_settings` per RLS nur für Admins lesbar ist und
// das SMTP-Passwort niemals ins Frontend-Bundle darf.
//
// Nutzt einen selbst geschriebenen SMTP-Client (./smtp.ts) statt einer fertigen
// Library: die naheliegende Bibliothek "denomailer" brachte die Edge-Function
// reproduzierbar zum Absturz, sobald zuvor schon ein fetch() lief (z. B. für
// den Auth-Check oder das Lesen von email_settings) – siehe Kommentar in
// smtp.ts für die Details der Verifikation.

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

  // Unerwartete Ausnahmen (z. B. ein Netzwerkfehler beim Auth-Check) landen
  // sonst als nackter 500er ohne CORS-Header beim Client – hier stattdessen
  // geloggt und mit einer auswertbaren Fehlermeldung beantwortet, siehe
  // Kommentar in smtp.ts zu genau diesem Absturzverhalten bei Edge Functions.
  try {
    return await handle(req, supabaseUrl, serviceRoleKey, jsonResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-email', message)
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
    .select('role, is_active')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
    return jsonResponse({ error: 'Nur aktive Administratoren dürfen E-Mails versenden.' }, 403)
  }

  let body: { to?: string; subject?: string; html?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const { to, subject, html } = body
  if (!to?.trim() || !subject?.trim() || !html?.trim()) {
    return jsonResponse({ error: 'Empfänger, Betreff und Inhalt sind erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: settings, error: settingsError } = await adminClient
    .from('email_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle()

  if (settingsError || !settings) {
    return jsonResponse({ error: 'E-Mail-Versand ist noch nicht konfiguriert (siehe Admin-Seite "E-Mail-Versand").' }, 400)
  }

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
        to,
        subject,
        html,
      },
    )
  } catch (err) {
    const message = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-email', message, {
      to,
      subject,
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_encryption: settings.smtp_encryption,
    })
    return jsonResponse({ error: `SMTP-Fehler: ${message}` }, 502)
  }

  return jsonResponse({ ok: true })
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


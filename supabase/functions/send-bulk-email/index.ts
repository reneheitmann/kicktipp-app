// Edge Function: verschickt E-Mails an mehrere Spieler in einem Aufruf
// (Empfängerauswahl/Variablen-Rendering passiert clientseitig, siehe
// src/features/emails/). Eigenständiges Funktionsverzeichnis mit eigener
// Kopie von smtp.ts (keine Cross-Function-Imports), analog zu send-email/.
//
// Anders als send-email/ (SMTP-Testmail, hart admin-only, betrifft die
// SMTP-Zugangsdaten selbst) ist der Massenversand an Spieler ein normales
// operatives Recht: die Berechtigung wird über das granulare
// role_permissions-System geprüft ('email.send'), nicht über role==='admin'.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendSmtpMail, SmtpError } from './smtp.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RECIPIENTS = 200

interface Recipient {
  to: string
  subject: string
  html: string
}

interface RecipientResult {
  to: string
  ok: boolean
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    return await handle(req, supabaseUrl, serviceRoleKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-bulk-email', message)
    return jsonResponse({ error: `Unerwarteter Fehler: ${message}` }, 500)
  }
})

async function handle(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
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

  // Nutzt current_user_has_permission() im Auth-Kontext des Aufrufers (RPC
  // über callerClient) statt die Rechte-Logik hier zu duplizieren – dieselbe
  // SQL-Funktion, die auch die RLS-Policies der email_templates-Tabelle nutzt.
  const { data: hasPermission, error: permissionError } = await callerClient.rpc('current_user_has_permission', {
    p_key: 'email.send',
  })

  if (permissionError || !hasPermission) {
    return jsonResponse({ error: 'Keine Berechtigung zum E-Mail-Versand.' }, 403)
  }

  let body: { recipients?: Recipient[] }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const recipients = body.recipients
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return jsonResponse({ error: 'Mindestens ein Empfänger ist erforderlich.' }, 400)
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return jsonResponse({ error: `Maximal ${MAX_RECIPIENTS} Empfänger je Versand.` }, 400)
  }
  for (const r of recipients) {
    if (!r.to?.trim() || !r.subject?.trim() || !r.html?.trim()) {
      return jsonResponse({ error: 'Jeder Empfänger benötigt Adresse, Betreff und Inhalt.' }, 400)
    }
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

  const smtpConfig = {
    hostname: settings.smtp_host,
    port: settings.smtp_port,
    encryption: settings.smtp_encryption,
    username: settings.smtp_username,
    password: settings.smtp_password,
  }

  const results: RecipientResult[] = []
  const failures: { to: string; error: string }[] = []
  for (const recipient of recipients) {
    try {
      await sendSmtpMail(smtpConfig, {
        fromEmail: settings.sender_email,
        fromName: settings.sender_name,
        to: recipient.to,
        subject: recipient.subject,
        html: recipient.html,
      })
      results.push({ to: recipient.to, ok: true })
    } catch (err) {
      const message = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
      results.push({ to: recipient.to, ok: false, error: message })
      failures.push({ to: recipient.to, error: message })
    }
  }

  // Einzelne fehlgeschlagene Empfänger sind für den sendenden User bereits im
  // Ergebnis (results) sichtbar – hier zusätzlich gesammelt für den Admin,
  // damit sich Muster (z. B. derselbe SMTP-Fehler bei allen) auf einen Blick
  // erkennen lassen, ohne jede einzelne Versand-Antwort durchsuchen zu müssen.
  if (failures.length > 0) {
    await logAppError(
      supabaseUrl,
      serviceRoleKey,
      'send-bulk-email',
      `${failures.length} von ${recipients.length} E-Mails fehlgeschlagen`,
      { failures, smtp_host: settings.smtp_host, smtp_port: settings.smtp_port, smtp_encryption: settings.smtp_encryption },
    )
  }

  return jsonResponse({ results })
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// Edge Function: verschickt den Passwort-Reset-Link über die eigene
// SMTP-Konfiguration (email_settings, siehe /admin/email) statt über
// Supabase Auths eingebautes Mail-System – damit kommt die Mail garantiert
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

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendSmtpMail, SmtpError } from './smtp.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const THROTTLE_MS = 5 * 60_000

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
    await handle(req, supabaseUrl, serviceRoleKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-password-reset', message)
  }

  // Immer dieselbe Antwort, unabhängig vom tatsächlichen Ausgang.
  return jsonResponse({ ok: true })
})

async function handle(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<void> {
  let body: { email?: string; redirectTo?: string }
  try {
    body = await req.json()
  } catch {
    return
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return

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

  // Der Link enthält mehrere &-getrennte Query-Parameter (token, type,
  // redirect_to) – roh in HTML eingesetzt interpretieren manche Mail-Clients
  // "&xyz..." als (unvollständige) HTML-Entity und schneiden den Link genau
  // dort ab oder verändern ihn. Sowohl im href-Attribut als auch im
  // sichtbaren Linktext muss & als &amp; escaped werden.
  const escapedActionLink = escapeHtml(actionLink)

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
        subject: `Passwort zurücksetzen – ${appName}`,
        html: [
          '<p>Hallo,</p>',
          `<p>über diesen Link kannst du dein Passwort für ${escapeHtml(appName)} zurücksetzen:</p>`,
          `<p><a href="${escapedActionLink}">${escapedActionLink}</a></p>`,
          '<p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>',
        ].join('\n'),
      },
    )
  } catch (err) {
    const message = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-password-reset', message, { email })
  }
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

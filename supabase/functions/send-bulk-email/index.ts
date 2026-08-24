// Edge Function: verschickt E-Mails an mehrere Spieler in einem Aufruf
// (Empfängerauswahl/Variablen-Rendering passiert clientseitig, siehe
// src/features/emails/). Nutzt denselben SMTP-Client wie send-email/ aus
// _shared/smtp.ts. Ist ein Gesendet-Ordner konfiguriert (_shared/imap.ts),
// wird für den ganzen Versandlauf eine einzige IMAP-Verbindung
// wiederverwendet statt pro Empfänger neu zu verbinden.
//
// Anders als send-email/ (SMTP-Testmail, hart admin-only, betrifft die
// SMTP-Zugangsdaten selbst) ist der Massenversand an Spieler ein normales
// operatives Recht: die Berechtigung wird über das granulare
// role_permissions-System geprüft ('email.send'), nicht über role==='admin'.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendSmtpMail, SmtpError } from '../_shared/smtp.ts'
import { archiveManyToSentFolder } from '../_shared/mailArchive.ts'
import { logAppError } from '../_shared/logging.ts'
import { corsHeadersForOrigin } from '../_shared/cors.ts'
import { sendPushToProfiles } from '../_shared/push.ts'

type JsonResponder = (body: unknown, status?: number) => Response

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
    await logAppError(supabaseUrl, serviceRoleKey, 'send-bulk-email', message)
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

  // Nutzt current_user_has_permission() im Auth-Kontext des Aufrufers (RPC
  // über callerClient) statt die Rechte-Logik hier zu duplizieren – dieselbe
  // SQL-Funktion, die auch die RLS-Policies der email_templates-Tabelle nutzt.
  const { data: hasPermission, error: permissionError } = await callerClient.rpc('current_user_has_permission', {
    p_key: 'email.send',
  })

  if (permissionError || !hasPermission) {
    return jsonResponse({ error: 'Keine Berechtigung zum E-Mail-Versand.' }, 403)
  }

  let body: { recipients?: Recipient[]; push?: { title?: string; body?: string; player_ids?: string[] } }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const recipients = body.recipients
  const wantsEmail = Array.isArray(recipients) && recipients.length > 0
  const wantsPush = !!(
    body.push?.title?.trim() &&
    body.push?.body?.trim() &&
    Array.isArray(body.push.player_ids) &&
    body.push.player_ids.length > 0
  )
  if (!wantsEmail && !wantsPush) {
    return jsonResponse({ error: 'Mindestens ein E-Mail- oder Push-Empfänger ist erforderlich.' }, 400)
  }
  if (wantsPush && body.push!.player_ids!.length > MAX_RECIPIENTS) {
    return jsonResponse({ error: `Maximal ${MAX_RECIPIENTS} Empfänger je Versand.` }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  let results: RecipientResult[] = []

  if (wantsEmail) {
    if (recipients!.length > MAX_RECIPIENTS) {
      return jsonResponse({ error: `Maximal ${MAX_RECIPIENTS} Empfänger je Versand.` }, 400)
    }
    for (const r of recipients!) {
      if (!r.to?.trim() || !r.subject?.trim() || !r.html?.trim()) {
        return jsonResponse({ error: 'Jeder Empfänger benötigt Adresse, Betreff und Inhalt.' }, 400)
      }
    }

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

    const failures: { to: string; error: string }[] = []
    const sentRawMessages: string[] = []
    for (const recipient of recipients!) {
      try {
        const sent = await sendSmtpMail(smtpConfig, {
          fromEmail: settings.sender_email,
          fromName: settings.sender_name,
          to: recipient.to,
          subject: recipient.subject,
          html: recipient.html,
        })
        results.push({ to: recipient.to, ok: true })
        sentRawMessages.push(sent.raw)
      } catch (err) {
        const message = err instanceof SmtpError ? err.message : err instanceof Error ? err.message : String(err)
        results.push({ to: recipient.to, ok: false, error: message })
        failures.push({ to: recipient.to, error: message })
      }
    }

    await archiveManyToSentFolder(supabaseUrl, serviceRoleKey, 'send-bulk-email', settings, sentRawMessages, {
      count: sentRawMessages.length,
    })

    // Einzelne fehlgeschlagene Empfänger sind für den sendenden User bereits
    // im Ergebnis (results) sichtbar – hier zusätzlich gesammelt für den
    // Admin, damit sich Muster (z. B. derselbe SMTP-Fehler bei allen) auf
    // einen Blick erkennen lassen, ohne jede einzelne Versand-Antwort
    // durchsuchen zu müssen.
    if (failures.length > 0) {
      await logAppError(
        supabaseUrl,
        serviceRoleKey,
        'send-bulk-email',
        `${failures.length} von ${recipients!.length} E-Mails fehlgeschlagen`,
        { failures, smtp_host: settings.smtp_host, smtp_port: settings.smtp_port, smtp_encryption: settings.smtp_encryption },
      )
    }
  }

  // Push ist ein eigenständiger, von E-Mail unabhängiger Kanal (eigene
  // player_ids statt aus den E-Mail-Empfängern abgeleitet) - so lässt sich
  // eine Nachricht auch als reiner Push ohne E-Mail verschicken, z. B. an
  // Spieler ohne hinterlegte E-Mail-Adresse. Titel/Text sind bewusst NICHT
  // durch dieselbe Vorlagen-Variablen-Ersetzung wie die E-Mail gelaufen
  // (keine Personalisierung für Push in diesem Schritt, siehe
  // SendEmailPage.tsx).
  //
  // pushDeviceCount wird zurückgemeldet, weil sendPushToProfiles() sonst
  // komplett "fire and forget" läuft (siehe deren eigener Kommentar) - ohne
  // diese Rückmeldung hätte der Admin keine Möglichkeit zu erkennen, dass
  // "0 zugestellt" i. d. R. bedeutet: Empfänger haben (noch) kein Gerät mit
  // aktivierten Push-Benachrichtigungen registriert, nicht dass etwas
  // fehlgeschlagen ist.
  let pushDeviceCount: number | null = null
  if (wantsPush) {
    const playerIds = [...new Set(body.push!.player_ids!)]
    const { data: links } = await adminClient.from('player_profile_links').select('profile_id').in('player_id', playerIds)
    const profileIds = [...new Set((links ?? []).map((l) => l.profile_id))]
    const { count } = await adminClient
      .from('push_tokens')
      .select('id', { count: 'exact', head: true })
      .in('profile_id', profileIds)
    pushDeviceCount = count ?? 0
    await sendPushToProfiles(
      supabaseUrl,
      serviceRoleKey,
      'send-bulk-email',
      profileIds,
      body.push!.title!.trim(),
      body.push!.body!.trim(),
      { type: 'admin_message', supabase_url: supabaseUrl },
    )
  }

  return jsonResponse({ results, pushDeviceCount })
}


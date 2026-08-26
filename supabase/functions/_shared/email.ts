// Dispatcher zwischen den beiden admin-konfigurierbaren Versandarten
// (email_settings.provider, siehe 0070_email_provider_brevo.sql) – nach
// außen dieselbe Signatur wie das bisherige sendSmtpMail() (Promise<RawEmail>
// mit .raw für die IMAP-Archivierung, siehe mailArchive.ts), damit die fünf
// versendenden Edge Functions (send-email, send-bulk-email,
// send-contact-message, send-password-reset, update-own-email) nicht
// einzeln zwischen den Providern verzweigen müssen.
//
// Brevo ist eine normale HTTPS-API (fetch), kein SMTP-Protokoll über rohe
// Sockets – die "kein fetch() vor Deno.connect()"-Einschränkung, die
// smtp.ts zu seiner Eigenimplementierung zwingt (siehe Kommentar dort),
// betrifft diesen Pfad nicht.

import { sendSmtpMail, buildRawEmail, type SmtpMessage, type RawEmail } from './smtp.ts'

export type EmailProvider = 'smtp' | 'brevo'

export interface EmailSettingsRow {
  provider: EmailProvider
  smtp_host: string | null
  smtp_port: number | null
  smtp_encryption: 'none' | 'starttls' | 'tls'
  smtp_username: string | null
  smtp_password: string | null
  brevo_api_key: string | null
  sender_email: string
  sender_name: string | null
}

export class EmailSendError extends Error {}

export async function sendEmail(settings: EmailSettingsRow, message: SmtpMessage): Promise<RawEmail> {
  if (settings.provider === 'brevo') return sendBrevoMail(settings, message)

  if (!settings.smtp_host || !settings.smtp_port) {
    throw new EmailSendError('SMTP ist als Versandart gewählt, aber Host/Port fehlen.')
  }
  return sendSmtpMail(
    {
      hostname: settings.smtp_host,
      port: settings.smtp_port,
      encryption: settings.smtp_encryption,
      username: settings.smtp_username,
      password: settings.smtp_password,
    },
    message,
  )
}

// buildRawEmail() validiert/sanitisiert Adressen und Header identisch zum
// SMTP-Pfad und liefert zusätzlich den RFC822-Text für die optionale
// IMAP-Archivierung – Brevo selbst bekommt subject/html direkt, kein
// SMTP-Envelope nötig. Dadurch funktioniert die "Gesendet-Ordner"-Kopie
// (mailArchive.ts) unverändert auch mit Brevo als Versandart.
async function sendBrevoMail(settings: EmailSettingsRow, message: SmtpMessage): Promise<RawEmail> {
  if (!settings.brevo_api_key) {
    throw new EmailSendError('Brevo ist als Versandart gewählt, aber kein API-Key hinterlegt.')
  }
  const email = buildRawEmail(message)

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': settings.brevo_api_key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: email.envelopeFrom, ...(message.fromName ? { name: message.fromName } : {}) },
      to: [{ email: email.envelopeTo }],
      ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
      subject: message.subject,
      htmlContent: message.html,
    }),
  })

  if (!res.ok) {
    throw new EmailSendError(`Brevo-Fehler (${res.status}): ${await res.text()}`)
  }

  return email
}

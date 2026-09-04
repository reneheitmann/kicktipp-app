import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database, EmailProvider, EmailSettingsSafe, SmtpEncryption } from '../../types/database'

type EmailSettingsInsert = Database['public']['Tables']['email_settings']['Insert']

// Feste Singleton-id (siehe Migration 0017) – es gibt immer höchstens eine Zeile.
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export interface EmailSettingsInput {
  provider: EmailProvider
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password?: string
  smtp_encryption: SmtpEncryption
  brevo_api_key?: string
  sender_email: string
  sender_name: string | null
  imap_host: string | null
  imap_port: number | null
  imap_sent_folder: string | null
  auto_send_settlement_emails: boolean
  updated_by: string
}

export async function getEmailSettings(): Promise<EmailSettingsSafe | null> {
  const { data, error } = await supabase.from('email_settings').select('*').eq('id', SETTINGS_ID).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { smtp_password, brevo_api_key, ...rest } = data
  return { ...rest, has_password: !!smtp_password, has_brevo_api_key: !!brevo_api_key }
}

// Ein leeres/undefiniertes `smtp_password`/`brevo_api_key` lässt den
// bisherigen Wert unverändert: der Key wird dann gar nicht erst ins
// Upsert-Payload aufgenommen, sodass PostgREST die Spalte beim ON CONFLICT
// DO UPDATE ausspart statt sie zu überschreiben.
export async function saveEmailSettings(input: EmailSettingsInput): Promise<void> {
  const payload: EmailSettingsInsert = {
    id: SETTINGS_ID,
    provider: input.provider,
    smtp_host: input.smtp_host,
    smtp_port: input.smtp_port,
    smtp_username: input.smtp_username,
    smtp_encryption: input.smtp_encryption,
    sender_email: input.sender_email,
    sender_name: input.sender_name,
    imap_host: input.imap_host,
    imap_port: input.imap_port,
    imap_sent_folder: input.imap_sent_folder,
    auto_send_settlement_emails: input.auto_send_settlement_emails,
    updated_at: new Date().toISOString(),
    updated_by: input.updated_by,
  }
  if (input.smtp_password) payload.smtp_password = input.smtp_password
  if (input.brevo_api_key) payload.brevo_api_key = input.brevo_api_key

  const { error } = await supabase.from('email_settings').upsert(payload)
  if (error) throw error
}

export async function sendTestEmail(to: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to,
      subject: 'Test-E-Mail von Kicktipp Spielrunde',
      html: '<p>Diese Test-E-Mail bestätigt, dass die SMTP-Konfiguration funktioniert.</p>',
    },
  })
  if (error) throw await toDetailedError(error)
}

// supabase-js wirft bei einer Nicht-2xx-Antwort der Edge Function nur die
// generische Meldung "Edge Function returned a non-2xx status code" – die
// eigentliche, hilfreiche Fehlermeldung (z. B. der konkrete SMTP-Fehler)
// steckt im JSON-Body der Response, der separat ausgelesen werden muss.
async function toDetailedError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === 'string') return new Error(body.error)
    } catch {
      // Body war kein JSON – Fallback auf die generische Meldung unten.
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}

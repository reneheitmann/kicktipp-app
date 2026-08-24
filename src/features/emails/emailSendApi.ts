import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export interface BulkEmailRecipient {
  to: string
  subject: string
  html: string
  // Optional: nur gesetzt, wenn `push` mitgeschickt wird - löst dann
  // zusätzlich eine Push-Benachrichtigung an diesen Spieler aus.
  player_id?: string
}

export interface BulkEmailResult {
  to: string
  ok: boolean
  error?: string
}

export interface BulkEmailPush {
  title: string
  body: string
}

export interface BulkEmailSendResult {
  results: BulkEmailResult[]
  // null: kein Push angefordert. 0: Push angefordert, aber kein Empfänger
  // hat ein Gerät mit aktivierten Benachrichtigungen registriert.
  pushDeviceCount: number | null
}

export async function sendBulkEmail(recipients: BulkEmailRecipient[], push?: BulkEmailPush): Promise<BulkEmailSendResult> {
  const { data, error } = await supabase.functions.invoke<BulkEmailSendResult>('send-bulk-email', {
    body: { recipients, push },
  })
  if (error) throw await toDetailedError(error)
  return { results: data?.results ?? [], pushDeviceCount: data?.pushDeviceCount ?? null }
}

// supabase-js wirft bei einer Nicht-2xx-Antwort der Edge Function nur die
// generische Meldung "Edge Function returned a non-2xx status code" – die
// eigentliche Fehlermeldung steckt im JSON-Body, siehe emailSettingsApi.ts.
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

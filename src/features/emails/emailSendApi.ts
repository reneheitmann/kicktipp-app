import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export interface BulkEmailRecipient {
  to: string
  subject: string
  html: string
}

export interface BulkEmailResult {
  to: string
  ok: boolean
  error?: string
}

export async function sendBulkEmail(recipients: BulkEmailRecipient[]): Promise<BulkEmailResult[]> {
  const { data, error } = await supabase.functions.invoke<{ results: BulkEmailResult[] }>('send-bulk-email', {
    body: { recipients },
  })
  if (error) throw await toDetailedError(error)
  return data?.results ?? []
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

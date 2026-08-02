import { createClient } from 'jsr:@supabase/supabase-js@2'

// Gemeinsam für alle Mail-Versand-Functions (analog zu cors.ts) statt einer
// pro Function duplizierten Kopie.
export async function logAppError(
  supabaseUrl: string,
  serviceRoleKey: string,
  source: string,
  message: string,
  details?: Record<string, unknown>,
  level: 'error' | 'warn' = 'error',
): Promise<void> {
  try {
    const client = createClient(supabaseUrl, serviceRoleKey)
    await client.from('app_logs').insert({ level, source, message, details: details ?? null })
  } catch {
    // Logging darf den eigentlichen Response-Pfad nicht zusätzlich zum Absturz bringen.
  }
}

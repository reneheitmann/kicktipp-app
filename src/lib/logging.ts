import { supabase } from './supabaseClient'
import type { LogLevel } from '../types/database'

export function serializeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack }
  return { message: typeof err === 'string' ? err : JSON.stringify(err) }
}

// Fire-and-forget: wird u. a. aus globalen Error-Handlern und einer
// ErrorBoundary aufgerufen, die selbst schon mitten im Fehlerfall stecken –
// darf daher selbst niemals werfen oder die aufrufende Stelle blockieren.
// INSERT ist per RLS bewusst für jeden offen (auch anon, siehe
// supabase/migrations/0030_app_logs.sql), Lesen bleibt admin-only.
export function logToServer(
  level: LogLevel,
  source: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser()
      await supabase.from('app_logs').insert({
        level,
        source,
        message: message.slice(0, 2000),
        details: details ?? null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        user_id: data.user?.id ?? null,
      })
    } catch {
      // Logging darf selbst keine weitere Fehlerkaskade auslösen.
    }
  })()
}

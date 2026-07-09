import { supabase } from '../../lib/supabaseClient'
import type { Database, SessionPolicy } from '../../types/database'

type SessionPolicyUpdate = Database['public']['Tables']['session_policy']['Update']

// Feste Singleton-id (siehe Migration 0043) – es gibt immer genau eine Zeile.
const POLICY_ID = '00000000-0000-0000-0000-000000000004'

export async function getSessionPolicy(): Promise<SessionPolicy> {
  const { data, error } = await supabase.from('session_policy').select('*').eq('id', POLICY_ID).single()
  if (error) throw error
  return data
}

export async function saveSessionPolicy(input: { max_duration_hours: number; updated_by: string }): Promise<void> {
  const payload: SessionPolicyUpdate = {
    max_duration_hours: input.max_duration_hours,
    updated_at: new Date().toISOString(),
    updated_by: input.updated_by,
  }
  const { error } = await supabase.from('session_policy').update(payload).eq('id', POLICY_ID)
  if (error) throw error
}

/**
 * Registriert die aktuelle Sitzung serverseitig (siehe register_session()
 * in Migration 0043) – idempotent, spätere Aufrufe für dieselbe Sitzung
 * (Reload/Token-Refresh) sind No-Ops. Bewusst fire-and-forget-tauglich:
 * wirft nie, ein Fehlschlag darf den Login-Flow nicht blockieren (die
 * serverseitige Prüfung ist zusätzliche Absicherung, nicht die alleinige
 * Durchsetzung, siehe AuthProvider.tsx).
 */
export async function registerSession(): Promise<void> {
  const { error } = await supabase.rpc('register_session')
  if (error) throw error
}

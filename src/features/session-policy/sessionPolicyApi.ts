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

export async function saveSessionPolicy(input: {
  max_duration_hours: number
  mobile_max_duration_hours: number
  updated_by: string
}): Promise<void> {
  const payload: SessionPolicyUpdate = {
    max_duration_hours: input.max_duration_hours,
    mobile_max_duration_hours: input.mobile_max_duration_hours,
    updated_at: new Date().toISOString(),
    updated_by: input.updated_by,
  }
  const { error } = await supabase.from('session_policy').update(payload).eq('id', POLICY_ID)
  if (error) throw error
}

/**
 * Registriert die aktuelle Sitzung serverseitig (siehe register_session()
 * in Migration 0043/0071) – idempotent, spätere Aufrufe für dieselbe
 * Sitzung (Reload/Token-Refresh) sind No-Ops. `platform` bestimmt, welches
 * der beiden Limits (max_duration_hours/mobile_max_duration_hours)
 * current_session_valid() serverseitig auf diese Sitzung anwendet – siehe
 * AuthProvider.tsx für die Ermittlung des Kanals. Bewusst
 * fire-and-forget-tauglich: wirft nie, ein Fehlschlag darf den Login-Flow
 * nicht blockieren (die serverseitige Prüfung ist zusätzliche Absicherung,
 * nicht die alleinige Durchsetzung).
 */
export async function registerSession(platform: 'web' | 'mobile' = 'web'): Promise<void> {
  const { error } = await supabase.rpc('register_session', { p_platform: platform })
  if (error) throw error
}

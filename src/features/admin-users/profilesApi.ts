import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Profile, UserRole } from '../../types/database'

export async function listProfiles(): Promise<Profile[]> {
  return fetchAllRows((from, to) => supabase.from('profiles').select('*').order('name').range(from, to))
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  // base_role explizit mitleeren: eine direkte Rollenzuweisung durch einen
  // Admin ist die neue, echte Rolle – ein evtl. noch laufender eigener
  // Rollenwechsel (switch_to_user_role, siehe 0036) darf danach nicht mehr
  // "zurückwechseln" auf eine inzwischen überholte gespeicherte Rolle.
  const { error } = await supabase.from('profiles').update({ role, base_role: null }).eq('id', id)
  if (error) throw error
}

export async function setProfileActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_active }).eq('id', id)
  if (error) throw error
}

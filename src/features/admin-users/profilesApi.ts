import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Profile, UserRole } from '../../types/database'

export async function listProfiles(): Promise<Profile[]> {
  return fetchAllRows((from, to) => supabase.from('profiles').select('*').order('name').range(from, to))
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}

export async function setProfileActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_active }).eq('id', id)
  if (error) throw error
}

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/login`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

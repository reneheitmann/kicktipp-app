import { supabase } from '../../lib/supabaseClient'
import { toDetailedError } from './edgeFunctionError'

/**
 * Ruft die Edge Function "admin-delete-user" auf, da nur Supabase Auths
 * privilegierte Admin-API einen Login endgültig löschen kann.
 */
export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userId } })
  if (error) throw await toDetailedError(error)
}

import { supabase } from '../../lib/supabaseClient'
import { toDetailedError } from './edgeFunctionError'

interface UpdateUserInput {
  userId: string
  name: string
  vorname?: string
  nachname?: string
  email: string
}

/**
 * Ruft die Edge Function "admin-update-user" auf, da eine E-Mail-Änderung
 * auch den Login (auth.users.email) betrifft und daher den service_role-Key
 * benötigt – ein reines profiles-Update würde den Login-Namen nicht ändern.
 */
export async function adminUpdateUser(input: UpdateUserInput): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-update-user', { body: input })
  if (error) throw await toDetailedError(error)
}

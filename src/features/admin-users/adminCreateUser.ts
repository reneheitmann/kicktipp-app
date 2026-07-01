import { supabase } from '../../lib/supabaseClient'
import type { UserRole } from '../../types/database'

interface CreateUserInput {
  email: string
  password: string
  name: string
  role: UserRole
}

interface CreateUserResult {
  id: string
}

/**
 * Ruft die Edge Function "admin-create-user" auf, da das Anlegen eines neuen
 * Auth-Logins den service_role-Key benötigt und daher nicht direkt aus dem
 * Frontend, sondern nur serverseitig erfolgen darf.
 */
export async function adminCreateUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { data, error } = await supabase.functions.invoke<CreateUserResult>('admin-create-user', {
    body: input,
  })
  if (error) throw error
  if (!data) throw new Error('Keine Antwort von der Funktion erhalten')
  return data
}

import { supabase } from '../../lib/supabaseClient'
import { toDetailedError } from './edgeFunctionError'
import type { UserRole } from '../../types/database'

interface CreateUserInput {
  email: string
  password: string
  name: string
  vorname?: string
  nachname?: string
  role: UserRole
  /** true für den bei "Per E-Mail einladen" zufällig generierten Platzhalter
   *  (siehe CreateUserForm.tsx) – lässt die Passwort-Richtlinie serverseitig
   *  aus, da dieses Passwort dem User nie angezeigt wird. */
  isGeneratedPlaceholder?: boolean
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
  if (error) throw await toDetailedError(error)
  if (!data) throw new Error('Keine Antwort von der Funktion erhalten')
  return data
}

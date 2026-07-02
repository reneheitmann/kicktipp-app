import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { UserRole } from '../../types/database'

interface CreateUserInput {
  email: string
  password: string
  name: string
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

// supabase-js wirft bei einer Nicht-2xx-Antwort der Edge Function nur die
// generische Meldung "Edge Function returned a non-2xx status code" – die
// eigentliche Fehlermeldung (z. B. eine verletzte Passwort-Richtlinie) steckt
// im JSON-Body der Response, der separat ausgelesen werden muss.
async function toDetailedError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === 'string') return new Error(body.error)
    } catch {
      // Body war kein JSON – Fallback auf die generische Meldung unten.
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}

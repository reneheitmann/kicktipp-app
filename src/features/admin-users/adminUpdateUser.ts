import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

interface UpdateUserInput {
  userId: string
  name: string
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

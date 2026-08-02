import { FunctionsHttpError } from '@supabase/supabase-js'

// supabase-js wirft bei einer Nicht-2xx-Antwort einer Edge Function nur die
// generische Meldung "Edge Function returned a non-2xx status code" – die
// eigentliche Fehlermeldung steckt im JSON-Body der Response, der separat
// ausgelesen werden muss. Gemeinsam für admin-create-user/admin-update-user/
// admin-delete-user statt dreifach dupliziert.
export async function toDetailedError(error: unknown): Promise<Error> {
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

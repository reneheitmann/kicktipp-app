import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export async function updateOwnName(profileId: string, name: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ name }).eq('id', profileId)
  if (error) throw error
}

// Läuft über eine Edge Function statt direkt supabase.auth.updateUser(), da
// nur dort die Passwort-Richtlinie (Länge/Zeichenarten/Wiederverwendung,
// siehe password_policy) serverseitig durchgesetzt werden kann.
export async function updateOwnPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.functions.invoke('update-own-password', { body: { password: newPassword } })
  if (error) throw await toDetailedError(error)
}

// Ändert die E-Mail-Adresse NICHT direkt, sondern verschickt einen
// Bestätigungslink an die neue Adresse (siehe update-own-email Edge
// Function) – erst confirmEmailChange() übernimmt die Änderung tatsächlich.
export async function requestOwnEmailChange(newEmail: string): Promise<void> {
  const redirectTo = window.location.origin
  const { error } = await supabase.functions.invoke('update-own-email', { body: { email: newEmail, redirectTo } })
  if (error) throw await toDetailedError(error)
}

// Schließt eine per requestOwnEmailChange() angestoßene Änderung anhand des
// Tokens aus dem Bestätigungslink ab. Läuft bewusst ohne Session-Bezug (die
// Function identifiziert den User über das Token, nicht die aktuelle
// Anmeldung), da der Link auch in einem anderen Browser geöffnet werden kann.
export async function confirmEmailChange(token: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('confirm-email-change', { body: { token } })
  if (error) throw await toDetailedError(error)
  return (data as { email: string }).email
}

// supabase-js wirft bei einer Nicht-2xx-Antwort der Edge Function nur die
// generische Meldung "Edge Function returned a non-2xx status code" – die
// eigentliche Fehlermeldung (z. B. "Passwort muss mindestens ... Zeichen ...")
// steckt im JSON-Body der Response, der separat ausgelesen werden muss.
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

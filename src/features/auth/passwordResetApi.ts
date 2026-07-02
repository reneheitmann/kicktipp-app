import { supabase } from '../../lib/supabaseClient'

// Verschickt den Recovery-Link über die Edge Function send-password-reset
// (eigene SMTP-Konfiguration statt Supabase Auths eingebautem Mail-System,
// siehe Kommentar dort) – funktioniert ohne aktive Session (auch für nicht
// angemeldete Besucher auf der Login-Seite) und verrät bewusst nicht, ob die
// E-Mail zu einem Konto gehört (die Function liefert immer denselben
// Erfolgsstatus, kein Enumeration-Leck). Wird sowohl vom Self-Service-Reset
// auf der Login-Seite als auch vom Admin-Bereich (AdminUsersPage,
// CreateUserForm, TipperImportPage) verwendet.
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/login`
  const { error } = await supabase.functions.invoke('send-password-reset', { body: { email, redirectTo } })
  if (error) throw error
}

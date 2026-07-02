import { supabase } from '../../lib/supabaseClient'

// Verschickt den Supabase-Auth-Recovery-Link – funktioniert ohne aktive
// Session (auch für nicht angemeldete Besucher auf der Login-Seite) und
// verrät bewusst nicht, ob die E-Mail zu einem Konto gehört (Supabase gibt
// hier immer Erfolg zurück, kein Enumeration-Leck). Wird sowohl vom
// Self-Service-Reset auf der Login-Seite als auch vom Admin-Bereich
// (AdminUsersPage, CreateUserForm, TipperImportPage) verwendet.
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/login`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

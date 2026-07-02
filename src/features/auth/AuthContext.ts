import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { PermissionKey, Profile } from '../../types/database'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** Rechte der aktuellen Rolle (nicht die Vorschau-Wirkung von viewAsUser – dafür can() verwenden). */
  permissions: Set<PermissionKey>
  /** Rein clientseitiger Vorschau-Modus: simuliert die Rolle "user", ändert profiles.role nie. */
  viewAsUser: boolean
  setViewAsUser: (value: boolean) => void
  /**
   * true, sobald Supabase beim Öffnen eines Passwort-Reset-Links (Self-Service
   * auf der Login-Seite ODER vom Admin ausgelöst) das PASSWORD_RECOVERY-Event
   * feuert. App.tsx zeigt währenddessen unabhängig von Route/restlicher
   * Session ResetPasswordPage statt der normalen App, damit die per Link
   * automatisch entstehende Session nicht einfach direkt einloggt, ohne dass
   * ein neues Passwort gesetzt wurde.
   */
  passwordRecovery: boolean
  clearPasswordRecovery: () => void
  /** Einzige Stelle, die für UI-Gating genutzt werden soll – berücksichtigt viewAsUser automatisch. */
  can: (key: PermissionKey) => boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

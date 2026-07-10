import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { PermissionKey, Profile, UserRole } from '../../types/database'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** Rechte der aktuellen (echten) Rolle – für UI-Gating can() verwenden. */
  permissions: Set<PermissionKey>
  /**
   * Echter Rollenwechsel (ändert profiles.role tatsächlich, keine reine
   * Vorschau) – admin kann in "spielleiter" oder "user" wechseln,
   * spielleiter nur in "user" (serverseitig in switch_to_role() geprüft,
   * siehe Migration 0046). profile.base_role != null zeigt an, dass ein
   * Wechsel aktiv ist (enthält die ursprüngliche Rolle zum Zurückwechseln).
   */
  switchToRole: (role: UserRole) => Promise<{ error: string | null }>
  switchBackToBaseRole: () => Promise<{ error: string | null }>
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
  /**
   * true, sobald AuthProvider die aktuelle Sitzung wegen Überschreitung der
   * admin-konfigurierten Sitzungsdauer (session_policy, Default 8h)
   * zwangsweise beendet hat (siehe src/features/session-policy/). LoginPage
   * zeigt währenddessen einen entsprechenden Hinweis. Bewusst als Context-
   * Flag statt location.state: AuthProvider selbst (nicht eine Route)
   * erkennt den Ablauf, ein State-Flag ist robuster als ein möglicher
   * Wettlauf zwischen einer eigenen Navigation und ProtectedRoutes
   * reaktivem Redirect bei session === null.
   */
  sessionExpired: boolean
  clearSessionExpired: () => void
  /** Einzige Stelle, die für UI-Gating genutzt werden soll. */
  can: (key: PermissionKey) => boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

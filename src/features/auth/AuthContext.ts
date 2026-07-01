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
  /** Einzige Stelle, die für UI-Gating genutzt werden soll – berücksichtigt viewAsUser automatisch. */
  can: (key: PermissionKey) => boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { PermissionKey, Profile, UserRole } from '../../types/database'
import { AuthContext } from './AuthContext'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    console.error('Profil konnte nicht geladen werden', error)
    return null
  }
  return data
}

async function fetchPermissions(role: UserRole): Promise<Set<PermissionKey>> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role', role)
    .eq('granted', true)
  if (error) {
    console.error('Berechtigungen konnten nicht geladen werden', error)
    return new Set()
  }
  return new Set(data.map((row) => row.permission_key))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set())
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      if (data.session) {
        const loadedProfile = await fetchProfile(data.session.user.id)
        setProfile(loadedProfile)
        if (loadedProfile) setPermissions(await fetchPermissions(loadedProfile.role))
      }
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Supabase erkennt den Recovery-Link automatisch (detectSessionInUrl)
      // und würde ohne diese Unterscheidung denselben SIGNED_IN-artigen Ablauf
      // wie ein normaler Login auslösen – die App landet dann direkt im
      // Hauptbereich, ohne dass der User ein neues Passwort gesetzt hat.
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      setSession(newSession)
      if (newSession) {
        // `loading` war nach dem allerersten getSession()-Check (oben) bereits
        // `false` (typischerweise "kein Session" bei frischem Seitenaufruf) –
        // ohne dieses erneute setLoading(true) würden ProtectedRoute/LoginPage
        // in der Lücke zwischen setProfile() und dem noch laufenden
        // fetchPermissions() mit einem frisch gesetzten Profil, aber noch
        // leeren/veralteten permissions rendern (can() liefert dann für jedes
        // Recht fälschlich false) – bei jedem Login sichtbar, sobald eine Route
        // wie "/" selbst über ein Recht (page.dashboard.view) gesteuert wird.
        setLoading(true)
        const loadedProfile = await fetchProfile(newSession.user.id)
        setProfile(loadedProfile)
        setPermissions(loadedProfile ? await fetchPermissions(loadedProfile.role) : new Set())
      } else {
        setProfile(null)
        setPermissions(new Set())
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (session) {
      const loadedProfile = await fetchProfile(session.user.id)
      setProfile(loadedProfile)
      if (loadedProfile) setPermissions(await fetchPermissions(loadedProfile.role))
    }
  }

  async function refreshPermissions() {
    if (profile) {
      setPermissions(await fetchPermissions(profile.role))
    }
  }

  function clearPasswordRecovery() {
    setPasswordRecovery(false)
  }

  function can(key: PermissionKey): boolean {
    return permissions.has(key)
  }

  // Echter Rollenwechsel statt Vorschau: ruft die SECURITY DEFINER-Funktionen
  // aus 0036_real_role_switch.sql auf (die prüfen Berechtigung/Zustand selbst
  // serverseitig), lädt danach Profil+Rechte für die neue, echte Rolle neu –
  // ab da greifen alle RLS-Policies ganz normal, keine Sonderfälle im
  // Frontend nötig.
  async function switchToUserRole(): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('switch_to_user_role')
    if (error) return { error: error.message }
    await refreshProfile()
    return { error: null }
  }

  async function switchBackToBaseRole(): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('switch_back_to_base_role')
    if (error) return { error: error.message }
    await refreshProfile()
    return { error: null }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        permissions,
        switchToUserRole,
        switchBackToBaseRole,
        passwordRecovery,
        clearPasswordRecovery,
        can,
        signIn,
        signOut,
        refreshProfile,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

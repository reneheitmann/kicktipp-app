import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import { getSessionPolicy, registerSession } from '../session-policy/sessionPolicyApi'
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

// Sitzungs-Zeitlimit (siehe src/features/session-policy/): clientseitige
// Hälfte der Durchsetzung, Gegenstück zu current_session_valid() in
// Migration 0043. login_at wird NUR bei einem echten Neu-Login gesetzt
// (SIGNED_IN), nicht bei jedem Reload/Token-Refresh – sonst würde die
// Frist bei jedem Seitenaufruf heimlich verlängert.
const LOGIN_AT_STORAGE_KEY = 'kicktipp_session_login_at'
const DEFAULT_MAX_SESSION_HOURS = 8

function isSessionExpired(maxHours: number): boolean {
  const raw = localStorage.getItem(LOGIN_AT_STORAGE_KEY)
  if (!raw) return false
  const loginAt = Number(raw)
  if (!Number.isFinite(loginAt)) return false
  return Date.now() - loginAt > maxHours * 60 * 60 * 1000
}

async function fetchMaxSessionHours(): Promise<number> {
  try {
    const policy = await getSessionPolicy()
    return policy.max_duration_hours
  } catch (err) {
    console.error('Sitzungsrichtlinie konnte nicht geladen werden', err)
    return DEFAULT_MAX_SESSION_HOURS
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set())
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [maxSessionHours, setMaxSessionHours] = useState(DEFAULT_MAX_SESSION_HOURS)
  const [sessionExpired, setSessionExpired] = useState(false)
  // Verhindert doppeltes Laden von Profil/Rechten/Sitzungsrichtlinie für
  // denselben User: supabase-js ruft den onAuthStateChange-Listener beim
  // Registrieren selbst einmal sofort mit der aktuellen Sitzung auf –
  // zusätzlich zum expliziten getSession()-Aufruf unten – und danach bei
  // jedem stillen Token-Refresh erneut. Ohne diese Sperre lädt die App bei
  // jedem Seitenaufruf (und stündlich beim Refresh) Profil/Rechte/Richtlinie
  // doppelt bzw. unnötig neu (empirisch im Network-Waterfall bestätigt: alle
  // Dashboard-Anfragen liefen zweimal direkt hintereinander).
  const loadedUserIdRef = useRef<string | null>(null)
  // getSession() und der onAuthStateChange-Erstaufruf feuern beide synchron
  // kurz nacheinander, bevor loadedUserIdRef gesetzt werden kann – ein reiner
  // Ref-Vergleich käme daher zu spät (klassisches Race). Der zweite Aufrufer
  // wartet stattdessen auf denselben bereits laufenden Fetch, statt einen
  // eigenen zu starten.
  const loadingPromiseRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    let isMounted = true

    function loadProfileDataIfNeeded(userId: string): Promise<void> {
      if (loadedUserIdRef.current === userId) return Promise.resolve()
      if (loadingPromiseRef.current) return loadingPromiseRef.current

      const promise = (async () => {
        const [loadedProfile, hours] = await Promise.all([fetchProfile(userId), fetchMaxSessionHours()])
        if (!isMounted) return
        setProfile(loadedProfile)
        setMaxSessionHours(hours)
        setPermissions(loadedProfile ? await fetchPermissions(loadedProfile.role) : new Set())
        loadedUserIdRef.current = userId
      })().finally(() => {
        loadingPromiseRef.current = null
      })
      loadingPromiseRef.current = promise
      return promise
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      if (data.session) {
        // Reload einer bestehenden Sitzung: login_at nur setzen, falls noch
        // keiner gespeichert ist (Alt-Sessions von vor diesem Feature) –
        // sonst würde jeder Reload die Frist heimlich verlängern.
        if (!localStorage.getItem(LOGIN_AT_STORAGE_KEY)) {
          localStorage.setItem(LOGIN_AT_STORAGE_KEY, String(Date.now()))
        }
        // Serverseitige Registrierung ist idempotent (on conflict do
        // nothing) – fire-and-forget, darf den Ladevorgang nicht blockieren.
        registerSession().catch((err) => console.error('Sitzung konnte nicht registriert werden', err))
        await loadProfileDataIfNeeded(data.session.user.id)
      }
      if (isMounted) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Supabase erkennt den Recovery-Link automatisch (detectSessionInUrl)
      // und würde ohne diese Unterscheidung denselben SIGNED_IN-artigen Ablauf
      // wie ein normaler Login auslösen – die App landet dann direkt im
      // Hauptbereich, ohne dass der User ein neues Passwort gesetzt hat.
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      if (event === 'SIGNED_IN') {
        // Echter Neu-Login (nicht Token-Refresh/Session-Restore) – Frist
        // startet jetzt neu.
        localStorage.setItem(LOGIN_AT_STORAGE_KEY, String(Date.now()))
        registerSession().catch((err) => console.error('Sitzung konnte nicht registriert werden', err))
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(LOGIN_AT_STORAGE_KEY)
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
        // loadProfileDataIfNeeded() überspringt das erneute Laden selbst,
        // falls es sich (Doppel-Aufruf durch getSession() oben, oder ein
        // Token-Refresh) um denselben User handelt.
        if (loadedUserIdRef.current !== newSession.user.id) setLoading(true)
        await loadProfileDataIfNeeded(newSession.user.id)
      } else {
        setProfile(null)
        setPermissions(new Set())
        loadedUserIdRef.current = null
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // Sitzungs-Zeitlimit: prüft alle 60s sowie bei Tab-Fokus (fängt den Fall
  // "Gerät X Stunden im Hintergrund/zugeklappt" ab, den ein gedrosselter
  // Hintergrund-Timer verpasst) gegen die admin-konfigurierte Dauer. Meldet
  // bewusst nur dieses eine Gerät ab (scope: 'local') – ein Timeout auf
  // Gerät A soll andere Sitzungen desselben Users nicht mit beenden. Die
  // serverseitige Hälfte (current_session_valid() in Migration 0043) greift
  // unabhängig davon, auch falls dieser Check nie liefe.
  useEffect(() => {
    if (!session) return

    async function checkExpiry() {
      if (!isSessionExpired(maxSessionHours)) return
      setSessionExpired(true)
      await supabase.auth.signOut({ scope: 'local' })
    }

    checkExpiry()
    const interval = setInterval(checkExpiry, 60_000)
    document.addEventListener('visibilitychange', checkExpiry)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', checkExpiry)
    }
  }, [session, maxSessionHours])

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

  function clearSessionExpired() {
    setSessionExpired(false)
  }

  function can(key: PermissionKey): boolean {
    return permissions.has(key)
  }

  // Echter Rollenwechsel statt Vorschau: ruft die SECURITY DEFINER-Funktion
  // switch_to_role() aus 0046_switch_to_spielleiter_role.sql auf (prüft
  // Berechtigung/Hierarchie/Zustand selbst serverseitig), lädt danach
  // Profil+Rechte für die neue, echte Rolle neu – ab da greifen alle
  // RLS-Policies ganz normal, keine Sonderfälle im Frontend nötig.
  async function switchToRole(role: UserRole): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('switch_to_role', { p_target_role: role })
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
        switchToRole,
        switchBackToBaseRole,
        passwordRecovery,
        clearPasswordRecovery,
        sessionExpired,
        clearSessionExpired,
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

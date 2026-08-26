import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import { getSessionPolicy, registerSession } from '../session-policy/sessionPolicyApi'
import type { PermissionKey, Profile, UserRole } from '../../types/database'
import { AuthContext } from './AuthContext'
import { fetchPermissionsWithRetry } from './permissionsRetry'

// Wirft bewusst statt still null zurückzugeben – sonst ist ein echter
// Ladefehler (z. B. ein vom Server abgelehntes/abgelaufenes Token) nicht
// von "Profil existiert nicht" unterscheidbar. Beides führte vorher zum
// selben, nie mehr verlassenen "Lade..."-Zustand in ProtectedRoute (die
// dortige `session && !profile`-Bedingung ist als reine Übergangs-, nicht
// als Dauerlage gedacht) – wirft jetzt hierher hoch, siehe
// loadProfileDataIfNeeded() für die Behandlung (lokal abmelden).
async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

async function fetchPermissions(role: UserRole): Promise<Set<PermissionKey>> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role', role)
    .eq('granted', true)
  // Wirft bewusst statt still ein leeres Set zurückzugeben – sonst ist ein
  // echter Ladefehler (z. B. kurze Netzwerkstörung) nicht von "Rolle hat 0
  // Rechte" unterscheidbar, siehe loadProfileDataIfNeeded()/refreshProfile().
  if (error) throw error
  return new Set(data.map((row) => row.permission_key))
}

// Sitzungs-Zeitlimit (siehe src/features/session-policy/): clientseitige
// Hälfte der Durchsetzung, Gegenstück zu current_session_valid() in
// Migration 0043. login_at wird NUR bei einem echten Neu-Login gesetzt
// (SIGNED_IN), nicht bei jedem Reload/Token-Refresh – sonst würde die
// Frist bei jedem Seitenaufruf heimlich verlängert.
const LOGIN_AT_STORAGE_KEY = 'kicktipp_session_login_at'
const DEFAULT_MAX_SESSION_HOURS = 8

// Absicherung gegen einen hängenden Ladevorgang: wenn ein Tab länger im
// Hintergrund eingefroren war (Standby, vom Betriebssystem pausierter Tab)
// und danach wieder aktiv wird, kann der bereits laufende getSession()-Call
// (bzw. der interne navigator.locks-Mutex von supabase-js) nie mehr
// resolven/rejecten – ohne dieses Timeout bliebe `loading` für immer `true`
// und die App hinge dauerhaft auf "Lade...". Ein eingefrorener Tab pausiert
// auch seine Timer, daher feuert dieser bereits laufende setTimeout erst
// kurz nach dem Reaktivieren – kein zusätzlicher pageshow/visibilitychange-
// Listener nötig.
const INIT_SESSION_TIMEOUT_MS = 5_000
const STALL_RELOAD_FLAG = 'kicktipp_auth_stall_reload_attempted'

// supabase-js' signOut() räumt den lokalen Zustand (Session/Storage) erst
// NACH einem awaited Netzwerk-Aufruf gegen /auth/v1/logout auf – auch mit
// scope: 'local' (das bestimmt nur, was serverseitig widerrufen wird, nicht
// ob der Client überhaupt eine Anfrage stellt). Dieser Aufruf hat in
// auth-js selbst kein Timeout. Ohne die Race unten würde ein
// hängendes/unerreichbares Auth-Backend genau die Recovery-Pfade, die die
// App aus einem dauerhaften "Lade..." befreien sollen, selbst dauerhaft
// hängen lassen (beobachtet beim Wechsel auf eine zweite Spielrunde mit
// kurzzeitig gestörter Verbindung). Der lokale State wird deshalb unten an
// jeder Stelle zusätzlich explizit gesetzt, statt sich allein auf das
// SIGNED_OUT-Event von signOut() zu verlassen.
const SIGN_OUT_TIMEOUT_MS = 3_000

// supabase-js meldet einen Recovery-Link-Klick per PASSWORD_RECOVERY-Event
// erst NACH einem awaited Netzwerk-Roundtrip (Token-Validierung gegen
// /auth/v1/user, siehe _getSessionFromURL() in GoTrueClient), zusätzlich per
// setTimeout(…, 0) verzögert – registriert sich unser onAuthStateChange-
// Listener (unten, in useEffect) erst NACH diesem Timeout (z. B. bei
// langsamerem ersten Render, Tab im Hintergrund beim Laden), geht das Event
// unwiederbringlich verloren: der Listener bekommt dann nur noch ein
// normales INITIAL_SESSION mit bereits gültiger Sitzung – die Passwort-
// Pflicht wird stillschweigend umgangen (Race, kein deterministischer Bug,
// daher schwer reproduzierbar). Der Hash/Query-Marker steht dagegen
// GARANTIERT schon beim allerersten React-Render noch in der URL:
// supabase-js entfernt ihn (window.location.hash = '') ebenfalls erst nach
// demselben Netzwerk-Roundtrip, der zwingend länger dauert als der
// synchrone Rest von createClient() bis zum ersten Render. Ein rein
// URL-basierter, synchroner Check kann diesen Race daher grundsätzlich
// nicht verlieren (ersetzt das Event nicht, ergänzt es nur als
// zusätzliche, race-freie Quelle für den initialen State).
function isPasswordRecoveryUrl(): boolean {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  return hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery'
}

function timeout(ms: number): Promise<'timeout'> {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), ms))
}

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
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryUrl)
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

      // loadedUserIdRef wird NUR bei vollständigem Erfolg gesetzt. Jeder
      // Fehler in dieser Kette (Profil-Abruf, Rechte-Abruf nach allen
      // fetchPermissionsWithRetry()-Versuchen) führt zum lokalen Abmelden
      // statt mit unvollständigem/gar keinem Profil weiterzurendern. Sonst
      // bliebe z. B. ein Admin bis zum nächsten Token-Refresh (oft erst
      // nach ~50–60 Minuten) in einem Zustand fest, in dem nur der
      // Adminbereich sichtbar ist und jeder normale Menüpunkt fehlt (bei
      // fehlenden Rechten), oder – bei einem fehlgeschlagenen Profil-Abruf
      // (z. B. ein vom Server abgelehntes Token) – dauerhaft auf "Lade..."
      // (ProtectedRoute's `session && !profile`-Zustand ist als reine
      // Übergangs-, nicht als Dauerlage gedacht, siehe fetchProfile()).
      // Gleiches Muster wie beim Stall-Reload-Fallback unten (zweiter Stall
      // in initSession), bewusst ohne Banner/sessionExpired, weil es kein
      // echtes Zeitlimit ist, sondern ein Ladefehler.
      const promise = (async () => {
        try {
          const [loadedProfile, hours] = await Promise.all([fetchProfile(userId), fetchMaxSessionHours()])
          const loadedPermissions = await fetchPermissionsWithRetry(loadedProfile.role, fetchPermissions)
          if (!isMounted) return
          setProfile(loadedProfile)
          setMaxSessionHours(hours)
          setPermissions(loadedPermissions)
          loadedUserIdRef.current = userId
        } catch (err) {
          console.error('Profil/Rechte konnten nicht geladen werden – melde lokal ab', err)
          if (!isMounted) return
          await Promise.race([supabase.auth.signOut({ scope: 'local' }), timeout(SIGN_OUT_TIMEOUT_MS)]).catch(
            (signOutErr) => console.error('Lokales Abmelden fehlgeschlagen', signOutErr),
          )
          if (!isMounted) return
          setSession(null)
          setProfile(null)
          setPermissions(new Set())
          loadedUserIdRef.current = null
        }
      })().finally(() => {
        loadingPromiseRef.current = null
      })
      loadingPromiseRef.current = promise
      return promise
    }

    async function initSession(): Promise<void> {
      const { data } = await supabase.auth.getSession()
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
    }

    Promise.race([initSession(), timeout(INIT_SESSION_TIMEOUT_MS)])
      .catch((err) => {
        console.error('Session-Ladevorgang fehlgeschlagen', err)
        return 'timeout' as const
      })
      .then(async (result) => {
        if (!isMounted) return
        if (result === 'timeout') {
          console.error(`Session-Ladevorgang hängt oder schlägt fehl (Limit ${INIT_SESSION_TIMEOUT_MS}ms) – versuche Neuladen`)
          if (!sessionStorage.getItem(STALL_RELOAD_FLAG)) {
            sessionStorage.setItem(STALL_RELOAD_FLAG, '1')
            window.location.reload()
            return
          }
          // Zweiter Stall in Folge (Reload hat nicht geholfen, z. B. anhaltende
          // Netzwerkstörung): initSession() kann an jeder Stelle hängen
          // geblieben sein, z. B. nachdem `profile` bereits gesetzt wurde, aber
          // `permissions` noch die leere Ausgangsmenge ist. Einfach nur
          // `setLoading(false)` würde ProtectedRoute mit diesem inkonsistenten
          // Zwischenstand rendern lassen – can() liefert dann für jedes Recht
          // fälschlich false, was auf /unauthorized statt /login führt, obwohl
          // eine gültige Sitzung bestand. Stattdessen lokal abmelden und landet
          // garantiert auf der Login-Seite statt einer falschen
          // Zugriffsverweigerung. signOut() selbst mit Timeout geraced und der
          // lokale State direkt danach zusätzlich explizit geräumt (siehe
          // SIGN_OUT_TIMEOUT_MS oben) – ein hängendes Auth-Backend darf gerade
          // diesen letzten Ausweg nicht ebenfalls blockieren.
          await Promise.race([supabase.auth.signOut({ scope: 'local' }), timeout(SIGN_OUT_TIMEOUT_MS)]).catch((err) =>
            console.error('Lokales Abmelden fehlgeschlagen', err),
          )
          if (isMounted) {
            setSession(null)
            setProfile(null)
            setPermissions(new Set())
            loadedUserIdRef.current = null
          }
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
      // Schlägt z. B. bei kurzzeitig fehlender Verbindung fehl – ohne
      // .catch() bliebe die (technisch abgelaufene) Sitzung dann bestehen,
      // kein SIGNED_OUT-Event feuert. Heilt sich beim nächsten 60s-Tick/
      // visibilitychange von selbst, sobald wieder Netz da ist (gleiches
      // Muster wie die anderen signOut({scope:'local'})-Aufrufe in dieser
      // Datei).
      await supabase.auth.signOut({ scope: 'local' }).catch((err) => console.error('Lokales Abmelden nach Sitzungs-Timeout fehlgeschlagen', err))
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
    if (!session) return
    const loadedProfile = await fetchProfile(session.user.id)
    // Rechte ZUERST laden, erst danach zusammen mit dem Profil committen.
    // Sonst entsteht bei switchToRole()/switchBackToBaseRole() kurzzeitig
    // dieselbe Lücke wie in loadProfileDataIfNeeded oben: neue Rolle im
    // Profil, aber noch alte Rechte im permissions-Set. Wirft
    // fetchPermissionsWithRetry() endgültig, bleiben profile/permissions
    // unverändert beim alten, in sich konsistenten Stand – switchToRole()
    // gibt den Fehler wie bisher an den Aufrufer zurück (kein erzwungenes
    // Abmelden hier: das ist eine gezielte User-Aktion mit Fehlermeldung,
    // kein Hintergrund-Ladevorgang wie oben).
    const loadedPermissions = await fetchPermissionsWithRetry(loadedProfile.role, fetchPermissions)
    setProfile(loadedProfile)
    setPermissions(loadedPermissions)
  }

  async function refreshPermissions() {
    if (profile) {
      setPermissions(await fetchPermissionsWithRetry(profile.role, fetchPermissions))
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
    try {
      await refreshProfile()
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Rolle gewechselt, aber Rechte konnten nicht geladen werden.' }
    }
    return { error: null }
  }

  async function switchBackToBaseRole(): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('switch_back_to_base_role')
    if (error) return { error: error.message }
    try {
      await refreshProfile()
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Rolle gewechselt, aber Rechte konnten nicht geladen werden.' }
    }
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

import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase, type Client } from '../lib/supabaseClient'
import { secureStorage } from '../lib/secureStorage'

// secureStorage statt sessionStorage: das Token muss auch nach einem
// vollständigen App-Neustart (nicht nur einem Reload) noch bekannt sein, um
// es beim Abmelden/Instanz-Entfernen wieder löschen zu können – sessionStorage
// überlebt das nicht zuverlässig. Kein Geheimnis (nur eine Geräte-Kennung),
// dieselbe Ablage wird hier nur der Einfachheit halber mitgenutzt.
const LAST_TOKEN_STORAGE_KEY = 'kicktipp_mobile_last_push_token'

/** Aktueller Berechtigungsstatus, ohne den System-Dialog auszulösen – für die Entscheidung, ob die Erklärung noch gezeigt werden muss. */
export async function getPushPermissionState(): Promise<'granted' | 'denied' | 'prompt'> {
  const { receive } = await FirebaseMessaging.checkPermissions()
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'prompt'
}

/**
 * "Aktiv" heißt hier: für dieses Gerät ist aktuell ein Token hinterlegt
 * (siehe LAST_TOKEN_STORAGE_KEY) – dieselbe Ablage, die
 * requestPushPermissionAndRegister() setzt und removeCurrentDevicePushToken()
 * löscht, daher ohne zusätzliche eigene Datenhaltung als
 * Ein/Aus-Zustand für die Konto-Seite nutzbar (siehe MyAccountPage.tsx).
 */
export async function isPushEnabled(): Promise<boolean> {
  return !!(await secureStorage.getItem(LAST_TOKEN_STORAGE_KEY))
}

/**
 * Fragt nur die native Berechtigung an (löst den System-Dialog aus), OHNE
 * auf die anschließende Geräte-Registrierung zu warten. Getrennt von
 * registerPushDevice(), weil getToken() (siehe dort) mehrere Sekunden bis
 * ~20s dauern kann (beobachtet) – ein Erklärungsdialog, der darauf
 * wartet, bevor er sich schließt, fühlt sich dadurch spürbar hängend an,
 * obwohl technisch alles normal läuft (siehe MobilePushIntegration.tsx:
 * schließt sich direkt nach dieser Antwort, registerPushDevice() läuft
 * im Hintergrund weiter).
 */
export async function requestPushPermission(): Promise<boolean> {
  const { receive } = await FirebaseMessaging.requestPermissions()
  return receive === 'granted'
}

// Läuft der Hintergrund-Aufruf aus MobilePushIntegration.tsx (Dialog
// schließt sofort, siehe requestPushPermission()) noch, während z. B.
// MyAccountPage.tsx' Ein/Aus-Schalter ebenfalls registerPushDevice()
// aufruft (weil der zwischenzeitliche isPushEnabled()-Check den
// Hintergrund-Aufruf noch nicht sehen konnte - der ist ja bis zu ~20s
// unterwegs), würden ohne diese Dedupe zwei parallele getToken()-Aufrufe
// laufen: funktional unschädlich (derselbe Token, doppelter Insert wird
// eh abgefangen), aber wirkt dann, als würde der Schalter gar nicht
// reagieren. Beide Aufrufer warten stattdessen auf denselben bereits
// laufenden Versuch (gleiches Muster wie loadingPromiseRef in
// AuthProvider.tsx).
let pendingRegistration: Promise<boolean> | null = null

/**
 * Holt den FCM-Registrierungstoken (getToken() tauscht auf iOS intern den
 * rohen APNs-Gerätetoken gegen einen echten FCM-Token - der frühere,
 * direkte APNs-Token aus @capacitor/push-notifications wurde von FCMs
 * messages:send-API als "not a valid FCM registration token" abgelehnt,
 * siehe Commit-Historie) und speichert ihn. Setzt bereits erteilte
 * Berechtigung voraus (siehe requestPushPermission()).
 */
export async function registerPushDevice(profileId: string): Promise<boolean> {
  if (pendingRegistration) return pendingRegistration
  const promise = registerPushDeviceUncached(profileId).finally(() => {
    pendingRegistration = null
  })
  pendingRegistration = promise
  return promise
}

async function registerPushDeviceUncached(profileId: string): Promise<boolean> {
  try {
    const { token } = await FirebaseMessaging.getToken()
    const { error } = await supabase.from('push_tokens').insert({
      profile_id: profileId,
      platform: /android/i.test(navigator.userAgent) ? 'android' : 'ios',
      token,
    })
    // 23505 = unique_violation – derselbe Token ist schon registriert, kein
    // echter Fehler. Jeder andere Fehler (RLS, Netzwerk, falsches Schema, ...)
    // wurde bisher komplett ignoriert (die Insert-Antwort wurde gar nicht
    // ausgewertet) – dadurch zeigte isPushEnabled() "an", obwohl serverseitig
    // nie eine Zeile ankam (beobachtet: Schalter an, push_tokens leer).
    if (error && error.code !== '23505') {
      console.error('Push-Token konnte nicht gespeichert werden', error)
      return false
    }
    await secureStorage.setItem(LAST_TOKEN_STORAGE_KEY, token)
    return true
  } catch (err) {
    console.error('Push-Registrierung fehlgeschlagen', err)
    return false
  }
}

/**
 * Fragt die native Berechtigung an und registriert das Gerät bei Erfolg -
 * für Aufrufer, die das (langsamere) Endergebnis wirklich brauchen, z. B.
 * den Ein/Aus-Schalter in MyAccountPage.tsx (der Toggle-Zustand muss den
 * tatsächlichen Registrierungserfolg widerspiegeln). Der einmalige
 * Erklärungsdialog (MobilePushIntegration.tsx) nutzt stattdessen
 * requestPushPermission() + registerPushDevice() getrennt, siehe dort.
 */
export async function requestPushPermissionAndRegister(profileId: string): Promise<boolean> {
  const granted = await requestPushPermission()
  if (!granted) return false
  return registerPushDevice(profileId)
}

/**
 * Entfernt das zuletzt registrierte Token dieses Geräts aus push_tokens –
 * über einen explizit übergebenen Client, damit das auch für eine gerade
 * NICHT aktive Instanz funktioniert (siehe instanceStore.ts: removeInstance()
 * baut dafür einen kurzlebigen Client mit derselben gespeicherten Session).
 */
export async function removeCurrentDevicePushTokenVia(client: Client): Promise<void> {
  const token = await secureStorage.getItem(LAST_TOKEN_STORAGE_KEY)
  if (!token) return
  await client.from('push_tokens').delete().eq('token', token)
}

/** Entfernt das zuletzt registrierte Token dieses Geräts bei der aktuell aktiven Instanz (Abmelden). */
export async function removeCurrentDevicePushToken(): Promise<void> {
  await removeCurrentDevicePushTokenVia(supabase)
  await secureStorage.removeItem(LAST_TOKEN_STORAGE_KEY)
  // deleteToken() macht das FCM-Token auch nativ ungültig - ohne das würde
  // Firebase es bei einer erneuten Aktivierung ggf. unverändert
  // zurückgeben, obwohl der DB-Eintrag schon gelöscht wurde.
  await FirebaseMessaging.deleteToken().catch(() => {
    // Best effort - fehlt z. B. die Berechtigung noch, ist ohnehin kein
    // Token registriert, das gelöscht werden müsste.
  })
}

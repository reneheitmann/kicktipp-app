import { PushNotifications, type Token } from '@capacitor/push-notifications'
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
  const { receive } = await PushNotifications.checkPermissions()
  if (receive === 'granted') return 'granted'
  if (receive === 'denied') return 'denied'
  return 'prompt'
}

/**
 * Fragt die native Berechtigung an und registriert das Gerät bei Erfolg.
 * Wird erst NACH einer In-App-Erklärung aufgerufen (siehe
 * MobilePushIntegration.tsx) – nie blind beim ersten Start, siehe
 * docs/mobile-app.md.
 */
export async function requestPushPermissionAndRegister(profileId: string): Promise<boolean> {
  const { receive } = await PushNotifications.requestPermissions()
  if (receive !== 'granted') return false

  await PushNotifications.register()

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await supabase.from('push_tokens').insert({
          profile_id: profileId,
          platform: /android/i.test(navigator.userAgent) ? 'android' : 'ios',
          token: token.value,
        })
      } catch {
        // z. B. Token bereits registriert (unique-Constraint) – kein Grund,
        // die Registrierung als Fehler zu behandeln.
      }
      await secureStorage.setItem(LAST_TOKEN_STORAGE_KEY, token.value)
      resolve(true)
    })
    PushNotifications.addListener('registrationError', () => resolve(false))
  })
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
}

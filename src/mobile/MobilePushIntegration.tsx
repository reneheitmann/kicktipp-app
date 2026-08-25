import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PushNotifications, type ActionPerformed } from '@capacitor/push-notifications'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/useAuth'
import { useMobileInstance } from './MobileInstanceContext'
import { getPushPermissionState, registerPushDevice, removeCurrentDevicePushToken, requestPushPermission } from './push'

/**
 * mobile only, innerhalb von AuthProvider gerendert (siehe MobileApp.tsx):
 * zeigt einmal pro Login eine kurze Erklärung, bevor der native
 * Berechtigungs-Dialog kommt (bessere Annahmequote, aber vor allem: der
 * Nutzer soll verstehen, wofür – siehe docs/mobile-app.md), und navigiert
 * beim Tippen auf eine Push-Benachrichtigung zur passenden Stelle.
 */
export function MobilePushIntegration() {
  const { session, profile } = useAuth()
  const mobileInstance = useMobileInstance()
  const navigate = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!profile) return
    getPushPermissionState().then((state) => {
      if (state === 'prompt') setShowPrompt(true)
    })
  }, [profile])

  // Push-Token dieser Instanz entfernen, wenn sich die Sitzung von
  // vorhanden auf null ändert (echtes Abmelden) – nicht schon beim
  // allerersten Render ohne Sitzung (kein Übergang, kein Abmelden).
  const hadSession = useRef(false)
  useEffect(() => {
    if (session) {
      hadSession.current = true
      return
    }
    if (hadSession.current) {
      hadSession.current = false
      removeCurrentDevicePushToken()
    }
  }, [session])

  useEffect(() => {
    const listener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const data = action.notification.data as Record<string, string> | undefined
      if (!data) return
      // Push kam aus einer anderen als der aktuell aktiven Instanz (Gerät
      // kennt mehrere) – Navigieren macht dann keinen Sinn, ohne erst dorthin
      // zu wechseln. Für den Machbarkeitsnachweis reicht die Instanz-Wahl
      // zurück (kein automatischer Wechsel), damit nichts in der falschen
      // Instanz landet.
      if (mobileInstance && data.supabase_url && data.supabase_url !== mobileInstance.activeInstance.supabaseUrl) {
        mobileInstance.switchInstance()
        return
      }
      if (data.type === 'contact_message') {
        navigate('/kontakt')
      } else if (data.type === 'matchday_payout' && data.season_id) {
        navigate(`/seasons/${data.season_id}`)
      }
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [navigate, mobileInstance])

  if (!showPrompt || !profile) return null

  async function handleEnable() {
    setRequesting(true)
    const granted = await requestPushPermission()
    setRequesting(false)
    setShowPrompt(false)
    // Geräte-Registrierung (APNs-Roundtrip, bis zu ~20s) bewusst nicht
    // abgewartet, siehe push.ts requestPushPermission() - der Dialog hat
    // seinen Zweck erfüllt, sobald die Berechtigung erteilt/verweigert ist.
    if (granted) registerPushDevice(profile!.id)
  }

  return (
    <Modal title="Benachrichtigungen aktivieren?" onClose={() => setShowPrompt(false)}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Aktiviere Benachrichtigungen, um informiert zu werden, wenn eine neue Kontaktnachricht eingeht oder deine
          Gewinnberechnung für einen Spieltag abgeschlossen ist. Du kannst das jederzeit in den
          Geräte-Einstellungen wieder ändern.
        </p>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowPrompt(false)}>
            Später
          </Button>
          <Button type="button" className="flex-1" disabled={requesting} onClick={handleEnable}>
            {requesting ? 'Aktiviere...' : 'Aktivieren'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

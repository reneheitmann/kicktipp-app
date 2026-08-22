import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { AppBrandingProvider } from '../features/app-settings/AppBrandingProvider'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AppRoutes } from '../App'
import { InstancePickerPage } from './InstancePickerPage'
import { MobileInstanceContext } from './MobileInstanceContext'
import { activateInstance, deactivateInstance, getActiveInstanceId, type SavedInstance } from '../lib/instanceStore'

/** Koppelt die Android-Hardware-/Gesten-Zurück-Taste an die React-Router-
 *  Historie, statt dass sie die App unerwartet schließt (kein Effekt auf
 *  iOS/Web – das Event feuert dort nie). */
function AndroidBackButtonHandler() {
  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        CapacitorApp.exitApp()
      }
    })
    return () => {
      listenerPromise.then((listener) => listener.remove())
    }
  }, [])
  return null
}

/**
 * mobile only: Wurzelkomponente für den mobile-Kanal (siehe App.tsx) –
 * entscheidet zwischen Instanz-Wähler (keine aktive Instanz) und der
 * normalen App (AppRoutes, identisch zur Web-Version) für die aktive
 * Instanz. `key={activeInstance.id}` erzwingt bei einem Instanz-Wechsel
 * einen vollständigen Remount von AuthProvider & Co. – sonst würde die
 * bestehende onAuthStateChange-Subscription (siehe AuthProvider.tsx) noch
 * am ALTEN Supabase-Client hängen, statt neu gegen den der neuen Instanz
 * aufgebaut zu werden.
 */
export function MobileApp() {
  const [activeInstance, setActiveInstance] = useState<SavedInstance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restore() {
      const activeId = await getActiveInstanceId()
      if (activeId) {
        setActiveInstance(await activateInstance(activeId))
      }
      setLoading(false)
    }
    restore()
  }, [])

  function switchInstance() {
    deactivateInstance()
    setActiveInstance(null)
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  if (!activeInstance) {
    return <InstancePickerPage onConnected={setActiveInstance} />
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL} key={activeInstance.id}>
      <AndroidBackButtonHandler />
      <MobileInstanceContext.Provider value={{ activeInstance, switchInstance }}>
        <AppBrandingProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </AppBrandingProvider>
      </MobileInstanceContext.Provider>
    </BrowserRouter>
  )
}

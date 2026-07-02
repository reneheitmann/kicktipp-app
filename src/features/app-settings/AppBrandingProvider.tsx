import { useEffect, useState, type ReactNode } from 'react'
import { getAppSettings } from './appSettingsApi'
import { AppBrandingContext } from './AppBrandingContext'
import type { AppSettings } from '../../types/database'

const DEFAULT_APP_NAME = 'Kicktipp Spielrunde'
const DEFAULT_PRIMARY_COLOR = '#0f172a'

/** Verdunkelt eine Hex-Farbe leicht für den Hover-Zustand, damit der Admin nur eine Farbe wählen muss. */
function darkenHexColor(hex: string, amount = 0.12): string {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const factor = 1 - amount
  const toHex = (channel: number) =>
    Math.round(Math.max(0, Math.min(255, channel * factor)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function applyBranding(settings: Pick<AppSettings, 'app_name' | 'icon_url' | 'primary_color'>) {
  document.title = settings.app_name

  const iconHref = settings.icon_url ?? '/icon.png'
  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((el) => {
    el.setAttribute('href', iconHref)
  })

  document.documentElement.style.setProperty('--color-primary', settings.primary_color)
  document.documentElement.style.setProperty('--color-primary-hover', darkenHexColor(settings.primary_color))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.primary_color)
}

/**
 * Stellt das zur Laufzeit konfigurierbare App-Branding bereit (siehe
 * src/features/app-settings/AppSettingsPage.tsx) und wendet es global an
 * (Titel, Favicon, Primärfarbe). Bewusst außerhalb/vor AuthProvider
 * eingehängt, damit auch die Login-Seite vor der Anmeldung bereits das
 * konfigurierte Branding zeigt.
 */
export function AppBrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const data = await getAppSettings()
      setSettings(data)
      applyBranding(data)
    } catch (err) {
      console.error('App-Einstellungen konnten nicht geladen werden', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppBrandingContext.Provider
      value={{
        appName: settings?.app_name ?? DEFAULT_APP_NAME,
        iconUrl: settings?.icon_url ?? null,
        primaryColor: settings?.primary_color ?? DEFAULT_PRIMARY_COLOR,
        loading,
        refresh: load,
      }}
    >
      {children}
    </AppBrandingContext.Provider>
  )
}

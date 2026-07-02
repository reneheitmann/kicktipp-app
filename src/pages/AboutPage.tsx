import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { useAppBranding } from '../features/app-settings/useAppBranding'

const buildDateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatBuildDate(value: string | undefined): string {
  if (!value) return 'lokal'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return buildDateFormatter.format(date)
}

interface DeviceInfo {
  userAgent: string
  platform: string
  language: string
  timeZone: string
  viewport: string
  screenSize: string
  online: boolean
}

// Einmalig beim Öffnen der Seite ermittelt (kein Live-Tracking nötig) – dient
// als Momentaufnahme, die sich z. B. per Kopieren-Button in eine
// Support-Nachricht einfügen lässt, ohne dass der User selbst Browser-Details
// heraussuchen muss.
function getDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'unbekannt',
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    screenSize: `${window.screen.width} × ${window.screen.height}`,
    online: navigator.onLine,
  }
}

export function AboutPage() {
  const { appName, iconUrl } = useAppBranding()
  const commitSha = import.meta.env.VITE_APP_COMMIT_SHA
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE
  const [device] = useState(getDeviceInfo)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = [
      `${appName} – Diagnose-Info`,
      `Version: ${__APP_VERSION__}`,
      `Build: ${commitSha || 'lokal'} (${formatBuildDate(buildDate)})`,
      `Browser: ${device.userAgent}`,
      `Plattform: ${device.platform}`,
      `Sprache: ${device.language}`,
      `Zeitzone: ${device.timeZone}`,
      `Fenstergröße: ${device.viewport}`,
      `Bildschirmauflösung: ${device.screenSize}`,
      `Online: ${device.online ? 'ja' : 'nein'}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard-API kann in unsicheren Kontexten (kein HTTPS) fehlen –
      // dann bleibt der Button einfach wirkungslos, kein Absturz.
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Über {appName}</h1>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <img src={iconUrl ?? '/icon.png'} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div>
          <p className="text-base font-semibold text-slate-900">{appName}</p>
          <p className="text-sm text-slate-500">Companion-App für die private Kicktipp-Spielrunde.</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Version</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Version</dt>
            <dd className="font-medium text-slate-900">{__APP_VERSION__}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Build</dt>
            <dd className="font-mono text-xs text-slate-700">{commitSha || 'lokal'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Build-Zeitpunkt</dt>
            <dd className="text-slate-700">{formatBuildDate(buildDate)}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Gerät & Browser</h2>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? 'Kopiert!' : 'Für Support kopieren'}
          </Button>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">Browser (User-Agent)</dt>
            <dd className="break-all text-xs text-slate-700">{device.userAgent}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Plattform</dt>
            <dd className="text-slate-700">{device.platform}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Sprache</dt>
            <dd className="text-slate-700">{device.language}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Zeitzone</dt>
            <dd className="text-slate-700">{device.timeZone}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Fenstergröße</dt>
            <dd className="text-slate-700">{device.viewport}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Bildschirmauflösung</dt>
            <dd className="text-slate-700">{device.screenSize}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Online</dt>
            <dd className="text-slate-700">{device.online ? 'Ja' : 'Nein'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Technik</h2>
        <p className="text-sm text-slate-500">
          Frontend mit React, TypeScript und Tailwind CSS, Datenhaltung über Supabase (Postgres, Auth, Storage,
          Edge Functions). Selbst gehostet als Docker-Container.
        </p>
      </div>
    </div>
  )
}

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

export function AboutPage() {
  const { appName, iconUrl } = useAppBranding()
  const commitSha = import.meta.env.VITE_APP_COMMIT_SHA
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE

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

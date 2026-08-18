import { useAppBranding } from '../features/app-settings/useAppBranding'

export function HelpPage() {
  const { appName } = useAppBranding()

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Hilfe</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Was ist {appName}?</h2>
        <p className="text-sm text-slate-500">
          {appName} ist das Begleit-Tool zu einer privaten Kicktipp.de-Spielrunde. Getippt wird weiterhin ganz normal
          auf kicktipp.de – diese App bildet nur die Verwaltung drumherum ab: Einsätze, Guthaben, Gewinnverteilung
          sowie Saison- und Spieltagsauswertungen.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Wie komme ich zur Kicktipp-Runde?</h2>
        <p className="mb-3 text-sm text-slate-500">
          Getippt wird direkt auf kicktipp.de, nicht in dieser App. Mit einem kostenlosen kicktipp.de-Konto (oder nach
          dem Einloggen, falls schon vorhanden) einfach dem Link unten folgen und der Gruppe beitreten.
        </p>
        <a
          href="https://www.kicktipp.de/magicprus/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-slate-900 underline"
        >
          Zur Kicktipp-Runde auf kicktipp.de ↗
        </a>
      </div>
    </div>
  )
}

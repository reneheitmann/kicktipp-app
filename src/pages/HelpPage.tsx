import { useAppBranding } from '../features/app-settings/useAppBranding'
import { useAuth } from '../features/auth/useAuth'
import { groupNavItems, visibleNavItems } from '../components/layout/navItems'
import { useMobileInstance } from '../mobile/MobileInstanceContext'

// Ein Satz pro navItems.ts-Eintrag ohne adminGroup (siehe groupNavItems()) –
// welche davon tatsächlich sichtbar sind, hängt von der Rolle/den Rechten
// des Betrachters ab (visibleNavItems()), daher hier keine feste Liste,
// sondern nur Text zu den möglichen Einträgen.
const pageDescriptions: Record<string, string> = {
  '/': 'Startseite mit deinem eigenen Kontostand (falls dein Login mit einem Spieler verknüpft ist) und allen aktiven Saisons.',
  '/seasons': 'Alle Saisons mit Spieltagen, Einsätzen und der Gesamtwertung.',
  '/vergleich': 'Vergleicht Guthaben-Verläufe mehrerer Saisons als Diagramm.',
  '/kicktipp': 'Zeigt die Kicktipp-Gruppenseite direkt eingebettet, ohne extra Tab.',
  '/players': 'Übersicht aller Spieler mit ihren Kicktipp-Namen.',
  '/konten': 'Kontenübersicht mit Guthaben und Transaktionen aller Spieler.',
  '/import': 'Ergebnis- und Teilnehmerlisten aus Kicktipp.de importieren.',
  '/emails/senden': 'Nachrichten an Spieler verschicken.',
}

// Immer erreichbar für jeden eingeloggten User (siehe App.tsx), aber nicht
// Teil von navItems.ts/der Haupt-Navigation – deshalb hier statisch gelistet.
const staticPages: { to: string; label: string; description: string }[] = [
  { to: '/profil', label: 'Mein Profil', description: 'Eigenen Namen, Passwort und E-Mail-Adresse ändern.' },
  { to: '/kontakt', label: 'Kontakt', description: 'Nachricht an den Spielleiter senden.' },
  { to: '/ueber', label: 'Über diese App', description: 'Versionsinfo und Diagnosedaten für den Support.' },
]

export function HelpPage() {
  const { appName } = useAppBranding()
  const { profile, can } = useAuth()
  const { main } = groupNavItems(visibleNavItems(profile?.role, can))
  const mobileInstance = useMobileInstance()

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

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Was kann ich hier tun?</h2>
        <ul className="divide-y divide-slate-200">
          {main.map((item) => (
            <li key={item.to} className="py-2 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-500">{pageDescriptions[item.to]}</p>
            </li>
          ))}
          {staticPages.map((page) => (
            <li key={page.to} className="py-2 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-slate-900">{page.label}</p>
              <p className="text-sm text-slate-500">{page.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {mobileInstance && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Spielt ihr in mehreren Runden?</h2>
          <p className="text-sm text-slate-500">
            Spielst du in mehreren privaten Spielrunden mit eigener App-Adresse, kannst du sie alle auf diesem Gerät
            speichern. Zum Wechseln oben im Header (bzw. auf dem Anmeldebildschirm) einfach auf den App-Namen tippen.
          </p>
        </div>
      )}

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

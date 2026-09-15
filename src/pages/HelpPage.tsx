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

const APP_STORE_URL = 'https://apps.apple.com/de/app/kicktipp-spielrundenverwaltung/id6804452098'
const PLAY_STORE_TESTING_URL = 'https://play.google.com/apps/testing/de.magicprus.kicktipp'

// Inline-Nachbau des offiziellen Apple "Download on the App Store"-Badges
// (schwarz, Original-Seitenverhältnis) - kein Bild-Asset/Lizenz nötig,
// entspricht Apples Marketing-Richtlinien für Entwickler-Links.
function AppStoreBadge() {
  return (
    <svg viewBox="0 0 120 40" width="120" height="40" role="img" aria-hidden="true">
      <rect width="120" height="40" rx="6" fill="#000" />
      <path
        fill="#fff"
        d="M24.77 20.3c-.02-2.16 1.77-3.2 1.85-3.25-1.01-1.47-2.58-1.68-3.14-1.7-1.32-.14-2.6.79-3.27.79-.68 0-1.72-.77-2.84-.75-1.44.02-2.78.85-3.52 2.14-1.52 2.63-.39 6.51 1.08 8.64.73 1.04 1.58 2.2 2.71 2.16 1.09-.04 1.5-.7 2.82-.7 1.31 0 1.69.7 2.84.68 1.18-.02 1.92-1.05 2.63-2.1.83-1.2 1.17-2.37 1.19-2.43-.03-.01-2.28-.87-2.3-3.48Zm-2.16-6.4c.59-.72.99-1.71.88-2.7-.85.03-1.9.57-2.51 1.27-.55.63-1.03 1.65-.9 2.61.94.07 1.9-.48 2.53-1.18Z"
      />
      <text x="34" y="16.5" fill="#fff" fontFamily="-apple-system, sans-serif" fontSize="8.5">
        Download on the
      </text>
      <text x="34" y="28" fill="#fff" fontFamily="-apple-system, sans-serif" fontSize="14" fontWeight="600">
        App Store
      </text>
    </svg>
  )
}

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

      {!mobileInstance && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">App installieren</h2>
          <p className="mb-4 text-sm text-slate-500">
            Statt im Browser gibt es {appName} auch als App für dein Handy.
          </p>

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-900">iOS (iPhone/iPad)</p>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Im App Store laden">
              <AppStoreBadge />
            </a>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-900">Android</p>
            <p className="mb-2 text-sm text-slate-500">
              Die Android-App ist aktuell im geschlossenen Test bei Google. Über den Link unten als Tester beitreten
              und die App danach ganz normal über den Play Store installieren.
            </p>
            <a
              href={PLAY_STORE_TESTING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Als Android-Tester beitreten ↗
            </a>
          </div>
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

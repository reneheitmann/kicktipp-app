import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AppBrandingProvider } from './features/app-settings/AppBrandingProvider'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { ConfirmEmailChangePage } from './features/auth/ConfirmEmailChangePage'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { AboutPage } from './pages/AboutPage'
import { HelpPage } from './pages/HelpPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { DatenschutzPage } from './pages/DatenschutzPage'
import { ImpressumPage } from './pages/ImpressumPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlayerDetailPage } from './features/players/PlayerDetailPage'
import { SeasonsPage } from './features/seasons/SeasonsPage'
import { SeasonDetailPage } from './features/seasons/SeasonDetailPage'
import { MyAccountPage } from './features/auth/MyAccountPage'
import { ContactPage } from './features/contact/ContactPage'
import { KicktippWidgetPage } from './features/kicktipp-widget/KicktippWidgetPage'

// Siehe Kommentar in App() unten: lazy statt statisch, damit @capacitor/*
// nachweislich aus main/beta-Bundles draußen bleibt.
const LazyMobileApp = lazy(() => import('./mobile/MobileApp').then((m) => ({ default: m.MobileApp })))

// Lazy geladen: Admin-/Import-/E-Mail-/Konten-Verwaltungsseiten sind
// rollenbeschränkt und werden von den meisten Logins nie geöffnet – jeder
// Login soll trotzdem nicht deren Code mitladen müssen (relevant für mobile
// Ladezeiten, siehe PRODUCT.md "Mobile gleichwertig").
const PlayersPage = lazy(() => import('./features/players/PlayersPage').then((m) => ({ default: m.PlayersPage })))
const AccountsOverviewPage = lazy(() =>
  import('./features/players/AccountsOverviewPage').then((m) => ({ default: m.AccountsOverviewPage })),
)
const AdminUsersPage = lazy(() =>
  import('./features/admin-users/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const EmailSettingsPage = lazy(() =>
  import('./features/email-settings/EmailSettingsPage').then((m) => ({ default: m.EmailSettingsPage })),
)
const RolesPermissionsPage = lazy(() =>
  import('./features/permissions/RolesPermissionsPage').then((m) => ({ default: m.RolesPermissionsPage })),
)
const AppSettingsPage = lazy(() =>
  import('./features/app-settings/AppSettingsPage').then((m) => ({ default: m.AppSettingsPage })),
)
const LogsPage = lazy(() => import('./features/logs/LogsPage').then((m) => ({ default: m.LogsPage })))
const PasswordPolicyPage = lazy(() =>
  import('./features/password-policy/PasswordPolicyPage').then((m) => ({ default: m.PasswordPolicyPage })),
)
const SessionPolicyPage = lazy(() =>
  import('./features/session-policy/SessionPolicyPage').then((m) => ({ default: m.SessionPolicyPage })),
)
const NavSettingsPage = lazy(() =>
  import('./features/nav-settings/NavSettingsPage').then((m) => ({ default: m.NavSettingsPage })),
)
const LegalSettingsPage = lazy(() =>
  import('./features/legal-settings/LegalSettingsPage').then((m) => ({ default: m.LegalSettingsPage })),
)
const SeasonRankingPage = lazy(() =>
  import('./features/seasons/SeasonRankingPage').then((m) => ({ default: m.SeasonRankingPage })),
)
const MatchdayDetailPage = lazy(() =>
  import('./features/seasons/MatchdayDetailPage').then((m) => ({ default: m.MatchdayDetailPage })),
)
const ImportPage = lazy(() => import('./features/kicktipp-import/ImportPage').then((m) => ({ default: m.ImportPage })))
const TipperImportPage = lazy(() =>
  import('./features/kicktipp-import/TipperImportPage').then((m) => ({ default: m.TipperImportPage })),
)
const SendEmailPage = lazy(() => import('./features/emails/SendEmailPage').then((m) => ({ default: m.SendEmailPage })))
const EmailTemplatesPage = lazy(() =>
  import('./features/emails/EmailTemplatesPage').then((m) => ({ default: m.EmailTemplatesPage })),
)

// Lazy geladen, da recharts (Diagramme) allein mehrere hundert KB wiegt und nur
// auf diesen beiden Seiten gebraucht wird – relevant für mobile Ladezeiten.
const SeasonBalancesPage = lazy(() =>
  import('./features/balances/SeasonBalancesPage').then((m) => ({ default: m.SeasonBalancesPage })),
)
const SeasonComparisonPage = lazy(() =>
  import('./features/balances/SeasonComparisonPage').then((m) => ({ default: m.SeasonComparisonPage })),
)

function PageLoading() {
  return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
}

// Für Seiten, die sowohl ohne Login (Impressumspflicht) als auch normal
// innerhalb der App erreichbar sein müssen (Datenschutz/Impressum): mit
// Session die normale AppShell (Navigation, Zurück-Möglichkeit) außenrum,
// ohne Session die schlichte Standalone-Darstellung wie LoginPage. Ohne
// diesen Wrapper landete man beim Aufruf im angemeldeten Zustand in einer
// Sackgasse ohne jede Navigation.
function PublicOrAppShell() {
  const { session, loading } = useAuth()
  if (loading) return <PageLoading />
  if (session) return <AppShell />
  // Ohne Session (z. B. Datenschutz/Impressum vor dem Login) fehlt die
  // AppShell komplett, die sonst Notch/Dynamic-Island bzw. Home-Indicator
  // abfängt (siehe AppShell.tsx) – ohne dieses Padding rutscht der
  // Seiteninhalt auf Geräten mit Notch/Gestennavigation direkt unter die
  // Statusleiste bzw. hinter die Home-Indicator-Linie. env(safe-area-inset-*)
  // ist auf Geräten/Browsern ohne Notch (inkl. Desktop) 0 – unkritisch, hier
  // immer zu setzen.
  return (
    <div
      className="min-h-full"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <Outlet />
    </div>
  )
}

// Eigene Komponente (statt direkt in App()), damit useAuth() innerhalb von
// AuthProvider aufgerufen werden kann – passwordRecovery muss unabhängig von
// Route/restlicher Session die normale App überdecken können, siehe
// AuthContext.ts.
// Exportiert, damit MobileApp.tsx (mobile-Kanal, siehe src/mobile/) dieselbe
// Routen-Definition innerhalb ihrer eigenen Provider-Verschachtelung
// wiederverwenden kann (Instanz-Kontext, Instanz-Wähler statt fixer
// Web-Struktur) – Web-Builds nutzen weiterhin ausschließlich den Default-
// Export unten, unverändert.
export function AppRoutes() {
  const { passwordRecovery, profile, loading, can } = useAuth()

  if (passwordRecovery) {
    return <ResetPasswordPage />
  }

  // Läuft dieses Bundle als Beta-Build (siehe vite.config.ts, ausgeliefert
  // unter /beta/ desselben Containers, siehe nginx.conf.template) – ohne
  // beta.access-Recht landet man zurück auf der Produktivversion, statt die
  // Beta-UI überhaupt zu sehen. Erst nach dem Laden des Profils prüfbar
  // (siehe ProtectedRoute.tsx für dasselbe Ladezustands-Muster).
  if (import.meta.env.VITE_APP_CHANNEL === 'beta' && !loading && profile && !can('beta.access')) {
    window.location.replace('/')
    return null
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/email-bestaetigen" element={<ConfirmEmailChangePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        {/* Ohne Login erreichbar: Impressumspflicht (§ 5 TMG) und die
            DSGVO-Informationspflicht gelten unabhängig vom Login-Status. Mit
            Session trotzdem innerhalb der normalen AppShell (siehe
            PublicOrAppShell), damit man nicht in einer navigationslosen
            Sackgasse landet. */}
        <Route element={<PublicOrAppShell />}>
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<ProtectedRoute requiredPermission="page.dashboard.view" />}>
              <Route path="/" element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="page.seasons.view" />}>
              <Route path="/seasons" element={<SeasonsPage />} />
              <Route path="/seasons/:seasonId" element={<SeasonDetailPage />} />
              <Route path="/seasons/:seasonId/gesamtwertung" element={<SeasonRankingPage />} />
              <Route path="/seasons/:seasonId/matchdays/:matchdayId" element={<MatchdayDetailPage />} />
              <Route path="/seasons/:seasonId/guthaben" element={<SeasonBalancesPage />} />
            </Route>

            {/* Persönliche Seiten (eigenes Konto/Profil) bleiben bewusst außerhalb
                des page.*.view-Konzepts – jeder aktive User muss sein eigenes Konto
                und Profil immer erreichen können, unabhängig davon, ob z. B. die
                Saisons- oder Konten-Übersichtsseite für seine Rolle ausgeblendet ist. */}
            <Route path="/players/:playerId" element={<PlayerDetailPage />} />
            <Route path="/profil" element={<MyAccountPage />} />
            <Route path="/kontakt" element={<ContactPage />} />
            <Route path="/ueber" element={<AboutPage />} />
            <Route path="/hilfe" element={<HelpPage />} />

            <Route element={<ProtectedRoute requiredPermission="page.vergleich.view" />}>
              <Route path="/vergleich" element={<SeasonComparisonPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="page.kicktipp.view" />}>
              <Route path="/kicktipp" element={<KicktippWidgetPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission={['players.manage', 'page.players.view']} />}>
              <Route path="/players" element={<PlayersPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission={['accounts.manage', 'page.accounts.view']} />}>
              <Route path="/konten" element={<AccountsOverviewPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission={['import.use', 'page.import.view']} />}>
              <Route path="/import" element={<ImportPage />} />
              <Route path="/import/tipper" element={<TipperImportPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission={['email.send', 'page.email_send.view']} />}>
              <Route path="/emails/senden" element={<SendEmailPage />} />
              <Route path="/emails/vorlagen" element={<EmailTemplatesPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission={['users.manage', 'page.users.view']} />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/email" element={<EmailSettingsPage />} />
              <Route path="/admin/roles" element={<RolesPermissionsPage />} />
              <Route path="/admin/branding" element={<AppSettingsPage />} />
              <Route path="/admin/logs" element={<LogsPage />} />
              <Route path="/admin/password-policy" element={<PasswordPolicyPage />} />
              <Route path="/admin/session-policy" element={<SessionPolicyPage />} />
              <Route path="/admin/menu" element={<NavSettingsPage />} />
              <Route path="/admin/legal" element={<LegalSettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  // mobile (Capacitor, siehe src/mobile/): eigene Wurzelkomponente statt
  // der festen main/beta-Struktur unten – entscheidet zwischen Instanz-
  // Wähler und AppRoutes für die jeweils aktive Instanz (siehe
  // MobileApp.tsx). Bewusst lazy() statt eines statischen Imports: Capacitor-
  // Plugins registrieren sich beim Import selbst (Seiteneffekt), den Rollup
  // nicht als toten Code erkennen kann, selbst wenn der `if`-Zweig unten nie
  // erreicht wird – ein statischer Import hätte @capacitor/* trotzdem ins
  // main/beta-Bundle gezogen (empirisch geprüft). lazy() erzeugt stattdessen
  // einen eigenen Chunk, der nur bei tatsächlichem Rendern nachgeladen wird –
  // im mobile-Kanal ohnehin sofort beim Start, in main/beta nie.
  if (import.meta.env.VITE_APP_CHANNEL === 'mobile') {
    return (
      <Suspense fallback={<p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>}>
        <LazyMobileApp />
      </Suspense>
    )
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppBrandingProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AppBrandingProvider>
    </BrowserRouter>
  )
}

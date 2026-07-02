import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppBrandingProvider } from './features/app-settings/AppBrandingProvider'
import { AppSettingsPage } from './features/app-settings/AppSettingsPage'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { AboutPage } from './pages/AboutPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlayersPage } from './features/players/PlayersPage'
import { PlayerDetailPage } from './features/players/PlayerDetailPage'
import { AccountsOverviewPage } from './features/players/AccountsOverviewPage'
import { AdminUsersPage } from './features/admin-users/AdminUsersPage'
import { EmailSettingsPage } from './features/email-settings/EmailSettingsPage'
import { RolesPermissionsPage } from './features/permissions/RolesPermissionsPage'
import { LogsPage } from './features/logs/LogsPage'
import { PasswordPolicyPage } from './features/password-policy/PasswordPolicyPage'
import { SeasonsPage } from './features/seasons/SeasonsPage'
import { SeasonDetailPage } from './features/seasons/SeasonDetailPage'
import { SeasonRankingPage } from './features/seasons/SeasonRankingPage'
import { MatchdayDetailPage } from './features/seasons/MatchdayDetailPage'
import { ImportPage } from './features/kicktipp-import/ImportPage'
import { TipperImportPage } from './features/kicktipp-import/TipperImportPage'
import { MyAccountPage } from './features/auth/MyAccountPage'
import { SendEmailPage } from './features/emails/SendEmailPage'
import { EmailTemplatesPage } from './features/emails/EmailTemplatesPage'

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

// Eigene Komponente (statt direkt in App()), damit useAuth() innerhalb von
// AuthProvider aufgerufen werden kann – passwordRecovery muss unabhängig von
// Route/restlicher Session die normale App überdecken können, siehe
// AuthContext.ts.
function AppRoutes() {
  const { passwordRecovery } = useAuth()

  if (passwordRecovery) {
    return <ResetPasswordPage />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

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
            <Route
              path="/seasons/:seasonId/guthaben"
              element={
                <Suspense fallback={<PageLoading />}>
                  <SeasonBalancesPage />
                </Suspense>
              }
            />
          </Route>

          {/* Persönliche Seiten (eigenes Konto/Profil) bleiben bewusst außerhalb
              des page.*.view-Konzepts – jeder aktive User muss sein eigenes Konto
              und Profil immer erreichen können, unabhängig davon, ob z. B. die
              Saisons- oder Konten-Übersichtsseite für seine Rolle ausgeblendet ist. */}
          <Route path="/players/:playerId" element={<PlayerDetailPage />} />
          <Route path="/profil" element={<MyAccountPage />} />
          <Route path="/ueber" element={<AboutPage />} />

          <Route element={<ProtectedRoute requiredPermission="page.vergleich.view" />}>
            <Route
              path="/vergleich"
              element={
                <Suspense fallback={<PageLoading />}>
                  <SeasonComparisonPage />
                </Suspense>
              }
            />
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

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/email" element={<EmailSettingsPage />} />
            <Route path="/admin/roles" element={<RolesPermissionsPage />} />
            <Route path="/admin/branding" element={<AppSettingsPage />} />
            <Route path="/admin/logs" element={<LogsPage />} />
            <Route path="/admin/password-policy" element={<PasswordPolicyPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBrandingProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AppBrandingProvider>
    </BrowserRouter>
  )
}

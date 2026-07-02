import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppBrandingProvider } from './features/app-settings/AppBrandingProvider'
import { AppSettingsPage } from './features/app-settings/AppSettingsPage'
import { AuthProvider } from './features/auth/AuthProvider'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlayersPage } from './features/players/PlayersPage'
import { PlayerDetailPage } from './features/players/PlayerDetailPage'
import { AccountsOverviewPage } from './features/players/AccountsOverviewPage'
import { AdminUsersPage } from './features/admin-users/AdminUsersPage'
import { EmailSettingsPage } from './features/email-settings/EmailSettingsPage'
import { RolesPermissionsPage } from './features/permissions/RolesPermissionsPage'
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

export default function App() {
  return (
    <BrowserRouter>
      <AppBrandingProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/seasons" element={<SeasonsPage />} />
                <Route path="/seasons/:seasonId" element={<SeasonDetailPage />} />
                <Route path="/seasons/:seasonId/gesamtwertung" element={<SeasonRankingPage />} />
                <Route path="/seasons/:seasonId/matchdays/:matchdayId" element={<MatchdayDetailPage />} />
                <Route path="/players/:playerId" element={<PlayerDetailPage />} />
                <Route path="/profil" element={<MyAccountPage />} />
                <Route
                  path="/seasons/:seasonId/guthaben"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <SeasonBalancesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/vergleich"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <SeasonComparisonPage />
                    </Suspense>
                  }
                />

                <Route element={<ProtectedRoute requiredPermission="players.manage" />}>
                  <Route path="/players" element={<PlayersPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="accounts.manage" />}>
                  <Route path="/konten" element={<AccountsOverviewPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="import.use" />}>
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/import/tipper" element={<TipperImportPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="email.send" />}>
                  <Route path="/emails/senden" element={<SendEmailPage />} />
                  <Route path="/emails/vorlagen" element={<EmailTemplatesPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/email" element={<EmailSettingsPage />} />
                  <Route path="/admin/roles" element={<RolesPermissionsPage />} />
                  <Route path="/admin/branding" element={<AppSettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </AppBrandingProvider>
    </BrowserRouter>
  )
}

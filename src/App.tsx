import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import { SeasonsPage } from './features/seasons/SeasonsPage'
import { SeasonDetailPage } from './features/seasons/SeasonDetailPage'
import { MatchdayDetailPage } from './features/seasons/MatchdayDetailPage'
import { ImportPage } from './features/kicktipp-import/ImportPage'
import { TipperImportPage } from './features/kicktipp-import/TipperImportPage'
import { MyAccountPage } from './features/auth/MyAccountPage'

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
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/seasons" element={<SeasonsPage />} />
              <Route path="/seasons/:seasonId" element={<SeasonDetailPage />} />
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

              <Route element={<ProtectedRoute allowedRoles={['admin', 'spielleiter']} />}>
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/konten" element={<AccountsOverviewPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/import/tipper" element={<TipperImportPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/email" element={<EmailSettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

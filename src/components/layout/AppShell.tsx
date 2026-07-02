import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { useAppBranding } from '../../features/app-settings/useAppBranding'
import { Modal } from '../ui/Modal'
import { visibleNavItems } from './navItems'

const linkBaseClasses = 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition'
const linkActiveClasses = 'bg-[var(--color-primary)] text-white'
const linkInactiveClasses = 'text-slate-600 hover:bg-slate-100'

const roleLabels = { admin: 'Administrator', spielleiter: 'Spielleiter', user: 'Spieler' } as const

export function AppShell() {
  const { profile, signOut, can, switchBackToBaseRole } = useAuth()
  const { appName } = useAppBranding()
  const items = visibleNavItems(profile?.role, can)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [switchingBack, setSwitchingBack] = useState(false)
  const [switchBackError, setSwitchBackError] = useState<string | null>(null)

  async function handleSwitchBack() {
    setSwitchingBack(true)
    setSwitchBackError(null)
    const { error } = await switchBackToBaseRole()
    if (error) setSwitchBackError(error)
    setSwitchingBack(false)
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Desktop-Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900">
          {appName}
          <BetaBadge />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
              }
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <UserFooter name={profile?.name} role={profile?.role} baseRole={profile?.base_role} onSignOut={signOut} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile Top-Bar: Hamburger öffnet die Navigation (ersetzt die
            frühere Bottom-Nav), Konto-Button rechts wie bisher. */}
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setNavMenuOpen(true)}
              aria-label="Menü öffnen"
              className="-ml-2 flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg p-2 active:bg-slate-100"
            >
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
              <span className="h-0.5 w-5 rounded-full bg-slate-700" />
            </button>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold text-slate-900">{appName}</span>
              <BetaBadge />
            </span>
          </div>
          <button
            onClick={() => setAccountMenuOpen(true)}
            aria-label="Konto-Menü öffnen"
            className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 active:bg-slate-100"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {getInitials(profile?.name)}
            </span>
          </button>
        </header>

        {navMenuOpen && (
          <Modal title="Menü" onClose={() => setNavMenuOpen(false)}>
            <nav className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setNavMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive ? linkActiveClasses : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </Modal>
        )}

        {accountMenuOpen && (
          <Modal title={profile?.name ?? 'Konto'} onClose={() => setAccountMenuOpen(false)}>
            <p className="mb-3 text-xs text-slate-500">
              {profile?.role && roleLabels[profile.role]}
              {profile?.base_role && ` (eigentliche Rolle: ${roleLabels[profile.base_role]})`}
            </p>
            <div className="space-y-1">
              <NavLink
                to="/profil"
                onClick={() => setAccountMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Mein Profil
              </NavLink>
              <NavLink
                to="/ueber"
                onClick={() => setAccountMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Über diese App
              </NavLink>
              <button
                onClick={() => {
                  setAccountMenuOpen(false)
                  signOut()
                }}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Abmelden
              </button>
            </div>
          </Modal>
        )}

        {profile?.base_role && (
          <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Du agierst aktuell als Spieler (eigentliche Rolle: {roleLabels[profile.base_role]})
              {switchBackError && <span className="block text-red-600 sm:inline sm:ml-2">{switchBackError}</span>}
            </span>
            <button
              onClick={handleSwitchBack}
              disabled={switchingBack}
              className="shrink-0 self-start rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium hover:bg-amber-200 disabled:opacity-60 sm:self-auto"
            >
              {switchingBack ? 'Wechsle zurück...' : `Zurück zu ${roleLabels[profile.base_role]}`}
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Zeigt "BETA" neben dem App-Namen, wenn dieser Build aus dem beta-Branch
 * stammt (VITE_APP_CHANNEL per Docker-Build-Arg gesetzt, siehe
 * docker-publish.yml) – damit auf einen Blick erkennbar ist, in welcher
 * Umgebung man sich befindet, ohne extra auf die "Über"-Seite zu wechseln. */
function BetaBadge() {
  if (import.meta.env.VITE_APP_CHANNEL !== 'beta') return null
  return (
    <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
      Beta
    </span>
  )
}

function UserFooter({
  name,
  role,
  baseRole,
  onSignOut,
}: {
  name?: string
  role?: keyof typeof roleLabels
  baseRole?: keyof typeof roleLabels | null
  onSignOut: () => void
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <NavLink to="/profil" className="block rounded-lg px-2 py-1.5 hover:bg-slate-100">
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">
          {role && roleLabels[role]}
          {baseRole && ` (eigentliche Rolle: ${roleLabels[baseRole]})`}
        </p>
      </NavLink>
      <NavLink
        to="/ueber"
        className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Über diese App
      </NavLink>
      <button
        onClick={onSignOut}
        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Abmelden
      </button>
    </div>
  )
}

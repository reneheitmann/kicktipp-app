import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { useAppBranding } from '../../features/app-settings/useAppBranding'
import { visibleNavItems } from './navItems'

const linkBaseClasses = 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition'
const linkActiveClasses = 'bg-[var(--color-primary)] text-white'
const linkInactiveClasses = 'text-slate-600 hover:bg-slate-100'

export function AppShell() {
  const { profile, signOut, can, viewAsUser, setViewAsUser } = useAuth()
  const { appName } = useAppBranding()
  const items = visibleNavItems(profile?.role, can)

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Desktop-Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 px-2 text-lg font-semibold text-slate-900">{appName}</div>
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
              {viewAsUser && item.roles && <AdminOnlyBadge className="ml-auto" />}
            </NavLink>
          ))}
        </nav>
        <UserFooter name={profile?.name} role={profile?.role} viewAsUser={viewAsUser} onSignOut={signOut} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile Top-Bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="text-base font-semibold text-slate-900">{appName}</span>
          <div className="flex items-center gap-1">
            <NavLink
              to="/profil"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-600'} active:bg-slate-100`
              }
            >
              Profil
            </NavLink>
            <NavLink
              to="/ueber"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-600'} active:bg-slate-100`
              }
            >
              Über
            </NavLink>
            <button
              onClick={signOut}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-100"
            >
              Abmelden
            </button>
          </div>
        </header>

        {viewAsUser && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <span>Vorschau: Ansicht als Spieler (deine echte Rolle bleibt unverändert)</span>
            <button
              onClick={() => setViewAsUser(false)}
              className="shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium hover:bg-amber-200"
            >
              Beenden
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom-Navigation: horizontal scrollbar statt Gleichverteilung,
          damit Tabs bei vielen Einträgen (z. B. Admin-Rolle) nicht umbrechen/quetschen. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-2.5 text-xs font-medium ${
                isActive ? 'text-slate-900' : 'text-slate-500'
              }`
            }
          >
            <span>{item.label}</span>
            {viewAsUser && item.roles && <AdminOnlyBadge />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/** Kennzeichnet einen Menüpunkt, der trotz aktiver "Als Spieler anzeigen"-Vorschau
 * sichtbar bleibt, weil er zu den 3 fest auf Admin verdrahteten Funktionen
 * gehört (Benutzerverwaltung, E-Mail, Rollen & Berechtigungen) und nicht Teil
 * der simulierten Berechtigungsvorschau ist. */
function AdminOnlyBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
    >
      Admin
    </span>
  )
}

function UserFooter({
  name,
  role,
  viewAsUser,
  onSignOut,
}: {
  name?: string
  role?: string
  viewAsUser: boolean
  onSignOut: () => void
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <NavLink to="/profil" className="block rounded-lg px-2 py-1.5 hover:bg-slate-100">
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">
          {role}
          {viewAsUser && ' (Vorschau: Spieler)'}
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

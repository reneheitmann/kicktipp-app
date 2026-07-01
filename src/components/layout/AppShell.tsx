import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { visibleNavItems } from './navItems'

const linkBaseClasses = 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition'
const linkActiveClasses = 'bg-slate-900 text-white'
const linkInactiveClasses = 'text-slate-600 hover:bg-slate-100'

export function AppShell() {
  const { profile, signOut } = useAuth()
  const items = visibleNavItems(profile?.role)

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Desktop-Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 px-2 text-lg font-semibold text-slate-900">Kicktipp Spielrunde</div>
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
              {item.label}
            </NavLink>
          ))}
        </nav>
        <UserFooter name={profile?.name} role={profile?.role} onSignOut={signOut} />
      </aside>

      {/* Mobile Top-Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="text-base font-semibold text-slate-900">Kicktipp Spielrunde</span>
        <div className="flex items-center gap-1">
          <NavLink
            to="/profil"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-600'} active:bg-slate-100`
            }
          >
            Profil
          </NavLink>
          <button
            onClick={signOut}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-100"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>

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
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function UserFooter({
  name,
  role,
  onSignOut,
}: {
  name?: string
  role?: string
  onSignOut: () => void
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <NavLink to="/profil" className="block rounded-lg px-2 py-1.5 hover:bg-slate-100">
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </NavLink>
      <button
        onClick={onSignOut}
        className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Abmelden
      </button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { useAppBranding } from '../../features/app-settings/useAppBranding'
import { Modal } from '../ui/Modal'
import { visibleNavItems } from './navItems'

const linkBaseClasses = 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition'
const linkActiveClasses = 'bg-[var(--color-primary)] text-white'
const linkInactiveClasses = 'text-slate-600 hover:bg-slate-100'

export function AppShell() {
  const { profile, signOut, can, viewAsUser, setViewAsUser } = useAuth()
  const { appName } = useAppBranding()
  const items = visibleNavItems(profile?.role, can)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

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
              {viewAsUser && item.roles && <AdminOnlyBadge className="ml-auto" />}
            </NavLink>
          ))}
        </nav>
        <UserFooter name={profile?.name} role={profile?.role} viewAsUser={viewAsUser} onSignOut={signOut} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile Top-Bar: nur noch ein Konto-Button statt drei nebeneinander
            konkurrierender Text-Links – vermeidet, dass ein längerer App-Name
            in zwei Zeilen umbricht und alles zusammenquetscht. */}
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold text-slate-900">{appName}</span>
            <BetaBadge />
          </span>
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

        {accountMenuOpen && (
          <Modal title={profile?.name ?? 'Konto'} onClose={() => setAccountMenuOpen(false)}>
            <p className="mb-3 text-xs text-slate-500">
              {profile?.role}
              {viewAsUser && ' (Vorschau: Spieler)'}
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

      <MobileBottomNav items={items} viewAsUser={viewAsUser} />
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

/** Mobile Bottom-Navigation: horizontal scrollbar statt Gleichverteilung,
 * damit Tabs bei vielen Einträgen (z. B. Admin-Rolle) nicht umbrechen/quetschen.
 * Ein rechtsseitiger Verlauf zeigt an, wenn weitere Einträge außerhalb des
 * sichtbaren Bereichs liegen und per Wischen erreichbar sind – ohne dieses
 * Signal war nicht erkennbar, dass z. B. "Passwort-Richtlinie" überhaupt
 * existiert, wenn sie erst nach mehrfachem Wischen sichtbar wird. */
function MobileBottomNav({
  items,
  viewAsUser,
}: {
  items: ReturnType<typeof visibleNavItems>
  viewAsUser: boolean
}) {
  const scrollRef = useRef<HTMLElement>(null)
  const [canScrollMore, setCanScrollMore] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setCanScrollMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 4)
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items.length])

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 md:hidden">
      <nav
        ref={scrollRef}
        className="flex overflow-x-auto border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
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
      {canScrollMore && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/90 to-transparent"
          style={{ bottom: 'env(safe-area-inset-bottom)' }}
        />
      )}
    </div>
  )
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

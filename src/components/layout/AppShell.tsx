import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { useAppBranding } from '../../features/app-settings/useAppBranding'
import { Modal } from '../ui/Modal'
import { groupNavItems, visibleNavItems, type NavItem } from './navItems'

const linkBaseClasses = 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition'
const linkActiveClasses = 'bg-[var(--color-primary)] text-white'
const linkInactiveClasses = 'text-slate-600 hover:bg-slate-100'

const roleLabels = { admin: 'Administrator', spielleiter: 'Spielleiter', user: 'Spieler' } as const

export function AppShell() {
  const { profile, signOut, can } = useAuth()
  const { appName } = useAppBranding()
  const items = visibleNavItems(profile?.role, can)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Tastatur-Sprungmarke: ohne sie muss ein Tastatur-/Screenreader-Nutzer
          bei jedem Seitenaufruf erst durch die komplette Sidebar/Kontoleiste
          tabben, bevor der eigentliche Seiteninhalt erreichbar ist. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg focus:outline focus:outline-2 focus:outline-[var(--color-primary)]"
      >
        Zum Inhalt springen
      </a>
      {/* Desktop-Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900">
          {appName}
          <BetaBadge />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks items={items} variant="desktop" />
        </nav>
        <UserFooter name={profile?.name} role={profile?.role} baseRole={profile?.base_role} onSignOut={signOut} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile Top-Bar: Hamburger öffnet die Navigation (ersetzt die
            frühere Bottom-Nav), Konto-Button rechts wie bisher. "relative",
            damit das Dropdown darunter direkt an der Hamburger-Ecke andockt
            statt (wie das gemeinsame Modal) unten am Bildschirmrand
            aufzuklappen – ein Menü, das von einem oben-links sitzenden
            Button ausgeht, wird sonst leicht als "woanders herkommend"
            wahrgenommen. */}
        <header className="relative flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setNavMenuOpen(true)}
              aria-label="Menü öffnen"
              aria-haspopup="menu"
              aria-expanded={navMenuOpen}
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
          <span className="relative shrink-0">
            <button
              onClick={() => setAccountMenuOpen(true)}
              aria-label="Konto-Menü öffnen"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 active:bg-slate-100"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {getInitials(profile?.name)}
              </span>
            </button>
            {profile?.base_role && (
              <RoleSwitchBadge
                label={`Du agierst als ${roleLabels[profile.role]} (eigentliche Rolle: ${roleLabels[profile.base_role]})`}
                className="absolute right-1 top-0"
              />
            )}
          </span>

          {navMenuOpen && (
            <>
              {/* Unsichtbarer Vollflächen-Layer statt eines abgedunkelten
                  Modal-Backdrops: das Dropdown soll wie ein Menü wirken,
                  nicht wie ein Dialog – Klick daneben schließt es trotzdem. */}
              <div className="fixed inset-0 z-20" onClick={() => setNavMenuOpen(false)} />
              <nav className="absolute left-4 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <NavLinks items={items} variant="mobile" onNavigate={() => setNavMenuOpen(false)} />
              </nav>
            </>
          )}
        </header>

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

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Rendert die sichtbaren Nav-Items: normale Einträge flach, admin-only
 * Einträge gebündelt unter einer "Administration"-Überschrift mit
 * Untergruppen (siehe navItems.ts) – von Desktop-Sidebar und Mobile-Menü
 * gemeinsam genutzt, damit die Gruppierungs-Logik nicht doppelt existiert. */
const ADMIN_NAV_STORAGE_KEY = 'kicktipp_nav_admin_open'

function NavLinks({
  items,
  variant,
  onNavigate,
}: {
  items: NavItem[]
  variant: 'desktop' | 'mobile'
  onNavigate?: () => void
}) {
  const { main, adminGroups } = groupNavItems(items)
  // Default eingeklappt, Zustand persistiert wie bei CollapsibleSection.tsx
  // (personliche Vorliebe, kein Reset bei jedem Seitenaufruf).
  const [adminOpen, setAdminOpen] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_NAV_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  function toggleAdminOpen() {
    setAdminOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(ADMIN_NAV_STORAGE_KEY, String(next))
      } catch {
        // z. B. privates Fenster ohne Storage-Zugriff – Zustand bleibt dann
        // nur für die aktuelle Sitzung erhalten, kein Absturz nötig.
      }
      return next
    })
  }

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    variant === 'desktop'
      ? `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
      : `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
          isActive ? linkActiveClasses : 'text-slate-700 hover:bg-slate-100'
        }`

  return (
    <>
      {main.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onNavigate} className={linkClassName}>
          <span>{item.label}</span>
        </NavLink>
      ))}
      {adminGroups.length > 0 && (
        <button
          type="button"
          onClick={toggleAdminOpen}
          aria-expanded={adminOpen}
          className="mt-4 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          <span className={`inline-block transition-transform ${adminOpen ? 'rotate-90' : ''}`}>▶</span>
          Administration
        </button>
      )}
      {adminOpen &&
        adminGroups.map(([group, groupItems]) => (
          <div key={group}>
            <p className="mt-2 px-3 text-xs font-medium text-slate-400">{group}</p>
            {groupItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onNavigate} className={linkClassName}>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
    </>
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

/** Markierung für "agiert aktuell als Spieler". `title` bedient Desktop-Hover,
 * der Klick/Tap zeigt zusätzlich ein Label direkt an – auf Touch-Geräten gibt
 * es keinen Hover, ohne das eigene onClick wäre der Stern dort ohne jede
 * Erklärung sichtbar. stopPropagation, damit der Tap nicht zugleich das
 * umgebende Element (Konto-Button/NavLink) auslöst. */
function RoleSwitchBadge({ label, className }: { label: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    // className (Positionierung beim Aufrufer, z. B. "absolute right-1 top-0")
    // sitzt bewusst auf einem eigenen äußeren Element statt zusammen mit dem
    // fest codierten "relative" unten – beide auf demselben Element würden
    // sich über die generierte Tailwind-Stylesheet-Reihenfolge gegenseitig
    // überschreiben, unabhängig von der Reihenfolge im className-String.
    //
    // Feste kleine Ankergröße statt inline-flex: der globale button-Touch-
    // Target (min-height: 44px, siehe index.css) würde sonst die sichtbare
    // ★-Glyphe aus der Ecke nach unten verschieben. Der button wird darum
    // per absolute + translate(-50%, -50%) auf den Ankerpunkt zentriert,
    // unabhängig von seiner eigenen (aufgeblähten) Box.
    <span className={className}>
      <span className="relative block h-3 w-3">
        <button
          type="button"
          title={label}
          aria-label={label}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          onBlur={() => setOpen(false)}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[11px] leading-none text-amber-500"
        >
          ★
        </button>
        {open && (
          <span className="absolute right-0 top-full z-10 mt-1 w-max max-w-[14rem] rounded-lg bg-slate-900 px-2 py-1 text-xs font-normal text-white shadow-lg">
            {label}
          </span>
        )}
      </span>
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
      <div className="relative">
        <NavLink to="/profil" className="block rounded-lg px-2 py-1.5 hover:bg-slate-100">
          <p className="text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{role && roleLabels[role]}</p>
        </NavLink>
        {baseRole && role && (
          <RoleSwitchBadge
            label={`Du agierst als ${roleLabels[role]} (eigentliche Rolle: ${roleLabels[baseRole]})`}
            className="absolute right-2 top-1.5"
          />
        )}
      </div>
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

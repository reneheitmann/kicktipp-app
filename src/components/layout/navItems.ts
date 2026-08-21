import type { PermissionKey, UserRole } from '../../types/database'

/** Unterüberschriften innerhalb des "Administration"-Bereichs, siehe AppShell.tsx. */
export type AdminNavGroup = 'Benutzer & Zugriff' | 'System'

export interface NavItem {
  to: string
  label: string
  roles?: UserRole[]
  /**
   * Granulares Recht statt fester Rollenliste, siehe permissionCatalog.ts.
   * Ein Array verknüpft mehrere Rechte mit UND (z. B. Aktionsrecht +
   * page.*.view-Sichtbarkeitsschalter müssen beide erfüllt sein).
   */
  requiredPermission?: PermissionKey | PermissionKey[]
  /** Gruppiert einen Eintrag im "Administration"-Bereich der Navigation, unabhängig davon, ob er über
   * `roles` oder `requiredPermission` gesteuert wird. */
  adminGroup?: AdminNavGroup
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Übersicht', requiredPermission: 'page.dashboard.view' },
  { to: '/seasons', label: 'Saison', requiredPermission: 'page.seasons.view' },
  { to: '/vergleich', label: 'Vergleich', requiredPermission: 'page.vergleich.view' },
  { to: '/kicktipp', label: 'Kicktipp', requiredPermission: 'page.kicktipp.view' },
  { to: '/players', label: 'Spieler', requiredPermission: ['players.manage', 'page.players.view'] },
  { to: '/konten', label: 'Konten', requiredPermission: ['accounts.manage', 'page.accounts.view'] },
  { to: '/import', label: 'Import', requiredPermission: ['import.use', 'page.import.view'] },
  { to: '/emails/senden', label: 'E-Mail versenden', requiredPermission: ['email.send', 'page.email_send.view'] },
  {
    to: '/admin/users',
    label: 'Benutzer',
    requiredPermission: ['users.manage', 'page.users.view'],
    adminGroup: 'Benutzer & Zugriff',
  },
  { to: '/admin/roles', label: 'Rollen & Berechtigungen', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/password-policy', label: 'Passwort-Richtlinie', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/session-policy', label: 'Sitzungsdauer', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/email', label: 'E-Mail', roles: ['admin'], adminGroup: 'System' },
  { to: '/admin/branding', label: 'Erscheinungsbild', roles: ['admin'], adminGroup: 'System' },
  { to: '/admin/logs', label: 'Logs & Diagnose', roles: ['admin'], adminGroup: 'System' },
  { to: '/admin/menu', label: 'Menü verwalten', roles: ['admin'], adminGroup: 'System' },
  { to: '/admin/legal', label: 'Datenschutz & Impressum', roles: ['admin'], adminGroup: 'System' },
]

export function visibleNavItems(
  role: UserRole | undefined,
  can: (key: PermissionKey) => boolean,
  items: NavItem[] = navItems,
) {
  return items.filter((item) => {
    if (item.roles && !(role && item.roles.includes(role))) return false
    if (!item.requiredPermission) return true
    const required = Array.isArray(item.requiredPermission) ? item.requiredPermission : [item.requiredPermission]
    return required.every((key) => can(key))
  })
}

/** Wendet eine admin-konfigurierte Reihenfolge (siehe nav-settings-Feature)
 * auf die Menüpunkte an, bevor sie gefiltert/gruppiert werden. Einträge, die
 * (noch) nicht Teil der gespeicherten Reihenfolge sind (z. B. neu
 * hinzugekommene Menüpunkte), behalten ihre ursprüngliche relative Position
 * und landen ans Ende – Array.prototype.sort ist seit ES2019 stabil, daher
 * kein Sonderfall nötig. */
export function applyCustomOrder(items: NavItem[], order: string[]): NavItem[] {
  if (order.length === 0) return items
  const orderIndex = new Map(order.map((to, i) => [to, i]))
  return [...items].sort((a, b) => {
    const ai = orderIndex.get(a.to) ?? Number.MAX_SAFE_INTEGER
    const bi = orderIndex.get(b.to) ?? Number.MAX_SAFE_INTEGER
    return ai - bi
  })
}

/** Überschreibt das Label einzelner Menüpunkte mit einer admin-konfigurierten
 * Bezeichnung (siehe nav-settings-Feature). Pfade ohne Eintrag in `labels`
 * behalten ihr im Code definiertes Label unverändert. */
export function applyCustomLabels(items: NavItem[], labels: Record<string, string>): NavItem[] {
  return items.map((item) => (labels[item.to] ? { ...item, label: labels[item.to] } : item))
}

/** Teilt sichtbare Items in normale (flache Liste) und admin-only (nach
 * adminGroup gruppiert) auf – für die "Administration"-Überschrift in
 * AppShell.tsx. Gruppenreihenfolge folgt der ersten Fundstelle in navItems. */
export function groupNavItems(items: NavItem[]): { main: NavItem[]; adminGroups: [AdminNavGroup, NavItem[]][] } {
  const main = items.filter((item) => !item.adminGroup)
  const adminItems = items.filter((item) => item.adminGroup)
  const groups = new Map<AdminNavGroup, NavItem[]>()
  for (const item of adminItems) {
    const key = item.adminGroup ?? 'System'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return { main, adminGroups: [...groups.entries()] }
}

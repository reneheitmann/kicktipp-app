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
  /** Nur für admin-only Einträge (roles: ['admin']) – gruppiert sie im Admin-Bereich der Navigation. */
  adminGroup?: AdminNavGroup
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Übersicht', requiredPermission: 'page.dashboard.view' },
  { to: '/seasons', label: 'Saison', requiredPermission: 'page.seasons.view' },
  { to: '/vergleich', label: 'Vergleich', requiredPermission: 'page.vergleich.view' },
  { to: '/players', label: 'Spieler', requiredPermission: ['players.manage', 'page.players.view'] },
  { to: '/konten', label: 'Konten', requiredPermission: ['accounts.manage', 'page.accounts.view'] },
  { to: '/import', label: 'Import', requiredPermission: ['import.use', 'page.import.view'] },
  { to: '/emails/senden', label: 'E-Mail versenden', requiredPermission: ['email.send', 'page.email_send.view'] },
  { to: '/admin/users', label: 'Benutzer', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/roles', label: 'Rollen & Berechtigungen', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/password-policy', label: 'Passwort-Richtlinie', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/session-policy', label: 'Sitzungsdauer', roles: ['admin'], adminGroup: 'Benutzer & Zugriff' },
  { to: '/admin/email', label: 'E-Mail', roles: ['admin'], adminGroup: 'System' },
  { to: '/admin/branding', label: 'Erscheinungsbild', roles: ['admin'], adminGroup: 'System' },
  { to: '/admin/logs', label: 'Logs & Diagnose', roles: ['admin'], adminGroup: 'System' },
]

export function visibleNavItems(role: UserRole | undefined, can: (key: PermissionKey) => boolean) {
  return navItems.filter((item) => {
    if (item.roles && !(role && item.roles.includes(role))) return false
    if (!item.requiredPermission) return true
    const required = Array.isArray(item.requiredPermission) ? item.requiredPermission : [item.requiredPermission]
    return required.every((key) => can(key))
  })
}

/** Teilt sichtbare Items in normale (flache Liste) und admin-only (nach
 * adminGroup gruppiert) auf – für die "Administration"-Überschrift in
 * AppShell.tsx. Gruppenreihenfolge folgt der ersten Fundstelle in navItems. */
export function groupNavItems(items: NavItem[]): { main: NavItem[]; adminGroups: [AdminNavGroup, NavItem[]][] } {
  const main = items.filter((item) => !item.roles)
  const adminItems = items.filter((item) => item.roles)
  const groups = new Map<AdminNavGroup, NavItem[]>()
  for (const item of adminItems) {
    const key = item.adminGroup ?? 'System'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return { main, adminGroups: [...groups.entries()] }
}

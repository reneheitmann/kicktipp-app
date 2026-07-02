import type { PermissionKey, UserRole } from '../../types/database'

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
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Übersicht', requiredPermission: 'page.dashboard.view' },
  { to: '/seasons', label: 'Saisons', requiredPermission: 'page.seasons.view' },
  { to: '/vergleich', label: 'Vergleich', requiredPermission: 'page.vergleich.view' },
  { to: '/players', label: 'Spieler', requiredPermission: ['players.manage', 'page.players.view'] },
  { to: '/konten', label: 'Konten', requiredPermission: ['accounts.manage', 'page.accounts.view'] },
  { to: '/import', label: 'Import', requiredPermission: ['import.use', 'page.import.view'] },
  { to: '/emails/senden', label: 'E-Mail versenden', requiredPermission: ['email.send', 'page.email_send.view'] },
  { to: '/admin/users', label: 'Benutzer', roles: ['admin'] },
  { to: '/admin/email', label: 'E-Mail', roles: ['admin'] },
  { to: '/admin/roles', label: 'Rollen & Berechtigungen', roles: ['admin'] },
  { to: '/admin/branding', label: 'Erscheinungsbild', roles: ['admin'] },
  { to: '/admin/logs', label: 'Logs & Diagnose', roles: ['admin'] },
]

export function visibleNavItems(role: UserRole | undefined, can: (key: PermissionKey) => boolean) {
  return navItems.filter((item) => {
    if (item.roles && !(role && item.roles.includes(role))) return false
    if (!item.requiredPermission) return true
    const required = Array.isArray(item.requiredPermission) ? item.requiredPermission : [item.requiredPermission]
    return required.every((key) => can(key))
  })
}

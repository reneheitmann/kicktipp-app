import type { PermissionKey, UserRole } from '../../types/database'

export interface NavItem {
  to: string
  label: string
  roles?: UserRole[]
  /** Granulares Recht statt fester Rollenliste, siehe permissionCatalog.ts. */
  requiredPermission?: PermissionKey
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Übersicht' },
  { to: '/seasons', label: 'Saisons' },
  { to: '/vergleich', label: 'Vergleich' },
  { to: '/players', label: 'Spieler', requiredPermission: 'players.manage' },
  { to: '/konten', label: 'Konten', requiredPermission: 'accounts.manage' },
  { to: '/import', label: 'Import', requiredPermission: 'import.use' },
  { to: '/emails/senden', label: 'E-Mail versenden', requiredPermission: 'email.send' },
  { to: '/admin/users', label: 'Benutzer', roles: ['admin'] },
  { to: '/admin/email', label: 'E-Mail', roles: ['admin'] },
  { to: '/admin/roles', label: 'Rollen & Berechtigungen', roles: ['admin'] },
  { to: '/admin/branding', label: 'Erscheinungsbild', roles: ['admin'] },
]

export function visibleNavItems(role: UserRole | undefined, can: (key: PermissionKey) => boolean) {
  return navItems.filter(
    (item) =>
      (!item.roles || (role && item.roles.includes(role))) &&
      (!item.requiredPermission || can(item.requiredPermission)),
  )
}

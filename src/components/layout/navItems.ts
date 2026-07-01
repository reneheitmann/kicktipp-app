import type { UserRole } from '../../types/database'

export interface NavItem {
  to: string
  label: string
  roles?: UserRole[]
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Übersicht' },
  { to: '/seasons', label: 'Saisons' },
  { to: '/vergleich', label: 'Vergleich' },
  { to: '/players', label: 'Spieler', roles: ['admin', 'spielleiter'] },
  { to: '/konten', label: 'Konten', roles: ['admin', 'spielleiter'] },
  { to: '/import', label: 'Import', roles: ['admin', 'spielleiter'] },
  { to: '/admin/users', label: 'Benutzer', roles: ['admin'] },
  { to: '/admin/email', label: 'E-Mail', roles: ['admin'] },
]

export function visibleNavItems(role: UserRole | undefined) {
  return navItems.filter((item) => !item.roles || (role && item.roles.includes(role)))
}

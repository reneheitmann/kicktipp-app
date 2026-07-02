import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { PermissionKey, UserRole } from '../../types/database'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  /**
   * Granulares Recht statt fester Rollenliste, siehe
   * src/features/permissions/permissionCatalog.ts. Ein Array verknüpft
   * mehrere Rechte mit UND (z. B. Aktionsrecht + page.*.view müssen beide
   * erfüllt sein, siehe navItems.ts).
   */
  requiredPermission?: PermissionKey | PermissionKey[]
}

export function ProtectedRoute({ allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { session, profile, loading, can } = useAuth()

  // `loading` deckt nur die allererste Session-Prüfung ab. Bei jedem
  // weiteren Auth-Wechsel (z. B. frisches Login) setzt AuthProvider zuerst
  // `session`, das Profil folgt erst nach einem zusätzlichen Request. Ohne
  // diese zweite Bedingung würde in genau dieser Lücke kurzzeitig
  // `session` vorhanden, aber `profile` noch null sein – das hätte
  // ProtectedRoute fälschlich als "Profil inaktiv" gewertet und zurück zu
  // /login geschickt, während LoginPage wegen der vorhandenen Session
  // sofort wieder hierher zurückgeschickt hätte (oszillierende Redirects).
  if (loading || (session && !profile)) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-slate-500">
        Lade...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile?.is_active) {
    return <Navigate to="/login" replace state={{ reason: 'disabled' }} />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  if (requiredPermission) {
    const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
    if (!required.every((key) => can(key))) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <Outlet />
}

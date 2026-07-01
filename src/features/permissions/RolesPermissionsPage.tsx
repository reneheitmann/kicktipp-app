import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { permissionCatalog } from './permissionCatalog'
import { listRolePermissions, setRolePermission } from './permissionsApi'
import type { PermissionKey, UserRole } from '../../types/database'

const roleColumns: { role: UserRole; label: string }[] = [
  { role: 'admin', label: 'Admin' },
  { role: 'spielleiter', label: 'Spielleiter' },
  { role: 'user', label: 'Spieler' },
]

function groupKey(role: UserRole, key: PermissionKey): string {
  return `${role}:${key}`
}

export function RolesPermissionsPage() {
  const { refreshPermissions } = useAuth()
  const [grants, setGrants] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const rows = await listRolePermissions()
      setGrants(new Map(rows.map((r) => [groupKey(r.role, r.permission_key), r.granted])))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Berechtigungen konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleToggle(role: UserRole, key: PermissionKey, checked: boolean) {
    const gk = groupKey(role, key)
    setSavingKey(gk)
    setError(null)
    // Optimistisches Update, damit die Checkbox sofort reagiert.
    setGrants((prev) => new Map(prev).set(gk, checked))
    try {
      await setRolePermission(role, key, checked)
      await refreshPermissions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
      // Bei Fehler den optimistischen Wert wieder zurücknehmen.
      await reload()
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  const pages = [...new Set(permissionCatalog.map((entry) => entry.page))]

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Rollen & Berechtigungen</h1>
      <p className="mb-6 text-sm text-slate-500">
        Legt fest, welche der 3 Rollen welche Funktionen nutzen darf. Jede Zeile zeigt, auf welcher Seite das
        jeweilige Recht greift. Benutzerverwaltung, E-Mail-Einstellungen und dieses Modul selbst sind bewusst fest
        auf Admin beschränkt und hier nicht änderbar.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        {pages.map((page) => (
          <div key={page} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Seite: {page}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Recht</th>
                    {roleColumns.map((c) => (
                      <th key={c.role} className="w-24 py-2 text-center font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionCatalog
                    .filter((entry) => entry.page === page)
                    .map((entry) => (
                      <tr key={entry.key} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4">
                          <p className="font-medium text-slate-900">{entry.label}</p>
                          <p className="text-xs text-slate-400">{entry.description}</p>
                        </td>
                        {roleColumns.map((c) => {
                          const gk = groupKey(c.role, entry.key)
                          return (
                            <td key={c.role} className="text-center">
                              <input
                                type="checkbox"
                                checked={grants.get(gk) ?? false}
                                disabled={savingKey === gk}
                                onChange={(e) => handleToggle(c.role, entry.key, e.target.checked)}
                                className="h-5 w-5"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

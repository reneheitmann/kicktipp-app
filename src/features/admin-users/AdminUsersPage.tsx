import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput } from '../../components/ui/SearchInput'
import { CreateUserForm } from './CreateUserForm'
import { DeleteUserDialog } from './DeleteUserDialog'
import { EditUserForm } from './EditUserForm'
import { adminDeleteUser } from './adminDeleteUser'
import { listProfiles, setProfileActive, updateProfileRole } from './profilesApi'
import { requestPasswordReset } from '../auth/passwordResetApi'
import { useAuth } from '../auth/useAuth'
import type { Profile, UserRole } from '../../types/database'

const roleLabels: Record<UserRole, string> = { admin: 'Administrator', spielleiter: 'Spielleiter', user: 'Spieler' }
const lastSignInFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

export function AdminUsersPage() {
  const { profile: ownProfile } = useAuth()
  // Serverseitig (RLS + Trigger + Edge Functions) ist ein berechtigter
  // Spielleiter bereits daran gehindert, Admin-Konten anzufassen oder
  // jemanden zum Admin zu machen (siehe 0050_users_manage_permission.sql) –
  // isTrueAdmin blendet diese ohnehin fehlschlagenden Aktionen nur im UI aus.
  const isTrueAdmin = ownProfile?.role === 'admin'
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [pendingRoleChange, setPendingRoleChange] = useState<{ profile: Profile; role: UserRole } | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Profile | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null)

  async function reload() {
    setLoading(true)
    try {
      setProfiles(await listProfiles())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const activeAdminCount = profiles.filter((p) => p.role === 'admin' && p.is_active).length
  const isLastActiveAdmin = (p: Profile) => p.role === 'admin' && p.is_active && activeAdminCount <= 1

  function requestRoleChange(profileRow: Profile, role: UserRole) {
    if (role !== 'admin' && isLastActiveAdmin(profileRow)) {
      setError('Der letzte aktive Administrator kann nicht in eine andere Rolle geändert werden.')
      return
    }
    setPendingRoleChange({ profile: profileRow, role })
  }

  function requestToggleActive(profileRow: Profile) {
    if (profileRow.is_active && isLastActiveAdmin(profileRow)) {
      setError('Der letzte aktive Administrator kann nicht gesperrt werden.')
      return
    }
    setPendingToggle(profileRow)
  }

  function requestDelete(profileRow: Profile) {
    if (isLastActiveAdmin(profileRow)) {
      setError('Der letzte aktive Administrator kann nicht gelöscht werden.')
      return
    }
    setPendingDelete(profileRow)
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return
    try {
      await updateProfileRole(pendingRoleChange.profile.id, pendingRoleChange.role)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rolle konnte nicht geändert werden.')
    }
  }

  async function confirmToggleActive() {
    if (!pendingToggle) return
    try {
      await setProfileActive(pendingToggle.id, !pendingToggle.is_active)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.')
    }
  }

  async function handlePasswordReset(profileRow: Profile) {
    if (!profileRow.email) return
    try {
      await requestPasswordReset(profileRow.email)
      setInfo(`Passwort-Reset-E-Mail an ${profileRow.email} gesendet.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset-E-Mail konnte nicht gesendet werden.')
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return p.name.toLowerCase().includes(term) || (p.email ?? '').toLowerCase().includes(term)
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Benutzerverwaltung</h1>
        <Button onClick={() => setShowCreate(true)}>+ Benutzer</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Benutzer suchen..." className="mb-4 max-w-xs" />

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mb-4 text-sm text-emerald-700">{info}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : filteredProfiles.length === 0 ? (
        <p className="text-sm text-slate-500">
          {profiles.length === 0 ? 'Noch keine Benutzer angelegt.' : 'Keine Treffer für die Suche.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredProfiles.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {p.name} {!p.is_active && <span className="text-xs font-normal text-red-500">(gesperrt)</span>}
                  {p.base_role && (
                    <span className="text-xs font-normal text-amber-600">
                      {' '}
                      (agiert aktuell als {roleLabels[p.role]}, eigentlich {roleLabels[p.base_role]})
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-slate-500">{p.email}</p>
                <p className="truncate text-xs text-slate-400">
                  Letzter Login: {p.last_sign_in_at ? lastSignInFormatter.format(new Date(p.last_sign_in_at)) : 'noch nie'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isTrueAdmin && p.role === 'admin' ? (
                  <span className="px-2 py-2 text-sm text-slate-500">{roleLabels[p.role]}</span>
                ) : (
                  <select
                    value={p.role}
                    onChange={(e) => requestRoleChange(p, e.target.value as UserRole)}
                    className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  >
                    <option value="user">Spieler</option>
                    <option value="spielleiter">Spielleiter</option>
                    {isTrueAdmin && <option value="admin">Administrator</option>}
                  </select>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setEditingProfile(p)}
                  disabled={!isTrueAdmin && p.role === 'admin'}
                >
                  Bearbeiten
                </Button>
                <Button variant="secondary" onClick={() => handlePasswordReset(p)}>
                  Passwort-Reset
                </Button>
                <Button
                  variant={p.is_active ? 'danger' : 'secondary'}
                  onClick={() => requestToggleActive(p)}
                  disabled={!isTrueAdmin && p.role === 'admin'}
                >
                  {p.is_active ? 'Sperren' : 'Entsperren'}
                </Button>
                {p.id !== ownProfile?.id && (
                  <Button variant="danger" onClick={() => requestDelete(p)} disabled={!isTrueAdmin && p.role === 'admin'}>
                    Löschen
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateUserForm onClose={() => setShowCreate(false)} onCreated={reload} allowAdminRole={isTrueAdmin} />
      )}

      {editingProfile && (
        <EditUserForm profile={editingProfile} onClose={() => setEditingProfile(null)} onSaved={reload} />
      )}

      {pendingRoleChange && (
        <ConfirmDialog
          title="Rolle ändern?"
          message={
            pendingRoleChange.profile.id === ownProfile?.id
              ? `Dies ist dein eigenes Konto. Deine Rolle wird von "${roleLabels[pendingRoleChange.profile.role]}" auf "${roleLabels[pendingRoleChange.role]}" geändert.`
              : `${pendingRoleChange.profile.name} erhält die Rolle "${roleLabels[pendingRoleChange.role]}" (bisher "${roleLabels[pendingRoleChange.profile.role]}").`
          }
          confirmLabel="Ändern"
          onConfirm={confirmRoleChange}
          onClose={() => setPendingRoleChange(null)}
        />
      )}

      {pendingToggle && (
        <ConfirmDialog
          title={pendingToggle.is_active ? 'Benutzer sperren?' : 'Benutzer entsperren?'}
          message={
            pendingToggle.id === ownProfile?.id
              ? 'Dies ist dein eigenes Konto. Du wirst dich danach nicht mehr anmelden können.'
              : `${pendingToggle.name} wird ${pendingToggle.is_active ? 'gesperrt und kann sich nicht mehr anmelden' : 'wieder entsperrt'}.`
          }
          confirmLabel={pendingToggle.is_active ? 'Sperren' : 'Entsperren'}
          danger={pendingToggle.is_active}
          onConfirm={confirmToggleActive}
          onClose={() => setPendingToggle(null)}
        />
      )}

      {pendingDelete && (
        <DeleteUserDialog
          profile={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            await adminDeleteUser(pendingDelete.id)
            await reload()
          }}
        />
      )}
    </div>
  )
}

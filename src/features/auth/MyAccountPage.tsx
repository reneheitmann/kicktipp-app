import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { useAuth } from './useAuth'
import { updateOwnName, updateOwnPassword } from './myAccountApi'

export function MyAccountPage() {
  const { profile, refreshProfile, viewAsUser, setViewAsUser } = useAuth()

  const [name, setName] = useState(profile?.name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!name.trim()) {
      setNameError('Name darf nicht leer sein.')
      return
    }
    setSavingName(true)
    setNameError(null)
    setNameSuccess(null)
    try {
      await updateOwnName(profile.id, name.trim())
      await refreshProfile()
      setNameSuccess('Name gespeichert.')
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingName(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein.')
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)
    try {
      await updateOwnPassword(newPassword)
      setPasswordSuccess('Passwort geändert.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!profile) return null

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Mein Profil</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Stammdaten</h2>
        <form className="space-y-4" onSubmit={handleNameSubmit}>
          <div>
            <label htmlFor="account-name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">E-Mail</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-base text-slate-500">{profile.email}</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Rolle</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-base text-slate-500">{profile.role}</p>
          </div>

          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          {nameSuccess && <p className="text-sm text-emerald-600">{nameSuccess}</p>}

          <Button type="submit" disabled={savingName}>
            {savingName ? 'Speichern...' : 'Name speichern'}
          </Button>
        </form>
      </div>

      {(profile.role === 'admin' || profile.role === 'spielleiter') && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Ansicht</h2>
          <p className="mb-3 text-sm text-slate-500">
            Simuliert die Ansicht der Rolle „Spieler" (Rollen &amp; Berechtigungen bleiben in der Datenbank
            unverändert – jederzeit umkehrbar).
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={viewAsUser}
              onChange={(e) => setViewAsUser(e.target.checked)}
              className="h-5 w-5"
            />
            Als Spieler anzeigen
          </label>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Passwort ändern</h2>
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="account-new-password" className="mb-1 block text-sm font-medium text-slate-700">
              Neues Passwort
            </label>
            <input
              id="account-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="account-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Neues Passwort bestätigen
            </label>
            <input
              id="account-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>

          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-emerald-600">{passwordSuccess}</p>}

          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? 'Speichern...' : 'Passwort ändern'}
          </Button>
        </form>
      </div>
    </div>
  )
}

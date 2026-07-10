import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from './useAuth'
import { updateOwnName, updateOwnPassword } from './myAccountApi'
import { getPasswordPolicy } from '../password-policy/passwordPolicyApi'
import { describePasswordPolicy, validatePasswordAgainstPolicy } from '../../lib/passwordValidation'
import { listPlayers } from '../players/playersApi'
import { listPlayerProfileLinks } from '../players/playerProfileLinksApi'
import type { PasswordPolicy, Player, UserRole } from '../../types/database'

const roleLabels = { admin: 'Administrator', spielleiter: 'Spielleiter', user: 'Spieler' } as const

export function MyAccountPage() {
  const { profile, refreshProfile, switchToRole, switchBackToBaseRole } = useAuth()

  const [name, setName] = useState(profile?.name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  async function handleSwitchTo(role: UserRole) {
    setSwitching(true)
    setSwitchError(null)
    const { error } = await switchToRole(role)
    if (error) setSwitchError(error)
    setSwitching(false)
  }

  async function handleSwitchBack() {
    setSwitching(true)
    setSwitchError(null)
    const { error } = await switchBackToBaseRole()
    if (error) setSwitchError(error)
    setSwitching(false)
  }

  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    getPasswordPolicy()
      .then(setPasswordPolicy)
      .catch(() => {
        // Ohne geladene Richtlinie greift serverseitig trotzdem der
        // dortige Default (siehe update-own-password) – hier nur relevant
        // für die client-seitige Vorab-Prüfung/Anzeige.
      })
  }, [])

  const [linkedPlayers, setLinkedPlayers] = useState<Player[]>([])

  useEffect(() => {
    if (!profile) return
    Promise.all([listPlayers(), listPlayerProfileLinks()])
      .then(([players, links]) => {
        const linkedPlayerIds = new Set(links.filter((l) => l.profile_id === profile.id).map((l) => l.player_id))
        setLinkedPlayers(players.filter((p) => linkedPlayerIds.has(p.id)))
      })
      .catch(() => setLinkedPlayers([]))
  }, [profile])

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
    if (passwordPolicy) {
      const policyError = validatePasswordAgainstPolicy(newPassword, passwordPolicy)
      if (policyError) {
        setPasswordError(policyError)
        return
      }
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
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-base text-slate-500">
              {roleLabels[profile.role]}
              {profile.base_role && ` (eigentliche Rolle: ${roleLabels[profile.base_role]})`}
            </p>
          </div>

          {nameError && <p role="alert" className="text-sm text-red-600">{nameError}</p>}
          {nameSuccess && <p className="text-sm text-emerald-700">{nameSuccess}</p>}

          <Button type="submit" disabled={savingName}>
            {savingName ? 'Speichern...' : 'Name speichern'}
          </Button>
        </form>
      </div>

      {linkedPlayers.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Meine Spieler</h2>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
            {linkedPlayers.map((player) => (
              <li key={player.id}>
                <Link to={`/players/${player.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <p className="font-medium text-slate-900">{player.name}</p>
                  <p className="text-sm text-slate-500">Kicktipp: {player.kicktipp_name || '—'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(profile.role === 'admin' || profile.role === 'spielleiter') && !profile.base_role && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Als andere Rolle agieren</h2>
          <p className="mb-3 text-sm text-slate-500">
            Wechselt deine Rolle tatsächlich – die Funktionen deiner jetzigen Rolle sind währenddessen wirklich
            nicht mehr nutzbar (kein Vorschau-Modus). Jederzeit über diese Seite rückgängig zu machen.
          </p>
          {switchError && <p role="alert" className="mb-3 text-sm text-red-600">{switchError}</p>}
          <div className="flex flex-wrap gap-2">
            {profile.role === 'admin' && (
              <Button variant="secondary" onClick={() => handleSwitchTo('spielleiter')} disabled={switching}>
                {switching ? 'Wechsle...' : 'Als Spielleiter agieren'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => handleSwitchTo('user')} disabled={switching}>
              {switching ? 'Wechsle...' : 'Als Spieler agieren'}
            </Button>
          </div>
        </div>
      )}

      {profile.base_role && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 text-base font-semibold text-amber-900">Du agierst als {roleLabels[profile.role]}</h2>
          <p className="mb-3 text-sm text-amber-800">
            Eigentliche Rolle: {roleLabels[profile.base_role]}. Funktionen der eigentlichen Rolle sind bis zum
            Zurückwechseln nicht sichtbar.
          </p>
          {switchError && <p role="alert" className="mb-3 text-sm text-red-600">{switchError}</p>}
          <Button onClick={handleSwitchBack} disabled={switching}>
            {switching ? 'Wechsle zurück...' : `Zurück zu ${roleLabels[profile.base_role]}`}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Passwort ändern</h2>
        {passwordPolicy && (
          <p className="mb-3 text-xs text-slate-500">{describePasswordPolicy(passwordPolicy)}</p>
        )}
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

          {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-emerald-700">{passwordSuccess}</p>}

          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? 'Speichern...' : 'Passwort ändern'}
          </Button>
        </form>
      </div>
    </div>
  )
}

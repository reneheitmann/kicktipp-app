import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { listProfiles } from '../admin-users/profilesApi'
import { describePlayerSaveError } from './playersApi'
import type { Player, Profile } from '../../types/database'

interface PlayerFormProps {
  player?: Player
  existingPlayers: Player[]
  onClose: () => void
  onSubmit: (input: { name: string; kicktipp_name: string | null; profile_id: string | null }) => Promise<void>
}

export function PlayerForm({ player, existingPlayers, onClose, onSubmit }: PlayerFormProps) {
  const { profile } = useAuth()
  const [name, setName] = useState(player?.name ?? '')
  const [kicktippName, setKicktippName] = useState(player?.kicktipp_name ?? '')
  const [profileId, setProfileId] = useState(player?.profile_id ?? '')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canLinkLogin = profile?.role === 'admin'

  useEffect(() => {
    if (!canLinkLogin) return
    listProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
  }, [canLinkLogin])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedKicktippName = kicktippName.trim()

    if (!trimmedName) {
      setError('Name ist erforderlich.')
      return
    }

    const nameTaken = existingPlayers.some(
      (p) => p.id !== player?.id && p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    )
    if (nameTaken) {
      setError('Dieser Name ist bereits vergeben. Bitte einen anderen Namen wählen.')
      return
    }

    if (trimmedKicktippName) {
      const kicktippNameTaken = existingPlayers.some(
        (p) =>
          p.id !== player?.id &&
          p.kicktipp_name?.trim().toLowerCase() === trimmedKicktippName.toLowerCase(),
      )
      if (kicktippNameTaken) {
        setError('Dieser Kicktipp-Name ist bereits einem anderen Spieler zugeordnet.')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: trimmedName,
        kicktipp_name: trimmedKicktippName || null,
        profile_id: profileId || null,
      })
      onClose()
    } catch (err) {
      setError(describePlayerSaveError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={player ? 'Spieler bearbeiten' : 'Spieler anlegen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="player-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="player-kicktipp" className="mb-1 block text-sm font-medium text-slate-700">
            Kicktipp-Name
          </label>
          <input
            id="player-kicktipp"
            value={kicktippName}
            onChange={(e) => setKicktippName(e.target.value)}
            placeholder="Anzeigename in Kicktipp.de"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Wird später für den automatischen Abgleich beim Kicktipp-Import genutzt.
          </p>
        </div>

        {canLinkLogin && (
          <div>
            <label htmlFor="player-profile" className="mb-1 block text-sm font-medium text-slate-700">
              Verknüpfter Login (optional)
            </label>
            <select
              id="player-profile"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            >
              <option value="">Kein Login verknüpft</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

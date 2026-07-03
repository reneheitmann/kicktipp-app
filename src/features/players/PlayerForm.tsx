import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { listProfiles } from '../admin-users/profilesApi'
import { describePlayerSaveError } from './playersApi'
import type { Player, PlayerProfileLink, Profile } from '../../types/database'

interface PlayerFormProps {
  player?: Player
  existingPlayers: Player[]
  existingLinks: PlayerProfileLink[]
  onClose: () => void
  onSubmit: (input: { name: string; kicktipp_name: string | null; profileIds: string[] }) => Promise<void>
}

export function PlayerForm({ player, existingPlayers, existingLinks, onClose, onSubmit }: PlayerFormProps) {
  const { profile } = useAuth()
  const [name, setName] = useState(player?.name ?? '')
  const [kicktippName, setKicktippName] = useState(player?.kicktipp_name ?? '')
  const [profileIds, setProfileIds] = useState<Set<string>>(
    () => new Set(player ? existingLinks.filter((l) => l.player_id === player.id).map((l) => l.profile_id) : []),
  )
  const [profileSearch, setProfileSearch] = useState('')
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

  function toggleProfile(profileId: string) {
    setProfileIds((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) next.delete(profileId)
      else next.add(profileId)
      return next
    })
  }

  const filteredProfiles = useMemo(() => {
    const term = profileSearch.trim().toLowerCase()
    if (!term) return profiles
    return profiles.filter((p) => p.name.toLowerCase().includes(term) || (p.email ?? '').toLowerCase().includes(term))
  }, [profiles, profileSearch])

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
        profileIds: [...profileIds],
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
          <p className="mt-1 text-xs text-slate-500">
            Wird später für den automatischen Abgleich beim Kicktipp-Import genutzt.
          </p>
        </div>

        {canLinkLogin && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">
              Verknüpfte Logins ({profileIds.size} ausgewählt)
            </p>
            <p className="mb-1 text-xs text-slate-500">
              Mehrfachauswahl möglich – z. B. wenn Eltern und Kind sich einen Spieler teilen.
            </p>
            <input
              type="text"
              value={profileSearch}
              onChange={(e) => setProfileSearch(e.target.value)}
              placeholder="Login suchen..."
              aria-label="Login suchen..."
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-300 p-1">
              {filteredProfiles.length === 0 ? (
                <p className="px-2 py-2 text-sm text-slate-500">Keine Treffer.</p>
              ) : (
                filteredProfiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-2 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={profileIds.has(p.id)}
                      onChange={() => toggleProfile(p.id)}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {p.name} ({p.email})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

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

import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SeasonParticipantForm } from './SeasonParticipantForm'
import { currencyFormatter } from '../../lib/format'
import type { Player, SeasonParticipant } from '../../types/database'

interface SeasonParticipantsSectionProps {
  participants: SeasonParticipant[]
  players: Player[]
  /** Anzahl der bisher angelegten Spieltage dieser Saison, für die Spieltagseinsatz-Aufschlüsselung. */
  matchdayCount: number
  canManage: boolean
  onAdd: (input: { playerId: string; gesamtsiegBetrag: number; spieltagsBetrag: number }) => Promise<void>
  onUpdate: (
    id: string,
    input: { gesamtsiegBetrag: number; spieltagsBetrag: number },
  ) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export function SeasonParticipantsSection({
  participants,
  players,
  matchdayCount,
  canManage,
  onAdd,
  onUpdate,
  onRemove,
}: SeasonParticipantsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<SeasonParticipant | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const playersById = new Map(players.map((p) => [p.id, p]))
  const assignedPlayerIds = new Set(participants.map((p) => p.player_id))
  const availablePlayers = players.filter((p) => !assignedPlayerIds.has(p.id))

  async function handleRemove(participant: SeasonParticipant) {
    const playerName = playersById.get(participant.player_id)?.name ?? 'Spieler'
    if (!confirm(`Teilnehmer "${playerName}" wirklich entfernen?`)) return
    try {
      await onRemove(participant.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.')
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Teilnehmer & Einsätze</h2>
        {canManage && availablePlayers.length > 0 && (
          <Button onClick={() => setShowAddForm(true)}>+ Spieler</Button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {participants.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Teilnehmer.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {playersById.get(participant.player_id)?.name ?? 'Unbekannter Spieler'}
                </p>
                <p className="truncate text-sm text-slate-500">
                  Gesamtwertung: {currencyFormatter.format(participant.gesamtsieg_einsatz_betrag)} · Spieltag:{' '}
                  {matchdayCount} × {currencyFormatter.format(participant.spieltags_einsatz_betrag)} ={' '}
                  {currencyFormatter.format(matchdayCount * participant.spieltags_einsatz_betrag)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400">Gesamteinsatz</p>
                <p className="text-sm font-semibold text-slate-900">
                  {currencyFormatter.format(
                    participant.gesamtsieg_einsatz_betrag + participant.spieltags_einsatz_betrag * matchdayCount,
                  )}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" onClick={() => setEditingParticipant(participant)}>
                    Bearbeiten
                  </Button>
                  <Button variant="danger" onClick={() => handleRemove(participant)}>
                    Entfernen
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showAddForm && (
        <SeasonParticipantForm
          availablePlayers={availablePlayers}
          onClose={() => setShowAddForm(false)}
          onSubmit={async ({ playerId, gesamtsiegBetrag, spieltagsBetrag }) =>
            onAdd({ playerId, gesamtsiegBetrag, spieltagsBetrag })
          }
        />
      )}

      {editingParticipant && (
        <SeasonParticipantForm
          participant={editingParticipant}
          fixedPlayer={playersById.get(editingParticipant.player_id)}
          onClose={() => setEditingParticipant(undefined)}
          onSubmit={async ({ gesamtsiegBetrag, spieltagsBetrag }) =>
            onUpdate(editingParticipant.id, { gesamtsiegBetrag, spieltagsBetrag })
          }
        />
      )}
    </div>
  )
}

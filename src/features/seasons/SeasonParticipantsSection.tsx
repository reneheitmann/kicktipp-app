import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CollapsibleSection } from '../../components/ui/CollapsibleSection'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchInput } from '../../components/ui/SearchInput'
import { SeasonParticipantForm } from './SeasonParticipantForm'
import { currencyFormatter } from '../../lib/format'
import { centsToEuros, type Cents } from '../../lib/money'
import type { Player, SeasonParticipant } from '../../types/database'

interface SeasonParticipantsSectionProps {
  participants: SeasonParticipant[]
  players: Player[]
  /** Anzahl der bisher angelegten Spieltage dieser Saison, für die Spieltagseinsatz-Aufschlüsselung. */
  matchdayCount: number
  canManage: boolean
  onAdd: (input: { playerId: string; gesamtsiegBetrag: Cents; spieltagsBetrag: Cents }) => Promise<void>
  onUpdate: (
    id: string,
    input: { gesamtsiegBetrag: Cents; spieltagsBetrag: Cents },
  ) => Promise<void>
  onRemove: (id: string) => Promise<void>
  /** Mehrere Teilnehmer auf einmal entfernen – für Saisons mit vielen
   *  Teilnehmern (z. B. Saisonende), damit nicht jeder einzeln über
   *  "Entfernen" + Bestätigung laufen muss. */
  onRemoveMany: (ids: string[]) => Promise<void>
  /** Als Favorit markierter Spieler (spieler-, nicht saisonübergreifend gemerkt) –
   *  bestimmt die Standardauswahl in "Spieltage", siehe SeasonDetailPage.tsx. */
  favoritePlayerId: string | null
  onToggleFavorite: (playerId: string) => void
}

export function SeasonParticipantsSection({
  participants,
  players,
  matchdayCount,
  canManage,
  onAdd,
  onUpdate,
  onRemove,
  onRemoveMany,
  favoritePlayerId,
  onToggleFavorite,
}: SeasonParticipantsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<SeasonParticipant | undefined>(undefined)
  const [removingParticipant, setRemovingParticipant] = useState<SeasonParticipant | undefined>(undefined)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingBulkRemove, setConfirmingBulkRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const playersById = new Map(players.map((p) => [p.id, p]))
  const assignedPlayerIds = new Set(participants.map((p) => p.player_id))
  const availablePlayers = players.filter((p) => !assignedPlayerIds.has(p.id))
  const filteredParticipants = participants.filter((participant) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (playersById.get(participant.player_id)?.name ?? '').toLowerCase().includes(term)
  })
  const allVisibleSelected = filteredParticipants.length > 0 && filteredParticipants.every((p) => selectedIds.has(p.id))

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        for (const p of filteredParticipants) next.delete(p.id)
        return next
      }
      return new Set([...prev, ...filteredParticipants.map((p) => p.id)])
    })
  }

  async function confirmRemove() {
    if (!removingParticipant) return
    try {
      await onRemove(removingParticipant.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.')
    }
  }

  async function confirmBulkRemove() {
    try {
      await onRemoveMany([...selectedIds])
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.')
    }
  }

  return (
    <>
      <CollapsibleSection
        title="Teilnehmer & Einsätze"
        count={participants.length}
        defaultOpen={false}
        actions={
          canManage && availablePlayers.length > 0 ? (
            <Button onClick={() => setShowAddForm(true)}>+ Spieler</Button>
          ) : undefined
        }
      >
        {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}

        {participants.length > 1 && (
          <SearchInput value={search} onChange={setSearch} placeholder="Spieler suchen..." className="mb-3 max-w-xs" />
        )}

        {canManage && filteredParticipants.length > 1 && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="h-4 w-4" />
              Alle auswählen
            </label>
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-slate-500">{selectedIds.size} ausgewählt</span>
                <Button variant="danger" onClick={() => setConfirmingBulkRemove(true)}>
                  Ausgewählte entfernen
                </Button>
                <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
                  Auswahl aufheben
                </Button>
              </>
            )}
          </div>
        )}

        {participants.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Teilnehmer.</p>
        ) : filteredParticipants.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Treffer für die Suche.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {filteredParticipants.map((participant) => (
              <li key={participant.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {canManage && participants.length > 1 && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(participant.id)}
                      onChange={() => toggleSelected(participant.id)}
                      aria-label={`${playersById.get(participant.player_id)?.name ?? 'Teilnehmer'} auswählen`}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 font-medium text-slate-900">
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(participant.player_id)}
                        aria-label={
                          favoritePlayerId === participant.player_id
                            ? 'Als Standardauswahl entfernen'
                            : 'Als Standardauswahl für Spieltage markieren'
                        }
                        className={`flex min-w-11 shrink-0 items-center justify-center text-base leading-none ${
                          favoritePlayerId === participant.player_id
                            ? 'text-amber-500'
                            : 'text-slate-400 hover:text-amber-400'
                        }`}
                      >
                        {favoritePlayerId === participant.player_id ? '★' : '☆'}
                      </button>
                    )}
                    <span className="min-w-0 truncate">{playersById.get(participant.player_id)?.name ?? 'Unbekannter Spieler'}</span>
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    Gesamtwertung: {currencyFormatter.format(centsToEuros(participant.gesamtsieg_einsatz_betrag))} · Spieltag:{' '}
                    {matchdayCount} × {currencyFormatter.format(centsToEuros(participant.spieltags_einsatz_betrag))} ={' '}
                    {currencyFormatter.format(centsToEuros(matchdayCount * participant.spieltags_einsatz_betrag))}
                  </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500">Gesamteinsatz</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {currencyFormatter.format(
                        centsToEuros(participant.gesamtsieg_einsatz_betrag + participant.spieltags_einsatz_betrag * matchdayCount),
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button variant="secondary" onClick={() => setEditingParticipant(participant)}>
                        Bearbeiten
                      </Button>
                      <Button variant="danger" onClick={() => setRemovingParticipant(participant)}>
                        Entfernen
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

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

      {removingParticipant && (
        <ConfirmDialog
          title="Teilnehmer entfernen?"
          message={`Teilnehmer "${playersById.get(removingParticipant.player_id)?.name ?? 'Spieler'}" wird aus dieser Saison entfernt.`}
          confirmLabel="Entfernen"
          danger
          onConfirm={confirmRemove}
          onClose={() => setRemovingParticipant(undefined)}
        />
      )}

      {confirmingBulkRemove && (
        <ConfirmDialog
          title="Ausgewählte Teilnehmer entfernen?"
          message={`${selectedIds.size} Teilnehmer werden aus dieser Saison entfernt.`}
          confirmLabel="Entfernen"
          danger
          onConfirm={confirmBulkRemove}
          onClose={() => setConfirmingBulkRemove(false)}
        />
      )}
    </>
  )
}

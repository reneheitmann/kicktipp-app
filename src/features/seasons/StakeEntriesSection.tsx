import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CollapsibleSection } from '../../components/ui/CollapsibleSection'
import { StakeEntryForm } from './StakeEntryForm'
import { currencyFormatter } from '../../lib/format'
import { centsToEuros, type Cents } from '../../lib/money'
import type { Player } from '../../types/database'

export interface StakeEntry {
  id: string
  player_id: string
  betrag: Cents
}

interface StakeEntriesSectionProps {
  heading: string
  betragLabel: string
  entries: StakeEntry[]
  players: Player[]
  canManage: boolean
  /** Standard-Auf-/Zuklappzustand, siehe CollapsibleSection.tsx (Default: aufgeklappt). */
  defaultOpen?: boolean
  onAdd: (playerId: string, betrag: Cents) => Promise<void>
  onUpdate: (id: string, betrag: Cents) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export function StakeEntriesSection({
  heading,
  betragLabel,
  entries,
  players,
  canManage,
  defaultOpen = true,
  onAdd,
  onUpdate,
  onRemove,
}: StakeEntriesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<StakeEntry | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const playersById = new Map(players.map((p) => [p.id, p]))
  const assignedPlayerIds = new Set(entries.map((e) => e.player_id))
  const availablePlayers = players.filter((p) => !assignedPlayerIds.has(p.id))

  async function handleRemove(entry: StakeEntry) {
    const playerName = playersById.get(entry.player_id)?.name ?? 'Spieler'
    if (!confirm(`Eintrag für "${playerName}" wirklich entfernen?`)) return
    try {
      await onRemove(entry.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.')
    }
  }

  return (
    <CollapsibleSection
      title={heading}
      count={entries.length}
      defaultOpen={defaultOpen}
      actions={
        canManage && availablePlayers.length > 0 ? <Button onClick={() => setShowAddForm(true)}>+ Spieler</Button> : undefined
      }
    >
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Einträge.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 flex-1 truncate font-medium text-slate-900">
                {playersById.get(entry.player_id)?.name ?? 'Unbekannter Spieler'}
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="text-sm text-slate-700">{currencyFormatter.format(centsToEuros(entry.betrag))}</span>
                {canManage && (
                  <>
                    <Button variant="secondary" onClick={() => setEditingEntry(entry)}>
                      Bearbeiten
                    </Button>
                    <Button variant="danger" onClick={() => handleRemove(entry)}>
                      Entfernen
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAddForm && (
        <StakeEntryForm
          title={`${heading} – Spieler hinzufügen`}
          betragLabel={betragLabel}
          availablePlayers={availablePlayers}
          onClose={() => setShowAddForm(false)}
          onSubmit={async ({ playerId, betrag }) => onAdd(playerId, betrag)}
        />
      )}

      {editingEntry && (
        <StakeEntryForm
          title={`${heading} – bearbeiten`}
          betragLabel={betragLabel}
          fixedPlayer={playersById.get(editingEntry.player_id)}
          initialBetrag={editingEntry.betrag}
          onClose={() => setEditingEntry(undefined)}
          onSubmit={async ({ betrag }) => onUpdate(editingEntry.id, betrag)}
        />
      )}
    </CollapsibleSection>
  )
}

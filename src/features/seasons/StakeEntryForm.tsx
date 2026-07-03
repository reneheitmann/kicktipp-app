import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Player } from '../../types/database'

interface StakeEntryFormProps {
  title: string
  betragLabel: string
  /** Bei Bearbeitung eines bestehenden Eintrags vorausgewählt und nicht änderbar. */
  fixedPlayer?: Player
  /** Bei Neuanlage: Spieler, die noch keinen Eintrag haben. */
  availablePlayers?: Player[]
  initialBetrag?: number
  onClose: () => void
  onSubmit: (input: { playerId: string; betrag: number }) => Promise<void>
}

export function StakeEntryForm({
  title,
  betragLabel,
  fixedPlayer,
  availablePlayers,
  initialBetrag,
  onClose,
  onSubmit,
}: StakeEntryFormProps) {
  const [playerId, setPlayerId] = useState(fixedPlayer?.id ?? '')
  const [betrag, setBetrag] = useState(initialBetrag !== undefined ? String(initialBetrag) : '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedBetrag = Number(betrag.replace(',', '.'))
    if (!playerId) {
      setError('Bitte einen Spieler auswählen.')
      return
    }
    if (!Number.isFinite(parsedBetrag) || parsedBetrag < 0) {
      setError('Bitte einen gültigen Betrag (≥ 0) angeben.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ playerId, betrag: parsedBetrag })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="stake-player" className="mb-1 block text-sm font-medium text-slate-700">
            Spieler
          </label>
          {fixedPlayer ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-base text-slate-700">{fixedPlayer.name}</p>
          ) : (
            <select
              id="stake-player"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            >
              <option value="">Bitte wählen...</option>
              {availablePlayers?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="stake-betrag" className="mb-1 block text-sm font-medium text-slate-700">
            {betragLabel} (€)
          </label>
          <input
            id="stake-betrag"
            type="text"
            inputMode="decimal"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

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

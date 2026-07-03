import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { currencyFormatter } from '../../lib/format'
import type { Season } from '../../types/database'

interface TransferFormProps {
  playerName?: string
  fromSeason: Season
  currentOffen: number
  otherSeasons: Season[]
  onClose: () => void
  onSubmit: (input: { toSeasonId: string; betrag: number; notiz: string | null }) => Promise<void>
}

export function TransferForm({ playerName, fromSeason, currentOffen, otherSeasons, onClose, onSubmit }: TransferFormProps) {
  const [toSeasonId, setToSeasonId] = useState(otherSeasons.length === 1 ? otherSeasons[0].id : '')
  const [betrag, setBetrag] = useState(currentOffen.toFixed(2).replace('.', ','))
  const [notiz, setNotiz] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = Number(betrag.replace(',', '.'))
    if (!toSeasonId) {
      setError('Bitte eine Ziel-Saison auswählen.')
      return
    }
    if (!Number.isFinite(parsed) || parsed === 0) {
      setError('Bitte einen gültigen Betrag ungleich 0 angeben.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ toSeasonId, betrag: parsed, notiz: notiz.trim() || null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Übertrag fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={playerName ? `Saldo übertragen – ${playerName}` : 'Saldo übertragen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Aktueller Saldo in <span className="font-medium">{fromSeason.name}</span>:{' '}
          <span className={currentOffen > 0 ? 'font-medium text-amber-700' : 'font-medium text-emerald-700'}>
            {currentOffen > 0 ? 'Schuldet' : 'Guthaben'} {currencyFormatter.format(Math.abs(currentOffen))}
          </span>
          . Der Übertrag gleicht diese Saison auf 0 aus und übernimmt den Betrag als Startsaldo in die Ziel-Saison.
        </p>

        <div>
          <label htmlFor="transfer-season" className="mb-1 block text-sm font-medium text-slate-700">
            Ziel-Saison
          </label>
          <select
            id="transfer-season"
            value={toSeasonId}
            onChange={(e) => setToSeasonId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            <option value="">Bitte wählen...</option>
            {otherSeasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transfer-betrag" className="mb-1 block text-sm font-medium text-slate-700">
            Betrag (€)
          </label>
          <input
            id="transfer-betrag"
            type="text"
            inputMode="decimal"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">Positiv = Schuld, negativ = Guthaben (wie oben bei "Noch offen/Guthaben").</p>
        </div>

        <div>
          <label htmlFor="transfer-notiz" className="mb-1 block text-sm font-medium text-slate-700">
            Notiz (optional)
          </label>
          <input
            id="transfer-notiz"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Übertrage...' : 'Übertragen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

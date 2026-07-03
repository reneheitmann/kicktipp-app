import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Season, ZahlungTyp } from '../../types/database'

interface ZahlungFormProps {
  playerName?: string
  seasons: Season[]
  initialSeasonId?: string
  onClose: () => void
  onSubmit: (input: { typ: ZahlungTyp; seasonId: string; betrag: number; datum: string; notiz: string | null }) => Promise<void>
}

export function ZahlungForm({ playerName, seasons, initialSeasonId, onClose, onSubmit }: ZahlungFormProps) {
  const [typ, setTyp] = useState<ZahlungTyp>('einzahlung')
  const [seasonId, setSeasonId] = useState(initialSeasonId ?? (seasons.length === 1 ? seasons[0].id : ''))
  const [betrag, setBetrag] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10))
  const [notiz, setNotiz] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = Number(betrag.replace(',', '.'))
    if (!seasonId) {
      setError('Bitte eine Saison auswählen.')
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Bitte einen gültigen Betrag (> 0) angeben.')
      return
    }
    if (!datum) {
      setError('Bitte ein Datum angeben.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ typ, seasonId, betrag: parsed, datum, notiz: notiz.trim() || null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={playerName ? `Zahlung erfassen – ${playerName}` : 'Zahlung erfassen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Art</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTyp('einzahlung')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                typ === 'einzahlung'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              Einzahlung
            </button>
            <button
              type="button"
              onClick={() => setTyp('auszahlung')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                typ === 'auszahlung'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              Guthaben-Auszahlung
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="zahlung-season" className="mb-1 block text-sm font-medium text-slate-700">
            Saison
          </label>
          <select
            id="zahlung-season"
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            <option value="">Bitte wählen...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="zahlung-betrag" className="mb-1 block text-sm font-medium text-slate-700">
            Betrag (€)
          </label>
          <input
            id="zahlung-betrag"
            type="text"
            inputMode="decimal"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="zahlung-datum" className="mb-1 block text-sm font-medium text-slate-700">
            Datum
          </label>
          <input
            id="zahlung-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="zahlung-notiz" className="mb-1 block text-sm font-medium text-slate-700">
            Notiz (optional)
          </label>
          <input
            id="zahlung-notiz"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder={typ === 'einzahlung' ? 'z. B. Bar erhalten' : 'z. B. Bar ausgezahlt'}
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

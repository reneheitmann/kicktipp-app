import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Matchday } from '../../types/database'

interface MatchdayFormProps {
  matchday?: Matchday
  nextNummer: number
  onClose: () => void
  onSubmit: (input: { nummer: number; datum: string | null }) => Promise<void>
}

export function MatchdayForm({ matchday, nextNummer, onClose, onSubmit }: MatchdayFormProps) {
  const [nummer, setNummer] = useState(String(matchday?.nummer ?? nextNummer))
  const [datum, setDatum] = useState(matchday?.datum ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedNummer = Number(nummer)
    if (!Number.isInteger(parsedNummer) || parsedNummer <= 0) {
      setError('Spieltagsnummer muss eine positive Zahl sein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ nummer: parsedNummer, datum: datum || null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={matchday ? 'Spieltag bearbeiten' : 'Spieltag anlegen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="matchday-nummer" className="mb-1 block text-sm font-medium text-slate-700">
            Spieltag-Nummer
          </label>
          <input
            id="matchday-nummer"
            type="number"
            min={1}
            value={nummer}
            onChange={(e) => setNummer(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="matchday-datum" className="mb-1 block text-sm font-medium text-slate-700">
            Datum (optional)
          </label>
          <input
            id="matchday-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

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

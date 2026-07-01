import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Season } from '../../types/database'

interface CopySeasonDialogProps {
  season: Season
  onClose: () => void
  onSubmit: (input: {
    name: string
    startDate: string
    endDate: string
    copyPayoutRules: boolean
    copyPlayers: boolean
    copyMatchdays: boolean
  }) => Promise<void>
}

function addOneYear(dateStr: string): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function CopySeasonDialog({ season, onClose, onSubmit }: CopySeasonDialogProps) {
  const [name, setName] = useState(`${season.name} (Kopie)`)
  const [startDate, setStartDate] = useState(addOneYear(season.start_date))
  const [endDate, setEndDate] = useState(addOneYear(season.end_date))
  const [copyPayoutRules, setCopyPayoutRules] = useState(true)
  const [copyPlayers, setCopyPlayers] = useState(true)
  const [copyMatchdays, setCopyMatchdays] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    if (endDate < startDate) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), startDate, endDate, copyPayoutRules, copyPlayers, copyMatchdays })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kopieren fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Saison kopieren" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-slate-600">
          Legt eine neue Saison auf Basis von „{season.name}" an. Platzierungen, Buchungen und Zahlungen werden in
          jedem Fall <strong>nicht</strong> übernommen.
        </p>

        <div>
          <label htmlFor="copy-season-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name der neuen Saison
          </label>
          <input
            id="copy-season-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="copy-season-start" className="mb-1 block text-sm font-medium text-slate-700">
              Start
            </label>
            <input
              id="copy-season-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="copy-season-end" className="mb-1 block text-sm font-medium text-slate-700">
              Ende
            </label>
            <input
              id="copy-season-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Mitkopieren</span>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={copyPayoutRules}
                onChange={(e) => setCopyPayoutRules(e.target.checked)}
                className="h-5 w-5"
              />
              Gewinnverteilung
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={copyPlayers}
                onChange={(e) => setCopyPlayers(e.target.checked)}
                className="h-5 w-5"
              />
              Spieler (inkl. Einsätze)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={copyMatchdays}
                onChange={(e) => setCopyMatchdays(e.target.checked)}
                className="h-5 w-5"
              />
              Spieltage
            </label>
          </div>
          {copyMatchdays && !copyPlayers && (
            <p className="mt-1 text-xs text-amber-700">
              Spieltage ohne Spieler kopiert: Es entstehen noch keine Einsatz-Einträge. Diese lassen sich später je
              Spieltag über „fehlende Teilnehmer nachtragen" ergänzen, sobald Spieler hinzugefügt wurden.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Kopieren...' : 'Kopieren'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

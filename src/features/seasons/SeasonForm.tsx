import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatEuroInputValue, parseEuroInput, type Cents } from '../../lib/money'
import type { Season } from '../../types/database'

interface SeasonFormProps {
  season?: Season
  onClose: () => void
  onSubmit: (input: {
    name: string
    start_date: string
    end_date: string
    kicktipp_link: string
    default_gesamtsieg_einsatz_betrag: Cents
    default_spieltags_einsatz_betrag: Cents
  }) => Promise<void>
}

export function SeasonForm({ season, onClose, onSubmit }: SeasonFormProps) {
  const [name, setName] = useState(season?.name ?? '')
  const [startDate, setStartDate] = useState(season?.start_date ?? '')
  const [endDate, setEndDate] = useState(season?.end_date ?? '')
  const [kicktippLink, setKicktippLink] = useState(season?.kicktipp_link ?? '')
  const [defaultGesamtsiegBetrag, setDefaultGesamtsiegBetrag] = useState(
    season ? formatEuroInputValue(season.default_gesamtsieg_einsatz_betrag) : '',
  )
  const [defaultSpieltagsBetrag, setDefaultSpieltagsBetrag] = useState(
    season ? formatEuroInputValue(season.default_spieltags_einsatz_betrag) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate || !kicktippLink.trim()) {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    if (endDate < startDate) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }
    const parsedGesamtsieg = defaultGesamtsiegBetrag.trim() === '' ? 0 : parseEuroInput(defaultGesamtsiegBetrag)
    const parsedSpieltag = defaultSpieltagsBetrag.trim() === '' ? 0 : parseEuroInput(defaultSpieltagsBetrag)
    if (parsedGesamtsieg === null || parsedGesamtsieg < 0) {
      setError('Standard-Einsatz Gesamtwertung muss eine gültige Zahl (≥ 0) sein.')
      return
    }
    if (parsedSpieltag === null || parsedSpieltag < 0) {
      setError('Standard-Einsatz Spieltag muss eine gültige Zahl (≥ 0) sein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        kicktipp_link: kicktippLink.trim(),
        default_gesamtsieg_einsatz_betrag: parsedGesamtsieg,
        default_spieltags_einsatz_betrag: parsedSpieltag,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={season ? 'Saison bearbeiten' : 'Saison anlegen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="season-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="season-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. 2026/27"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="season-start" className="mb-1 block text-sm font-medium text-slate-700">
              Start
            </label>
            <input
              id="season-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="season-end" className="mb-1 block text-sm font-medium text-slate-700">
              Ende
            </label>
            <input
              id="season-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="season-kicktipp-link" className="mb-1 block text-sm font-medium text-slate-700">
            Link zur Kicktipp-Spielrunde
          </label>
          <input
            id="season-kicktipp-link"
            type="url"
            value={kicktippLink}
            onChange={(e) => setKicktippLink(e.target.value)}
            placeholder="https://www.kicktipp.de/..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="season-default-gesamtsieg" className="mb-1 block text-sm font-medium text-slate-700">
              Standard-Einsatz Gesamtwertung (€)
            </label>
            <input
              id="season-default-gesamtsieg"
              type="text"
              inputMode="decimal"
              value={defaultGesamtsiegBetrag}
              onChange={(e) => setDefaultGesamtsiegBetrag(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="season-default-spieltag" className="mb-1 block text-sm font-medium text-slate-700">
              Standard-Einsatz Spieltag (€)
            </label>
            <input
              id="season-default-spieltag"
              type="text"
              inputMode="decimal"
              value={defaultSpieltagsBetrag}
              onChange={(e) => setDefaultSpieltagsBetrag(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Wird beim Hinzufügen neuer Teilnehmer vorausgefüllt und dient als Referenz für die Abweichungs-Anzeige.
        </p>

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

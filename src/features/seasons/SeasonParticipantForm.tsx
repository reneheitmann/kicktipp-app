import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatEuroInputValue, parseEuroInput, type Cents } from '../../lib/money'
import type { Player, SeasonParticipant } from '../../types/database'

interface SeasonParticipantFormProps {
  participant?: SeasonParticipant
  fixedPlayer?: Player
  availablePlayers?: Player[]
  onClose: () => void
  onSubmit: (input: {
    playerId: string
    gesamtsiegBetrag: Cents
    spieltagsBetrag: Cents
  }) => Promise<void>
}

export function SeasonParticipantForm({
  participant,
  fixedPlayer,
  availablePlayers,
  onClose,
  onSubmit,
}: SeasonParticipantFormProps) {
  const [playerId, setPlayerId] = useState(fixedPlayer?.id ?? '')
  const [gesamtsiegBetrag, setGesamtsiegBetrag] = useState(
    participant ? formatEuroInputValue(participant.gesamtsieg_einsatz_betrag) : '',
  )
  const [spieltagsBetrag, setSpieltagsBetrag] = useState(
    participant ? formatEuroInputValue(participant.spieltags_einsatz_betrag) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedGesamtsieg = parseEuroInput(gesamtsiegBetrag)
    const parsedSpieltag = parseEuroInput(spieltagsBetrag)
    if (!playerId) {
      setError('Bitte einen Spieler auswählen.')
      return
    }
    if (parsedGesamtsieg === null || parsedGesamtsieg < 0) {
      setError('Gesamtwertung-Einsatz muss eine gültige Zahl (≥ 0) sein.')
      return
    }
    if (parsedSpieltag === null || parsedSpieltag < 0) {
      setError('Spieltags-Einsatz muss eine gültige Zahl (≥ 0) sein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ playerId, gesamtsiegBetrag: parsedGesamtsieg, spieltagsBetrag: parsedSpieltag })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={participant ? 'Teilnehmer bearbeiten' : 'Teilnehmer hinzufügen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="participant-player" className="mb-1 block text-sm font-medium text-slate-700">
            Spieler
          </label>
          {fixedPlayer ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-base text-slate-700">{fixedPlayer.name}</p>
          ) : (
            <select
              id="participant-player"
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
          <label htmlFor="participant-gesamtsieg" className="mb-1 block text-sm font-medium text-slate-700">
            Gesamtwertung-Einsatz (€, einmalig)
          </label>
          <input
            id="participant-gesamtsieg"
            type="text"
            inputMode="decimal"
            value={gesamtsiegBetrag}
            onChange={(e) => setGesamtsiegBetrag(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="participant-spieltag" className="mb-1 block text-sm font-medium text-slate-700">
            Spieltags-Einsatz (€, Standard pro Spieltag)
          </label>
          <input
            id="participant-spieltag"
            type="text"
            inputMode="decimal"
            value={spieltagsBetrag}
            onChange={(e) => setSpieltagsBetrag(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Wird automatisch für jeden neu angelegten Spieltag dieser Saison übernommen. 0 = nimmt nicht am
            Spieltags-Topf teil.
          </p>
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

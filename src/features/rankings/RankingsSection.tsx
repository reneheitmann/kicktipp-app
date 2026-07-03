import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { currencyFormatter } from '../../lib/format'
import type { Player } from '../../types/database'

export interface RankingEntry {
  id: string
  player_id: string
  rang: number
}

export interface PayoutAmount {
  player_id: string
  betrag: number
}

interface RankingsSectionProps {
  heading: string
  /** Spieler, die für diesen Spieltag/diese Saison einen Einsatz geleistet haben. */
  eligiblePlayerIds: string[]
  players: Player[]
  rankings: RankingEntry[]
  payouts: PayoutAmount[]
  canManage: boolean
  onSetRang: (playerId: string, rang: number) => Promise<void>
  onRemoveRang: (rankingId: string) => Promise<void>
  onCalculate: () => Promise<void>
}

export function RankingsSection({
  heading,
  eligiblePlayerIds,
  players,
  rankings,
  payouts,
  canManage,
  onSetRang,
  onRemoveRang,
  onCalculate,
}: RankingsSectionProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)

  const playersById = new Map(players.map((p) => [p.id, p]))
  const rankingsByPlayer = new Map(rankings.map((r) => [r.player_id, r]))
  const payoutsByPlayer = new Map(payouts.map((p) => [p.player_id, p.betrag]))

  const sortedPlayerIds = [...eligiblePlayerIds].sort((a, b) => {
    const rangA = rankingsByPlayer.get(a)?.rang ?? Number.MAX_SAFE_INTEGER
    const rangB = rankingsByPlayer.get(b)?.rang ?? Number.MAX_SAFE_INTEGER
    if (rangA !== rangB) return rangA - rangB
    return (playersById.get(a)?.name ?? '').localeCompare(playersById.get(b)?.name ?? '')
  })

  function draftValue(playerId: string): string {
    if (playerId in drafts) return drafts[playerId]
    return rankingsByPlayer.get(playerId)?.rang.toString() ?? ''
  }

  async function handleCommit(playerId: string) {
    const raw = draftValue(playerId).trim()
    const existing = rankingsByPlayer.get(playerId)

    if (raw === '') {
      if (existing) {
        try {
          await onRemoveRang(existing.id)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.')
        }
      }
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[playerId]
        return next
      })
      return
    }

    const rang = Number(raw)
    if (!Number.isInteger(rang) || rang <= 0) {
      setError('Platzierung muss eine positive ganze Zahl sein.')
      return
    }
    try {
      await onSetRang(playerId, rang)
      setError(null)
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[playerId]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    }
  }

  async function handleCalculate() {
    if (!confirm('Gewinne jetzt berechnen und verbuchen? Eine vorherige Berechnung wird dabei ersetzt.')) return
    setCalculating(true)
    setError(null)
    try {
      await onCalculate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Berechnung fehlgeschlagen.')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
        {canManage && (
          <Button onClick={handleCalculate} disabled={calculating}>
            {calculating ? 'Berechne...' : 'Gewinne berechnen'}
          </Button>
        )}
      </div>

      {canManage && (
        <p className="mb-2 text-xs text-slate-500">
          Bei Gleichstand (mehrere Spieler auf demselben Platz) bitte den nächsten freien Platz für den
          Folge-Rang überspringen, z. B. zwei Spieler auf Platz 1, danach weiter mit Platz 3 – sonst stimmt die
          Gewinnverteilung nicht.
        </p>
      )}

      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}

      {sortedPlayerIds.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Teilnehmer.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {sortedPlayerIds.map((playerId) => {
            const payout = payoutsByPlayer.get(playerId)
            return (
              <li key={playerId} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 truncate font-medium text-slate-900">
                  {playersById.get(playerId)?.name ?? 'Unbekannter Spieler'}
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  {payout !== undefined && (
                    <span className="text-sm font-medium text-emerald-700">{currencyFormatter.format(payout)}</span>
                  )}
                  {canManage ? (
                    <input
                      type="number"
                      min={1}
                      placeholder="Platz"
                      value={draftValue(playerId)}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [playerId]: e.target.value }))}
                      onBlur={() => handleCommit(playerId)}
                      className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm text-slate-700">
                      {rankingsByPlayer.get(playerId) ? `Platz ${rankingsByPlayer.get(playerId)?.rang}` : '–'}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

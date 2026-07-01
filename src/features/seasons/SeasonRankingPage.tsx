import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { listPlayers } from '../players/playersApi'
import { getSeason } from './seasonsApi'
import { listSeasonParticipants } from './seasonParticipantsApi'
import { RankingsSection } from '../rankings/RankingsSection'
import {
  calculateSeasonPayout,
  deleteSeasonPayoutDistribution,
  listSeasonPayouts,
  listSeasonRankings,
  removeSeasonRanking,
  setSeasonRanking,
} from '../rankings/seasonRankingsApi'
import type { Player, Season, SeasonParticipant, SeasonRanking, Transaction } from '../../types/database'

export function SeasonRankingPage() {
  const { seasonId } = useParams<{ seasonId: string }>()
  const { can } = useAuth()
  const canManage = can('rankings.manage')
  // Löschen betrifft zwei Tabellen mit unterschiedlichen Rechten (Prozent-
  // Verteilung -> payouts.manage, bereits verbuchte Gewinne -> rankings.manage)
  // – ohne beide Rechte würde die RPC an der jeweils fehlenden RLS-Policy
  // scheitern, daher hier vorab beide prüfen.
  const canDeleteDistribution = can('payouts.manage') && can('rankings.manage')
  const [deleting, setDeleting] = useState(false)

  const [season, setSeason] = useState<Season | null>(null)
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [rankings, setRankings] = useState<SeasonRanking[]>([])
  const [payouts, setPayouts] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    try {
      const [seasonData, participantData, playerData, rankingData, payoutData] = await Promise.all([
        getSeason(seasonId),
        listSeasonParticipants(seasonId),
        listPlayers(),
        listSeasonRankings(seasonId),
        listSeasonPayouts(seasonId),
      ])
      setSeason(seasonData)
      setParticipants(participantData)
      setPlayers(playerData)
      setRankings(rankingData)
      setPayouts(payoutData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gesamtwertung konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleDeleteDistribution() {
    if (!seasonId) return
    if (
      !confirm(
        'Gewinnverteilung (Prozentsätze) und alle bereits verbuchten Gewinne dieser Gesamtwertung wirklich unwiderruflich löschen?',
      )
    ) {
      return
    }
    setDeleting(true)
    setError(null)
    try {
      await deleteSeasonPayoutDistribution(seasonId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  if (!season) {
    return <p className="p-4 text-sm text-red-600 sm:p-6">{error ?? 'Saison nicht gefunden.'}</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <Link to={`/seasons/${season.id}`} className="mb-3 inline-block text-sm text-slate-500 hover:underline">
        ← Zurück zur Saison
      </Link>

      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Gesamtwertung – {season.name}</h1>
        <Badge tone={season.gesamtwertung_status === 'abgerechnet' ? 'positive' : 'warning'}>
          {season.gesamtwertung_status}
        </Badge>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {(canManage || canDeleteDistribution) && (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
          {canManage && (
            <Link to={`/import?seasonId=${season.id}`} className="text-sm font-medium text-slate-600 hover:underline">
              Platzierungen aus Kicktipp importieren →
            </Link>
          )}
          {canDeleteDistribution && (
            <Button variant="danger" onClick={handleDeleteDistribution} disabled={deleting}>
              {deleting ? 'Löschen...' : 'Gewinnverteilung & Gewinne löschen'}
            </Button>
          )}
        </div>
      )}

      <RankingsSection
        heading="Gesamtwertung-Gewinnberechnung"
        // Für Admin/Spielleiter: alle Teilnehmer (auch ohne Platzierung, damit
        // sie eingetragen werden kann). Für normale User liefert RLS bei
        // season_participants nur die eigene Zeile (Einsatz bleibt privat) –
        // die öffentlich sichtbare Platzierung wird stattdessen aus den
        // (für alle lesbaren) season_rankings abgeleitet.
        eligiblePlayerIds={canManage ? participants.map((p) => p.player_id) : rankings.map((r) => r.player_id)}
        players={players}
        rankings={rankings}
        payouts={payouts.map((p) => ({ player_id: p.player_id, betrag: p.betrag }))}
        canManage={canManage}
        onSetRang={async (playerId, rang) => {
          await setSeasonRanking(season.id, playerId, rang)
          await reload()
        }}
        onRemoveRang={async (id) => {
          await removeSeasonRanking(id)
          await reload()
        }}
        onCalculate={async () => {
          await calculateSeasonPayout(season.id)
          await reload()
        }}
      />
    </div>
  )
}

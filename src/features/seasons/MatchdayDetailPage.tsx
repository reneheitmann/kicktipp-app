import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { listPlayers } from '../players/playersApi'
import { StakeEntriesSection } from './StakeEntriesSection'
import { getMatchday } from './matchdaysApi'
import { getSeason } from './seasonsApi'
import { isSeasonLocked } from './seasonStatus'
import {
  addMatchdayEntry,
  bulkAddMatchdayEntries,
  listMatchdayEntries,
  removeMatchdayEntry,
  updateMatchdayEntry,
} from './matchdayEntriesApi'
import { listSeasonParticipants } from './seasonParticipantsApi'
import { RankingsSection } from '../rankings/RankingsSection'
import {
  calculateMatchdayPayout,
  listMatchdayPayouts,
  listMatchdayRankings,
  removeMatchdayRanking,
  setMatchdayRanking,
} from '../rankings/matchdayRankingsApi'
import type { Matchday, MatchdayEntry, MatchdayRanking, Player, Season, SeasonParticipant, Transaction } from '../../types/database'

export function MatchdayDetailPage() {
  const { seasonId, matchdayId } = useParams<{ seasonId: string; matchdayId: string }>()
  const { can } = useAuth()
  const canManageEntries = can('matchday_entries.manage')
  const canManageRankings = can('rankings.manage')

  const [matchday, setMatchday] = useState<Matchday | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [entries, setEntries] = useState<MatchdayEntry[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [seasonParticipants, setSeasonParticipants] = useState<SeasonParticipant[]>([])
  const [rankings, setRankings] = useState<MatchdayRanking[]>([])
  const [payouts, setPayouts] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bulkAdding, setBulkAdding] = useState(false)

  const reload = useCallback(async () => {
    if (!matchdayId) return
    setLoading(true)
    try {
      const matchdayData = await getMatchday(matchdayId)
      if (!matchdayData) {
        setMatchday(null)
        setError(null)
        return
      }
      const [entryData, playerData, participantData, rankingData, payoutData, seasonData] = await Promise.all([
        listMatchdayEntries(matchdayId),
        listPlayers(),
        listSeasonParticipants(matchdayData.season_id),
        listMatchdayRankings(matchdayId),
        listMatchdayPayouts(matchdayId),
        getSeason(matchdayData.season_id),
      ])
      setMatchday(matchdayData)
      setEntries(entryData)
      setPlayers(playerData)
      setSeasonParticipants(participantData)
      setRankings(rankingData)
      setPayouts(payoutData)
      setSeason(seasonData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spieltag konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [matchdayId])

  useEffect(() => {
    reload()
  }, [reload])

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  if (!matchday) {
    return <p role="alert" className="p-4 text-sm text-red-600 sm:p-6">{error ?? 'Spieltag nicht gefunden.'}</p>
  }

  const entryPlayerIds = new Set(entries.map((e) => e.player_id))
  const missingParticipants = seasonParticipants.filter((p) => !entryPlayerIds.has(p.player_id))

  // Gesperrt, wenn entweder die Saison abgeschlossen/archiviert ist oder
  // dieser Spieltag selbst schon abgerechnet wurde (siehe Migration 0045).
  const locked = matchday.status === 'abgerechnet' || (season ? isSeasonLocked(season.status) : false)

  async function handleBulkAdd() {
    if (missingParticipants.length === 0) return
    setBulkAdding(true)
    setError(null)
    try {
      await bulkAddMatchdayEntries(
        matchday!.id,
        missingParticipants.map((p) => ({ player_id: p.player_id, spieltags_einsatz_betrag: p.spieltags_einsatz_betrag })),
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nachtragen fehlgeschlagen.')
    } finally {
      setBulkAdding(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <Link to={`/seasons/${seasonId}`} className="mb-3 inline-block text-sm text-slate-500 hover:underline">
        ← Zurück zur Saison
      </Link>

      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Spieltag {matchday.nummer}</h1>
        <Badge tone={matchday.status === 'abgerechnet' ? 'positive' : 'warning'}>{matchday.status}</Badge>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      {locked && (canManageEntries || canManageRankings) && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {matchday.status === 'abgerechnet'
            ? 'Dieser Spieltag ist abgerechnet und kann nicht mehr geändert werden.'
            : 'Die Saison dieses Spieltags ist abgeschlossen/archiviert – keine Änderungen mehr möglich.'}
        </p>
      )}

      {canManageEntries && !locked && missingParticipants.length > 0 && (
        <div className="mb-3 flex justify-end">
          <Button variant="secondary" onClick={handleBulkAdd} disabled={bulkAdding}>
            {bulkAdding
              ? 'Nachtragen...'
              : `${missingParticipants.length} fehlende Teilnehmer mit Standard-Einsatz nachtragen`}
          </Button>
        </div>
      )}

      <StakeEntriesSection
        heading="Teilnehmer & Spieltags-Einsatz"
        betragLabel="Spieltags-Einsatz"
        entries={entries.map((e) => ({ id: e.id, player_id: e.player_id, betrag: e.spieltags_einsatz_betrag }))}
        players={players}
        canManage={canManageEntries && !locked}
        onAdd={async (playerId, betrag) => {
          await addMatchdayEntry({ matchday_id: matchday.id, player_id: playerId, spieltags_einsatz_betrag: betrag })
          await reload()
        }}
        onUpdate={async (id, betrag) => {
          await updateMatchdayEntry(id, betrag)
          await reload()
        }}
        onRemove={async (id) => {
          await removeMatchdayEntry(id)
          await reload()
        }}
      />

      {canManageRankings && !locked && (
        <div className="mb-3 flex justify-end">
          <Link
            to={`/import?seasonId=${seasonId}&matchdayId=${matchday.id}`}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Platzierungen aus Kicktipp importieren →
          </Link>
        </div>
      )}

      <RankingsSection
        heading="Platzierungen & Gewinnberechnung"
        // Für Admin/Spielleiter: alle Teilnehmer (auch ohne Platzierung, damit
        // sie eingetragen werden kann). Für normale User liefert RLS bei
        // matchday_entries nur die eigene Zeile (Einsatz bleibt privat) – die
        // öffentlich sichtbare Platzierung wird stattdessen aus den (für alle
        // lesbaren) matchday_rankings abgeleitet.
        eligiblePlayerIds={canManageRankings ? entries.map((e) => e.player_id) : rankings.map((r) => r.player_id)}
        players={players}
        rankings={rankings}
        payouts={payouts.map((p) => ({ player_id: p.player_id, betrag: p.betrag }))}
        canManage={canManageRankings && !locked}
        onSetRang={async (playerId, rang) => {
          await setMatchdayRanking(matchday.id, playerId, rang)
          await reload()
        }}
        onRemoveRang={async (id) => {
          await removeMatchdayRanking(id)
          await reload()
        }}
        onCalculate={async () => {
          await calculateMatchdayPayout(matchday.id)
          await reload()
        }}
      />
    </div>
  )
}

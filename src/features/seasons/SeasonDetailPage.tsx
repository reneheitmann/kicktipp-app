import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../auth/useAuth'
import { listPlayers } from '../players/playersApi'
import { SeasonForm } from './SeasonForm'
import { MatchdayForm } from './MatchdayForm'
import { DeleteSeasonDialog } from './DeleteSeasonDialog'
import { CopySeasonDialog } from './CopySeasonDialog'
import { ImportSpieltageDialog } from './ImportSpieltageDialog'
import { SeasonParticipantsSection } from './SeasonParticipantsSection'
import { PayoutRulesEditor } from '../payouts/PayoutRulesEditor'
import { copySeason, deleteSeason, getSeason, setSeasonStatus, updateSeason } from './seasonsApi'
import { createMatchday, deleteMatchday, listMatchdays, updateMatchday } from './matchdaysApi'
import {
  addSeasonParticipant,
  listSeasonParticipants,
  removeSeasonParticipant,
  updateSeasonParticipant,
} from './seasonParticipantsApi'
import { RankingsSection } from '../rankings/RankingsSection'
import {
  calculateSeasonPayout,
  listSeasonPayouts,
  listSeasonRankings,
  removeSeasonRanking,
  setSeasonRanking,
} from '../rankings/seasonRankingsApi'
import type { Matchday, Player, Season, SeasonParticipant, SeasonRanking, Transaction } from '../../types/database'

export function SeasonDetailPage() {
  const { seasonId } = useParams<{ seasonId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canManage = profile?.role === 'admin' || profile?.role === 'spielleiter'

  const [season, setSeason] = useState<Season | null>(null)
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [rankings, setRankings] = useState<SeasonRanking[]>([])
  const [payouts, setPayouts] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [showImportSpieltageDialog, setShowImportSpieltageDialog] = useState(false)
  const [editingMatchday, setEditingMatchday] = useState<Matchday | undefined>(undefined)
  const [showMatchdayForm, setShowMatchdayForm] = useState(false)

  const reload = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    try {
      const [seasonData, matchdayData, participantData, playerData, rankingData, payoutData] = await Promise.all([
        getSeason(seasonId),
        listMatchdays(seasonId),
        listSeasonParticipants(seasonId),
        listPlayers(),
        listSeasonRankings(seasonId),
        listSeasonPayouts(seasonId),
      ])
      setSeason(seasonData)
      setMatchdays(matchdayData)
      setParticipants(participantData)
      setPlayers(playerData)
      setRankings(rankingData)
      setPayouts(payoutData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saison konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleToggleSeasonStatus() {
    if (!season) return
    const next = season.status === 'aktiv' ? 'abgeschlossen' : 'aktiv'
    try {
      await setSeasonStatus(season.id, next)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.')
    }
  }

  async function handleToggleMatchdayStatus(matchday: Matchday) {
    const next = matchday.status === 'offen' ? 'abgerechnet' : 'offen'
    try {
      await updateMatchday(matchday.id, { status: next })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.')
    }
  }

  async function handleDeleteMatchday(matchday: Matchday) {
    if (!confirm(`Spieltag ${matchday.nummer} wirklich löschen?`)) return
    try {
      await deleteMatchday(matchday.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  if (!season) {
    return <p className="p-4 text-sm text-red-600 sm:p-6">{error ?? 'Saison nicht gefunden.'}</p>
  }

  const nextNummer = matchdays.length > 0 ? Math.max(...matchdays.map((m) => m.nummer)) + 1 : 1

  return (
    <div className="p-4 sm:p-6">
      <Link to="/seasons" className="mb-3 inline-block text-sm text-slate-500 hover:underline">
        ← Alle Saisons
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{season.name}</h1>
            <Badge tone={season.status === 'aktiv' ? 'positive' : 'neutral'}>{season.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {season.start_date} – {season.end_date}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link to={`/seasons/${season.id}/guthaben`}>
            <Button variant="secondary">Guthaben</Button>
          </Link>
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => setShowSeasonForm(true)}>
                Bearbeiten
              </Button>
              <Button variant="secondary" onClick={() => setShowCopyDialog(true)}>
                Kopieren
              </Button>
              <Button variant="secondary" onClick={handleToggleSeasonStatus}>
                {season.status === 'aktiv' ? 'Abschließen' : 'Reaktivieren'}
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <SeasonParticipantsSection
        participants={participants}
        players={players}
        canManage={canManage}
        onAdd={async ({ playerId, gesamtsiegBetrag, spieltagsBetrag }) => {
          await addSeasonParticipant({
            season_id: season.id,
            player_id: playerId,
            gesamtsieg_einsatz_betrag: gesamtsiegBetrag,
            spieltags_einsatz_betrag: spieltagsBetrag,
          })
          await reload()
        }}
        onUpdate={async (id, { gesamtsiegBetrag, spieltagsBetrag }) => {
          await updateSeasonParticipant(id, {
            gesamtsieg_einsatz_betrag: gesamtsiegBetrag,
            spieltags_einsatz_betrag: spieltagsBetrag,
          })
          await reload()
        }}
        onRemove={async (id) => {
          await removeSeasonParticipant(id)
          await reload()
        }}
      />

      <div className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Gewinnverteilung</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PayoutRulesEditor seasonId={season.id} typ="gesamtsieg" title="Gesamtsieg" canManage={canManage} />
          <PayoutRulesEditor seasonId={season.id} typ="spieltag" title="Spieltag" canManage={canManage} />
        </div>
      </div>

      {canManage && (
        <div className="mb-3 flex justify-end">
          <Link
            to={`/import?seasonId=${season.id}`}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Platzierungen aus Kicktipp importieren →
          </Link>
        </div>
      )}

      <RankingsSection
        heading="Saison-Platzierungen & Gesamtsieg-Gewinnberechnung"
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Spieltage</h2>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImportSpieltageDialog(true)}>
              Aus dem Internet importieren
            </Button>
            <Button
              onClick={() => {
                setEditingMatchday(undefined)
                setShowMatchdayForm(true)
              }}
            >
              + Spieltag
            </Button>
          </div>
        )}
      </div>

      {canManage && matchdays.length === 0 && participants.some((p) => p.spieltags_einsatz_betrag > 0) && (
        <p className="mb-3 text-xs text-slate-400">
          Der Spieltags-Einsatz der Teilnehmer wird automatisch für jeden neuen Spieltag übernommen.
        </p>
      )}

      {matchdays.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Spieltage angelegt.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {matchdays.map((matchday) => (
            <li key={matchday.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link to={`/seasons/${season.id}/matchdays/${matchday.id}`} className="min-w-0 hover:underline">
                <p className="font-medium text-slate-900">Spieltag {matchday.nummer}</p>
                <p className="truncate text-sm text-slate-500">{matchday.datum ?? 'Kein Datum hinterlegt'}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={matchday.status === 'abgerechnet' ? 'positive' : 'warning'}>{matchday.status}</Badge>
                {canManage && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingMatchday(matchday)
                        setShowMatchdayForm(true)
                      }}
                    >
                      Bearbeiten
                    </Button>
                    <Button variant="secondary" onClick={() => handleToggleMatchdayStatus(matchday)}>
                      {matchday.status === 'offen' ? 'Abrechnen' : 'Öffnen'}
                    </Button>
                    <Button variant="danger" onClick={() => handleDeleteMatchday(matchday)}>
                      Löschen
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showSeasonForm && (
        <SeasonForm
          season={season}
          onClose={() => setShowSeasonForm(false)}
          onSubmit={async (input) => {
            await updateSeason(season.id, input)
            await reload()
          }}
        />
      )}

      {showMatchdayForm && (
        <MatchdayForm
          matchday={editingMatchday}
          nextNummer={nextNummer}
          onClose={() => setShowMatchdayForm(false)}
          onSubmit={async (input) => {
            if (editingMatchday) {
              await updateMatchday(editingMatchday.id, input)
            } else {
              await createMatchday({ season_id: season.id, ...input })
            }
            await reload()
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteSeasonDialog
          season={season}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            await deleteSeason(season.id)
            navigate('/seasons')
          }}
        />
      )}

      {showCopyDialog && (
        <CopySeasonDialog
          season={season}
          onClose={() => setShowCopyDialog(false)}
          onSubmit={async (input) => {
            const newSeasonId = await copySeason({
              sourceSeasonId: season.id,
              name: input.name,
              startDate: input.startDate,
              endDate: input.endDate,
              copyPayoutRules: input.copyPayoutRules,
              copyPlayers: input.copyPlayers,
              copyMatchdays: input.copyMatchdays,
            })
            navigate(`/seasons/${newSeasonId}`)
          }}
        />
      )}

      {showImportSpieltageDialog && (
        <ImportSpieltageDialog
          season={season}
          existingNummern={new Set(matchdays.map((m) => m.nummer))}
          onClose={() => setShowImportSpieltageDialog(false)}
          onImported={reload}
        />
      )}
    </div>
  )
}

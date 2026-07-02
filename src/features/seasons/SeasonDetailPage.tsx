import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { CollapsibleSection } from '../../components/ui/CollapsibleSection'
import { SearchInput } from '../../components/ui/SearchInput'
import { currencyFormatter, formatGermanDate } from '../../lib/format'
import { useAuth } from '../auth/useAuth'
import { listPlayers } from '../players/playersApi'
import { listPlayerProfileLinks } from '../players/playerProfileLinksApi'
import { SeasonForm } from './SeasonForm'
import { MatchdayForm } from './MatchdayForm'
import { DeleteSeasonDialog } from './DeleteSeasonDialog'
import { CopySeasonDialog } from './CopySeasonDialog'
import { ImportSpieltageDialog } from './ImportSpieltageDialog'
import { SeasonParticipantsSection } from './SeasonParticipantsSection'
import { PayoutRulesEditor } from '../payouts/PayoutRulesEditor'
import { copySeason, deleteSeason, getSeason, setGesamtwertungStatus, setSeasonStatus, updateSeason } from './seasonsApi'
import { createMatchday, deleteMatchday, listMatchdays, updateMatchday } from './matchdaysApi'
import {
  addSeasonParticipant,
  listSeasonParticipants,
  removeSeasonParticipant,
  updateSeasonParticipant,
} from './seasonParticipantsApi'
import { listSeasonPayouts, listSeasonRankings } from '../rankings/seasonRankingsApi'
import { listMatchdayRankingsForMatchdays } from '../rankings/matchdayRankingsApi'
import { listSeasonTransactions } from '../balances/balancesApi'
import type {
  Matchday,
  MatchdayRanking,
  Player,
  PlayerProfileLink,
  Season,
  SeasonParticipant,
  SeasonRanking,
  Transaction,
} from '../../types/database'

// Global (nicht pro Saison) gemerkt – wer einen Spieler als Favorit
// markiert, will dessen Platzierungen/Gewinne meist über alle Saisons
// hinweg als Standard sehen, nicht nur in der Saison, in der markiert wurde.
const FAVORITE_PLAYER_STORAGE_KEY = 'kicktipp_favorite_player_id'

export function SeasonDetailPage() {
  const { seasonId } = useParams<{ seasonId: string }>()
  const navigate = useNavigate()
  const { profile, can } = useAuth()
  const canManageSeason = can('seasons.manage')
  const canManageParticipants = can('participants.manage')
  const canManagePayouts = can('payouts.manage')
  const canManageMatchdays = can('matchdays.manage')

  const [season, setSeason] = useState<Season | null>(null)
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [rankings, setRankings] = useState<SeasonRanking[]>([])
  const [payouts, setPayouts] = useState<Transaction[]>([])
  const [matchdayRankings, setMatchdayRankings] = useState<MatchdayRanking[]>([])
  const [seasonTransactions, setSeasonTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [showImportSpieltageDialog, setShowImportSpieltageDialog] = useState(false)
  const [editingMatchday, setEditingMatchday] = useState<Matchday | undefined>(undefined)
  const [showMatchdayForm, setShowMatchdayForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'abgerechnet' | 'offen' | 'alle'>('abgerechnet')
  const [sortOrder, setSortOrder] = useState<'neueste' | 'aelteste'>('neueste')
  const [matchdaySearch, setMatchdaySearch] = useState('')
  const [favoritePlayerId, setFavoritePlayerId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(FAVORITE_PLAYER_STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [profileLinks, setProfileLinks] = useState<PlayerProfileLink[]>([])

  const reload = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    try {
      const [seasonData, matchdayData, participantData, playerData, rankingData, payoutData, transactionData, linkData] =
        await Promise.all([
          getSeason(seasonId),
          listMatchdays(seasonId),
          listSeasonParticipants(seasonId),
          listPlayers(),
          listSeasonRankings(seasonId),
          listSeasonPayouts(seasonId),
          listSeasonTransactions(seasonId),
          listPlayerProfileLinks(),
        ])
      const matchdayRankingData = await listMatchdayRankingsForMatchdays(matchdayData.map((m) => m.id))
      setProfileLinks(linkData)
      setSeason(seasonData)
      setMatchdays(matchdayData)
      setParticipants(participantData)
      setPlayers(playerData)
      setRankings(rankingData)
      setPayouts(payoutData)
      setSeasonTransactions(transactionData)
      setMatchdayRankings(matchdayRankingData)
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

  // Standardauswahl für den Spieler, dessen Platzierungen/Gewinne in
  // "Spieltage" angezeigt werden: bei genau einem Teilnehmer immer dieser,
  // sonst der als Favorit markierte (falls Teilnehmer dieser Saison),
  // sonst der eigene verknüpfte Spieler (falls Teilnehmer), sonst keiner.
  useEffect(() => {
    if (participants.length === 1) {
      setSelectedPlayerId(participants[0]?.player_id ?? '')
      return
    }
    if (favoritePlayerId && participants.some((p) => p.player_id === favoritePlayerId)) {
      setSelectedPlayerId(favoritePlayerId)
      return
    }
    // Ein Login kann mit mehreren Spielern verknüpft sein – hier genügt der
    // erste eigene Spieler, der auch Teilnehmer dieser Saison ist.
    const ownPlayerIds = new Set(profileLinks.filter((l) => l.profile_id === profile?.id).map((l) => l.player_id))
    const ownParticipant = participants.find((p) => ownPlayerIds.has(p.player_id))
    setSelectedPlayerId(ownParticipant?.player_id ?? '')
  }, [participants, favoritePlayerId, profileLinks, profile?.id])

  function toggleFavoritePlayer(playerId: string) {
    setFavoritePlayerId((prev) => {
      const next = prev === playerId ? null : playerId
      try {
        if (next) localStorage.setItem(FAVORITE_PLAYER_STORAGE_KEY, next)
        else localStorage.removeItem(FAVORITE_PLAYER_STORAGE_KEY)
      } catch {
        // z. B. privates Fenster ohne Storage-Zugriff – Favorit bleibt dann
        // nur für die aktuelle Sitzung erhalten, kein Absturz nötig.
      }
      return next
    })
  }

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

  async function handleToggleGesamtwertungStatus() {
    if (!season) return
    const next = season.gesamtwertung_status === 'offen' ? 'abgerechnet' : 'offen'
    if (
      next === 'offen' &&
      !confirm('Gesamtwertung wieder öffnen? Ein bereits berechneter Gewinn für diese Saison wird dabei entfernt (Platzierungen bleiben erhalten).')
    ) {
      return
    }
    try {
      await setGesamtwertungStatus(season.id, next)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.')
    }
  }

  async function handleToggleMatchdayStatus(matchday: Matchday) {
    const next = matchday.status === 'offen' ? 'abgerechnet' : 'offen'
    if (
      next === 'offen' &&
      !confirm('Spieltag wieder öffnen? Ein bereits berechneter Gewinn für diesen Spieltag wird dabei entfernt (Platzierungen bleiben erhalten).')
    ) {
      return
    }
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

  const playersById = new Map(players.map((p) => [p.id, p]))
  const selectedOverallRanking = selectedPlayerId ? rankings.find((r) => r.player_id === selectedPlayerId) : undefined
  const selectedOverallPayout = selectedPlayerId ? payouts.find((p) => p.player_id === selectedPlayerId) : undefined

  const nextNummer = matchdays.length > 0 ? Math.max(...matchdays.map((m) => m.nummer)) + 1 : 1

  const matchdaySearchTerm = matchdaySearch.trim().toLowerCase()
  const filteredSortedMatchdays = matchdays
    .filter((m) => statusFilter === 'alle' || m.status === statusFilter)
    .filter(
      (m) =>
        !matchdaySearchTerm ||
        `spieltag ${m.nummer}`.includes(matchdaySearchTerm) ||
        (m.datum ?? '').toLowerCase().includes(matchdaySearchTerm),
    )
    .sort((a, b) => (sortOrder === 'neueste' ? b.nummer - a.nummer : a.nummer - b.nummer))
  const showGesamtwertungRow = statusFilter === 'alle' || season.gesamtwertung_status === statusFilter

  // Gesamtgewinnsumme des ausgewählten Spielers über alle bereits
  // abgerechneten Spieltage (unabhängig vom aktuell gewählten Filter) plus
  // die Gesamtwertung, sofern auch diese schon abgerechnet ist.
  const abgerechnetMatchdayIds = new Set(matchdays.filter((m) => m.status === 'abgerechnet').map((m) => m.id))
  const selectedMatchdayGewinnSumme = selectedPlayerId
    ? seasonTransactions
        .filter(
          (t) =>
            t.typ === 'gewinn_spieltag' &&
            t.player_id === selectedPlayerId &&
            abgerechnetMatchdayIds.has(t.matchday_id ?? ''),
        )
        .reduce((sum, t) => sum + t.betrag, 0)
    : 0
  const selectedGesamtgewinnsumme =
    selectedMatchdayGewinnSumme + (season.gesamtwertung_status === 'abgerechnet' ? (selectedOverallPayout?.betrag ?? 0) : 0)

  return (
    <div className="p-4 sm:p-6">
      <Link to="/seasons" className="mb-3 inline-block text-sm text-slate-500 hover:underline">
        ← Alle Saisons
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{season.name}</h1>
            <Badge tone={season.status === 'aktiv' ? 'positive' : 'neutral'}>{season.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {season.start_date} – {season.end_date}
          </p>
          {season.kicktipp_link && (
            <a
              href={season.kicktipp_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-[var(--color-primary)] hover:underline"
            >
              Zur Kicktipp-Spielrunde ↗
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link to={`/seasons/${season.id}/guthaben`}>
            <Button variant="secondary">Guthaben</Button>
          </Link>
          {canManageSeason && (
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

      <CollapsibleSection title="Gewinnverteilung" defaultOpen={false}>
        <div className="grid gap-4 sm:grid-cols-2">
          <PayoutRulesEditor seasonId={season.id} typ="spieltag" title="Spieltag" canManage={canManagePayouts} />
          <PayoutRulesEditor seasonId={season.id} typ="gesamtsieg" title="Gesamtwertung" canManage={canManagePayouts} />
        </div>
      </CollapsibleSection>

      <SeasonParticipantsSection
        participants={participants}
        players={players}
        matchdayCount={matchdays.length}
        canManage={canManageParticipants}
        favoritePlayerId={favoritePlayerId}
        onToggleFavorite={toggleFavoritePlayer}
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

      <CollapsibleSection
        title="Spieltage"
        count={matchdays.length}
        actions={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-900 focus:outline-none"
            >
              <option value="abgerechnet">Nur abgerechnete</option>
              <option value="offen">Nur offene</option>
              <option value="alle">Alle</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-900 focus:outline-none"
            >
              <option value="neueste">Neueste zuerst</option>
              <option value="aelteste">Älteste zuerst</option>
            </select>
            {participants.length > 1 && (
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="">Kein Spieler ausgewählt</option>
                {participants.map((p) => (
                  <option key={p.player_id} value={p.player_id}>
                    {playersById.get(p.player_id)?.name ?? 'Unbekannt'}
                  </option>
                ))}
              </select>
            )}
            {selectedPlayerId && (
              <span className="text-sm text-slate-500">
                Gesamtgewinn:{' '}
                <span className="font-medium text-emerald-600">{currencyFormatter.format(selectedGesamtgewinnsumme)}</span>
              </span>
            )}
            {canManageMatchdays && (
              <>
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
              </>
            )}
          </>
        }
      >
        {canManageMatchdays && matchdays.length === 0 && participants.some((p) => p.spieltags_einsatz_betrag > 0) && (
          <p className="mb-3 text-xs text-slate-400">
            Der Spieltags-Einsatz der Teilnehmer wird automatisch für jeden neuen Spieltag übernommen.
          </p>
        )}

        {matchdays.length > 0 && (
          <SearchInput
            value={matchdaySearch}
            onChange={setMatchdaySearch}
            placeholder="Spieltag suchen (Nummer oder Datum)..."
            className="mb-3 max-w-xs"
          />
        )}

        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {showGesamtwertungRow && (
            <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Link to={`/seasons/${season.id}/gesamtwertung`} className="min-w-0 flex-1 hover:underline">
                <p className="font-medium text-slate-900">Gesamtwertung</p>
                <p className="truncate text-sm text-slate-500">Saisonrangliste</p>
                {selectedOverallRanking && (
                  <p className="text-sm font-medium text-slate-700 sm:hidden">
                    Platz {selectedOverallRanking.rang}
                    {selectedOverallPayout && (
                      <span className="text-emerald-600"> · {currencyFormatter.format(selectedOverallPayout.betrag)}</span>
                    )}
                  </p>
                )}
              </Link>
              <div className="flex shrink-0 items-center gap-4">
                <span className="hidden w-16 text-right text-sm text-slate-700 sm:inline">
                  {selectedOverallRanking ? `Platz ${selectedOverallRanking.rang}` : '–'}
                </span>
                <span className="hidden w-20 text-right text-sm font-medium text-emerald-600 sm:inline">
                  {selectedOverallPayout ? currencyFormatter.format(selectedOverallPayout.betrag) : '–'}
                </span>
                <Badge tone={season.gesamtwertung_status === 'abgerechnet' ? 'positive' : 'warning'}>
                  {season.gesamtwertung_status}
                </Badge>
                {canManageSeason && (
                  <Button variant="secondary" onClick={handleToggleGesamtwertungStatus}>
                    {season.gesamtwertung_status === 'offen' ? 'Abrechnen' : 'Öffnen'}
                  </Button>
                )}
              </div>
            </li>
          )}
          {matchdays.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Noch keine Spieltage angelegt.</li>
          )}
          {matchdays.length > 0 && filteredSortedMatchdays.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              {matchdaySearchTerm ? 'Keine Treffer für die Suche.' : 'Keine Spieltage für diesen Filter.'}
            </li>
          )}
          {filteredSortedMatchdays.map((matchday) => {
            const selectedRanking = selectedPlayerId
              ? matchdayRankings.find((r) => r.matchday_id === matchday.id && r.player_id === selectedPlayerId)
              : undefined
            const selectedPayout = selectedPlayerId
              ? seasonTransactions.find(
                  (t) => t.matchday_id === matchday.id && t.typ === 'gewinn_spieltag' && t.player_id === selectedPlayerId,
                )
              : undefined
            return (
              <li key={matchday.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <Link to={`/seasons/${season.id}/matchdays/${matchday.id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="font-medium text-slate-900">Spieltag {matchday.nummer}</p>
                  <p className="truncate text-sm text-slate-500">
                    {matchday.datum ? formatGermanDate(matchday.datum) : 'Kein Datum hinterlegt'}
                  </p>
                  {selectedRanking && (
                    <p className="text-sm font-medium text-slate-700 sm:hidden">
                      Platz {selectedRanking.rang}
                      {selectedPayout && (
                        <span className="text-emerald-600"> · {currencyFormatter.format(selectedPayout.betrag)}</span>
                      )}
                    </p>
                  )}
                </Link>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden w-16 text-right text-sm text-slate-700 sm:inline">
                    {selectedRanking ? `Platz ${selectedRanking.rang}` : '–'}
                  </span>
                  <span className="hidden w-20 text-right text-sm font-medium text-emerald-600 sm:inline">
                    {selectedPayout ? currencyFormatter.format(selectedPayout.betrag) : '–'}
                  </span>
                  <Badge tone={matchday.status === 'abgerechnet' ? 'positive' : 'warning'}>{matchday.status}</Badge>
                  {canManageMatchdays && (
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
            )
          })}
        </ul>
      </CollapsibleSection>

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
          canCopyPayoutRules={canManagePayouts}
          canCopyPlayers={canManageParticipants}
          canCopyMatchdays={canManageMatchdays}
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

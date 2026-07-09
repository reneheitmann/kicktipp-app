import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { currencyFormatter, formatGermanDate } from '../../lib/format'
import { centsToEuros } from '../../lib/money'
import { useAuth } from '../auth/useAuth'
import { listPlayerProfileLinks } from '../players/playerProfileLinksApi'
import { listAllTransactions } from '../balances/balancesApi'
import { SeasonForm } from './SeasonForm'
import { SEASON_STATUS_LABELS, SEASON_STATUS_TONE } from './seasonStatus'
import { createSeason, listSeasons } from './seasonsApi'
import { listAllMatchdays } from './matchdaysApi'
import { listAllSeasonParticipants } from './seasonParticipantsApi'
import type {
  Matchday,
  PlayerProfileLink,
  Season,
  SeasonParticipant,
  SeasonStatus,
  Transaction,
} from '../../types/database'

type SeasonListFilter = 'ohne_archiviert' | 'alle' | SeasonStatus

export function SeasonsPage() {
  const { profile, can } = useAuth()
  const canManage = can('seasons.manage')

  const [seasons, setSeasons] = useState<Season[]>([])
  const [profileLinks, setProfileLinks] = useState<PlayerProfileLink[]>([])
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<SeasonListFilter>('ohne_archiviert')

  async function reload() {
    setLoading(true)
    try {
      const [seasonData, linkData, matchdayData, transactionData, participantData] = await Promise.all([
        listSeasons(),
        listPlayerProfileLinks(),
        listAllMatchdays(),
        listAllTransactions(),
        listAllSeasonParticipants(),
      ])
      setSeasons(seasonData)
      setProfileLinks(linkData)
      setMatchdays(matchdayData)
      setTransactions(transactionData)
      setParticipants(participantData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saisons konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  // Ein Login kann mit mehreren Spielern verknüpft sein (z. B. Vater/Kind
  // teilen sich einen Spieler-Eintrag oder ein Login tippt für mehrere
  // Kicktipp-Profile) – daher wird hier über alle eigenen Spieler summiert.
  const myPlayerIds = new Set(profileLinks.filter((l) => l.profile_id === profile?.id).map((l) => l.player_id))

  // Eigener Gesamtgewinn je Saison, analog zur Berechnung auf der
  // Saison-Detailseite: nur Spieltage mit Status "abgerechnet" zählen, dazu
  // die Gesamtwertung, sofern auch diese schon abgerechnet ist. Liefert
  // `undefined`, wenn der aktuelle User (typischerweise Admin/Spielleiter mit
  // Blick auf fremde Saisons) dort mit keinem eigenen Spieler Teilnehmer ist
  // – das unterscheidet "kein Gewinn ausgewiesen" von "0,00 € Gewinn"
  // (Teilnehmer ohne bisherige Auszahlung).
  function myGesamtgewinnForSeason(season: Season): number | undefined {
    const ownParticipantIds = new Set(
      participants.filter((p) => p.season_id === season.id && myPlayerIds.has(p.player_id)).map((p) => p.player_id),
    )
    if (ownParticipantIds.size === 0) return undefined
    const abgerechnetMatchdayIds = new Set(
      matchdays.filter((m) => m.season_id === season.id && m.status === 'abgerechnet').map((m) => m.id),
    )
    const spieltagSumme = transactions
      .filter(
        (t) =>
          t.season_id === season.id &&
          t.typ === 'gewinn_spieltag' &&
          ownParticipantIds.has(t.player_id) &&
          abgerechnetMatchdayIds.has(t.matchday_id ?? ''),
      )
      .reduce((sum, t) => sum + t.betrag, 0)
    const gesamtwertungBetrag =
      season.gesamtwertung_status === 'abgerechnet'
        ? transactions
            .filter((t) => t.season_id === season.id && t.typ === 'gewinn_gesamt' && ownParticipantIds.has(t.player_id))
            .reduce((sum, t) => sum + t.betrag, 0)
        : 0
    return spieltagSumme + gesamtwertungBetrag
  }

  // Normale User bekommen über RLS ohnehin nur aktiv/abgeschlossen geliefert
  // (siehe is_season_participant() in
  // supabase/migrations/0044_season_lifecycle.sql) – der Filter ist daher
  // nur für Admin/Spielleiter relevant, die auch Entwurf/Archiviert sehen.
  const filteredSeasons = seasons.filter((season) => {
    if (statusFilter === 'alle') return true
    if (statusFilter === 'ohne_archiviert') return season.status !== 'archiviert'
    return season.status === statusFilter
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Saison</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SeasonListFilter)}
              aria-label="Nach Status filtern"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            >
              <option value="ohne_archiviert">Alle außer Archiviert</option>
              <option value="alle">Alle</option>
              <option value="entwurf">Entwurf</option>
              <option value="aktiv">Aktiv</option>
              <option value="abgeschlossen">Abgeschlossen</option>
              <option value="archiviert">Archiviert</option>
            </select>
          )}
          {canManage && <Button onClick={() => setShowForm(true)}>+ Saison</Button>}
        </div>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : seasons.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Saisons angelegt.</p>
      ) : filteredSeasons.length === 0 ? (
        <p className="text-sm text-slate-500">Keine Saisons für diesen Filter.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredSeasons.map((season) => {
            const myGewinn = myGesamtgewinnForSeason(season)
            return (
              <li key={season.id}>
                <Link
                  to={`/seasons/${season.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{season.name}</p>
                    <p className="truncate text-sm text-slate-500">
                      {formatGermanDate(season.start_date)} – {formatGermanDate(season.end_date)}
                    </p>
                  </div>
                  {myGewinn !== undefined && (
                    <span className="shrink-0 text-right text-sm font-medium text-emerald-700">
                      {currencyFormatter.format(centsToEuros(myGewinn))}
                    </span>
                  )}
                  <Badge tone={SEASON_STATUS_TONE[season.status]}>{SEASON_STATUS_LABELS[season.status]}</Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {showForm && (
        <SeasonForm
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await createSeason(input)
            await reload()
          }}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { currencyFormatter } from '../../lib/format'
import { useAuth } from '../auth/useAuth'
import { listPlayerProfileLinks } from '../players/playerProfileLinksApi'
import { listAllTransactions } from '../balances/balancesApi'
import { SeasonForm } from './SeasonForm'
import { createSeason, listSeasons } from './seasonsApi'
import { listAllMatchdays } from './matchdaysApi'
import { listAllSeasonParticipants } from './seasonParticipantsApi'
import type { Matchday, PlayerProfileLink, Season, SeasonParticipant, Transaction } from '../../types/database'

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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Saison</h1>
        {canManage && <Button onClick={() => setShowForm(true)}>+ Saison</Button>}
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : seasons.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Saisons angelegt.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {seasons.map((season) => {
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
                      {season.start_date} – {season.end_date}
                    </p>
                  </div>
                  {myGewinn !== undefined && (
                    <span className="shrink-0 text-right text-sm font-medium text-emerald-700">
                      {currencyFormatter.format(myGewinn)}
                    </span>
                  )}
                  <Badge tone={season.status === 'aktiv' ? 'positive' : 'neutral'}>{season.status}</Badge>
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

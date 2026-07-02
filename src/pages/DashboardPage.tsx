import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { currencyFormatter } from '../lib/format'
import { useAuth } from '../features/auth/useAuth'
import { listSeasons } from '../features/seasons/seasonsApi'
import { listPlayers } from '../features/players/playersApi'
import { listSeasonParticipantsForPlayer, listAllSeasonParticipants } from '../features/seasons/seasonParticipantsApi'
import { listAllMatchdays, listMatchdayCountsBySeasonId } from '../features/seasons/matchdaysApi'
import { listZahlungen, listAllZahlungen } from '../features/players/zahlungenApi'
import { listPlayerTransactions, listAllTransactions } from '../features/balances/balancesApi'
import { computeAccountBalance, computeTotalOutstanding, type AccountBalance } from '../features/players/accountBalance'
import type { Player, Season } from '../types/database'

interface AdminStats {
  playerCount: number
  activeSeasonCount: number
  matchdayCount: number
  totalOutstanding: number
}

export function DashboardPage() {
  const { profile, can } = useAuth()
  // Statistik ist eine finanzielle Gesamtübersicht -> gleiches Recht wie Konten.
  const canManage = can('accounts.manage')

  const [activeSeasons, setActiveSeasons] = useState<Season[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [myBalance, setMyBalance] = useState<AccountBalance | null>(null)
  // Nur Saisons, an denen myPlayer tatsächlich teilnimmt, haben hier einen
  // Eintrag – so lässt sich "kein Gewinn ausgewiesen" (Admin/Spielleiter ohne
  // eigene Teilnahme) von "0,00 € Gewinn" (Teilnehmer ohne bisherige
  // Auszahlung) unterscheiden.
  const [myGewinnBySeasonId, setMyGewinnBySeasonId] = useState<Map<string, number>>(new Map())
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    Promise.all([listSeasons(), listPlayers(), listMatchdayCountsBySeasonId()])
      .then(async ([seasons, players, matchdayCounts]) => {
        setActiveSeasons(seasons.filter((s) => s.status === 'aktiv'))

        const linked = players.find((p) => p.profile_id === profile.id) ?? null
        setMyPlayer(linked)
        if (linked) {
          const [participants, zahlungen, transactions, matchdays] = await Promise.all([
            listSeasonParticipantsForPlayer(linked.id),
            listZahlungen(linked.id),
            listPlayerTransactions(linked.id),
            listAllMatchdays(),
          ])
          setMyBalance(computeAccountBalance(participants, matchdayCounts, zahlungen, transactions))

          // Eigener Gesamtgewinn je Saison, an der teilgenommen wird – analog zur
          // Berechnung auf der Saison-Detailseite/Saisons-Liste: nur Spieltage mit
          // Status "abgerechnet" zählen, dazu die Gesamtwertung, sofern auch diese
          // schon abgerechnet ist.
          const abgerechnetMatchdayIds = new Set(
            matchdays.filter((m) => m.status === 'abgerechnet').map((m) => m.id),
          )
          const gewinnMap = new Map<string, number>()
          for (const participant of participants) {
            const spieltagSumme = transactions
              .filter(
                (t) =>
                  t.season_id === participant.season_id &&
                  t.typ === 'gewinn_spieltag' &&
                  abgerechnetMatchdayIds.has(t.matchday_id ?? ''),
              )
              .reduce((sum, t) => sum + t.betrag, 0)
            const season = seasons.find((s) => s.id === participant.season_id)
            const gesamtwertungBetrag =
              season?.gesamtwertung_status === 'abgerechnet'
                ? (transactions.find((t) => t.season_id === participant.season_id && t.typ === 'gewinn_gesamt')
                    ?.betrag ?? 0)
                : 0
            gewinnMap.set(participant.season_id, spieltagSumme + gesamtwertungBetrag)
          }
          setMyGewinnBySeasonId(gewinnMap)
        }

        if (canManage) {
          const [allParticipants, allZahlungen, allTransactions] = await Promise.all([
            listAllSeasonParticipants(),
            listAllZahlungen(),
            listAllTransactions(),
          ])
          const totalMatchdays = [...matchdayCounts.values()].reduce((sum, c) => sum + c, 0)
          setStats({
            playerCount: players.length,
            activeSeasonCount: seasons.filter((s) => s.status === 'aktiv').length,
            matchdayCount: totalMatchdays,
            totalOutstanding: computeTotalOutstanding(
              players.map((p) => p.id),
              allParticipants,
              matchdayCounts,
              allZahlungen,
              allTransactions,
            ),
          })
        }
      })
      .finally(() => setLoading(false))
  }, [profile, canManage])

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-slate-900">Willkommen, {profile?.name}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Rolle: <span className="font-medium">{profile?.role}</span>
      </p>

      {myPlayer && myBalance && (
        <Link
          to={`/players/${myPlayer.id}`}
          className="mb-6 block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
        >
          <p className="text-sm text-slate-500">Mein Konto</p>
          <p
            className={`text-xl font-semibold ${
              myBalance.offen > 0 ? 'text-amber-700' : myBalance.offen < 0 ? 'text-emerald-600' : 'text-slate-900'
            }`}
          >
            {myBalance.offen > 0
              ? `${currencyFormatter.format(myBalance.offen)} offen`
              : myBalance.offen < 0
                ? `${currencyFormatter.format(-myBalance.offen)} Guthaben`
                : 'Ausgeglichen'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Beiträge: {currencyFormatter.format(myBalance.beitraegeGesamt)} · Eingezahlt:{' '}
            {currencyFormatter.format(myBalance.einzahlungenGesamt)} · Ausgezahlt:{' '}
            {currencyFormatter.format(myBalance.auszahlungenGesamt)} · Gewinne:{' '}
            {currencyFormatter.format(myBalance.gewinneGesamt)}
          </p>
        </Link>
      )}

      {canManage && stats && (
        <>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Statistik</h2>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Spieler" value={String(stats.playerCount)} />
            <StatCard label="Aktive Saisons" value={String(stats.activeSeasonCount)} />
            <StatCard label="Spieltage gesamt" value={String(stats.matchdayCount)} />
            <StatCard
              label="Offene Beträge"
              value={currencyFormatter.format(stats.totalOutstanding)}
              tone={stats.totalOutstanding > 0 ? 'amber' : undefined}
            />
          </div>
        </>
      )}

      <h2 className="mb-3 text-base font-semibold text-slate-900">Aktive Saisons</h2>
      {activeSeasons.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">Keine aktive Saison.</p>
      ) : (
        <ul className="mb-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {activeSeasons.map((season) => {
            const myGewinn = myGewinnBySeasonId.get(season.id)
            return (
              <li key={season.id}>
                <Link
                  to={`/seasons/${season.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{season.name}</span>
                  <div className="flex items-center gap-3">
                    {myGewinn !== undefined && (
                      <span className="text-sm font-medium text-emerald-600">{currencyFormatter.format(myGewinn)}</span>
                    )}
                    <Badge tone="positive">{season.status}</Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {(can('seasons.manage') || can('players.manage') || can('accounts.manage') || can('import.use')) && (
        <>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Schnellzugriff</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {can('seasons.manage') && (
              <Link to="/seasons" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
                Saisons
              </Link>
            )}
            {can('players.manage') && (
              <Link to="/players" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
                Spieler
              </Link>
            )}
            {can('accounts.manage') && (
              <Link to="/konten" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
                Konten
              </Link>
            )}
            {can('import.use') && (
              <Link to="/import" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
                Import
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

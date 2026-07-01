import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { currencyFormatter } from '../lib/format'
import { useAuth } from '../features/auth/useAuth'
import { listSeasons } from '../features/seasons/seasonsApi'
import { listPlayers } from '../features/players/playersApi'
import { listSeasonParticipantsForPlayer, listAllSeasonParticipants } from '../features/seasons/seasonParticipantsApi'
import { listMatchdayCountsBySeasonId } from '../features/seasons/matchdaysApi'
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
  const { profile } = useAuth()
  const canManage = profile?.role === 'admin' || profile?.role === 'spielleiter'

  const [activeSeasons, setActiveSeasons] = useState<Season[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [myBalance, setMyBalance] = useState<AccountBalance | null>(null)
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
          const [participants, zahlungen, transactions] = await Promise.all([
            listSeasonParticipantsForPlayer(linked.id),
            listZahlungen(linked.id),
            listPlayerTransactions(linked.id),
          ])
          setMyBalance(computeAccountBalance(participants, matchdayCounts, zahlungen, transactions))
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
          {activeSeasons.map((season) => (
            <li key={season.id}>
              <Link
                to={`/seasons/${season.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{season.name}</span>
                <Badge tone="positive">{season.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Schnellzugriff</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link to="/seasons" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
              Saisons
            </Link>
            <Link to="/players" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
              Spieler
            </Link>
            <Link to="/konten" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
              Konten
            </Link>
            <Link to="/import" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50">
              Import
            </Link>
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

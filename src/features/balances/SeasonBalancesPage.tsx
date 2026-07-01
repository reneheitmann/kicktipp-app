import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../../components/ui/Button'
import { currencyFormatter } from '../../lib/format'
import { listPlayers } from '../players/playersApi'
import { getSeason } from '../seasons/seasonsApi'
import { listMatchdays } from '../seasons/matchdaysApi'
import { listSeasonParticipants } from '../seasons/seasonParticipantsApi'
import { listSeasonTransactions } from './balancesApi'
import { computePlayerBalances, type PlayerBalance } from './balanceCalculations'
import type { Matchday, Player, Season, Transaction } from '../../types/database'

export function SeasonBalancesPage() {
  const { seasonId } = useParams<{ seasonId: string }>()
  const [season, setSeason] = useState<Season | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [balances, setBalances] = useState<PlayerBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seasonId) return
    Promise.all([
      getSeason(seasonId),
      listPlayers(),
      listSeasonTransactions(seasonId),
      listMatchdays(seasonId),
      listSeasonParticipants(seasonId),
    ])
      .then(([seasonData, playerData, transactionData, matchdayData, participantData]) => {
        setSeason(seasonData)
        setPlayers(playerData)
        setTransactions(transactionData)
        setMatchdays(matchdayData)
        setBalances(computePlayerBalances(transactionData, playerData, participantData, matchdayData.length))
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Guthabenübersicht konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [seasonId])

  async function handleExport() {
    if (!season) return
    setExporting(true)
    setError(null)
    try {
      const { exportSeasonExcel } = await import('./exportExcel')
      await exportSeasonExcel(season, balances, transactions, players, matchdays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  const chartData = balances.map((b) => ({
    name: b.name,
    Gesamtsieg: b.gesamtsieg_saldo,
    Spieltag: b.spieltag_saldo,
  }))

  return (
    <div className="p-4 sm:p-6">
      {seasonId && (
        <Link to={`/seasons/${seasonId}`} className="mb-3 inline-block text-sm text-slate-500 hover:underline">
          ← Zurück zur Saison
        </Link>
      )}

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-slate-900">Guthabenübersicht</h1>
          {season && <p className="text-sm text-slate-500">{season.name}</p>}
        </div>
        {balances.length > 0 && (
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Export...' : 'Als Excel exportieren'}
          </Button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {balances.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Buchungen für diese Saison.</p>
      ) : (
        <>
          <div className="mb-6 h-72 rounded-xl border border-slate-200 bg-white p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
                <Legend />
                <Bar dataKey="Gesamtsieg" fill="#0f172a" />
                <Bar dataKey="Spieltag" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Spieler</th>
                  <th className="px-4 py-3 font-medium">Gesamtsieg-Einsatz</th>
                  <th className="px-4 py-3 font-medium">Gesamtsieg-Gewinn</th>
                  <th className="px-4 py-3 font-medium">Gesamtsieg-Saldo</th>
                  <th className="px-4 py-3 font-medium">Spieltag-Einsatz</th>
                  <th className="px-4 py-3 font-medium">Spieltag-Gewinn</th>
                  <th className="px-4 py-3 font-medium">Spieltag-Saldo</th>
                  <th className="px-4 py-3 font-medium">Gesamt-Saldo</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.player_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(b.gesamtsieg_einsatz)}</td>
                    <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(b.gesamtsieg_gewinn)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {currencyFormatter.format(b.gesamtsieg_saldo)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(b.spieltag_einsatz)}</td>
                    <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(b.spieltag_gewinn)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {currencyFormatter.format(b.spieltag_saldo)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {currencyFormatter.format(b.gesamt_saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

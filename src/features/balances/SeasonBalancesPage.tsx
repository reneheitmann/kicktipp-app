import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/SearchInput'
import { SortableTh } from '../../components/ui/SortableTh'
import { currencyFormatter } from '../../lib/format'
import { listPlayers } from '../players/playersApi'
import { listZahlungenForSeason } from '../players/zahlungenApi'
import { getSeason } from '../seasons/seasonsApi'
import { listMatchdays } from '../seasons/matchdaysApi'
import { listSeasonParticipants } from '../seasons/seasonParticipantsApi'
import { listSeasonTransactions } from './balancesApi'
import { computePlayerBalances, type PlayerBalance } from './balanceCalculations'
import type { Matchday, Player, Season, Transaction } from '../../types/database'

type SortColumn = keyof Pick<
  PlayerBalance,
  | 'name'
  | 'gesamtsieg_einsatz'
  | 'gesamtsieg_gewinn'
  | 'gesamtsieg_saldo'
  | 'spieltag_einsatz'
  | 'spieltag_gewinn'
  | 'spieltag_saldo'
  | 'gesamt_saldo'
>

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
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  function handleSort(column: string) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column as SortColumn)
      // Zahlenspalten sinnvollerweise erst absteigend (höchster Saldo/Gewinn zuerst), Name aufsteigend.
      setSortDirection(column === 'name' ? 'asc' : 'desc')
    }
  }

  useEffect(() => {
    if (!seasonId) return
    Promise.all([
      getSeason(seasonId),
      listPlayers(),
      listSeasonTransactions(seasonId),
      listMatchdays(seasonId),
      listSeasonParticipants(seasonId),
      listZahlungenForSeason(seasonId),
    ])
      .then(([seasonData, playerData, transactionData, matchdayData, participantData, zahlungData]) => {
        setSeason(seasonData)
        setPlayers(playerData)
        setTransactions(transactionData)
        setMatchdays(matchdayData)
        setBalances(
          computePlayerBalances(transactionData, playerData, participantData, matchdayData.length, zahlungData),
        )
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
    Gesamtwertung: b.gesamtsieg_saldo,
    Spieltag: b.spieltag_saldo,
  }))

  const sortedBalances = balances
    .filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      if (sortColumn === 'name') return a.name.localeCompare(b.name) * dir
      return (a[sortColumn] - b[sortColumn]) * dir
    })

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
                <Bar dataKey="Gesamtwertung" fill="#0f172a" />
                <Bar dataKey="Spieltag" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <SearchInput value={search} onChange={setSearch} placeholder="Spieler suchen..." className="mb-4 max-w-xs" />

          {sortedBalances.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Treffer für die Suche.</p>
          ) : (
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <SortableTh columnKey="name" label="Spieler" activeKey={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <SortableTh
                    columnKey="gesamtsieg_einsatz"
                    label="Gesamtwertung-Einsatz"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="gesamtsieg_gewinn"
                    label="Gesamtwertung-Gewinn"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="gesamtsieg_saldo"
                    label="Gesamtwertung-Saldo"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="spieltag_einsatz"
                    label="Spieltag-Einsatz"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="spieltag_gewinn"
                    label="Spieltag-Gewinn"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="spieltag_saldo"
                    label="Spieltag-Saldo"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="gesamt_saldo"
                    label="Gesamt-Saldo"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedBalances.map((b) => (
                  <tr key={b.player_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(b.gesamtsieg_einsatz)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(b.gesamtsieg_gewinn)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {currencyFormatter.format(b.gesamtsieg_saldo)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(b.spieltag_einsatz)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(b.spieltag_gewinn)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {currencyFormatter.format(b.spieltag_saldo)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {currencyFormatter.format(b.gesamt_saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SearchInput } from '../../components/ui/SearchInput'
import { SortableTh } from '../../components/ui/SortableTh'
import { currencyFormatter } from '../../lib/format'
import { centsToEuros } from '../../lib/money'
import { listPlayers } from '../players/playersApi'
import { listAllZahlungen } from '../players/zahlungenApi'
import { listSeasons } from '../seasons/seasonsApi'
import { listAllSeasonParticipants } from '../seasons/seasonParticipantsApi'
import { listMatchdayCountsBySeasonId } from '../seasons/matchdaysApi'
import { listAllTransactions } from './balancesApi'
import { computePlayerBalances } from './balanceCalculations'
import type { Player, Season, SeasonParticipant, Transaction, Zahlung } from '../../types/database'

const lineColors = ['#0f172a', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d']

// Anzahl der größten Gewinner/Verlierer, die das Diagramm beim ersten Laden
// vorauswählt – bei vielen Spielern (z. B. ~80) wäre "alle anzeigen" sofort
// unlesbar, daher startet die Auswahl bewusst klein und lässt sich gezielt
// erweitern.
const DEFAULT_CHART_PLAYER_COUNT = 4

export function SeasonComparisonPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [zahlungen, setZahlungen] = useState<Zahlung[]>([])
  const [matchdayCounts, setMatchdayCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [playerSearch, setPlayerSearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  // 'name' | 'total' | eine season.id – Saison-Spalten sind dynamisch, daher kein festes Enum.
  const [sortKey, setSortKey] = useState<string>('total')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' ? 'asc' : 'desc')
    }
  }

  useEffect(() => {
    Promise.all([
      listSeasons(),
      listPlayers(),
      listAllTransactions(),
      listAllSeasonParticipants(),
      listMatchdayCountsBySeasonId(),
      listAllZahlungen(),
    ])
      .then(([seasonData, playerData, txData, participantData, countsData, zahlungData]) => {
        setSeasons([...seasonData].sort((a, b) => a.start_date.localeCompare(b.start_date)))
        setPlayers(playerData)
        setTransactions(txData)
        setParticipants(participantData)
        setMatchdayCounts(countsData)
        setZahlungen(zahlungData)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Saisonvergleich konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  const perSeasonBalances = useMemo(() => {
    return seasons.map((season) => ({
      season,
      balances: computePlayerBalances(
        transactions.filter((t) => t.season_id === season.id),
        players,
        participants.filter((p) => p.season_id === season.id),
        matchdayCounts.get(season.id) ?? 0,
        zahlungen.filter((z) => z.season_id === season.id),
      ),
    }))
  }, [seasons, players, transactions, participants, matchdayCounts, zahlungen])

  // Eine Zeile je Spieler (statt einer Spalte) mit dem Saldo pro Saison sowie
  // dem Gesamt-Saldo über alle Saisons, absteigend sortiert – skaliert auch
  // bei vielen Spielern, da die Saison-Anzahl üblicherweise viel langsamer
  // wächst als die Spieler-Anzahl.
  const playerRows = useMemo(() => {
    const involvedIds = new Set<string>(transactions.map((t) => t.player_id))
    return players
      .filter((p) => involvedIds.has(p.id))
      .map((player) => {
        const bySeasonId = new Map(
          perSeasonBalances.map(({ season, balances }) => [
            season.id,
            balances.find((b) => b.player_id === player.id)?.gesamt_saldo ?? 0,
          ]),
        )
        const total = [...bySeasonId.values()].reduce((sum, v) => sum + v, 0)
        return { player, bySeasonId, total }
      })
      .sort((a, b) => b.total - a.total)
  }, [players, transactions, perSeasonBalances])

  // Eigene Sortierung + Suche nur für die Tabelle – playerRows selbst bleibt
  // total-absteigend sortiert, da die Vorauswahl-Logik unten (größte
  // Gewinner/Verlierer) darauf aufbaut.
  const sortedPlayerRows = useMemo(() => {
    const term = tableSearch.trim().toLowerCase()
    const dir = sortDirection === 'asc' ? 1 : -1
    return playerRows
      .filter((r) => r.player.name.toLowerCase().includes(term))
      .sort((a, b) => {
        if (sortKey === 'name') return a.player.name.localeCompare(b.player.name) * dir
        if (sortKey === 'total') return (a.total - b.total) * dir
        return ((a.bySeasonId.get(sortKey) ?? 0) - (b.bySeasonId.get(sortKey) ?? 0)) * dir
      })
  }, [playerRows, sortKey, sortDirection, tableSearch])

  // Vorauswahl beim ersten Laden: die größten Gewinner und Verlierer über
  // alle Saisons hinweg, damit das Diagramm sofort etwas Aussagekräftiges
  // zeigt, ohne dass erst manuell ausgewählt werden muss.
  useEffect(() => {
    if (playerRows.length === 0 || selectedPlayerIds.size > 0) return
    const half = Math.ceil(DEFAULT_CHART_PLAYER_COUNT / 2)
    const top = playerRows.slice(0, half)
    const bottom = playerRows.slice(-half)
    setSelectedPlayerIds(new Set([...top, ...bottom].map((r) => r.player.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRows])

  const filteredPlayerRows = useMemo(() => {
    const term = playerSearch.trim().toLowerCase()
    if (!term) return playerRows
    return playerRows.filter((r) => r.player.name.toLowerCase().includes(term))
  }, [playerRows, playerSearch])

  const chartData = perSeasonBalances.map(({ season, balances }) => {
    const row: Record<string, number | string> = { name: season.name }
    for (const { player } of playerRows) {
      if (!selectedPlayerIds.has(player.id)) continue
      row[player.name] = balances.find((b) => b.player_id === player.id)?.gesamt_saldo ?? 0
    }
    return row
  })

  const selectedPlayers = playerRows.filter((r) => selectedPlayerIds.has(r.player.id))

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Saisonvergleich</h1>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      {seasons.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Saisons vorhanden.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            Die Grafik zeigt den Verlauf des Gesamtsaldos je ausgewähltem Spieler über alle Saisons hinweg – so
            lässt sich auf einen Blick erkennen, wer über die Zeit im Plus oder Minus liegt.
          </p>
          <div className="mb-3 flex flex-col gap-4 sm:flex-row">
            <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-4 sm:flex-1">
              {selectedPlayers.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">
                  Bitte mindestens einen Spieler rechts auswählen.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => currencyFormatter.format(centsToEuros(Number(value)))} />
                    <Legend />
                    {selectedPlayers.map(({ player }, i) => (
                      <Line
                        key={player.id}
                        type="monotone"
                        dataKey={player.name}
                        stroke={lineColors[i % lineColors.length]}
                        strokeWidth={2}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex h-72 w-full flex-col rounded-xl border border-slate-200 bg-white p-3 sm:w-64">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Spieler im Diagramm ({selectedPlayers.length} ausgewählt)
              </p>
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Spieler suchen..."
                aria-label="Spieler suchen..."
                className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
              />
              <div className="flex-1 overflow-y-auto">
                {filteredPlayerRows.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-slate-500">Keine Treffer.</p>
                ) : (
                  filteredPlayerRows.map(({ player, total }) => (
                    <label key={player.id} className="flex items-center gap-2 px-1 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.has(player.id)}
                        onChange={() => togglePlayer(player.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{player.name}</span>
                      <span className={`shrink-0 text-xs ${total >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {currencyFormatter.format(centsToEuros(total))}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <p className="mb-6 text-xs text-slate-500">
            Vorausgewählt sind die größten Gewinner und Verlierer über alle Saisons – weitere Spieler lassen sich
            oben über die Suche gezielt hinzufügen.
          </p>

          <SearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Spieler suchen..."
            className="mb-4 max-w-xs"
          />

          {sortedPlayerRows.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Treffer für die Suche.</p>
          ) : (
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[320px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <SortableTh
                    columnKey="name"
                    label="Spieler"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="w-px whitespace-nowrap"
                  />
                  {seasons.map((season) => (
                    <SortableTh
                      key={season.id}
                      columnKey={season.id}
                      label={season.name}
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      align="right"
                    />
                  ))}
                  <SortableTh columnKey="total" label="Gesamt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedPlayerRows.map(({ player, bySeasonId, total }) => (
                  <tr key={player.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-900 sm:px-4 sm:py-3">
                      {player.name}
                    </td>
                    {seasons.map((season) => (
                      <td key={season.id} className="px-2 py-2 text-right text-slate-700 sm:px-4 sm:py-3">
                        {currencyFormatter.format(centsToEuros(bySeasonId.get(season.id) ?? 0))}
                      </td>
                    ))}
                    <td
                      className={`px-2 py-2 text-right font-semibold sm:px-4 sm:py-3 ${total >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}
                    >
                      {currencyFormatter.format(centsToEuros(total))}
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

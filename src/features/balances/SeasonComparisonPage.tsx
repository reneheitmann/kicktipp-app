import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/SearchInput'
import { SortableTh } from '../../components/ui/SortableTh'
import { StickyTableScroll } from '../../components/ui/StickyTableScroll'
import { currencyFormatter } from '../../lib/format'
import { centsToEuros } from '../../lib/money'
import { listPlayers } from '../players/playersApi'
import { listSeasons } from '../seasons/seasonsApi'
import { isSeasonBalanceEligible } from '../seasons/seasonStatus'
import { useAuth } from '../auth/useAuth'
import { getPublicPlayerSeasonBalances, type PublicPlayerSeasonBalance } from './balancesApi'
import type { Player, Season } from '../../types/database'

function matchesSearch(player: Player, term: string): boolean {
  if (!term) return true
  return player.name.toLowerCase().includes(term) || (player.kicktipp_name ?? '').toLowerCase().includes(term)
}

const lineColors = ['#0f172a', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d']

// Verallgemeinert das Einzel-Favorit-Muster aus SeasonDetailPage.tsx
// (FAVORITE_PLAYER_STORAGE_KEY) auf mehrere IDs, da hier bereits eine
// Mehrfachauswahl existiert.
const FAVORITE_PLAYER_IDS_STORAGE_KEY = 'kicktipp_favorite_player_ids'

function readFavoritePlayerIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_PLAYER_IDS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function saveFavoritePlayerIds(ids: string[]): void {
  try {
    if (ids.length === 0) localStorage.removeItem(FAVORITE_PLAYER_IDS_STORAGE_KEY)
    else localStorage.setItem(FAVORITE_PLAYER_IDS_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // z. B. privates Fenster ohne Storage-Zugriff – Auswahl bleibt dann nur
    // für die aktuelle Sitzung erhalten, kein Absturz nötig.
  }
}

export function SeasonComparisonPage() {
  const { can } = useAuth()
  const canManageAccounts = can('accounts.manage')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [publicBalances, setPublicBalances] = useState<PublicPlayerSeasonBalance[]>([])
  const [metric, setMetric] = useState<'saldo' | 'gewinne'>('saldo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [playerSearch, setPlayerSearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  // 'name' | 'total' | eine season.id – Saison-Spalten sind dynamisch, daher kein festes Enum.
  const [sortKey, setSortKey] = useState<string>('total')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const saveInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSaveFavorites() {
    saveFavoritePlayerIds([...selectedPlayerIds])
    setSaveInfo('Gespeichert.')
    if (saveInfoTimeoutRef.current) clearTimeout(saveInfoTimeoutRef.current)
    saveInfoTimeoutRef.current = setTimeout(() => setSaveInfo(null), 2000)
  }

  useEffect(() => () => {
    if (saveInfoTimeoutRef.current) clearTimeout(saveInfoTimeoutRef.current)
  }, [])

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' ? 'asc' : 'desc')
    }
  }

  useEffect(() => {
    Promise.all([listSeasons(), listPlayers()])
      .then(([seasonData, playerData]) => {
        // Entwurf/Archiviert zählen nicht in saisonübergreifenden
        // Geld-Summen mit (siehe seasonStatus.ts) – dieser Vergleich ist per
        // Definition immer eine Mehrsaison-Aggregation.
        setSeasons(
          seasonData
            .filter((s) => isSeasonBalanceEligible(s.status, canManageAccounts))
            .sort((a, b) => a.start_date.localeCompare(b.start_date)),
        )
        setPlayers(playerData)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Saisonvergleich konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [canManageAccounts])

  // Salden serverseitig über eine security-definer-Funktion laden, die nur
  // die fertig berechnete Summe je Spieler/Saison offenlegt (siehe
  // getPublicPlayerSeasonBalances) – so sieht jeder aktive User jeden
  // aktiven Spieler im Vergleich, ohne dass die zugrundeliegenden, weiterhin
  // privaten Einsatz-/Zahlungszeilen offengelegt werden. Läuft erneut,
  // sobald `seasons` geladen ist.
  useEffect(() => {
    if (seasons.length === 0) return
    const seasonIds = seasons.map((s) => s.id)
    getPublicPlayerSeasonBalances(seasonIds)
      .then(setPublicBalances)
      .catch((err) => setError(err instanceof Error ? err.message : 'Saisonvergleich konnte nicht geladen werden.'))
  }, [seasons])

  // Eine Zeile je aktivem Spieler (statt einer Spalte) mit dem Saldo pro
  // Saison sowie dem Gesamt-Saldo über alle Saisons, absteigend sortiert.
  const playerRows = useMemo(() => {
    return players
      .map((player) => {
        const bySeasonId = new Map(
          seasons.map((season) => {
            const balance = publicBalances.find((b) => b.player_id === player.id && b.season_id === season.id)
            return [season.id, (metric === 'saldo' ? balance?.gesamt_saldo : balance?.gewinne) ?? 0]
          }),
        )
        const total = [...bySeasonId.values()].reduce((sum, v) => sum + v, 0)
        return { player, bySeasonId, total }
      })
      .sort((a, b) => b.total - a.total)
  }, [players, seasons, publicBalances, metric])

  // Eigene Sortierung + Suche nur für die Tabelle – playerRows selbst bleibt
  // total-absteigend sortiert, da die Vorauswahl-Logik unten (größte
  // Gewinner/Verlierer) darauf aufbaut.
  const sortedPlayerRows = useMemo(() => {
    const term = tableSearch.trim().toLowerCase()
    const dir = sortDirection === 'asc' ? 1 : -1
    return playerRows
      .filter((r) => matchesSearch(r.player, term))
      .sort((a, b) => {
        if (sortKey === 'name') return a.player.name.localeCompare(b.player.name) * dir
        if (sortKey === 'total') return (a.total - b.total) * dir
        return ((a.bySeasonId.get(sortKey) ?? 0) - (b.bySeasonId.get(sortKey) ?? 0)) * dir
      })
  }, [playerRows, sortKey, sortDirection, tableSearch])

  // Vorauswahl beim ersten Laden: ausschließlich die selbst gespeicherten
  // Favoriten (siehe "Als Standard speichern" unten). Ohne gespeicherte
  // Auswahl bleibt die Liste bewusst leer, statt automatisch Spieler zu
  // erraten – der User wählt gezielt selbst aus.
  useEffect(() => {
    if (playerRows.length === 0 || selectedPlayerIds.size > 0) return
    const favoriteIds = new Set(readFavoritePlayerIds())
    const favorites = playerRows.filter((r) => favoriteIds.has(r.player.id))
    if (favorites.length > 0) setSelectedPlayerIds(new Set(favorites.map((r) => r.player.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRows])

  const filteredPlayerRows = useMemo(() => {
    const term = playerSearch.trim().toLowerCase()
    return playerRows.filter((r) => matchesSearch(r.player, term))
  }, [playerRows, playerSearch])

  const chartData = seasons.map((season) => {
    const row: Record<string, number | string> = { name: season.name }
    for (const { player, bySeasonId } of playerRows) {
      if (!selectedPlayerIds.has(player.id)) continue
      row[player.name] = bySeasonId.get(season.id) ?? 0
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
          <div className="mb-3 flex items-center gap-2">
            <Button variant={metric === 'saldo' ? 'primary' : 'secondary'} onClick={() => setMetric('saldo')}>
              Saldo
            </Button>
            <Button variant={metric === 'gewinne' ? 'primary' : 'secondary'} onClick={() => setMetric('gewinne')}>
              Gewinne
            </Button>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            {metric === 'saldo' ? (
              <>
                Die Grafik zeigt den Verlauf des Gesamtsaldos je ausgewähltem Spieler über alle Saisons hinweg – so
                lässt sich auf einen Blick erkennen, wer über die Zeit im Plus oder Minus liegt.
              </>
            ) : (
              <>
                Die Grafik zeigt den Verlauf der reinen Gewinne (ohne Einsatz/Zahlungen gegenzurechnen) je
                ausgewähltem Spieler über alle Saisons hinweg – so lässt sich auf einen Blick erkennen, wer am
                meisten gewonnen hat.
              </>
            )}
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
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => currencyFormatter.format(centsToEuros(Number(value)))} />
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">
                  Spieler im Diagramm ({selectedPlayers.length} ausgewählt)
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {saveInfo && <span className="text-xs text-emerald-700">{saveInfo}</span>}
                  <button
                    type="button"
                    onClick={handleSaveFavorites}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Als Standard speichern
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Spieler oder Kicktipp-Name suchen..."
                aria-label="Spieler oder Kicktipp-Name suchen..."
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
            Ohne gespeicherte Standardauswahl ist zunächst kein Spieler ausgewählt – über die Suche rechts lassen
            sich gezielt Spieler hinzufügen und die aktuelle Auswahl über "Als Standard speichern" für künftige
            Aufrufe merken (nur in diesem Browser).
          </p>

          <SearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Spieler oder Kicktipp-Name suchen..."
            className="mb-4 max-w-xs"
          />

          {sortedPlayerRows.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Treffer für die Suche.</p>
          ) : (
          <>
          <p className="mb-2 text-xs text-slate-500 sm:hidden">→ Tabelle nach links wischen für weitere Spalten</p>
          <StickyTableScroll className="max-h-[70vh] overflow-auto scroll-fade-x">
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
                  <th className="whitespace-nowrap bg-white px-2 py-2 text-left text-xs font-medium sm:px-4 sm:py-3 sm:text-sm">
                    Kicktipp
                  </th>
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
                  <SortableTh
                    columnKey="total"
                    label={metric === 'saldo' ? 'Gesamtsaldo' : 'Gesamtgewinne'}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedPlayerRows.map(({ player, bySeasonId, total }) => (
                  <tr key={player.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-900 sm:px-4 sm:py-3">
                      {player.name}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600 sm:px-4 sm:py-3">
                      {player.kicktipp_name || '—'}
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
          </StickyTableScroll>
          </>
          )}
        </>
      )}
    </div>
  )
}

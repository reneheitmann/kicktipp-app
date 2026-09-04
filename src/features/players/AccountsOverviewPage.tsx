import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { CollapsibleSection } from '../../components/ui/CollapsibleSection'
import { SearchInput } from '../../components/ui/SearchInput'
import { SeasonFilter } from '../../components/ui/SeasonFilter'
import { SortableTh } from '../../components/ui/SortableTh'
import { StickyTableScroll } from '../../components/ui/StickyTableScroll'
import { currencyFormatter, formatGermanDate } from '../../lib/format'
import { centsToEuros } from '../../lib/money'
import { listPlayers } from './playersApi'
import { addZahlung, listZahlungenForSeasons } from './zahlungenApi'
import { listSeasonParticipantsForSeasons } from '../seasons/seasonParticipantsApi'
import { listMatchdayCountsBySeasonId } from '../seasons/matchdaysApi'
import { listSeasons } from '../seasons/seasonsApi'
import { listTransactionsForSeasons } from '../balances/balancesApi'
import { computeAccountBalance, computeTotalOutstanding } from './accountBalance'
import { isSeasonBalanceEligible } from '../seasons/seasonStatus'
import { useAuth } from '../auth/useAuth'
import { ZahlungForm } from './ZahlungForm'
import type { Player, Season, SeasonParticipant, Transaction, Zahlung } from '../../types/database'

export function AccountsOverviewPage() {
  const { can } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [matchdayCounts, setMatchdayCounts] = useState<Map<string, number>>(new Map())
  const [zahlungen, setZahlungen] = useState<Zahlung[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zahlungFor, setZahlungFor] = useState<Player | null>(null)
  const [exportingZahlungen, setExportingZahlungen] = useState(false)
  const [zahlungSearch, setZahlungSearch] = useState('')
  const [zahlungDatumVon, setZahlungDatumVon] = useState('')
  const [zahlungDatumBis, setZahlungDatumBis] = useState('')
  const [zahlungSeasonId, setZahlungSeasonId] = useState('')
  const [zahlungTyp, setZahlungTyp] = useState<'' | 'einzahlung' | 'auszahlung'>('')
  const [seasonFilter, setSeasonFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<
    'name' | 'beitraegeGesamt' | 'einzahlungenGesamt' | 'auszahlungenGesamt' | 'gewinneGesamt' | 'offen'
  >('offen')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  function handleSort(column: string) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column as typeof sortColumn)
      setSortDirection(column === 'name' ? 'asc' : 'desc')
    }
  }

  async function loadBase() {
    setLoading(true)
    try {
      const [playerData, seasonData, countsData] = await Promise.all([
        listPlayers(),
        listSeasons(),
        listMatchdayCountsBySeasonId(),
      ])
      setPlayers(playerData)
      setSeasons(seasonData)
      setMatchdayCounts(countsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBase()
  }, [])

  // Ohne Filter (Aggregat über alle Saisons) zählen Entwurf/Archiviert nicht
  // mit; eine explizit ausgewählte Einzelsaison zeigt ihre Zahlen dagegen
  // unabhängig vom Status (siehe seasonStatus.ts).
  const eligibleSeasonIds = seasons
    .filter((s) => isSeasonBalanceEligible(s.status, can('accounts.manage')))
    .map((s) => s.id)

  async function reload() {
    const targetSeasonIds = seasonFilter ? [seasonFilter] : eligibleSeasonIds
    try {
      const [participantData, zahlungData, transactionData] = await Promise.all([
        listSeasonParticipantsForSeasons(targetSeasonIds),
        listZahlungenForSeasons(targetSeasonIds),
        listTransactionsForSeasons(targetSeasonIds),
      ])
      setParticipants(participantData)
      setZahlungen(zahlungData)
      setTransactions(transactionData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konten konnten nicht geladen werden.')
    }
  }

  // Läuft erneut, sobald die Saisonliste geladen ist oder sich der Filter
  // ändert – die eigentlichen Konten-Daten sind jetzt serverseitig auf die
  // relevanten Saison(en) eingegrenzt, statt (wie zuvor) immer die komplette
  // Tabelle zu laden und erst clientseitig zu filtern.
  useEffect(() => {
    if (seasons.length === 0) return
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasons, seasonFilter])

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  const rows = players
    .filter((player) => player.name.toLowerCase().includes(search.trim().toLowerCase()))
    .map((player) => ({
      player,
      balance: computeAccountBalance(
        participants.filter((p) => p.player_id === player.id),
        matchdayCounts,
        zahlungen.filter((z) => z.player_id === player.id),
        transactions.filter((t) => t.player_id === player.id),
      ),
    }))
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      if (sortColumn === 'name') return a.player.name.localeCompare(b.player.name) * dir
      return (a.balance[sortColumn] - b.balance[sortColumn]) * dir
    })

  const totalOffen = computeTotalOutstanding(players.map((p) => p.id), participants, matchdayCounts, zahlungen, transactions)

  const playersById = new Map(players.map((p) => [p.id, p]))
  const seasonsById = new Map(seasons.map((s) => [s.id, s.name]))

  const zahlungTerm = zahlungSearch.trim().toLowerCase()
  const filteredZahlungen = zahlungen
    .filter((z) => {
      const player = playersById.get(z.player_id)
      if (zahlungTerm) {
        const matchesName = (player?.name ?? '').toLowerCase().includes(zahlungTerm)
        const matchesKicktipp = (player?.kicktipp_name ?? '').toLowerCase().includes(zahlungTerm)
        if (!matchesName && !matchesKicktipp) return false
      }
      if (zahlungDatumVon && z.datum < zahlungDatumVon) return false
      if (zahlungDatumBis && z.datum > zahlungDatumBis) return false
      if (zahlungSeasonId && z.season_id !== zahlungSeasonId) return false
      if (zahlungTyp && z.typ !== zahlungTyp) return false
      return true
    })
    .sort((a, b) => b.datum.localeCompare(a.datum))
  const summeEinzahlungen = filteredZahlungen
    .filter((z) => z.typ === 'einzahlung')
    .reduce((sum, z) => sum + z.betrag, 0)
  const summeAuszahlungen = filteredZahlungen
    .filter((z) => z.typ === 'auszahlung')
    .reduce((sum, z) => sum + z.betrag, 0)
  const summeDifferenz = summeEinzahlungen - summeAuszahlungen

  async function handleExportZahlungen() {
    setExportingZahlungen(true)
    try {
      const { exportZahlungenExcel } = await import('../balances/exportExcel')
      await exportZahlungenExcel(filteredZahlungen, players, seasons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen.')
    } finally {
      setExportingZahlungen(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Konten-Übersicht</h1>
        <SeasonFilter seasons={seasons} value={seasonFilter} onChange={setSeasonFilter} />
      </div>
      <p className="mb-4 text-sm font-medium text-slate-700">
        Insgesamt offen: {currencyFormatter.format(centsToEuros(totalOffen))}
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      <CollapsibleSection title="Kontostände" count={rows.length}>
        <SearchInput value={search} onChange={setSearch} placeholder="Spieler suchen..." className="mb-4 max-w-xs" />

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            {players.length === 0 ? 'Noch keine Spieler angelegt.' : 'Keine Treffer für die Suche.'}
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500 sm:hidden">→ Tabelle nach links wischen für weitere Spalten</p>
            <StickyTableScroll className="max-h-[70vh] overflow-auto scroll-fade-x">
              <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <SortableTh columnKey="name" label="Spieler" activeKey={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <th className="whitespace-nowrap bg-white px-4 py-3 text-left font-medium">Kicktipp</th>
                  <SortableTh
                    columnKey="beitraegeGesamt"
                    label="Beiträge gesamt"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="einzahlungenGesamt"
                    label="Eingezahlt"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="auszahlungenGesamt"
                    label="Ausgezahlt"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="gewinneGesamt"
                    label="Gewinne"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    columnKey="offen"
                    label="Status"
                    activeKey={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="bg-white px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ player, balance }) => (
                  <tr key={player.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link to={`/players/${player.id}`} className="font-medium text-slate-900 hover:underline">
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{player.kicktipp_name || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(centsToEuros(balance.beitraegeGesamt))}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(centsToEuros(balance.einzahlungenGesamt))}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(centsToEuros(balance.auszahlungenGesamt))}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(centsToEuros(balance.gewinneGesamt))}</td>
                    <td className="px-4 py-3 text-right">
                      {balance.offen > 0 ? (
                        <span className="font-medium text-amber-700">
                          {currencyFormatter.format(centsToEuros(balance.offen))} offen
                        </span>
                      ) : balance.offen < 0 ? (
                        <span className="font-medium text-emerald-700">
                          {currencyFormatter.format(centsToEuros(-balance.offen))} Guthaben
                        </span>
                      ) : (
                        <span className="font-medium text-slate-500">Ausgeglichen</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" onClick={() => setZahlungFor(player)}>
                        + Zahlung
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </StickyTableScroll>
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Ein-/Auszahlungen"
        count={filteredZahlungen.length}
        defaultOpen={false}
        actions={
          filteredZahlungen.length > 0 ? (
            <Button variant="secondary" onClick={handleExportZahlungen} disabled={exportingZahlungen}>
              {exportingZahlungen ? 'Export...' : 'Als Excel exportieren'}
            </Button>
          ) : undefined
        }
      >
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <SearchInput
            value={zahlungSearch}
            onChange={setZahlungSearch}
            placeholder="Spieler oder Kicktipp-Name suchen..."
            className="max-w-xs"
          />
          <label className="text-sm text-slate-600">
            von{' '}
            <input
              type="date"
              value={zahlungDatumVon}
              onChange={(e) => setZahlungDatumVon(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-600">
            bis{' '}
            <input
              type="date"
              value={zahlungDatumBis}
              onChange={(e) => setZahlungDatumBis(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </label>
          <SeasonFilter seasons={seasons} value={zahlungSeasonId} onChange={setZahlungSeasonId} />
          <select
            value={zahlungTyp}
            onChange={(e) => setZahlungTyp(e.target.value as typeof zahlungTyp)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            <option value="">Alle Typen</option>
            <option value="einzahlung">Einzahlung</option>
            <option value="auszahlung">Auszahlung</option>
          </select>
        </div>
        <p className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium">
          <span className="text-emerald-700">
            Summe Einzahlungen: {currencyFormatter.format(centsToEuros(summeEinzahlungen))}
          </span>
          <span className="text-amber-700">
            Summe Auszahlungen: {currencyFormatter.format(centsToEuros(summeAuszahlungen))}
          </span>
          <span className={summeDifferenz >= 0 ? 'text-emerald-700' : 'text-amber-700'}>
            Differenz: {currencyFormatter.format(centsToEuros(summeDifferenz))}
          </span>
        </p>
        {filteredZahlungen.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Zahlungen gefunden.</p>
        ) : (
          <>
          <p className="mb-2 text-xs text-slate-500 sm:hidden">→ Tabelle nach links wischen für weitere Spalten</p>
          <StickyTableScroll className="max-h-[70vh] overflow-auto scroll-fade-x">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="bg-white px-4 py-3 text-left font-medium">Datum</th>
                  <th className="bg-white px-4 py-3 text-left font-medium">Spieler</th>
                  <th className="bg-white px-4 py-3 text-left font-medium">Saison</th>
                  <th className="bg-white px-4 py-3 text-left font-medium">Typ</th>
                  <th className="bg-white px-4 py-3 text-right font-medium">Betrag</th>
                  <th className="bg-white px-4 py-3 text-left font-medium">Notiz</th>
                </tr>
              </thead>
              <tbody>
                {filteredZahlungen.map((z) => (
                  <tr key={z.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{formatGermanDate(z.datum)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/players/${z.player_id}`} className="font-medium text-slate-900 hover:underline">
                        {playersById.get(z.player_id)?.name ?? 'Unbekannter Spieler'}
                      </Link>
                      <p className="text-xs text-slate-500">Kicktipp: {playersById.get(z.player_id)?.kicktipp_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{seasonsById.get(z.season_id) ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{z.typ === 'einzahlung' ? 'Einzahlung' : 'Auszahlung'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{currencyFormatter.format(centsToEuros(z.betrag))}</td>
                    <td className="px-4 py-3 text-slate-500">{z.notiz || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StickyTableScroll>
          </>
        )}
      </CollapsibleSection>

      {zahlungFor && (
        <ZahlungForm
          playerName={zahlungFor.name}
          seasons={seasons}
          initialSeasonId={seasonFilter || undefined}
          onClose={() => setZahlungFor(null)}
          onSubmit={async (input) => {
            await addZahlung({
              player_id: zahlungFor.id,
              season_id: input.seasonId,
              typ: input.typ,
              betrag: input.betrag,
              datum: input.datum,
              notiz: input.notiz,
            })
            await reload()
          }}
        />
      )}
    </div>
  )
}

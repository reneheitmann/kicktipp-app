import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { SeasonFilter } from '../../components/ui/SeasonFilter'
import { currencyFormatter } from '../../lib/format'
import { listPlayers } from './playersApi'
import { addZahlung, listAllZahlungen } from './zahlungenApi'
import { listAllSeasonParticipants } from '../seasons/seasonParticipantsApi'
import { listMatchdayCountsBySeasonId } from '../seasons/matchdaysApi'
import { listSeasons } from '../seasons/seasonsApi'
import { listAllTransactions } from '../balances/balancesApi'
import { computeAccountBalance, computeTotalOutstanding } from './accountBalance'
import { ZahlungForm } from './ZahlungForm'
import type { Player, Season, SeasonParticipant, Transaction, Zahlung } from '../../types/database'

export function AccountsOverviewPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [matchdayCounts, setMatchdayCounts] = useState<Map<string, number>>(new Map())
  const [zahlungen, setZahlungen] = useState<Zahlung[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zahlungFor, setZahlungFor] = useState<Player | null>(null)
  const [seasonFilter, setSeasonFilter] = useState('')

  async function reload() {
    setLoading(true)
    try {
      const [playerData, seasonData, participantData, countsData, zahlungData, transactionData] = await Promise.all([
        listPlayers(),
        listSeasons(),
        listAllSeasonParticipants(),
        listMatchdayCountsBySeasonId(),
        listAllZahlungen(),
        listAllTransactions(),
      ])
      setPlayers(playerData)
      setSeasons(seasonData)
      setParticipants(participantData)
      setMatchdayCounts(countsData)
      setZahlungen(zahlungData)
      setTransactions(transactionData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  const filteredParticipants = seasonFilter
    ? participants.filter((p) => p.season_id === seasonFilter)
    : participants
  const filteredZahlungen = seasonFilter ? zahlungen.filter((z) => z.season_id === seasonFilter) : zahlungen
  const filteredTransactions = seasonFilter ? transactions.filter((t) => t.season_id === seasonFilter) : transactions

  const rows = players
    .map((player) => ({
      player,
      balance: computeAccountBalance(
        filteredParticipants.filter((p) => p.player_id === player.id),
        matchdayCounts,
        filteredZahlungen.filter((z) => z.player_id === player.id),
        filteredTransactions.filter((t) => t.player_id === player.id),
      ),
    }))
    .sort((a, b) => b.balance.offen - a.balance.offen)

  const totalOffen = computeTotalOutstanding(
    players.map((p) => p.id),
    filteredParticipants,
    matchdayCounts,
    filteredZahlungen,
    filteredTransactions,
  )

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Konten-Übersicht</h1>
        <SeasonFilter seasons={seasons} value={seasonFilter} onChange={setSeasonFilter} />
      </div>
      <p className="mb-6 text-sm font-medium text-slate-700">
        Insgesamt offen: {currencyFormatter.format(totalOffen)}
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Spieler angelegt.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Spieler</th>
                <th className="px-4 py-3 font-medium">Beiträge gesamt</th>
                <th className="px-4 py-3 font-medium">Eingezahlt</th>
                <th className="px-4 py-3 font-medium">Ausgezahlt</th>
                <th className="px-4 py-3 font-medium">Gewinne</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
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
                  <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(balance.beitraegeGesamt)}</td>
                  <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(balance.einzahlungenGesamt)}</td>
                  <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(balance.auszahlungenGesamt)}</td>
                  <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(balance.gewinneGesamt)}</td>
                  <td className="px-4 py-3">
                    {balance.offen > 0 ? (
                      <span className="font-medium text-amber-700">
                        {currencyFormatter.format(balance.offen)} offen
                      </span>
                    ) : balance.offen < 0 ? (
                      <span className="font-medium text-emerald-600">
                        {currencyFormatter.format(-balance.offen)} Guthaben
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
        </div>
      )}

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

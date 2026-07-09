import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { SeasonFilter } from '../../components/ui/SeasonFilter'
import { currencyFormatter } from '../../lib/format'
import { centsToEuros } from '../../lib/money'
import { useAuth } from '../auth/useAuth'
import { getPlayer } from './playersApi'
import { listSeasons } from '../seasons/seasonsApi'
import { listSeasonParticipantsForPlayer } from '../seasons/seasonParticipantsApi'
import { listMatchdayCountsBySeasonId } from '../seasons/matchdaysApi'
import { listPlayerTransactions } from '../balances/balancesApi'
import { addZahlung, listZahlungen, removeZahlung } from './zahlungenApi'
import { transferBalanceToSeason } from './transferApi'
import { computeAccountBalance } from './accountBalance'
import { isSeasonBalanceEligible } from '../seasons/seasonStatus'
import { ZahlungForm } from './ZahlungForm'
import { TransferForm } from './TransferForm'
import type { Player, Season, SeasonParticipant, Transaction, Zahlung } from '../../types/database'

export function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const { can } = useAuth()
  const canManage = can('accounts.manage')
  const canManageBalanceTransfer = can('balance_transfer.manage')

  const [player, setPlayer] = useState<Player | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [matchdayCounts, setMatchdayCounts] = useState<Map<string, number>>(new Map())
  const [zahlungen, setZahlungen] = useState<Zahlung[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState('')

  const reload = useCallback(async () => {
    if (!playerId) return
    setLoading(true)
    try {
      const [playerData, seasonData, participantData, countsData, zahlungData, transactionData] = await Promise.all([
        getPlayer(playerId),
        listSeasons(),
        listSeasonParticipantsForPlayer(playerId),
        listMatchdayCountsBySeasonId(),
        listZahlungen(playerId),
        listPlayerTransactions(playerId),
      ])
      setPlayer(playerData)
      setSeasons(seasonData)
      setParticipants(participantData)
      setMatchdayCounts(countsData)
      setZahlungen(zahlungData)
      setTransactions(transactionData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spieler konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    reload()
  }, [reload])

  const seasonsById = useMemo(() => new Map(seasons.map((s) => [s.id, s])), [seasons])

  async function handleRemoveZahlung(id: string) {
    if (!confirm('Diese Zahlung wirklich löschen?')) return
    try {
      await removeZahlung(id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  if (!player) {
    return <p role="alert" className="p-4 text-sm text-red-600 sm:p-6">{error ?? 'Spieler nicht gefunden.'}</p>
  }

  // Ohne Filter (Aggregat über alle Saisons) zählen Entwurf/Archiviert nicht
  // mit; eine explizit ausgewählte Einzelsaison zeigt ihre Zahlen dagegen
  // unabhängig vom Status (siehe seasonStatus.ts).
  const eligibleSeasonIds = new Set(seasons.filter((s) => isSeasonBalanceEligible(s.status)).map((s) => s.id))
  const filteredParticipants = seasonFilter
    ? participants.filter((p) => p.season_id === seasonFilter)
    : participants.filter((p) => eligibleSeasonIds.has(p.season_id))
  const filteredZahlungen = seasonFilter
    ? zahlungen.filter((z) => z.season_id === seasonFilter)
    : zahlungen.filter((z) => eligibleSeasonIds.has(z.season_id))
  const filteredTransactions = seasonFilter
    ? transactions.filter((t) => t.season_id === seasonFilter)
    : transactions.filter((t) => eligibleSeasonIds.has(t.season_id))

  const balance = computeAccountBalance(filteredParticipants, matchdayCounts, filteredZahlungen, filteredTransactions)

  return (
    <div className="p-4 sm:p-6">
      {can('players.manage') && (
        <Link to="/players" className="mb-3 inline-block text-sm text-slate-500 hover:underline">
          ← Alle Spieler
        </Link>
      )}

      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">{player.name}</h1>
        <SeasonFilter seasons={seasons} value={seasonFilter} onChange={setSeasonFilter} />
      </div>
      <p className="mb-6 text-sm text-slate-500">Kicktipp: {player.kicktipp_name || '—'}</p>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">
            Beiträge gesamt {seasonFilter ? '' : '(alle Saisons)'}
          </p>
          <p className="text-lg font-semibold text-slate-900">{currencyFormatter.format(centsToEuros(balance.beitraegeGesamt))}</p>
          <p className="mt-1 text-xs text-slate-500">
            Gesamtwertung: {currencyFormatter.format(centsToEuros(balance.beitraegeGesamtsieg))} · Spieltag:{' '}
            {currencyFormatter.format(centsToEuros(balance.beitraegeSpieltag))}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Eingezahlt / Ausgezahlt</p>
          <p className="text-lg font-semibold text-slate-900">
            {currencyFormatter.format(centsToEuros(balance.einzahlungenGesamt))} / {currencyFormatter.format(centsToEuros(balance.auszahlungenGesamt))}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Abgerechnete Gewinne</p>
          <p className="text-lg font-semibold text-emerald-600">{currencyFormatter.format(centsToEuros(balance.gewinneGesamt))}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm text-slate-500">{balance.offen > 0 ? 'Noch offen' : 'Guthaben'}</p>
              <p className={`text-xl font-semibold ${balance.offen > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                {currencyFormatter.format(centsToEuros(Math.abs(balance.offen)))}
              </p>
            </div>
            {canManageBalanceTransfer && seasonFilter && balance.offen !== 0 && (
              <Button variant="secondary" onClick={() => setShowTransferForm(true)}>
                Saldo übertragen
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Beiträge {currencyFormatter.format(centsToEuros(balance.beitraegeGesamt))} − Einzahlungen{' '}
            {currencyFormatter.format(centsToEuros(balance.einzahlungenGesamt))} − Gewinne{' '}
            {currencyFormatter.format(centsToEuros(balance.gewinneGesamt))} − Korrektur/Übertrag{' '}
            {currencyFormatter.format(centsToEuros(balance.korrekturGesamt))} + Auszahlungen{' '}
            {currencyFormatter.format(centsToEuros(balance.auszahlungenGesamt))}
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Zahlungen</h2>
        {canManage && <Button onClick={() => setShowForm(true)}>+ Zahlung</Button>}
      </div>

      {filteredZahlungen.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Zahlungen erfasst.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredZahlungen.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className={`font-medium ${z.typ === 'auszahlung' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {z.typ === 'auszahlung' ? '−' : '+'} {currencyFormatter.format(centsToEuros(z.betrag))}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {z.typ === 'auszahlung' ? 'Auszahlung' : 'Einzahlung'}
                  </span>
                </p>
                <p className="truncate text-sm text-slate-500">
                  {z.datum} · {seasonsById.get(z.season_id)?.name ?? 'Unbekannte Saison'}
                  {z.notiz ? ` · ${z.notiz}` : ''}
                </p>
              </div>
              {canManage && (
                <Button variant="danger" onClick={() => handleRemoveZahlung(z.id)}>
                  Löschen
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && player && (
        <ZahlungForm
          seasons={seasons}
          initialSeasonId={seasonFilter || undefined}
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await addZahlung({
              player_id: player.id,
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

      {showTransferForm && player && seasonFilter && seasonsById.get(seasonFilter) && (
        <TransferForm
          playerName={player.name}
          fromSeason={seasonsById.get(seasonFilter)!}
          currentOffen={balance.offen}
          otherSeasons={seasons.filter((s) => s.id !== seasonFilter)}
          onClose={() => setShowTransferForm(false)}
          onSubmit={async (input) => {
            await transferBalanceToSeason({
              playerId: player.id,
              fromSeasonId: seasonFilter,
              toSeasonId: input.toSeasonId,
              betrag: input.betrag,
              notiz: input.notiz,
            })
            await reload()
          }}
        />
      )}
    </div>
  )
}

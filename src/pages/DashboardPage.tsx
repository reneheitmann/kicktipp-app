import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { currencyFormatter } from '../lib/format'
import { centsToEuros } from '../lib/money'
import { useAuth } from '../features/auth/useAuth'
import { listSeasons } from '../features/seasons/seasonsApi'
import { listPlayers } from '../features/players/playersApi'
import { listPlayerProfileLinks } from '../features/players/playerProfileLinksApi'
import { listSeasonParticipantsForPlayer, listSeasonParticipantsForSeasons } from '../features/seasons/seasonParticipantsApi'
import { listAbgerechneteMatchdayIds, listMatchdayCountsBySeasonId } from '../features/seasons/matchdaysApi'
import { listZahlungen, listZahlungenForSeasons } from '../features/players/zahlungenApi'
import { listPlayerTransactions, listTransactionsForSeasons } from '../features/balances/balancesApi'
import { computeAccountBalance, computeTotalOutstanding, type AccountBalance } from '../features/players/accountBalance'
import { isSeasonBalanceEligible } from '../features/seasons/seasonStatus'
import type { Player, Season } from '../types/database'

// Ab dieser Anzahl verknüpfter Spieler wird die Liste als kompakte Tabelle
// statt als volle Karten-pro-Spieler dargestellt – sonst wird die "ruhige"
// Startseite bei vielen verknüpften Spielern zu einer langen Kartenwand.
const COMPACT_PLAYER_LIST_THRESHOLD = 3

interface AdminStats {
  playerCount: number
  activeSeasonCount: number
  matchdayCount: number
  totalOutstanding: number
}

interface PlayerBalanceEntry {
  player: Player
  balance: AccountBalance
}

export function DashboardPage() {
  const { profile, can } = useAuth()
  // Statistik ist eine finanzielle Gesamtübersicht -> gleiches Recht wie Konten.
  const canManage = can('accounts.manage')

  const [activeSeasons, setActiveSeasons] = useState<Season[]>([])
  // Ein Login-Konto kann mit mehreren Spielern verknüpft sein (z. B. eine
  // Person tippt für mehrere Kicktipp-Profile) – daher hier bewusst ein
  // Array statt eines einzelnen Spielers.
  const [linkedPlayers, setLinkedPlayers] = useState<Player[]>([])
  const [myBalance, setMyBalance] = useState<AccountBalance | null>(null)
  const [myPlayerBalances, setMyPlayerBalances] = useState<PlayerBalanceEntry[]>([])
  // Nur Saisons, an denen mindestens einer der verknüpften Spieler tatsächlich
  // teilnimmt, haben hier einen Eintrag – so lässt sich "kein Gewinn
  // ausgewiesen" (Admin/Spielleiter ohne eigene Teilnahme) von "0,00 €
  // Gewinn" (Teilnehmer ohne bisherige Auszahlung) unterscheiden.
  const [myGewinnBySeasonId, setMyGewinnBySeasonId] = useState<Map<string, number>>(new Map())
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [seasons, players, matchdayCounts, links] = await Promise.all([
          listSeasons(),
          listPlayers(),
          listMatchdayCountsBySeasonId(),
          listPlayerProfileLinks(),
        ])
        setActiveSeasons(seasons.filter((s) => s.status === 'aktiv'))
        // Entwurf-/archivierte Saisons zählen nicht in saisonübergreifenden
        // Geld-Summen mit (siehe seasonStatus.ts) – eine explizit aufgerufene
        // Einzelsaison (SeasonBalancesPage) bleibt davon unberührt.
        const eligibleSeasonIds = new Set(seasons.filter((s) => isSeasonBalanceEligible(s.status)).map((s) => s.id))

        const linkedPlayerIds = new Set(links.filter((l) => l.profile_id === profile!.id).map((l) => l.player_id))
        const linked = players.filter((p) => linkedPlayerIds.has(p.id))
        setLinkedPlayers(linked)
        if (linked.length > 0) {
          const perPlayerData = await Promise.all(
            linked.map(async (player) => {
              const [participants, zahlungen, transactions] = await Promise.all([
                listSeasonParticipantsForPlayer(player.id),
                listZahlungen(player.id),
                listPlayerTransactions(player.id),
              ])
              return {
                player,
                participants: participants.filter((p) => eligibleSeasonIds.has(p.season_id)),
                zahlungen: zahlungen.filter((z) => eligibleSeasonIds.has(z.season_id)),
                transactions: transactions.filter((t) => eligibleSeasonIds.has(t.season_id)),
              }
            }),
          )

          // Gesamtkonto: dieselbe computeAccountBalance()-Funktion wie für
          // einen einzelnen Spieler, nur mit den zusammengeführten Rohdaten
          // aller verknüpften Spieler – rechnerisch identisch zum Aufsummieren
          // der Einzelsalden, aber ohne die Aggregationslogik zu duplizieren.
          const allParticipants = perPlayerData.flatMap((d) => d.participants)
          const allZahlungen = perPlayerData.flatMap((d) => d.zahlungen)
          const allTransactions = perPlayerData.flatMap((d) => d.transactions)
          setMyBalance(computeAccountBalance(allParticipants, matchdayCounts, allZahlungen, allTransactions))
          setMyPlayerBalances(
            perPlayerData.map(({ player, participants, zahlungen, transactions }) => ({
              player,
              balance: computeAccountBalance(participants, matchdayCounts, zahlungen, transactions),
            })),
          )

          // Eigener Gesamtgewinn je Saison, an der mindestens einer der
          // verknüpften Spieler teilnimmt – analog zur Berechnung auf der
          // Saison-Detailseite/Saisons-Liste: nur Spieltage mit Status
          // "abgerechnet" zählen, dazu die Gesamtwertung, sofern auch diese
          // schon abgerechnet ist.
          const matchdays = await listAbgerechneteMatchdayIds()
          const abgerechnetMatchdayIds = new Set(matchdays.map((m) => m.id))
          const gewinnMap = new Map<string, number>()
          for (const { participants, transactions } of perPlayerData) {
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
              const bisher = gewinnMap.get(participant.season_id) ?? 0
              gewinnMap.set(participant.season_id, bisher + spieltagSumme + gesamtwertungBetrag)
            }
          }
          setMyGewinnBySeasonId(gewinnMap)
        }

        if (canManage) {
          const eligibleSeasonIdList = [...eligibleSeasonIds]
          const [allParticipants, allZahlungen, allTransactions] = await Promise.all([
            listSeasonParticipantsForSeasons(eligibleSeasonIdList),
            listZahlungenForSeasons(eligibleSeasonIdList),
            listTransactionsForSeasons(eligibleSeasonIdList),
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
      } catch (err) {
        // Nur generische Meldung für den Nutzer – eine rohe Fehlermeldung
        // (z. B. ein Netzwerk-/Supabase-String) wäre für nicht-technische
        // Nutzer auf einer Geld-Seite verwirrend statt hilfreich.
        console.error('Dashboard konnte nicht vollständig geladen werden:', err)
        setError('Übersicht konnte nicht vollständig geladen werden.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [profile, canManage])

  if (loading) {
    return (
      <div className="p-4 sm:p-6" aria-live="polite" aria-busy="true">
        <span className="sr-only">Konto wird geladen…</span>
        <div className="mb-6 h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mb-6 animate-pulse rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 h-4 w-32 rounded bg-slate-100" />
          <div className="mb-3 h-7 w-40 rounded bg-slate-100" />
          <div className="h-4 w-full rounded bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Willkommen, {profile?.name}</h1>

      {error && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error} Bitte Seite neu laden.
        </p>
      )}

      {linkedPlayers.length === 0 && (
        <p className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Dein Login ist noch nicht mit einem Spieler verknüpft. Wende dich an deinen Spielleiter.
        </p>
      )}

      {linkedPlayers.length === 1 && myBalance && (
        <PlayerBalanceCard player={linkedPlayers[0]} balance={myBalance} title="Mein Konto" className="mb-6 shadow-md" />
      )}

      {linkedPlayers.length > 1 && linkedPlayers.length < COMPACT_PLAYER_LIST_THRESHOLD && myBalance && (
        <div className="mb-6">
          <PlayerBalanceSummary balance={myBalance} title="Mein Konto (alle Spieler)" />
          <div className="mt-3 space-y-3">
            {myPlayerBalances.map(({ player, balance }) => (
              <PlayerBalanceCard key={player.id} player={player} balance={balance} title={player.name} />
            ))}
          </div>
        </div>
      )}

      {linkedPlayers.length >= COMPACT_PLAYER_LIST_THRESHOLD && myBalance && (
        <div className="mb-6">
          <PlayerBalanceSummary balance={myBalance} title="Mein Konto (alle Spieler)" />
          <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {myPlayerBalances.map(({ player, balance }) => (
              <li key={player.id}>
                <Link
                  to={`/players/${player.id}`}
                  aria-label={`${player.name}, ${describeBalance(balance)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="truncate font-medium text-slate-900">{player.name}</span>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      balance.offen > 0 ? 'text-amber-700' : balance.offen < 0 ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {describeBalance(balance)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && stats && (
        <>
          <h2 className="text-base font-semibold text-slate-900">Statistik</h2>
          <p className="mb-3 text-xs text-slate-500">Zahlen über alle Spieler – nicht dein eigenes Konto.</p>
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
            <StatCard label="Spieler" value={String(stats.playerCount)} />
            <StatCard label="Aktive Saisons" value={String(stats.activeSeasonCount)} />
            <StatCard label="Spieltage gesamt" value={String(stats.matchdayCount)} />
            <StatCard
              label="Offene Beträge (alle Spieler)"
              value={currencyFormatter.format(centsToEuros(stats.totalOutstanding))}
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
                  aria-label={`Saison ${season.name}${myGewinn !== undefined ? `, Gewinn ${currencyFormatter.format(centsToEuros(myGewinn))}` : ''}, Status ${season.status}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{season.name}</span>
                  <div className="flex items-center gap-3">
                    {myGewinn !== undefined && (
                      <span className="text-sm font-medium text-emerald-700">{currencyFormatter.format(centsToEuros(myGewinn))}</span>
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
    <div className="rounded-xl bg-white p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

/** Kurzform der Saldo-Aussage, z. B. "12,00 € offen" / "5,00 € Guthaben" / "Ausgeglichen" – für Headline und Accessible Names. */
function describeBalance(balance: AccountBalance): string {
  if (balance.offen > 0) return `${currencyFormatter.format(centsToEuros(balance.offen))} offen`
  if (balance.offen < 0) return `${currencyFormatter.format(centsToEuros(-balance.offen))} Guthaben`
  return 'Ausgeglichen'
}

/** Reine Saldo-Anzeige ohne Link – für die Gesamtsumme über mehrere verknüpfte Spieler, die zu keiner einzelnen Spieler-Detailseite führt.
 * Bekommt die "Betont"-Schatten-Stufe (siehe DESIGN.md), da hier immer "Mein Konto" gemeint ist – anders als bei PlayerBalanceCard,
 * die auch für die flachen Nebenkarten der einzelnen Spieler wiederverwendet wird. */
function PlayerBalanceSummary({ balance, title }: { balance: AccountBalance; title: string }) {
  return (
    <div className="block rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <h2 className="text-sm text-slate-500">{title}</h2>
      <BalanceHeadline balance={balance} />
      <BalanceBreakdown balance={balance} />
    </div>
  )
}

/** Saldo-Karte eines einzelnen Spielers, verlinkt auf dessen Detailseite. */
function PlayerBalanceCard({
  player,
  balance,
  title,
  className = '',
}: {
  player: Player
  balance: AccountBalance
  title: string
  className?: string
}) {
  return (
    <Link
      to={`/players/${player.id}`}
      aria-label={`${title}, ${describeBalance(balance)}`}
      className={`block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 ${className}`}
    >
      <h2 className="text-sm text-slate-500">{title}</h2>
      <BalanceHeadline balance={balance} />
      <BalanceBreakdown balance={balance} />
    </Link>
  )
}

function BalanceHeadline({ balance }: { balance: AccountBalance }) {
  return (
    <p
      className={`text-xl font-semibold ${
        balance.offen > 0 ? 'text-amber-700' : balance.offen < 0 ? 'text-emerald-600' : 'text-slate-900'
      }`}
    >
      {describeBalance(balance)}
    </p>
  )
}

function BalanceBreakdown({ balance }: { balance: AccountBalance }) {
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
      <div className="flex justify-between gap-2">
        <dt>Beiträge</dt>
        <dd className="font-medium text-slate-700">{currencyFormatter.format(centsToEuros(balance.beitraegeGesamt))}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt>Eingezahlt</dt>
        <dd className="font-medium text-slate-700">{currencyFormatter.format(centsToEuros(balance.einzahlungenGesamt))}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt>Ausgezahlt</dt>
        <dd className="font-medium text-slate-700">{currencyFormatter.format(centsToEuros(balance.auszahlungenGesamt))}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt>Gewinne</dt>
        <dd className="font-medium text-slate-700">{currencyFormatter.format(centsToEuros(balance.gewinneGesamt))}</dd>
      </div>
    </dl>
  )
}

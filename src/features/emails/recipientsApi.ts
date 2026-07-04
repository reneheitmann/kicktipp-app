import { fetchAllRows } from '../../lib/fetchAllRows'
import type { Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import { listSeasonTransactions } from '../balances/balancesApi'
import { computeAccountBalance } from '../players/accountBalance'
import { listAllZahlungen } from '../players/zahlungenApi'
import { listMatchdayPayouts } from '../rankings/matchdayRankingsApi'
import { listSeasonPayouts } from '../rankings/seasonRankingsApi'
import { listMatchdayCountsBySeasonId } from '../seasons/matchdaysApi'
import { listSeasonParticipants } from '../seasons/seasonParticipantsApi'
import type { Player, Profile } from '../../types/database'

export type PlayerWithProfile = Player & {
  profile: Pick<Profile, 'id' | 'name' | 'vorname' | 'nachname' | 'email' | 'is_active'> | null
}

export async function listPlayersWithProfiles(): Promise<PlayerWithProfile[]> {
  const data = await fetchAllRows<unknown>((from, to) =>
    supabase
      .from('players')
      .select('*, profile:profiles(id, name, vorname, nachname, email, is_active)')
      .order('name')
      .range(from, to),
  )
  return data as PlayerWithProfile[]
}

/** Spieler mit betrag > 0 aus den gewinn_spieltag-Buchungen des Spieltags ("echte" Gewinner, nicht nur Rang 1). */
export async function resolveMatchdayWinnerIds(matchdayId: string): Promise<Set<string>> {
  const payouts = await listMatchdayPayouts(matchdayId)
  return new Set(payouts.filter((p) => p.betrag > 0).map((p) => p.player_id))
}

/** Spieler mit betrag > 0 aus den gewinn_gesamt-Buchungen der Saison. */
export async function resolveSeasonWinnerIds(seasonId: string): Promise<Set<string>> {
  const payouts = await listSeasonPayouts(seasonId)
  return new Set(payouts.filter((p) => p.betrag > 0).map((p) => p.player_id))
}

export interface PlayerSeasonBalance {
  offen: Cents
  gewinneGesamt: Cents
}

/**
 * Kontostand je Teilnehmer einer Saison (offen bereits auf >= 0 begrenzt,
 * siehe computeTotalOutstanding-Konvention in accountBalance.ts). Dient
 * sowohl als Basis für den Empfänger-Modus "Offene Posten" als auch für die
 * Variablen {{OffenePosten}}/{{Gewinne}} – unabhängig vom gewählten Modus,
 * da die Bezugssaison für den ganzen Versand einheitlich gewählt wird.
 */
export async function computeSeasonBalancesByPlayerId(seasonId: string): Promise<Map<string, PlayerSeasonBalance>> {
  const [participants, matchdayCounts, zahlungen, transactions] = await Promise.all([
    listSeasonParticipants(seasonId),
    listMatchdayCountsBySeasonId(),
    listAllZahlungen(),
    listSeasonTransactions(seasonId),
  ])
  const seasonZahlungen = zahlungen.filter((z) => z.season_id === seasonId)

  const result = new Map<string, PlayerSeasonBalance>()
  for (const participant of participants) {
    const balance = computeAccountBalance(
      [participant],
      matchdayCounts,
      seasonZahlungen.filter((z) => z.player_id === participant.player_id),
      transactions.filter((t) => t.player_id === participant.player_id),
    )
    result.set(participant.player_id, { offen: Math.max(0, balance.offen), gewinneGesamt: balance.gewinneGesamt })
  }
  return result
}

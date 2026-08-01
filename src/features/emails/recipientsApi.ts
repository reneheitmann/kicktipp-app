import { fetchAllRows } from '../../lib/fetchAllRows'
import type { Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import { listSeasonTransactions } from '../balances/balancesApi'
import { computeAccountBalance } from '../players/accountBalance'
import { listPlayerProfileLinks } from '../players/playerProfileLinksApi'
import { listZahlungenForSeason } from '../players/zahlungenApi'
import { listMatchdayPayouts } from '../rankings/matchdayRankingsApi'
import { listSeasonPayouts } from '../rankings/seasonRankingsApi'
import { listMatchdayCountsBySeasonId } from '../seasons/matchdaysApi'
import { listSeasonParticipants } from '../seasons/seasonParticipantsApi'
import type { Player, Profile } from '../../types/database'

type LinkedProfile = Pick<Profile, 'id' | 'name' | 'vorname' | 'nachname' | 'email' | 'is_active'>

export type PlayerWithProfile = Player & {
  profile: LinkedProfile | null
}

// players hat seit player_profile_links (0041_player_profile_links.sql) keine
// direkte profile_id-Spalte mehr, sondern eine n:m-Verknüpfung – ein
// PostgREST-Embed über die Zwischentabelle liefert dadurch ein Array statt
// eines einzelnen Profils zurück (`player.profile?.email` wäre dann immer
// undefined, ohne dass die Abfrage selbst fehlschlägt). Stattdessen wie an
// anderen Stellen im Code (z. B. MyAccountPage.tsx) player_profile_links
// selbst laden und clientseitig zuordnen.
export async function listPlayersWithProfiles(): Promise<PlayerWithProfile[]> {
  const [players, links, profiles] = await Promise.all([
    fetchAllRows<Player>((from, to) => supabase.from('players').select('*').order('name').range(from, to)),
    listPlayerProfileLinks(),
    fetchAllRows<LinkedProfile>((from, to) =>
      supabase.from('profiles').select('id, name, vorname, nachname, email, is_active').range(from, to),
    ),
  ])

  const profileById = new Map(profiles.map((p) => [p.id, p]))
  return players.map((player) => {
    const linkedProfiles = links
      .filter((l) => l.player_id === player.id)
      .map((l) => profileById.get(l.profile_id))
      .filter((p): p is LinkedProfile => !!p)
    // Ein Spieler kann mehrere verknüpfte Logins haben – für den
    // E-Mail-Versand reicht eine erreichbare Adresse; bevorzugt ein aktives
    // Profil mit hinterlegter E-Mail, sonst irgendein verknüpftes.
    const profile = linkedProfiles.find((p) => p.is_active && p.email) ?? linkedProfiles[0] ?? null
    return { ...player, profile }
  })
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
  const [participants, matchdayCounts, seasonZahlungen, transactions] = await Promise.all([
    listSeasonParticipants(seasonId),
    listMatchdayCountsBySeasonId(),
    listZahlungenForSeason(seasonId),
    listSeasonTransactions(seasonId),
  ])

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

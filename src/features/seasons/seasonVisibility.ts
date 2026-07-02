import type { SeasonParticipant } from '../../types/database'

/** Spiegelt is_season_participant() aus der DB-RLS (0028_season_participant_visibility.sql)
 * clientseitig nach: eine echte "user"-Rolle sieht dort nur Saisons, an denen
 * der eigene Spieler teilnimmt. Admin/Spielleiter sehen über RLS immer alles
 * (seasons.manage-Bypass) – auch während der "Spieler-Vorschau", da diese nur
 * clientseitig simuliert wird und die tatsächliche DB-Session admin bleibt.
 * Ohne diesen Filter zeigt die Vorschau also fälschlich Saisons an, die ein
 * echter Spieler-Account gar nicht sehen würde. */
export function isSeasonVisibleAsUser(
  seasonId: string,
  myPlayerId: string | undefined,
  participants: SeasonParticipant[],
): boolean {
  if (!myPlayerId) return false
  return participants.some((p) => p.season_id === seasonId && p.player_id === myPlayerId)
}

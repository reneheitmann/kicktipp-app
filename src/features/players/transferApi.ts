import { centsToEuros, type Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'

export interface TransferBalanceInput {
  playerId: string
  fromSeasonId: string
  toSeasonId: string
  betrag: Cents
  notiz: string | null
}

/**
 * Überträgt den offenen Saldo (Guthaben oder Restschuld) eines Spielers von
 * einer Saison in eine andere, siehe Migration 0019: bucht in der Quell-Saison
 * eine ausgleichende und in der Ziel-Saison eine spiegelbildliche
 * Korrektur-Buchung, sodass die Quell-Saison exakt auf 0 ausgeglichen ist und
 * die Ziel-Saison denselben Betrag als Startsaldo übernimmt.
 */
export async function transferBalanceToSeason(input: TransferBalanceInput): Promise<void> {
  const { error } = await supabase.rpc('transfer_balance_to_season', {
    p_player_id: input.playerId,
    p_from_season_id: input.fromSeasonId,
    p_to_season_id: input.toSeasonId,
    p_betrag: centsToEuros(input.betrag),
    p_notiz: input.notiz,
  })
  if (error) throw error
}

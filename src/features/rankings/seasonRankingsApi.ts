import { supabase } from '../../lib/supabaseClient'
import type { SeasonRanking, Transaction } from '../../types/database'

export async function listSeasonRankings(seasonId: string): Promise<SeasonRanking[]> {
  const { data, error } = await supabase.from('season_rankings').select('*').eq('season_id', seasonId)
  if (error) throw error
  return data
}

export async function setSeasonRanking(seasonId: string, playerId: string, rang: number): Promise<SeasonRanking> {
  const { data, error } = await supabase
    .from('season_rankings')
    .upsert({ season_id: seasonId, player_id: playerId, rang }, { onConflict: 'season_id,player_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeSeasonRanking(id: string): Promise<void> {
  const { error } = await supabase.from('season_rankings').delete().eq('id', id)
  if (error) throw error
}

export async function listSeasonPayouts(seasonId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('season_id', seasonId)
    .eq('typ', 'gewinn_gesamt')
    .is('matchday_id', null)
  if (error) throw error
  return data
}

export async function calculateSeasonPayout(seasonId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.rpc('calculate_season_payout', { p_season_id: seasonId })
  if (error) throw error
  return data
}

/** Löscht die Gesamtwertung-Gewinnverteilung (Prozentsätze) inkl. bereits verbuchter Gewinne. */
export async function deleteSeasonPayoutDistribution(seasonId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_season_payout_distribution', { p_season_id: seasonId })
  if (error) throw error
}

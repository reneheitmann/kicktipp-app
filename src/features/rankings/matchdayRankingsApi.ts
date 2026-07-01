import { supabase } from '../../lib/supabaseClient'
import type { MatchdayRanking, Transaction } from '../../types/database'

export async function listMatchdayRankings(matchdayId: string): Promise<MatchdayRanking[]> {
  const { data, error } = await supabase.from('matchday_rankings').select('*').eq('matchday_id', matchdayId)
  if (error) throw error
  return data
}

export async function listMatchdayRankingsForMatchdays(matchdayIds: string[]): Promise<MatchdayRanking[]> {
  if (matchdayIds.length === 0) return []
  const { data, error } = await supabase.from('matchday_rankings').select('*').in('matchday_id', matchdayIds)
  if (error) throw error
  return data
}

export async function setMatchdayRanking(matchdayId: string, playerId: string, rang: number): Promise<MatchdayRanking> {
  const { data, error } = await supabase
    .from('matchday_rankings')
    .upsert({ matchday_id: matchdayId, player_id: playerId, rang }, { onConflict: 'matchday_id,player_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeMatchdayRanking(id: string): Promise<void> {
  const { error } = await supabase.from('matchday_rankings').delete().eq('id', id)
  if (error) throw error
}

export async function listMatchdayPayouts(matchdayId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('matchday_id', matchdayId)
    .eq('typ', 'gewinn_spieltag')
  if (error) throw error
  return data
}

export async function calculateMatchdayPayout(matchdayId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.rpc('calculate_matchday_payout', { p_matchday_id: matchdayId })
  if (error) throw error
  return data
}

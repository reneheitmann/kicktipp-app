import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Transaction } from '../../types/database'

export async function listSeasonTransactions(seasonId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').eq('season_id', seasonId)
  if (error) throw error
  return data
}

export async function listAllTransactions(): Promise<Transaction[]> {
  return fetchAllRows((from, to) => supabase.from('transactions').select('*').range(from, to))
}

export async function listPlayerTransactions(playerId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').eq('player_id', playerId)
  if (error) throw error
  return data
}

import { fetchAllRows } from '../../lib/fetchAllRows'
import { eurosToCents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { SeasonRanking, Transaction } from '../../types/database'

function toCents(row: Transaction): Transaction {
  return { ...row, betrag: eurosToCents(row.betrag) }
}

export async function listSeasonRankings(seasonId: string): Promise<SeasonRanking[]> {
  return fetchAllRows((from, to) =>
    supabase.from('season_rankings').select('*').eq('season_id', seasonId).range(from, to),
  )
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

/** Entfernt die Platzierung eines Spielers samt einer dafür ggf. bereits verbuchten gewinn_gesamt-Buchung. */
export async function removeSeasonRanking(id: string): Promise<void> {
  const { error } = await supabase.rpc('remove_season_ranking', { p_ranking_id: id })
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
  return data.map(toCents)
}

export async function calculateSeasonPayout(seasonId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.rpc('calculate_season_payout', { p_season_id: seasonId })
  if (error) throw error
  return data.map(toCents)
}

/** Setzt Platzierungen der Gesamtwertung samt bereits verbuchter Gewinne zurück – die konfigurierte Gewinnverteilung (Prozentsätze) bleibt unangetastet. */
export async function resetSeasonRankings(seasonId: string): Promise<void> {
  const { error } = await supabase.rpc('reset_season_rankings', { p_season_id: seasonId })
  if (error) throw error
}

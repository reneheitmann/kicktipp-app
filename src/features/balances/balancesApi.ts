import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Transaction } from '../../types/database'

export async function listSeasonTransactions(seasonId: string): Promise<Transaction[]> {
  // Eine einzelne Saison kann bei vielen Teilnehmern/Spieltagen allein schon
  // über 1000 Zeilen erzeugen (z. B. 84 Spieler × 34 Spieltage), daher hier
  // ebenfalls paginiert wie listAllTransactions – sonst fehlen zufällig
  // ganze Buchungstypen (typischerweise die zuletzt eingefügten gewinn_*).
  return fetchAllRows((from, to) =>
    supabase.from('transactions').select('*').eq('season_id', seasonId).range(from, to),
  )
}

export async function listAllTransactions(): Promise<Transaction[]> {
  return fetchAllRows((from, to) => supabase.from('transactions').select('*').range(from, to))
}

export async function listPlayerTransactions(playerId: string): Promise<Transaction[]> {
  return fetchAllRows((from, to) =>
    supabase.from('transactions').select('*').eq('player_id', playerId).range(from, to),
  )
}

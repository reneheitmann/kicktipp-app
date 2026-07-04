import { fetchAllRows } from '../../lib/fetchAllRows'
import { eurosToCents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { Transaction } from '../../types/database'

function toCents(row: Transaction): Transaction {
  return { ...row, betrag: eurosToCents(row.betrag) }
}

export async function listSeasonTransactions(seasonId: string): Promise<Transaction[]> {
  // Eine einzelne Saison kann bei vielen Teilnehmern/Spieltagen allein schon
  // über 1000 Zeilen erzeugen (z. B. 84 Spieler × 34 Spieltage), daher hier
  // ebenfalls paginiert wie listAllTransactions – sonst fehlen zufällig
  // ganze Buchungstypen (typischerweise die zuletzt eingefügten gewinn_*).
  const rows = await fetchAllRows<Transaction>((from, to) =>
    supabase.from('transactions').select('*').eq('season_id', seasonId).range(from, to),
  )
  return rows.map(toCents)
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const rows = await fetchAllRows<Transaction>((from, to) => supabase.from('transactions').select('*').range(from, to))
  return rows.map(toCents)
}

export async function listPlayerTransactions(playerId: string): Promise<Transaction[]> {
  const rows = await fetchAllRows<Transaction>((from, to) =>
    supabase.from('transactions').select('*').eq('player_id', playerId).range(from, to),
  )
  return rows.map(toCents)
}

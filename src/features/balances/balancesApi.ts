import { fetchAllRows } from '../../lib/fetchAllRows'
import { eurosToCents, type Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { Transaction } from '../../types/database'

export interface PublicPlayerSeasonBalance {
  player_id: string
  season_id: string
  gesamt_saldo: Cents
  gewinne: Cents
}

function toCents(row: Transaction): Transaction {
  return { ...row, betrag: eurosToCents(row.betrag) }
}

export async function listSeasonTransactions(seasonId: string): Promise<Transaction[]> {
  // Eine einzelne Saison kann bei vielen Teilnehmern/Spieltagen allein schon
  // über 1000 Zeilen erzeugen (z. B. 84 Spieler × 34 Spieltage), daher hier
  // paginiert über fetchAllRows – sonst fehlen zufällig ganze Buchungstypen
  // (typischerweise die zuletzt eingefügten gewinn_*).
  const rows = await fetchAllRows<Transaction>((from, to) =>
    supabase.from('transactions').select('*').eq('season_id', seasonId).range(from, to),
  )
  return rows.map(toCents)
}

export async function listPlayerTransactions(playerId: string): Promise<Transaction[]> {
  const rows = await fetchAllRows<Transaction>((from, to) =>
    supabase.from('transactions').select('*').eq('player_id', playerId).range(from, to),
  )
  return rows.map(toCents)
}

/** Wie listSeasonTransactions, aber für mehrere Saisons auf einmal – serverseitig
 * gefiltert statt (wie zuvor per listAllTransactions) die komplette Tabelle zu
 * laden und erst clientseitig einzugrenzen. */
export async function listTransactionsForSeasons(seasonIds: string[]): Promise<Transaction[]> {
  if (seasonIds.length === 0) return []
  const rows = await fetchAllRows<Transaction>((from, to) =>
    supabase.from('transactions').select('*').in('season_id', seasonIds).range(from, to),
  )
  return rows.map(toCents)
}

/** Wie listPlayerTransactions, aber für mehrere Spieler auf einmal (z. B. alle
 * eigenen verknüpften Spieler). */
export async function listTransactionsForPlayers(playerIds: string[]): Promise<Transaction[]> {
  if (playerIds.length === 0) return []
  const rows = await fetchAllRows<Transaction>((from, to) =>
    supabase.from('transactions').select('*').in('player_id', playerIds).range(from, to),
  )
  return rows.map(toCents)
}

/** Liefert den Gesamtsaldo je Spieler/Saison für ALLE Spieler (nicht nur
 * eigene verknüpfte) über eine security-definer-Funktion, die nur die
 * fertig berechnete Summe offenlegt – season_participants/transactions/
 * zahlungen selbst bleiben weiterhin "eigener Spieler"-privat. Für den
 * Saisonvergleich, der jeden aktiven Spieler zeigen soll. */
export async function getPublicPlayerSeasonBalances(seasonIds: string[]): Promise<PublicPlayerSeasonBalance[]> {
  if (seasonIds.length === 0) return []
  const { data, error } = await supabase.rpc('get_player_season_balances', { p_season_ids: seasonIds })
  if (error) throw error
  return (data ?? []).map((row) => ({
    player_id: row.player_id,
    season_id: row.season_id,
    gesamt_saldo: eurosToCents(row.gesamt_saldo),
    gewinne: eurosToCents(row.gewinne),
  }))
}

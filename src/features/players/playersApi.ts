import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Player } from '../../types/database'

export async function listPlayers(opts: { includeInactive?: boolean } = {}): Promise<Player[]> {
  return fetchAllRows((from, to) => {
    let query = supabase.from('players').select('*').order('name')
    if (!opts.includeInactive) query = query.eq('is_active', true)
    return query.range(from, to)
  })
}

export async function getPlayer(id: string): Promise<Player> {
  const { data, error } = await supabase.from('players').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createPlayer(input: {
  name: string
  kicktipp_name: string | null
}): Promise<Player> {
  const { data, error } = await supabase.from('players').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updatePlayer(
  id: string,
  input: Partial<Pick<Player, 'name' | 'kicktipp_name' | 'is_active'>>,
): Promise<Player> {
  const { data, error } = await supabase.from('players').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw error
}

/**
 * Übersetzt den DB-Unique-Constraint-Fehler (Name bzw. Kicktipp-Name bereits
 * vergeben) in eine verständliche Meldung. Greift als Absicherung, falls die
 * clientseitige Vorab-Prüfung umgangen wird (z. B. Race Condition zwischen
 * zwei gleichzeitigen Anlagen).
 */
export function describePlayerSaveError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  if (message.includes('players_name_lower_idx')) {
    return 'Dieser Name ist bereits vergeben. Bitte einen anderen Namen wählen.'
  }
  if (message.includes('players_kicktipp_name_lower_idx')) {
    return 'Dieser Kicktipp-Name ist bereits einem anderen Spieler zugeordnet.'
  }
  return message || 'Speichern fehlgeschlagen.'
}

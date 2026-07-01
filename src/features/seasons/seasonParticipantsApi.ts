import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { SeasonParticipant } from '../../types/database'

export async function listSeasonParticipants(seasonId: string): Promise<SeasonParticipant[]> {
  return fetchAllRows((from, to) =>
    supabase.from('season_participants').select('*').eq('season_id', seasonId).range(from, to),
  )
}

export async function listSeasonParticipantsForPlayer(playerId: string): Promise<SeasonParticipant[]> {
  return fetchAllRows((from, to) =>
    supabase.from('season_participants').select('*').eq('player_id', playerId).range(from, to),
  )
}

export async function listAllSeasonParticipants(): Promise<SeasonParticipant[]> {
  return fetchAllRows((from, to) => supabase.from('season_participants').select('*').range(from, to))
}

export async function addSeasonParticipant(input: {
  season_id: string
  player_id: string
  gesamtsieg_einsatz_betrag: number
  spieltags_einsatz_betrag: number
}): Promise<SeasonParticipant> {
  const { data, error } = await supabase.from('season_participants').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateSeasonParticipant(
  id: string,
  input: { gesamtsieg_einsatz_betrag: number; spieltags_einsatz_betrag: number },
): Promise<SeasonParticipant> {
  const { data, error } = await supabase.from('season_participants').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removeSeasonParticipant(id: string): Promise<void> {
  const { error } = await supabase.from('season_participants').delete().eq('id', id)
  if (error) throw error
}

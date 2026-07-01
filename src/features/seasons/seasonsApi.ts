import { supabase } from '../../lib/supabaseClient'
import type { GesamtwertungStatus, Season, SeasonStatus } from '../../types/database'

export async function listSeasons(): Promise<Season[]> {
  const { data, error } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getSeason(id: string): Promise<Season> {
  const { data, error } = await supabase.from('seasons').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createSeason(input: {
  name: string
  start_date: string
  end_date: string
}): Promise<Season> {
  const { data, error } = await supabase.from('seasons').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateSeason(
  id: string,
  input: Partial<{ name: string; start_date: string; end_date: string }>,
): Promise<Season> {
  const { data, error } = await supabase.from('seasons').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function setSeasonStatus(id: string, status: SeasonStatus): Promise<Season> {
  const { data, error } = await supabase.from('seasons').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function setGesamtwertungStatus(id: string, gesamtwertung_status: GesamtwertungStatus): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .update({ gesamtwertung_status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSeason(id: string): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', id)
  if (error) throw error
}

/** Kopiert wahlweise Gewinnverteilung, Teilnehmer (inkl. Einsätze) und/oder Spieltags-Nummerierung in eine neue Saison. */
export async function copySeason(input: {
  sourceSeasonId: string
  name: string
  startDate: string
  endDate: string
  copyPayoutRules: boolean
  copyPlayers: boolean
  copyMatchdays: boolean
}): Promise<string> {
  const { data, error } = await supabase.rpc('copy_season', {
    p_source_season_id: input.sourceSeasonId,
    p_new_name: input.name,
    p_new_start_date: input.startDate,
    p_new_end_date: input.endDate,
    p_copy_payout_rules: input.copyPayoutRules,
    p_copy_players: input.copyPlayers,
    p_copy_matchdays: input.copyMatchdays,
  })
  if (error) throw error
  return data
}

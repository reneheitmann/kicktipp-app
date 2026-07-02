import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { GesamtwertungStatus, Season, SeasonStatus } from '../../types/database'

export async function listSeasons(): Promise<Season[]> {
  return fetchAllRows((from, to) => supabase.from('seasons').select('*').order('start_date', { ascending: false }).range(from, to))
}

// maybeSingle statt single: eine Saison, die RLS ausblendet (z. B. weil der
// aktuelle User dort kein Teilnehmer ist), liefert 0 Zeilen zurück – das ist
// kein Fehlerfall, sondern soll der aufrufenden Seite einfach `null` liefern
// (die dann "Saison nicht gefunden." anzeigt), statt einen rohen
// Postgrest-Fehler zu werfen.
export async function getSeason(id: string): Promise<Season | null> {
  const { data, error } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createSeason(input: {
  name: string
  start_date: string
  end_date: string
  kicktipp_link: string
}): Promise<Season> {
  const { data, error } = await supabase.from('seasons').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateSeason(
  id: string,
  input: Partial<{ name: string; start_date: string; end_date: string; kicktipp_link: string }>,
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

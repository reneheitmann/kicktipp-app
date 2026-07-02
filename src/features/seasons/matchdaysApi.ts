import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Matchday, MatchdayStatus } from '../../types/database'

export async function listMatchdays(seasonId: string): Promise<Matchday[]> {
  const { data, error } = await supabase
    .from('matchdays')
    .select('*')
    .eq('season_id', seasonId)
    .order('nummer')
  if (error) throw error
  return data
}

export async function listAllMatchdays(): Promise<Matchday[]> {
  return fetchAllRows((from, to) => supabase.from('matchdays').select('*').range(from, to))
}

/** Anzahl angelegter Spieltage je Saison – Basis für die Spieltags-Beitragsberechnung. */
export async function listMatchdayCountsBySeasonId(): Promise<Map<string, number>> {
  const data = await fetchAllRows((from, to) =>
    supabase.from('matchdays').select('season_id').range(from, to),
  )
  const counts = new Map<string, number>()
  for (const row of data) {
    counts.set(row.season_id, (counts.get(row.season_id) ?? 0) + 1)
  }
  return counts
}

// maybeSingle statt single: siehe Kommentar bei getSeason in seasonsApi.ts –
// ein per RLS ausgeblendeter Spieltag ist kein Fehlerfall, sondern liefert
// `null`.
export async function getMatchday(id: string): Promise<Matchday | null> {
  const { data, error } = await supabase.from('matchdays').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createMatchday(input: {
  season_id: string
  nummer: number
  datum: string | null
}): Promise<Matchday> {
  const { data, error } = await supabase.from('matchdays').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateMatchday(
  id: string,
  input: Partial<{ nummer: number; datum: string | null; status: MatchdayStatus }>,
): Promise<Matchday> {
  const { data, error } = await supabase.from('matchdays').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMatchday(id: string): Promise<void> {
  const { error } = await supabase.from('matchdays').delete().eq('id', id)
  if (error) throw error
}

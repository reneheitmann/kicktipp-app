import { fetchAllRows } from '../../lib/fetchAllRows'
import { centsToEuros, eurosToCents, type Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { MatchdayEntry } from '../../types/database'

function toCents(row: MatchdayEntry): MatchdayEntry {
  return { ...row, spieltags_einsatz_betrag: eurosToCents(row.spieltags_einsatz_betrag) }
}

export async function listMatchdayEntries(matchdayId: string): Promise<MatchdayEntry[]> {
  const rows = await fetchAllRows<MatchdayEntry>((from, to) =>
    supabase.from('matchday_entries').select('*').eq('matchday_id', matchdayId).range(from, to),
  )
  return rows.map(toCents)
}

export async function listMatchdayEntriesForMatchdays(matchdayIds: string[]): Promise<MatchdayEntry[]> {
  if (matchdayIds.length === 0) return []
  const rows = await fetchAllRows<MatchdayEntry>((from, to) =>
    supabase.from('matchday_entries').select('*').in('matchday_id', matchdayIds).range(from, to),
  )
  return rows.map(toCents)
}

export async function addMatchdayEntry(input: {
  matchday_id: string
  player_id: string
  spieltags_einsatz_betrag: Cents
}): Promise<MatchdayEntry> {
  const { data, error } = await supabase
    .from('matchday_entries')
    .insert({ ...input, spieltags_einsatz_betrag: centsToEuros(input.spieltags_einsatz_betrag) })
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function updateMatchdayEntry(id: string, spieltags_einsatz_betrag: Cents): Promise<MatchdayEntry> {
  const { data, error } = await supabase
    .from('matchday_entries')
    .update({ spieltags_einsatz_betrag: centsToEuros(spieltags_einsatz_betrag) })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function removeMatchdayEntry(id: string): Promise<void> {
  const { error } = await supabase.from('matchday_entries').delete().eq('id', id)
  if (error) throw error
}

/**
 * Trägt Saison-Teilnehmer, die für diesen Spieltag noch keinen Eintrag haben,
 * mit ihrem jeweils hinterlegten Standard-Spieltagseinsatz nach. Der
 * Normalfall (Teilnehmer existierte schon bei Spieltagsanlage) läuft bereits
 * automatisch über den DB-Trigger `matchdays_auto_create_entries`; das hier
 * deckt nur Nachzügler ab (z. B. später zur Saison hinzugekommene Spieler).
 */
export async function bulkAddMatchdayEntries(
  matchdayId: string,
  participants: { player_id: string; spieltags_einsatz_betrag: Cents }[],
): Promise<MatchdayEntry[]> {
  if (participants.length === 0) return []
  const { data, error } = await supabase
    .from('matchday_entries')
    .insert(
      participants.map((p) => ({
        matchday_id: matchdayId,
        player_id: p.player_id,
        spieltags_einsatz_betrag: centsToEuros(p.spieltags_einsatz_betrag),
      })),
    )
    .select()
  if (error) throw error
  return data.map(toCents)
}

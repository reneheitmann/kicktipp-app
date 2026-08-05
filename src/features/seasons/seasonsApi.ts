import { fetchAllRows } from '../../lib/fetchAllRows'
import { centsToEuros, eurosToCents, type Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { GesamtwertungStatus, Season, SeasonStatus } from '../../types/database'

// Postgres speichert die beiden Standard-Einsatz-Beträge als numeric(10,2)
// Euro – die App rechnet intern durchgehend in ganzen Cent (siehe
// src/lib/money.ts). Gleiche Konversionsgrenze wie in
// seasonParticipantsApi.ts: eurosToCents() nach jedem Read, centsToEuros()
// vor jedem Write.
function toCents(row: Season): Season {
  return {
    ...row,
    default_gesamtsieg_einsatz_betrag: eurosToCents(row.default_gesamtsieg_einsatz_betrag),
    default_spieltags_einsatz_betrag: eurosToCents(row.default_spieltags_einsatz_betrag),
  }
}

export async function listSeasons(): Promise<Season[]> {
  const rows = await fetchAllRows<Season>((from, to) =>
    supabase.from('seasons').select('*').order('start_date', { ascending: false }).range(from, to),
  )
  return rows.map(toCents)
}

// maybeSingle statt single: eine Saison, die RLS ausblendet (z. B. weil der
// aktuelle User dort kein Teilnehmer ist), liefert 0 Zeilen zurück – das ist
// kein Fehlerfall, sondern soll der aufrufenden Seite einfach `null` liefern
// (die dann "Saison nicht gefunden." anzeigt), statt einen rohen
// Postgrest-Fehler zu werfen.
export async function getSeason(id: string): Promise<Season | null> {
  const { data, error } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? toCents(data) : null
}

export async function createSeason(input: {
  name: string
  start_date: string
  end_date: string
  kicktipp_link: string
  default_gesamtsieg_einsatz_betrag: Cents
  default_spieltags_einsatz_betrag: Cents
}): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .insert({
      ...input,
      default_gesamtsieg_einsatz_betrag: centsToEuros(input.default_gesamtsieg_einsatz_betrag),
      default_spieltags_einsatz_betrag: centsToEuros(input.default_spieltags_einsatz_betrag),
    })
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function updateSeason(
  id: string,
  input: Partial<{
    name: string
    start_date: string
    end_date: string
    kicktipp_link: string
    default_gesamtsieg_einsatz_betrag: Cents
    default_spieltags_einsatz_betrag: Cents
  }>,
): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .update({
      ...input,
      ...(input.default_gesamtsieg_einsatz_betrag !== undefined && {
        default_gesamtsieg_einsatz_betrag: centsToEuros(input.default_gesamtsieg_einsatz_betrag),
      }),
      ...(input.default_spieltags_einsatz_betrag !== undefined && {
        default_spieltags_einsatz_betrag: centsToEuros(input.default_spieltags_einsatz_betrag),
      }),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function setSeasonStatus(id: string, status: SeasonStatus): Promise<Season> {
  const { data, error } = await supabase.from('seasons').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return toCents(data)
}

export async function setGesamtwertungStatus(id: string, gesamtwertung_status: GesamtwertungStatus): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .update({ gesamtwertung_status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toCents(data)
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

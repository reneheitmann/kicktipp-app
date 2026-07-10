import { fetchAllRows } from '../../lib/fetchAllRows'
import { centsToEuros, eurosToCents, type Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { SeasonParticipant } from '../../types/database'

// Postgres speichert die Einsatz-Beträge als numeric(10,2) Euro – die App
// rechnet intern durchgehend in ganzen Cent (siehe src/lib/money.ts), um
// Fließkomma-Drift bei Summierungen zu vermeiden. Diese Datei ist die
// Konversionsgrenze: eurosToCents() direkt nach jedem Read, centsToEuros()
// direkt vor jedem Write.
function toCents(row: SeasonParticipant): SeasonParticipant {
  return {
    ...row,
    gesamtsieg_einsatz_betrag: eurosToCents(row.gesamtsieg_einsatz_betrag),
    spieltags_einsatz_betrag: eurosToCents(row.spieltags_einsatz_betrag),
  }
}

export async function listSeasonParticipants(seasonId: string): Promise<SeasonParticipant[]> {
  const rows = await fetchAllRows<SeasonParticipant>((from, to) =>
    supabase.from('season_participants').select('*').eq('season_id', seasonId).range(from, to),
  )
  return rows.map(toCents)
}

export async function listSeasonParticipantsForPlayer(playerId: string): Promise<SeasonParticipant[]> {
  const rows = await fetchAllRows<SeasonParticipant>((from, to) =>
    supabase.from('season_participants').select('*').eq('player_id', playerId).range(from, to),
  )
  return rows.map(toCents)
}

/** Wie listSeasonParticipants, aber für mehrere Saisons auf einmal – serverseitig
 * gefiltert statt (wie zuvor per listAllSeasonParticipants) die komplette Tabelle
 * zu laden und erst clientseitig einzugrenzen. */
export async function listSeasonParticipantsForSeasons(seasonIds: string[]): Promise<SeasonParticipant[]> {
  if (seasonIds.length === 0) return []
  const rows = await fetchAllRows<SeasonParticipant>((from, to) =>
    supabase.from('season_participants').select('*').in('season_id', seasonIds).range(from, to),
  )
  return rows.map(toCents)
}

/** Wie listSeasonParticipantsForPlayer, aber für mehrere Spieler auf einmal. */
export async function listSeasonParticipantsForPlayers(playerIds: string[]): Promise<SeasonParticipant[]> {
  if (playerIds.length === 0) return []
  const rows = await fetchAllRows<SeasonParticipant>((from, to) =>
    supabase.from('season_participants').select('*').in('player_id', playerIds).range(from, to),
  )
  return rows.map(toCents)
}

export async function addSeasonParticipant(input: {
  season_id: string
  player_id: string
  gesamtsieg_einsatz_betrag: Cents
  spieltags_einsatz_betrag: Cents
}): Promise<SeasonParticipant> {
  const { data, error } = await supabase
    .from('season_participants')
    .insert({
      ...input,
      gesamtsieg_einsatz_betrag: centsToEuros(input.gesamtsieg_einsatz_betrag),
      spieltags_einsatz_betrag: centsToEuros(input.spieltags_einsatz_betrag),
    })
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function updateSeasonParticipant(
  id: string,
  input: { gesamtsieg_einsatz_betrag: Cents; spieltags_einsatz_betrag: Cents },
): Promise<SeasonParticipant> {
  const { data, error } = await supabase
    .from('season_participants')
    .update({
      gesamtsieg_einsatz_betrag: centsToEuros(input.gesamtsieg_einsatz_betrag),
      spieltags_einsatz_betrag: centsToEuros(input.spieltags_einsatz_betrag),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function removeSeasonParticipant(id: string): Promise<void> {
  const { error } = await supabase.from('season_participants').delete().eq('id', id)
  if (error) throw error
}

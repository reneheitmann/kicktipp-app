import { fetchAllRows } from '../../lib/fetchAllRows'
import { centsToEuros, eurosToCents, type Cents } from '../../lib/money'
import { supabase } from '../../lib/supabaseClient'
import type { Zahlung, ZahlungTyp } from '../../types/database'

function toCents(row: Zahlung): Zahlung {
  return { ...row, betrag: eurosToCents(row.betrag) }
}

export async function listZahlungen(playerId: string): Promise<Zahlung[]> {
  const rows = await fetchAllRows<Zahlung>((from, to) =>
    supabase.from('zahlungen').select('*').eq('player_id', playerId).order('datum', { ascending: false }).range(from, to),
  )
  return rows.map(toCents)
}

export async function listZahlungenForSeason(seasonId: string): Promise<Zahlung[]> {
  const rows = await fetchAllRows<Zahlung>((from, to) =>
    supabase.from('zahlungen').select('*').eq('season_id', seasonId).range(from, to),
  )
  return rows.map(toCents)
}

/** Wie listZahlungenForSeason, aber für mehrere Saisons auf einmal – serverseitig
 * gefiltert statt (wie zuvor per listAllZahlungen) die komplette Tabelle zu laden
 * und erst clientseitig einzugrenzen. */
export async function listZahlungenForSeasons(seasonIds: string[]): Promise<Zahlung[]> {
  if (seasonIds.length === 0) return []
  const rows = await fetchAllRows<Zahlung>((from, to) =>
    supabase.from('zahlungen').select('*').in('season_id', seasonIds).range(from, to),
  )
  return rows.map(toCents)
}

export async function addZahlung(input: {
  player_id: string
  season_id: string
  typ: ZahlungTyp
  betrag: Cents
  datum: string
  notiz: string | null
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('zahlungen')
    .insert({ ...input, betrag: centsToEuros(input.betrag), created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return toCents(data)
}

export async function removeZahlung(id: string): Promise<void> {
  const { error } = await supabase.from('zahlungen').delete().eq('id', id)
  if (error) throw error
}

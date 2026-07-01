import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { Zahlung, ZahlungTyp } from '../../types/database'

export async function listZahlungen(playerId: string): Promise<Zahlung[]> {
  return fetchAllRows((from, to) =>
    supabase.from('zahlungen').select('*').eq('player_id', playerId).order('datum', { ascending: false }).range(from, to),
  )
}

export async function listAllZahlungen(): Promise<Zahlung[]> {
  return fetchAllRows((from, to) => supabase.from('zahlungen').select('*').range(from, to))
}

export async function listZahlungenForSeason(seasonId: string): Promise<Zahlung[]> {
  return fetchAllRows((from, to) => supabase.from('zahlungen').select('*').eq('season_id', seasonId).range(from, to))
}

export async function addZahlung(input: {
  player_id: string
  season_id: string
  typ: ZahlungTyp
  betrag: number
  datum: string
  notiz: string | null
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('zahlungen')
    .insert({ ...input, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeZahlung(id: string): Promise<void> {
  const { error } = await supabase.from('zahlungen').delete().eq('id', id)
  if (error) throw error
}

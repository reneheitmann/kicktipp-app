import { supabase } from '../../lib/supabaseClient'
import type { Zahlung, ZahlungTyp } from '../../types/database'

export async function listZahlungen(playerId: string): Promise<Zahlung[]> {
  const { data, error } = await supabase
    .from('zahlungen')
    .select('*')
    .eq('player_id', playerId)
    .order('datum', { ascending: false })
  if (error) throw error
  return data
}

export async function listAllZahlungen(): Promise<Zahlung[]> {
  const { data, error } = await supabase.from('zahlungen').select('*')
  if (error) throw error
  return data
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

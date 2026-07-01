import { supabase } from '../../lib/supabaseClient'
import type { KicktippImport, KicktippImportRohdaten } from '../../types/database'

export async function createImport(input: {
  season_id: string
  matchday_id: string | null
  rohdaten: KicktippImportRohdaten
}): Promise<KicktippImport> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('kicktipp_imports')
    .insert({ ...input, uploaded_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markImportTaken(id: string): Promise<void> {
  const { error } = await supabase.from('kicktipp_imports').update({ status: 'uebernommen' }).eq('id', id)
  if (error) throw error
}

export async function listImports(seasonId: string): Promise<KicktippImport[]> {
  const { data, error } = await supabase
    .from('kicktipp_imports')
    .select('*')
    .eq('season_id', seasonId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data
}

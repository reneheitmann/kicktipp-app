import { supabase } from '../../lib/supabaseClient'
import type { LegalSettings } from '../../types/database'

// Feste Singleton-id (siehe Migration 0067) – es gibt immer genau eine Zeile.
const SETTINGS_ID = '00000000-0000-0000-0000-000000000006'

// SELECT ist per RLS bewusst öffentlich (auch ohne Login, siehe
// DatenschutzPage.tsx/ImpressumPage.tsx), daher hier ohne Auth-Check nutzbar.
export async function getLegalSettings(): Promise<LegalSettings> {
  const { data, error } = await supabase.from('legal_settings').select('*').eq('id', SETTINGS_ID).single()
  if (error) throw error
  return data
}

export async function saveLegalSettings(input: {
  operator_name: string
  operator_address: string
  operator_email: string
  operator_phone: string
  hosting_location: string
  hosting_location_frontend: string
  updated_by: string
}): Promise<void> {
  const { error } = await supabase
    .from('legal_settings')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', SETTINGS_ID)
  if (error) throw error
}

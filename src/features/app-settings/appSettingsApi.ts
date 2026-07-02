import { supabase } from '../../lib/supabaseClient'
import type { AppSettings } from '../../types/database'

// Feste Singleton-id (siehe Migration 0027) – es gibt immer genau eine Zeile.
const SETTINGS_ID = '00000000-0000-0000-0000-000000000002'
const ICON_BUCKET = 'app-assets'
const ICON_PATH = 'icon'

export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', SETTINGS_ID).single()
  if (error) throw error
  return data
}

export async function saveAppSettings(input: {
  app_name: string
  icon_url: string | null
  primary_color: string
  updated_by: string
}): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', SETTINGS_ID)
  if (error) throw error
}

/**
 * Lädt ein neues Icon unter festem Dateinamen hoch (upsert), damit bei
 * jedem Wechsel die vorherige Datei überschrieben statt eine neue,
 * verwaiste Datei angelegt wird. Ein Cache-Buster-Query-Parameter sorgt
 * dafür, dass Browser die neue Datei nicht unter der alten (identischen)
 * URL aus dem Cache zeigen.
 */
export async function uploadAppIcon(file: File): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'png'
  const path = `${ICON_PATH}.${extension}`
  const { error } = await supabase.storage.from(ICON_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const {
    data: { publicUrl },
  } = supabase.storage.from(ICON_BUCKET).getPublicUrl(path)
  return `${publicUrl}?v=${Date.now()}`
}

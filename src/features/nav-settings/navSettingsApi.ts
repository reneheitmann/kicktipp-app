import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../types/database'

type NavSettingsUpdate = Database['public']['Tables']['nav_settings']['Update']

// Feste Singleton-id (siehe Migration 0054) – es gibt immer genau eine Zeile.
const SETTINGS_ID = '00000000-0000-0000-0000-000000000005'

export interface NavSettingsValue {
  order: string[]
  /** Map von navItems.ts-"to"-Pfad auf überschriebenen Anzeigetext – fehlende Einträge nutzen das Code-Label. */
  labels: Record<string, string>
}

export async function getNavSettings(): Promise<NavSettingsValue> {
  const { data, error } = await supabase
    .from('nav_settings')
    .select('item_order, item_labels')
    .eq('id', SETTINGS_ID)
    .single()
  if (error) throw error
  return { order: data.item_order, labels: data.item_labels }
}

export async function saveNavSettings(value: NavSettingsValue, updatedBy: string): Promise<void> {
  const payload: NavSettingsUpdate = {
    item_order: value.order,
    item_labels: value.labels,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }
  const { error } = await supabase.from('nav_settings').update(payload).eq('id', SETTINGS_ID)
  if (error) throw error
}

import { supabase } from '../../lib/supabaseClient'
import type { AppLog } from '../../types/database'

export const LOG_LIMIT = 300

export async function listAppLogs(): Promise<AppLog[]> {
  const { data, error } = await supabase
    .from('app_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LOG_LIMIT)
  if (error) throw error
  return data
}

export async function clearAppLogs(): Promise<void> {
  const { error } = await supabase.from('app_logs').delete().not('id', 'is', null)
  if (error) throw error
}

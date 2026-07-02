import { fetchAllRows } from '../../lib/fetchAllRows'
import { supabase } from '../../lib/supabaseClient'
import type { PlayerProfileLink } from '../../types/database'

/**
 * Lädt alle Spieler-Login-Verknüpfungen. RLS filtert transparent: ein
 * normaler User bekommt nur seine eigenen Links (profile_id = auth.uid()),
 * ein Admin sieht alle – dieselbe Abfrage bedient also sowohl "meine
 * verknüpften Spieler" (Dashboard/Saisons) als auch die Admin-Verwaltung.
 */
export async function listPlayerProfileLinks(): Promise<PlayerProfileLink[]> {
  return fetchAllRows((from, to) => supabase.from('player_profile_links').select('*').range(from, to))
}

/** Ersetzt admin-seitig die komplette Menge der mit diesem Spieler verknüpften Logins. */
export async function setPlayerProfileLinks(playerId: string, profileIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from('player_profile_links').delete().eq('player_id', playerId)
  if (deleteError) throw deleteError

  if (profileIds.length === 0) return

  const { error: insertError } = await supabase
    .from('player_profile_links')
    .insert(profileIds.map((profile_id) => ({ player_id: playerId, profile_id })))
  if (insertError) throw insertError
}

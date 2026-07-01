import { supabase } from '../../lib/supabaseClient'
import type { PayoutRule, PayoutRuleInput, PayoutTyp } from '../../types/database'

export async function listPayoutRules(seasonId: string, typ: PayoutTyp): Promise<PayoutRule[]> {
  const { data, error } = await supabase
    .from('payout_rules')
    .select('*')
    .eq('season_id', seasonId)
    .eq('typ', typ)
    .order('rang')
  if (error) throw error
  return data
}

/**
 * Ersetzt die komplette Verteilung (alle Ränge) für eine Saison+Typ-Kombination
 * atomar über eine RPC (Löschen + Neuanlage in einer Transaktion), damit die
 * DB-seitige 100%-Prüfung erst gegen den fertigen Endzustand greift.
 */
export async function setPayoutRules(
  seasonId: string,
  typ: PayoutTyp,
  rules: PayoutRuleInput[],
): Promise<PayoutRule[]> {
  const { data, error } = await supabase.rpc('set_payout_rules', {
    p_season_id: seasonId,
    p_typ: typ,
    p_rules: rules,
  })
  if (error) throw error
  return data
}

/**
 * Nur die Summe der Einsätze (der "Topf") für diesen Verteilungstyp, per RPC
 * (SECURITY DEFINER) – die zugrunde liegenden season_participants-Zeilen
 * bleiben dabei privat, nur die Gesamtsumme wird für alle aktiven User
 * offengelegt (siehe Migration 0021).
 */
export async function getPayoutPool(seasonId: string, typ: PayoutTyp): Promise<number> {
  const { data, error } = await supabase.rpc('get_payout_pool', { p_season_id: seasonId, p_typ: typ })
  if (error) throw error
  return data
}

export async function hasPayouts(seasonId: string, typ: PayoutTyp): Promise<boolean> {
  const gewinnTyp = typ === 'spieltag' ? 'gewinn_spieltag' : 'gewinn_gesamt'
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .eq('typ', gewinnTyp)
  if (error) throw error
  return (count ?? 0) > 0
}

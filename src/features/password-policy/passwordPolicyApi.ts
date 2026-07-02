import { supabase } from '../../lib/supabaseClient'
import type { Database, PasswordPolicy } from '../../types/database'

type PasswordPolicyUpdate = Database['public']['Tables']['password_policy']['Update']

// Feste Singleton-id (siehe Migration 0032) – es gibt immer genau eine Zeile.
const POLICY_ID = '00000000-0000-0000-0000-000000000003'

export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  const { data, error } = await supabase.from('password_policy').select('*').eq('id', POLICY_ID).single()
  if (error) throw error
  return data
}

export async function savePasswordPolicy(input: {
  min_length: number
  min_character_classes: number
  reuse_days: number
  updated_by: string
}): Promise<void> {
  const payload: PasswordPolicyUpdate = {
    min_length: input.min_length,
    min_character_classes: input.min_character_classes,
    reuse_days: input.reuse_days,
    updated_at: new Date().toISOString(),
    updated_by: input.updated_by,
  }
  const { error } = await supabase.from('password_policy').update(payload).eq('id', POLICY_ID)
  if (error) throw error
}

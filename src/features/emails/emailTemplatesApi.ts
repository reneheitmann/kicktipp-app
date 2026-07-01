import { supabase } from '../../lib/supabaseClient'
import type { EmailTemplate } from '../../types/database'

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase.from('email_templates').select('*').order('name')
  if (error) throw error
  return data
}

export async function createEmailTemplate(input: {
  name: string
  subject: string
  body_text: string
}): Promise<EmailTemplate> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ ...input, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmailTemplate(
  id: string,
  input: Partial<{ name: string; subject: string; body_text: string }>,
): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('email_templates').delete().eq('id', id)
  if (error) throw error
}

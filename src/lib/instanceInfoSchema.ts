import { isValidInstanceUrl } from './instanceUrl'

/** Antwortformat von `<instanz>/instance-info.json`, siehe scripts/generate-instance-info.mjs. */
export interface InstanceInfo {
  supabase_url: string
  supabase_anon_key: string
  default_name: string
}

/**
 * Validiert die Antwort einer neu hinzugefügten Instanz gegen ein festes
 * Schema, BEVOR sie übernommen wird – bei Abweichung wird kein
 * Supabase-Client mit kaputten Werten initialisiert, sondern eine
 * verständliche Fehlermeldung zurückgegeben (siehe Aufrufer im
 * Instanz-Wähler, Phase 3).
 */
export function validateInstanceInfo(data: unknown): { ok: true; info: InstanceInfo } | { ok: false; error: string } {
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Antwort ist kein gültiges JSON-Objekt.' }
  }
  const record = data as Record<string, unknown>

  if (typeof record.supabase_url !== 'string' || record.supabase_url.trim() === '') {
    return { ok: false, error: '"supabase_url" fehlt oder ist leer.' }
  }
  if (!isValidInstanceUrl(record.supabase_url)) {
    return { ok: false, error: '"supabase_url" muss eine gültige https://-Adresse sein.' }
  }
  if (typeof record.supabase_anon_key !== 'string' || record.supabase_anon_key.trim() === '') {
    return { ok: false, error: '"supabase_anon_key" fehlt oder ist leer.' }
  }
  if (typeof record.default_name !== 'string' || record.default_name.trim() === '') {
    return { ok: false, error: '"default_name" fehlt oder ist leer.' }
  }

  return {
    ok: true,
    info: {
      supabase_url: record.supabase_url,
      supabase_anon_key: record.supabase_anon_key,
      default_name: record.default_name,
    },
  }
}

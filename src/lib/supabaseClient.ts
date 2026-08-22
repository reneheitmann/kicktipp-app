import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export type Client = SupabaseClient<Database>

const isMobile = import.meta.env.VITE_APP_CHANNEL === 'mobile'

// main/beta (Web): unverändert build-zeit-initialisiert, wie schon immer –
// dieser Zweig läuft für Web-Builds exakt so wie vor der mobile-Erweiterung,
// keine Verhaltens-/Performance-Änderung.
function buildWebClient(): Client {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. Bitte .env auf Basis von .env.example anlegen.',
    )
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

let currentClient: Client | null = isMobile ? null : buildWebClient()

/**
 * mobile only: erzeugt einen Client für eine konkrete Instanz (siehe
 * instanceStore.ts) – eigener `storage`-Adapter, da supabase-js für den
 * Session-Speicher sonst `localStorage` annimmt, das es in einer nativen
 * WebView zwar technisch gibt, das aber nicht Keychain/Keystore-abgesichert
 * ist (siehe docs/mobile-app.md, Sicherheitsarchitektur). `storageKey` wird
 * explizit statt supabase-js' automatischer Ableitung aus der Projekt-URL
 * gesetzt, damit instanceStore.ts beim Entfernen einer Instanz gezielt genau
 * deren gespeicherte Zugangsdaten löschen kann, ohne die interne
 * Schlüssel-Ableitung nachbauen zu müssen.
 */
export function createSupabaseClientFor(url: string, anonKey: string, storage: SupportedStorage, storageKey: string): Client {
  return createClient<Database>(url, anonKey, { auth: { storage, storageKey } })
}

/** mobile only: nach Instanz-Wahl/-Wechsel aufgerufen (siehe instanceStore.ts). */
export function setActiveSupabaseClient(client: Client | null): void {
  currentClient = client
}

/**
 * Proxy statt eines einfachen `export const supabase = ...`: dieselbe
 * Identität `supabase.xxx(...)`, wie sie überall in der App (AuthProvider,
 * alle *Api.ts-Dateien) bereits verwendet wird, bleibt unverändert – nur
 * dass im mobile-Kanal der zugrunde liegende Client zur Laufzeit gewechselt
 * werden kann (Instanz-Wechsel), ohne jeden einzelnen Aufrufer anzupassen.
 * Für Web ist `currentClient` von Anfang an gesetzt, der Proxy fügt dort
 * keine spürbare Latenz hinzu (eine zusätzliche Property-Weiterleitung).
 */
export const supabase: Client = new Proxy({} as Client, {
  get(_target, prop, _receiver) {
    if (!currentClient) {
      throw new Error(
        'Keine aktive Supabase-Instanz gewählt. Im mobile-Kanal muss vor der ersten Nutzung setActiveSupabaseClient() aufgerufen werden (siehe instanceStore.ts).',
      )
    }
    return Reflect.get(currentClient, prop, currentClient)
  },
})

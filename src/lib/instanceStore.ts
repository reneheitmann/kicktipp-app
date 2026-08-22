import { secureStorage } from './secureStorage'
import { createSupabaseClientFor, setActiveSupabaseClient } from './supabaseClient'
import { validateInstanceInfo } from './instanceInfoSchema'
import { isValidInstanceUrl, normalizeInstanceUrl } from './instanceUrl'

export interface SavedInstance {
  id: string
  url: string
  name: string
  supabaseUrl: string
  supabaseAnonKey: string
  addedAt: string
}

const INSTANCES_KEY = 'kicktipp_mobile_instances'
const ACTIVE_INSTANCE_KEY = 'kicktipp_mobile_active_instance_id'

function storageKeyFor(instanceId: string): string {
  return `sb-instance-${instanceId}`
}

async function readInstances(): Promise<SavedInstance[]> {
  const raw = await secureStorage.getItem(INSTANCES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SavedInstance[]
  } catch {
    return []
  }
}

async function writeInstances(instances: SavedInstance[]): Promise<void> {
  await secureStorage.setItem(INSTANCES_KEY, JSON.stringify(instances))
}

export async function listInstances(): Promise<SavedInstance[]> {
  return readInstances()
}

export async function getActiveInstanceId(): Promise<string | null> {
  return secureStorage.getItem(ACTIVE_INSTANCE_KEY)
}

/**
 * Ruft instance-info.json der angegebenen Domain ab, validiert die Antwort
 * (siehe instanceInfoSchema.ts) und speichert die Instanz bei Erfolg. Macht
 * sie noch nicht aktiv – das übernimmt activateInstance() explizit, damit
 * der Instanz-Wähler (Phase 3) die aufgelöste supabase_url erst anzeigen
 * kann, bevor der Nutzer sich einloggt (siehe docs/mobile-app.md).
 */
export async function addInstance(
  inputUrl: string,
): Promise<{ ok: true; instance: SavedInstance } | { ok: false; error: string }> {
  if (!isValidInstanceUrl(inputUrl)) {
    return { ok: false, error: 'Bitte eine gültige https://-Adresse eingeben.' }
  }
  const url = normalizeInstanceUrl(inputUrl)

  const existing = await readInstances()
  if (existing.some((instance) => instance.url === url)) {
    return { ok: false, error: 'Diese Instanz ist bereits gespeichert.' }
  }

  let response: Response
  try {
    response = await fetch(`${url}/instance-info.json`)
  } catch {
    return { ok: false, error: 'Instanz nicht erreichbar. Adresse und Internetverbindung prüfen.' }
  }
  if (!response.ok) {
    return { ok: false, error: `Instanz antwortete mit Status ${response.status}.` }
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    return { ok: false, error: 'Antwort der Instanz ist kein gültiges JSON.' }
  }

  const validated = validateInstanceInfo(data)
  if (!validated.ok) {
    return { ok: false, error: `Ungültige Instanz-Antwort: ${validated.error}` }
  }

  const instance: SavedInstance = {
    id: crypto.randomUUID(),
    url,
    name: validated.info.default_name,
    supabaseUrl: validated.info.supabase_url,
    supabaseAnonKey: validated.info.supabase_anon_key,
    addedAt: new Date().toISOString(),
  }

  await writeInstances([...existing, instance])
  return { ok: true, instance }
}

/** Macht eine gespeicherte Instanz zur aktiven – initialisiert deren Supabase-Client. */
export async function activateInstance(instanceId: string): Promise<SavedInstance | null> {
  const instances = await readInstances()
  const instance = instances.find((i) => i.id === instanceId)
  if (!instance) return null
  const client = createSupabaseClientFor(instance.supabaseUrl, instance.supabaseAnonKey, secureStorage, storageKeyFor(instance.id))
  setActiveSupabaseClient(client)
  await secureStorage.setItem(ACTIVE_INSTANCE_KEY, instanceId)
  return instance
}

/** Zurück zum Instanz-Wähler, ohne eine Instanz zu entfernen (siehe MyAccountPage.tsx "Instanz wechseln"). */
export async function deactivateInstance(): Promise<void> {
  setActiveSupabaseClient(null)
  await secureStorage.removeItem(ACTIVE_INSTANCE_KEY)
}

/** Entfernt eine gespeicherte Instanz inkl. ihrer Zugangsdaten aus dem Secure Storage. */
export async function removeInstance(instanceId: string): Promise<void> {
  const instances = await readInstances()
  await writeInstances(instances.filter((i) => i.id !== instanceId))
  await secureStorage.removeItem(storageKeyFor(instanceId))
  const activeId = await getActiveInstanceId()
  if (activeId === instanceId) {
    await deactivateInstance()
  }
}

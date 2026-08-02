// Nach einem Deploy enthält das neue Docker-Image nur die neuesten,
// inhaltsadressierten JS-Chunks (siehe nginx.conf.template) – ein bereits
// offener Tab, der danach erstmals eine noch nicht geladene Route öffnet
// (React.lazy() in App.tsx), bekommt einen 404 auf den alten Chunk. Statt
// dem User dafür eine Fehlerseite zu zeigen, einmal automatisch neu laden.
const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
]

const RELOAD_FLAG = 'kicktipp_chunk_reload_attempted'

/** Löst bei einer erkannten Chunk-Ladefehlermeldung einmal pro Tab-Sitzung
 * einen automatischen Reload aus (sessionStorage-Flag verhindert eine
 * Reload-Schleife, falls der Fehler danach weiter besteht) und gibt zurück,
 * ob das passiert ist – der Aufrufer kann den Fehler dann z. B. ungeloggt
 * lassen, da es sich nicht um einen echten Bug handelt. */
export function tryRecoverFromChunkLoadError(message: string): boolean {
  if (!CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) return false
  if (sessionStorage.getItem(RELOAD_FLAG)) return false
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
  return true
}

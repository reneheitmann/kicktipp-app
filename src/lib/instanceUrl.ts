/**
 * Prüft eine vom Nutzer eingegebene Instanz-Domain (mobile-Instanz-Wähler,
 * siehe docs/mobile-app.md). Nur `https://` – `http://` würde Zugangsdaten
 * im Klartext über eine unverschlüsselte Verbindung übertragen.
 */
export function isValidInstanceUrl(input: string): boolean {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return false
  }
  return url.protocol === 'https:' && url.hostname.length > 0
}

/** Normalisiert eine akzeptierte Instanz-URL auf `https://host` ohne Pfad/Query/Hash/trailing slash. */
export function normalizeInstanceUrl(input: string): string {
  const url = new URL(input.trim())
  return `https://${url.host}`
}

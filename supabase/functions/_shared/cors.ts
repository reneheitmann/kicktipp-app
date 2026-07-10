// Erlaubte Origins für Browser-Aufrufe der Edge Functions (CORS). `main`
// (Produktion) und `beta` (Test-Container) laufen unter unterschiedlichen
// Adressen (siehe docs/unraid-deployment.md) – deshalb als Function-Secret
// ALLOWED_ORIGINS (kommagetrennt) konfiguriert statt hartkodiert oder '*'.
//
// Reine Browser-Absicherung (Access-Control-Allow-Origin schützt vor
// Cross-Origin-Missbrauch einer eingeloggten Session aus einer fremden Seite
// heraus, ist aber kein Ersatz für echte Autorisierung): die eigentliche
// Berechtigung prüft jede Function weiterhin selbst über den
// Authorization-Bearer-Token bzw. (send-password-reset) über das eigene
// Throttling. Ein Origin-Mismatch führt daher zu einer klaren Ablehnung statt
// einem stillschweigenden Fallback auf eine andere (falsche) Origin, die der
// Browser ohnehin verwerfen würde – so bleibt der Fehlerfall eindeutig.
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * `null` heißt: Origin nicht erlaubt, der Aufrufer muss die Anfrage ablehnen
 * (siehe Verwendung in den einzelnen index.ts). Ein fehlender Origin-Header
 * (kein Browser-Aufruf) bekommt keine Access-Control-Allow-Origin-Zeile,
 * wird aber nicht blockiert – CORS betrifft ausschließlich Browser.
 */
export function corsHeadersForOrigin(origin: string | null): Record<string, string> | null {
  if (!origin) return { ...BASE_HEADERS }
  if (!allowedOrigins.includes(origin)) return null
  return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
}

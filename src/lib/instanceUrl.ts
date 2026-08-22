// localhost/Loopback/private/link-local Adressbereiche – abgelehnt, weil die
// App die eingegebene URL selbst per fetch() abruft (Instanz-Hinzufügen,
// instance-info.json). Ohne diese Sperre könnte eine präparierte Eingabe
// (auch scheinbar harmlos aussehend, z. B. hex-kodierte IPs wie
// "https://0x7f.0.0.1" – new URL() normalisiert das automatisch auf
// "127.0.0.1") die App dazu bringen, gegen das eigene Gerät oder das lokale
// Netzwerk zu requesten (SSRF-artiges Muster). Reine Sicherheitshärtung,
// keine legitime Instanz braucht eine private/lokale Adresse – ein echtes
// Self-Hosting muss ohnehin öffentlich erreichbar sein, damit das Gerät des
// Nutzers unterwegs überhaupt verbinden kann.
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return true

  // IPv6-Literale kommen in Klammern ("[::1]") – Klammern für die Prüfung entfernen.
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host

  const ipv4 = bare.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    // 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (link-local)
    if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      return true
    }
    return false
  }

  if (bare === '::1' || bare === '::') return true
  if (/^fe80:/i.test(bare)) return true // link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{2}:/i.test(bare)) return true // unique local (fc00::/7)

  return false
}

/**
 * Prüft eine URL, die die App selbst per HTTP(S) anspricht (vom Nutzer
 * eingegebene Instanz-Domain im mobile-Instanz-Wähler ODER `supabase_url`
 * aus einer `instance-info.json`-Antwort, siehe instanceInfoSchema.ts).
 * Nur `https://` – `http://` würde Zugangsdaten im Klartext über eine
 * unverschlüsselte Verbindung übertragen. Zusätzlich: kein eingebettetes
 * Userinfo (`user:pass@…`, klassisches Verwirrungsmuster – der sichtbare
 * Text vor dem `@` kann eine andere, vertrauenswürdig aussehende Domain
 * vortäuschen, während `url.hostname` bereits korrekt die tatsächliche
 * Ziel-Domain danach liefert) und keine lokale/private Adresse.
 */
export function isValidInstanceUrl(input: string): boolean {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.hostname.length === 0) return false
  if (url.username || url.password) return false
  if (isBlockedHost(url.hostname)) return false
  return true
}

/** Normalisiert eine akzeptierte Instanz-URL auf `https://host` ohne Pfad/Query/Hash/trailing slash. */
export function normalizeInstanceUrl(input: string): string {
  const url = new URL(input.trim())
  return `https://${url.host}`
}

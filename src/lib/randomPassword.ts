/** Erzeugt ein zufälliges, unrätbares Passwort für Konten, die per E-Mail-Einladung eingerichtet werden. */
export function generateRandomPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(36)).join('')
}

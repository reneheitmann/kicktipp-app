import type { PasswordPolicy } from '../types/database'

// Nur diese 4 Zeichenarten werden gezählt (fest, nicht konfigurierbar) –
// konfigurierbar ist nur, wie viele davon Pflicht sind (min_character_classes).
export function countCharacterClasses(password: string): number {
  let classes = 0
  if (/[A-Z]/.test(password)) classes++
  if (/[a-z]/.test(password)) classes++
  if (/[0-9]/.test(password)) classes++
  if (/[^A-Za-z0-9]/.test(password)) classes++
  return classes
}

export function describePasswordPolicy(policy: Pick<PasswordPolicy, 'min_length' | 'min_character_classes' | 'reuse_days'>): string {
  const parts = [
    `Mindestens ${policy.min_length} Zeichen`,
    `davon mindestens ${policy.min_character_classes} von 4 Zeichenarten (Großbuchstaben, Kleinbuchstaben, Zahlen, Sonderzeichen)`,
  ]
  if (policy.reuse_days > 0) {
    parts.push(`nicht identisch mit einem in den letzten ${policy.reuse_days} Tagen verwendeten Passwort`)
  }
  return parts.join(', ') + '.'
}

// Rein clientseitige Vorab-Prüfung für sofortiges UI-Feedback (Länge +
// Zeichenarten) – die Wiederverwendungssperre lässt sich naturgemäß nur
// serverseitig prüfen (Historie liegt nicht im Client), siehe die
// Edge Functions update-own-password/admin-create-user.
export function validatePasswordAgainstPolicy(
  password: string,
  policy: Pick<PasswordPolicy, 'min_length' | 'min_character_classes'>,
): string | null {
  if (password.length < policy.min_length) {
    return `Passwort muss mindestens ${policy.min_length} Zeichen lang sein.`
  }
  const classes = countCharacterClasses(password)
  if (classes < policy.min_character_classes) {
    return `Passwort muss mindestens ${policy.min_character_classes} von 4 Zeichenarten enthalten (Großbuchstaben, Kleinbuchstaben, Zahlen, Sonderzeichen).`
  }
  return null
}

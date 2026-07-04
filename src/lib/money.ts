/** Geldbetrag in ganzen Cent statt Euro-Float – vermeidet Fließkomma-Drift
 * (0.1 + 0.2-Problem) bei der Summierung vieler Einzelbuchungen. Reiner
 * Type-Alias, kein Branded Type: ein Brand würde `as Cents`-Casts an jeder
 * Arithmetik-Stelle erzwingen, ohne dass der Type-Checker "kam aus Cent"
 * damit besser verifizieren könnte – der Alias dient nur der Dokumentation. */
export type Cents = number

/** Euro-Betrag (z. B. aus Postgres numeric(10,2)) in ganze Cent umrechnen.
 * Rundet bewusst (nicht: trunkiert), um Float-Rauschen beim Übergang
 * Postgres numeric -> JS number abzufangen. */
export function eurosToCents(euros: number): Cents {
  return Math.round(euros * 100)
}

/** Ganze Cent zurück in einen Euro-Betrag für Anzeige/Excel/RPC-Aufrufe. */
export function centsToEuros(cents: Cents): number {
  return cents / 100
}

/** Deutsches Zahlenformat ("1234,56", "12,3", "7") parsen -> ganze Cent,
 * oder null wenn ungültig – wirft nie, Aufrufer prüfen wie bisher selbst
 * mit Number.isFinite-artigen Bereichschecks auf dem Cent-Ergebnis. */
export function parseEuroInput(raw: string): Cents | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const euros = Number(normalized)
  if (!Number.isFinite(euros)) return null
  return eurosToCents(euros)
}

/** Cent-Betrag als Eingabefeld-Vorbelegung im deutschen Format (z. B. TransferForm-Prefill). */
export function formatEuroInputValue(cents: Cents): string {
  return centsToEuros(cents).toFixed(2).replace('.', ',')
}

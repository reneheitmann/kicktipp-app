export const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

// Reines String-Splitting statt `new Date(iso)` + Intl.DateTimeFormat: die
// gespeicherten Datumswerte (aus <input type="date">) haben keine Uhrzeit/
// Zeitzone – über Date geparst würden sie als UTC-Mitternacht interpretiert
// und könnten sich abhängig von der Zeitzone des Betrachters auf den
// Vortag verschieben.
export function formatGermanDate(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year}`
}

// Anbindung an OpenLigaDB (https://www.openligadb.de/), eine freie, öffentliche
// Schnittstelle für deutsche Fußball-Spielpläne (kein API-Key nötig, CORS
// erlaubt direkten Browser-Zugriff). Bewusst auf die 1. Bundesliga ("bl1")
// beschränkt; weitere Ligen (2. Bundesliga "bl2" etc.) ließen sich später
// ergänzen, indem man den Liga-Kürzel parametrisiert.
const BUNDESLIGA_SHORTCUT = 'bl1'

interface OpenLigaDbMatch {
  matchDateTime: string
  group: { groupOrderID: number }
}

export interface FetchedSpieltag {
  nummer: number
  /** Anstoßdatum des frühesten Spiels dieses Spieltags (YYYY-MM-DD). */
  datum: string
}

/**
 * Lädt den kompletten Spielplan einer 1.-Bundesliga-Saison von OpenLigaDB in
 * einem einzigen Request und fasst ihn zu einem Datum pro Spieltag zusammen
 * (frühester Anstoß, da pro Spieltag i. d. R. mehrere Einzelspiele an
 * unterschiedlichen Tagen stattfinden, unsere App aber nur ein Datum je
 * Spieltag abbildet).
 */
export async function fetchBundesligaSpieltage(seasonStartYear: number): Promise<FetchedSpieltag[]> {
  const response = await fetch(`https://api.openligadb.de/getmatchdata/${BUNDESLIGA_SHORTCUT}/${seasonStartYear}`)
  if (!response.ok) {
    throw new Error(`Spielplan konnte nicht geladen werden (HTTP ${response.status}).`)
  }

  const matches: OpenLigaDbMatch[] = await response.json()
  if (matches.length === 0) {
    throw new Error(
      `Keine Spiele für die Saison ${seasonStartYear}/${(seasonStartYear + 1) % 100} gefunden. Bitte Saisonjahr prüfen.`,
    )
  }

  const earliestBySpieltag = new Map<number, string>()
  for (const match of matches) {
    const nummer = match.group.groupOrderID
    const datum = match.matchDateTime.slice(0, 10)
    const bisher = earliestBySpieltag.get(nummer)
    if (!bisher || datum < bisher) {
      earliestBySpieltag.set(nummer, datum)
    }
  }

  return [...earliestBySpieltag.entries()]
    .map(([nummer, datum]) => ({ nummer, datum }))
    .sort((a, b) => a.nummer - b.nummer)
}

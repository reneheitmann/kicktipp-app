export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * Generischer CSV-Parser ohne feste Annahmen über Kicktipp-Spaltennamen, da das
 * Exportformat von Kicktipp.de nicht offiziell dokumentiert ist und sich ändern
 * kann. Erkennt Komma oder Semikolon als Trennzeichen automatisch (Kicktipp
 * exportiert i. d. R. Semikolon-getrennt) und unterstützt einfache
 * Anführungszeichen-Quotierung.
 */
export function parseCsv(text: string): ParsedCsv {
  const cleanText = text.replace(/^﻿/, '').trim()
  if (!cleanText) {
    return { headers: [], rows: [] }
  }

  const lines = cleanText.split(/\r\n|\r|\n/).filter((line) => line.length > 0)
  const headerLine = lines[0]
  const delimiter = (headerLine.match(/;/g)?.length ?? 0) >= (headerLine.match(/,/g)?.length ?? 0) ? ';' : ','

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += char
        }
      } else if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    return cells
  }

  const headers = parseLine(headerLine)
  const rows = lines.slice(1).map(parseLine)

  return { headers, rows }
}

/** Bestes Rate-Match für die Namens-Spalte anhand gängiger Kicktipp-Spaltennamen. */
export function guessNameColumn(headers: string[]): number {
  const candidates = ['name', 'teilnehmer', 'mitspieler', 'tipper', 'spieler']
  const index = headers.findIndex((h) => candidates.some((c) => h.toLowerCase().includes(c)))
  return index >= 0 ? index : 0
}

/** Bestes Rate-Match für die E-Mail-Spalte (Tipperlisten-Export). */
export function guessEmailColumn(headers: string[]): number {
  const index = headers.findIndex((h) => h.toLowerCase().includes('mail'))
  return index >= 0 ? index : Math.min(1, headers.length - 1)
}

/**
 * Bestes Rate-Match für die Platzierungs-Spalte. Kicktipps "Rangliste
 * Einzelwertung"-Export für einen einzelnen Spieltag enthält sowohl eine
 * "Rang"-Spalte (Gesamtsaison-Stand zum Zeitpunkt des Exports) als auch eine
 * "Spieltagsplatzierung"-Spalte (tatsächliche Platzierung an genau diesem
 * Spieltag) – für einen Spieltags-Import ist ausschließlich Letztere korrekt,
 * sonst würden Gewinne anhand der Gesamtsaison-Platzierung statt der
 * Tagesplatzierung verbucht. Für einen Gesamtsieg-Import ist "Rang" dagegen
 * richtig.
 */
export function guessRangColumn(headers: string[], target: 'spieltag' | 'gesamtsieg' = 'gesamtsieg'): number {
  if (target === 'spieltag') {
    const spieltagSpecific = headers.findIndex((h) => h.toLowerCase().includes('spieltagsplatzierung'))
    if (spieltagSpecific >= 0) return spieltagSpecific
  }
  const candidates = ['platz', 'rang', 'position']
  const index = headers.findIndex((h) => candidates.some((c) => h.toLowerCase().includes(c)))
  return index >= 0 ? index : Math.min(1, headers.length - 1)
}

/** Extrahiert die erste in der Zelle enthaltene Zahl (z. B. "1.", "1)", " 1 " -> 1). */
export function parseRang(cell: string): number | null {
  const match = cell.match(/\d+/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isInteger(value) && value > 0 ? value : null
}

const PAGE_SIZE = 1000
// Sobald eine zweite Seite feststeht, werden weitere Seiten bündelweise
// parallel statt strikt sequenziell nachgeladen (siehe unten) – 4 deckt bis
// zu 5.000 Zeilen in einem einzigen Bündel-Round-Trip ab, dem in der Praxis
// bei weitem größten Fall (z. B. alle Transaktionen einer stark bespielten
// Saison, empirisch ~3.100 Zeilen).
const PARALLEL_LOOKAHEAD = 4

/**
 * Lädt alle Zeilen einer Supabase-Query seitenweise (je 1000). PostgREST
 * begrenzt eine einzelne Antwort standardmäßig auf 1000 Zeilen (db-max-rows) –
 * ein `.select()` ohne `.range()` liefert bei größeren Tabellen sonst
 * stillschweigend nur einen Teil der Daten (kein Fehler, kein Hinweis), was
 * bei Listen-Abfragen über die ganze Tabelle (z. B. alle Transaktionen) zu
 * falschen Summen führt, sobald die Tabelle die Grenze überschreitet.
 *
 * Die erste Seite läuft immer einzeln (der weit überwiegende Normalfall –
 * fast jede Abfrage in dieser App passt in eine Seite). Erst wenn eine
 * zweite Seite tatsächlich nötig ist, werden weitere Seiten in Bündeln von
 * `PARALLEL_LOOKAHEAD` parallel angefragt statt jede einzeln abzuwarten –
 * überzählige Seiten jenseits der echten Daten liefern einfach leere
 * Ergebnisse (kein Fehler, kein Overhead über den schnellen Index-Scan
 * hinaus). Das ersetzt die vormals rein sequenzielle Pagination, die bei
 * größeren Ergebnismengen (z. B. Dashboard-Admin-Statistik) messbar mehrere
 * hundert Millisekunden reiner Wartezeit zwischen den Seiten kostete.
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const first = await buildQuery(0, PAGE_SIZE - 1)
  if (first.error) throw first.error
  const firstRows = first.data ?? []
  if (firstRows.length < PAGE_SIZE) return firstRows

  const rows = [...firstRows]
  let from = PAGE_SIZE
  outer: while (true) {
    const batch = await Promise.all(
      Array.from({ length: PARALLEL_LOOKAHEAD }, (_, i) =>
        buildQuery(from + i * PAGE_SIZE, from + (i + 1) * PAGE_SIZE - 1),
      ),
    )
    for (const page of batch) {
      if (page.error) throw page.error
      const data = page.data ?? []
      rows.push(...data)
      if (data.length < PAGE_SIZE) break outer
    }
    from += PARALLEL_LOOKAHEAD * PAGE_SIZE
  }
  return rows
}

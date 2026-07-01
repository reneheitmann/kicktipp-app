const PAGE_SIZE = 1000

/**
 * Lädt alle Zeilen einer Supabase-Query seitenweise (je 1000). PostgREST
 * begrenzt eine einzelne Antwort standardmäßig auf 1000 Zeilen (db-max-rows) –
 * ein `.select()` ohne `.range()` liefert bei größeren Tabellen sonst
 * stillschweigend nur einen Teil der Daten (kein Fehler, kein Hinweis), was
 * bei Listen-Abfragen über die ganze Tabelle (z. B. alle Transaktionen) zu
 * falschen Summen führt, sobald die Tabelle die Grenze überschreitet.
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

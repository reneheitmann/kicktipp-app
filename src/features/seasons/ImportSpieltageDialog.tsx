import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { fetchBundesligaSpieltage, type FetchedSpieltag } from './openLigaDbApi'
import { createMatchday } from './matchdaysApi'
import type { Season } from '../../types/database'

interface ImportSpieltageDialogProps {
  season: Season
  existingNummern: Set<number>
  onClose: () => void
  onImported: () => Promise<void>
}

export function ImportSpieltageDialog({ season, existingNummern, onClose, onImported }: ImportSpieltageDialogProps) {
  const [seasonYear, setSeasonYear] = useState(() => Number(season.start_date.slice(0, 4)))
  const [fetched, setFetched] = useState<FetchedSpieltag[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleFetch() {
    setLoading(true)
    setError(null)
    setFetched(null)
    try {
      const result = await fetchBundesligaSpieltage(seasonYear)
      setFetched(result)
      setSelected(new Set(result.filter((s) => !existingNummern.has(s.nummer)).map((s) => s.nummer)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Abruf fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  function toggle(nummer: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(nummer)) next.delete(nummer)
      else next.add(nummer)
      return next
    })
  }

  async function handleImport() {
    if (!fetched) return
    const toImport = fetched.filter((f) => selected.has(f.nummer))
    if (toImport.length === 0) return
    setImporting(true)
    setImportedCount(0)
    setError(null)
    for (const item of toImport) {
      try {
        await createMatchday({ season_id: season.id, nummer: item.nummer, datum: item.datum })
        setImportedCount((c) => c + 1)
      } catch (err) {
        setError(
          `Spieltag ${item.nummer}: ${err instanceof Error ? err.message : 'Fehlgeschlagen.'} (Import an dieser Stelle abgebrochen, bereits übernommene Spieltage bleiben erhalten.)`,
        )
        break
      }
    }
    await onImported()
    setImporting(false)
    setDone(true)
  }

  const selectableCount = fetched?.filter((s) => !existingNummern.has(s.nummer)).length ?? 0

  return (
    <Modal title="Spieltage aus dem Internet importieren" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Lädt den offiziellen Spielplan der 1. Bundesliga von{' '}
          <span className="font-medium">OpenLigaDB</span> (frei, ohne Anmeldung). Übernommen werden nur Spieltags-
          Nummer und -Datum (frühester Anstoß) – Tipps und Ergebnisse bleiben weiterhin bei Kicktipp.de.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="spieltage-saisonjahr" className="mb-1 block text-sm font-medium text-slate-700">
              Saison (Startjahr)
            </label>
            <input
              id="spieltage-saisonjahr"
              type="number"
              value={seasonYear}
              onChange={(e) => setSeasonYear(Number(e.target.value))}
              placeholder="z. B. 2025 für Saison 2025/26"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <Button type="button" variant="secondary" onClick={handleFetch} disabled={loading}>
            {loading ? 'Lade...' : 'Abrufen'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {fetched && (
          <>
            <p className="text-sm text-slate-600">
              {fetched.length} Spieltage gefunden · {selectableCount} noch nicht angelegt
            </p>
            <ul className="max-h-64 divide-y divide-slate-200 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white">
              {fetched.map((s) => {
                const alreadyExists = existingNummern.has(s.nummer)
                return (
                  <li key={s.nummer} className={`flex items-center gap-3 px-4 py-2 ${alreadyExists ? 'bg-slate-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.nummer)}
                      onChange={() => toggle(s.nummer)}
                      disabled={alreadyExists || importing || done}
                      className="h-5 w-5 shrink-0"
                    />
                    <span className="w-24 shrink-0 text-sm text-slate-900">Spieltag {s.nummer}</span>
                    <span className="text-sm text-slate-500">{s.datum}</span>
                    {alreadyExists && <span className="ml-auto text-xs text-slate-400">bereits vorhanden</span>}
                  </li>
                )
              })}
            </ul>

            {importing && (
              <p className="text-sm text-slate-500">
                Importiere... {importedCount} / {selected.size}
              </p>
            )}
            {done && !error && <p className="text-sm font-medium text-emerald-600">{importedCount} Spieltag(e) importiert.</p>}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                {done ? 'Schließen' : 'Abbrechen'}
              </Button>
              {!done && (
                <Button onClick={handleImport} disabled={importing || selected.size === 0} className="flex-1">
                  {importing ? 'Importiere...' : `${selected.size} Spieltag(e) importieren`}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

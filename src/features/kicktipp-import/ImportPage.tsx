import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { listSeasons } from '../seasons/seasonsApi'
import { listMatchdays } from '../seasons/matchdaysApi'
import { listPlayers, updatePlayer, describePlayerSaveError } from '../players/playersApi'
import { addMatchdayEntry, listMatchdayEntries } from '../seasons/matchdayEntriesApi'
import { listSeasonParticipants } from '../seasons/seasonParticipantsApi'
import { setMatchdayRanking } from '../rankings/matchdayRankingsApi'
import { setSeasonRanking } from '../rankings/seasonRankingsApi'
import { createImport, markImportTaken } from './kicktippImportsApi'
import { guessNameColumn, guessRangColumn, parseCsv, parseRang, type ParsedCsv } from './csvParser'
import type { Matchday, Player, Season, SeasonParticipant } from '../../types/database'

interface ImportRow {
  rawName: string
  rawRang: string
  parsedRang: number | null
  playerId: string | null
  eligible: boolean
  /** Spieler ist Saison-Teilnehmer, hat aber für diesen Spieltag noch keinen Einsatz-Eintrag. */
  needsAutoAssign: boolean
  included: boolean
  status: 'pending' | 'done' | 'error'
  message?: string
}

function findPlayerMatch(rawName: string, players: Player[]): string | null {
  const normalized = rawName.trim().toLowerCase()
  if (!normalized) return null
  const byKicktippName = players.find((p) => p.kicktipp_name?.trim().toLowerCase() === normalized)
  if (byKicktippName) return byKicktippName.id
  const byName = players.find((p) => p.name.trim().toLowerCase() === normalized)
  return byName?.id ?? null
}

export function ImportPage() {
  const [searchParams] = useSearchParams()
  const { can } = useAuth()

  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [matchdayEntryPlayerIds, setMatchdayEntryPlayerIds] = useState<Set<string>>(new Set())
  const [seasonParticipants, setSeasonParticipants] = useState<SeasonParticipant[]>([])

  const [seasonId, setSeasonId] = useState(searchParams.get('seasonId') ?? '')
  const [target, setTarget] = useState<'spieltag' | 'gesamtsieg'>(
    searchParams.get('matchdayId') ? 'spieltag' : 'gesamtsieg',
  )
  const [matchdayId, setMatchdayId] = useState(searchParams.get('matchdayId') ?? '')

  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [nameColumn, setNameColumn] = useState(0)
  const [rangColumn, setRangColumn] = useState(0)
  const [rows, setRows] = useState<ImportRow[]>([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listSeasons(), listPlayers()])
      .then(([seasonData, playerData]) => {
        setSeasons(seasonData)
        setPlayers(playerData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!seasonId) {
      setMatchdays([])
      return
    }
    listMatchdays(seasonId)
      .then(setMatchdays)
      .catch((err) => setError(err instanceof Error ? err.message : 'Spieltage konnten nicht geladen werden.'))
  }, [seasonId])

  // Saison-Teilnehmer (inkl. hinterlegtem Standard-Spieltagseinsatz) werden
  // immer geladen: für "Gesamtwertung" sind sie direkt die Teilnahme-Berechtigung
  // (FK von season_rankings auf season_participants), für "Spieltag" liefern
  // sie zusätzlich den Betrag, mit dem ein noch fehlender Spieltags-Eintrag
  // automatisch nachgetragen werden kann.
  useEffect(() => {
    if (!seasonId) {
      setSeasonParticipants([])
      return
    }
    listSeasonParticipants(seasonId)
      .then(setSeasonParticipants)
      .catch((err) => setError(err instanceof Error ? err.message : 'Saison-Teilnehmer konnten nicht geladen werden.'))
  }, [seasonId])

  useEffect(() => {
    if (target === 'spieltag' && matchdayId) {
      listMatchdayEntries(matchdayId)
        .then((entries) => setMatchdayEntryPlayerIds(new Set(entries.map((e) => e.player_id))))
        .catch((err) => setError(err instanceof Error ? err.message : 'Teilnehmer konnten nicht geladen werden.'))
    } else {
      setMatchdayEntryPlayerIds(new Set())
    }
  }, [target, matchdayId])

  const seasonParticipantsByPlayerId = useMemo(
    () => new Map(seasonParticipants.map((p) => [p.player_id, p])),
    [seasonParticipants],
  )

  /**
   * Bestimmt, ob ein Spieler für das gewählte Ziel Platzierungen erhalten
   * darf. Bei "Spieltag" reicht es, Saison-Teilnehmer zu sein – ein fehlender
   * Spieltags-Eintrag wird beim Übernehmen automatisch mit dem hinterlegten
   * Standard-Spieltagseinsatz nachgetragen, statt die Zeile abzulehnen.
   */
  const getRowMeta = useCallback(
    (playerId: string | null): { eligible: boolean; needsAutoAssign: boolean } => {
      if (!playerId) return { eligible: false, needsAutoAssign: false }
      const isParticipant = seasonParticipantsByPlayerId.has(playerId)
      if (target === 'spieltag') {
        const hasEntry = matchdayEntryPlayerIds.has(playerId)
        return { eligible: hasEntry || isParticipant, needsAutoAssign: !hasEntry && isParticipant }
      }
      return { eligible: isParticipant, needsAutoAssign: false }
    },
    [target, matchdayEntryPlayerIds, seasonParticipantsByPlayerId],
  )

  const buildRows = useCallback(
    (parsed: ParsedCsv, nameCol: number, rangCol: number): ImportRow[] => {
      return parsed.rows
        .filter((cells) => cells.some((c) => c.trim() !== ''))
        .map((cells) => {
          const rawName = cells[nameCol] ?? ''
          const rawRang = cells[rangCol] ?? ''
          const playerId = findPlayerMatch(rawName, players)
          const { eligible, needsAutoAssign } = getRowMeta(playerId)
          return {
            rawName,
            rawRang,
            parsedRang: parseRang(rawRang),
            playerId,
            eligible,
            needsAutoAssign,
            // Nicht-teilnehmende Tipper standardmäßig abwählen, damit ein
            // versehentlicher Übernahme-Klick nicht an ihnen scheitert.
            included: eligible,
            status: 'pending' as const,
          }
        })
    },
    [players, getRowMeta],
  )

  // Einzige Quelle für die Zeilenberechnung: läuft bei jeder Änderung an CSV,
  // Spaltenwahl oder Teilnehmer-Menge neu (Letztere kommt asynchron nach, da
  // die CSV ggf. schon vor Abschluss dieser Fetches hochgeladen wurde).
  useEffect(() => {
    if (csv) {
      setRows(buildRows(csv, nameColumn, rangColumn))
    }
  }, [csv, nameColumn, rangColumn, buildRows])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(null)
    file.text().then((text) => {
      const parsed = parseCsv(text)
      if (parsed.headers.length === 0) {
        setError('Datei konnte nicht gelesen werden oder ist leer.')
        return
      }
      setCsv(parsed)
      setNameColumn(guessNameColumn(parsed.headers))
      setRangColumn(guessRangColumn(parsed.headers, target))
    })
  }

  function updateRow(index: number, patch: Partial<ImportRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const includedRows = rows.filter((r) => r.included)
  const unresolvedCount = includedRows.filter((r) => !r.playerId || r.parsedRang === null).length
  const autoAssignCount = includedRows.filter((r) => r.needsAutoAssign).length
  const ineligibleExcludedCount = rows.filter((r) => !r.eligible && r.playerId).length
  // Das Übernehmen schreibt Platzierungen (matchday_rankings/season_rankings),
  // das erfordert zusätzlich zum reinen Import-Zugriff das Recht
  // rankings.manage – sonst würde der Klick an der RLS-Policy scheitern.
  const canSubmit =
    !!seasonId &&
    (target === 'gesamtsieg' || !!matchdayId) &&
    includedRows.length > 0 &&
    unresolvedCount === 0 &&
    !submitting &&
    can('rankings.manage')

  async function handleSubmit() {
    if (!canSubmit || !csv) return
    setSubmitting(true)
    setProcessedCount(0)
    setError(null)
    setSuccess(null)

    const importRecord = await createImport({
      season_id: seasonId,
      matchday_id: target === 'spieltag' ? matchdayId : null,
      rohdaten: { headers: csv.headers, rows: csv.rows, nameColumn, rangColumn },
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Import konnte nicht angelegt werden.')
      return null
    })
    if (!importRecord) {
      setSubmitting(false)
      return
    }

    const next = [...rows]
    let successCount = 0
    let errorCount = 0
    let assignedCount = 0
    for (let i = 0; i < next.length; i++) {
      const row = next[i]
      if (!row.included || !row.playerId || row.parsedRang === null) continue
      try {
        const player = players.find((p) => p.id === row.playerId)
        if (player && player.kicktipp_name?.trim().toLowerCase() !== row.rawName.trim().toLowerCase()) {
          await updatePlayer(player.id, { kicktipp_name: row.rawName.trim() })
        }
        if (target === 'spieltag') {
          if (row.needsAutoAssign) {
            const participant = seasonParticipantsByPlayerId.get(row.playerId)
            if (!participant) {
              throw new Error('Saison-Teilnahme nicht gefunden.')
            }
            await addMatchdayEntry({
              matchday_id: matchdayId,
              player_id: row.playerId,
              spieltags_einsatz_betrag: participant.spieltags_einsatz_betrag,
            })
            assignedCount++
          }
          await setMatchdayRanking(matchdayId, row.playerId, row.parsedRang)
        } else {
          await setSeasonRanking(seasonId, row.playerId, row.parsedRang)
        }
        next[i] = { ...row, status: 'done' }
        successCount++
      } catch (err) {
        next[i] = { ...row, status: 'error', message: describePlayerSaveError(err) }
        errorCount++
      }
      setProcessedCount((c) => c + 1)
      setRows([...next])
    }

    await markImportTaken(importRecord.id)
    setSuccess(
      `Import abgeschlossen: ${successCount} Platzierung(en) gespeichert` +
        (assignedCount > 0 ? `, davon ${assignedCount} Spieler neu dem Spieltag zugewiesen` : '') +
        (errorCount > 0 ? `, ${errorCount} fehlgeschlagen (siehe Zeilen unten).` : '.'),
    )
    setSubmitting(false)
  }

  const detailLink =
    target === 'spieltag' && matchdayId
      ? `/seasons/${seasonId}/matchdays/${matchdayId}`
      : seasonId
        ? `/seasons/${seasonId}`
        : null

  const playerOptions = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players])

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Kicktipp-Import: Platzierungen</h1>
        <Link to="/import/tipper" className="text-sm font-medium text-slate-600 hover:underline">
          Stattdessen Tipperliste (Spieler) importieren →
        </Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}{' '}
          {detailLink && (
            <Link to={detailLink} className="underline">
              Zur Übersicht
            </Link>
          )}
        </p>
      )}

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="import-season" className="mb-1 block text-sm font-medium text-slate-700">
            Saison
          </label>
          <select
            id="import-season"
            value={seasonId}
            onChange={(e) => {
              setSeasonId(e.target.value)
              setMatchdayId('')
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            <option value="">Bitte wählen...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="import-target" className="mb-1 block text-sm font-medium text-slate-700">
            Ziel
          </label>
          <select
            id="import-target"
            value={target}
            onChange={(e) => {
              const newTarget = e.target.value as 'spieltag' | 'gesamtsieg'
              setTarget(newTarget)
              if (csv) {
                setRangColumn(guessRangColumn(csv.headers, newTarget))
              }
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            <option value="gesamtsieg">Gesamtwertung (Saisonrangliste)</option>
            <option value="spieltag">Spieltag (Tagesrangliste)</option>
          </select>
        </div>

        {target === 'spieltag' && (
          <div>
            <label htmlFor="import-matchday" className="mb-1 block text-sm font-medium text-slate-700">
              Spieltag
            </label>
            <select
              id="import-matchday"
              value={matchdayId}
              onChange={(e) => setMatchdayId(e.target.value)}
              disabled={!seasonId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            >
              <option value="">Bitte wählen...</option>
              {matchdays.map((m) => (
                <option key={m.id} value={m.id}>
                  Spieltag {m.nummer}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <label htmlFor="import-file" className="mb-1 block text-sm font-medium text-slate-700">
          CSV-Datei von Kicktipp.de (Spielleiter &gt; Mitgliederverwaltung &gt; Datenexport)
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
      </div>

      {csv && csv.headers.length > 0 && (
        <>
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="import-name-col" className="mb-1 block text-sm font-medium text-slate-700">
                Spalte: Name
              </label>
              <select
                id="import-name-col"
                value={nameColumn}
                onChange={(e) => setNameColumn(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              >
                {csv.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Spalte ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="import-rang-col" className="mb-1 block text-sm font-medium text-slate-700">
                Spalte: Platz
              </label>
              <select
                id="import-rang-col"
                value={rangColumn}
                onChange={(e) => setRangColumn(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              >
                {csv.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Spalte ${i + 1}`}
                  </option>
                ))}
              </select>
              {target === 'spieltag' && (
                <p className="mt-1 text-xs text-slate-500">
                  Achtung: Bei Kicktipps Spieltags-Ranglisten-Export ist „Spieltagsplatzierung" die korrekte Spalte –
                  „Rang" ist dort der Gesamtsaison-Stand, nicht die Platzierung an diesem Spieltag.
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm text-slate-600">
              {rows.length} Zeile(n) erkannt
              {autoAssignCount > 0 && (
                <span className="ml-2 font-medium text-blue-700">
                  – {autoAssignCount} Saison-Teilnehmer werden neu dem Spieltag zugewiesen
                </span>
              )}
              {ineligibleExcludedCount > 0 && (
                <span className="ml-2 text-slate-500">
                  – {ineligibleExcludedCount} ohne Saison-Teilnahme (automatisch abgewählt)
                </span>
              )}
              {unresolvedCount > 0 && (
                <span className="ml-2 font-medium text-red-600">
                  – {unresolvedCount} nicht zuordenbar oder ungültig, bitte vor Übernahme korrigieren
                </span>
              )}
            </p>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {rows.map((row, index) => {
                const invalid = !row.playerId || row.parsedRang === null
                return (
                  <li
                    key={index}
                    className={`flex flex-wrap items-center gap-2 px-4 py-3 ${
                      row.included && invalid ? 'bg-red-50' : !row.eligible ? 'bg-slate-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) => updateRow(index, { included: e.target.checked })}
                      disabled={submitting}
                      className="h-5 w-5 shrink-0"
                    />
                    <span className="w-40 shrink-0 truncate text-sm text-slate-900">{row.rawName || '(leer)'}</span>
                    <span className="w-20 shrink-0 text-sm text-slate-500">
                      {row.parsedRang !== null ? `Platz ${row.parsedRang}` : `"${row.rawRang}" ungültig`}
                    </span>
                    <select
                      value={row.playerId ?? ''}
                      onChange={(e) => {
                        const playerId = e.target.value || null
                        const { eligible, needsAutoAssign } = getRowMeta(playerId)
                        updateRow(index, { playerId, eligible, needsAutoAssign })
                      }}
                      disabled={!row.included || submitting}
                      className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                    >
                      <option value="">Nicht zugeordnet</option>
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="w-full shrink-0 text-xs sm:w-auto">
                      {row.status === 'done' && <span className="text-emerald-700">✓ übernommen</span>}
                      {row.status === 'error' && <span className="text-red-600">Fehler: {row.message}</span>}
                      {row.status === 'pending' && !row.eligible && row.playerId && (
                        <span className="text-slate-500">kein Saison-Teilnehmer</span>
                      )}
                      {row.status === 'pending' && row.needsAutoAssign && (
                        <span className="text-blue-700">+ wird zugewiesen</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {submitting && (
            <p className="mb-3 text-sm text-slate-500">
              Verarbeite... {processedCount} / {includedRows.length}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Übernehmen...' : 'Import übernehmen'}
          </Button>
        </>
      )}
    </div>
  )
}

import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { listPlayers, createPlayer, updatePlayer, describePlayerSaveError } from '../players/playersApi'
import { listProfiles, sendPasswordReset } from '../admin-users/profilesApi'
import { adminCreateUser } from '../admin-users/adminCreateUser'
import { generateRandomPassword } from '../../lib/randomPassword'
import { guessEmailColumn, guessNameColumn, parseCsv, type ParsedCsv } from './csvParser'
import { classifyTipperRows, willCreateLogin, type TipperRow } from './tipperImportLogic'
import type { Player, Profile } from '../../types/database'

interface RowResult {
  row: TipperRow
  included: boolean
  status: 'pending' | 'done' | 'error'
  message?: string
}

export function TipperImportPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [players, setPlayers] = useState<Player[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [nameColumn, setNameColumn] = useState(0)
  const [emailColumn, setEmailColumn] = useState(0)
  const [results, setResults] = useState<RowResult[]>([])
  const [createLoginsEnabled, setCreateLoginsEnabled] = useState(false)
  const [sendInviteEmails, setSendInviteEmails] = useState(false)

  const [running, setRunning] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([listPlayers(), isAdmin ? listProfiles() : Promise.resolve([])])
      .then(([playerData, profileData]) => {
        setPlayers(playerData)
        setProfiles(profileData)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [isAdmin])

  function buildResults(parsed: ParsedCsv, nameCol: number, emailCol: number, loginsEnabled: boolean): RowResult[] {
    const rawRows = parsed.rows
      .filter((cells) => cells.some((c) => c.trim() !== ''))
      .map((cells) => ({ name: cells[nameCol] ?? '', email: cells[emailCol] ?? '' }))
    const classified = classifyTipperRows(rawRows, players, profiles)
    return classified.map((row) => ({
      row,
      included: !row.playerExists || willCreateLogin(row, loginsEnabled),
      status: 'pending',
    }))
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setDone(false)
    file.text().then((text) => {
      const parsed = parseCsv(text)
      if (parsed.headers.length === 0) {
        setError('Datei konnte nicht gelesen werden oder ist leer.')
        return
      }
      const guessedName = guessNameColumn(parsed.headers)
      const guessedEmail = guessEmailColumn(parsed.headers)
      setCsv(parsed)
      setNameColumn(guessedName)
      setEmailColumn(guessedEmail)
      setResults(buildResults(parsed, guessedName, guessedEmail, createLoginsEnabled))
    })
  }

  function handleColumnChange(newNameColumn: number, newEmailColumn: number) {
    setNameColumn(newNameColumn)
    setEmailColumn(newEmailColumn)
    if (csv) setResults(buildResults(csv, newNameColumn, newEmailColumn, createLoginsEnabled))
  }

  function toggleRow(index: number) {
    setResults((prev) => prev.map((r, i) => (i === index ? { ...r, included: !r.included } : r)))
  }

  const newPlayerCount = results.filter((r) => r.included && !r.row.playerExists).length
  const newLoginCount = results.filter((r) => r.included && willCreateLogin(r.row, createLoginsEnabled)).length
  const skippedCount = results.filter((r) => !r.included).length

  async function handleImport() {
    setRunning(true)
    setProcessedCount(0)
    setDone(false)
    const next = [...results]
    for (let i = 0; i < next.length; i++) {
      const entry = next[i]
      if (!entry.included) continue
      try {
        let playerId = entry.row.existingPlayerId
        if (!entry.row.playerExists) {
          const created = await createPlayer({
            name: entry.row.kicktippName,
            kicktipp_name: entry.row.kicktippName,
            profile_id: null,
          })
          playerId = created.id
        }

        if (isAdmin && willCreateLogin(entry.row, createLoginsEnabled) && entry.row.email) {
          const createdUser = await adminCreateUser({
            name: entry.row.kicktippName,
            email: entry.row.email,
            password: generateRandomPassword(),
            role: 'user',
          })
          if (sendInviteEmails) {
            await sendPasswordReset(entry.row.email)
          }
          if (playerId) {
            await updatePlayer(playerId, { profile_id: createdUser.id })
          }
        }

        next[i] = { ...entry, status: 'done' }
      } catch (err) {
        next[i] = { ...entry, status: 'error', message: describePlayerSaveError(err) }
      }
      setProcessedCount(i + 1)
      setResults([...next])
    }
    setRunning(false)
    setDone(true)
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <Link to="/import" className="mb-3 inline-block text-sm text-slate-500 hover:underline">
        ← Zurück zum Platzierungs-Import
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-slate-900">Tipperliste importieren</h1>
      <p className="mb-4 text-sm text-slate-500">
        Importiert Spieler (und optional Logins) aus dem Kicktipp-Datenexport „Tipperliste" (Spielleiter &gt;
        Mitgliederverwaltung &gt; Datenexport). Bereits vorhandene Spieler bzw. Logins werden automatisch erkannt
        und übersprungen.
      </p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <label htmlFor="tipper-file" className="mb-1 block text-sm font-medium text-slate-700">
          CSV-Datei (Tipperliste)
        </label>
        <input
          id="tipper-file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
      </div>

      {csv && csv.headers.length > 0 && (
        <>
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tipper-name-col" className="mb-1 block text-sm font-medium text-slate-700">
                Spalte: Kicktipp-Name
              </label>
              <select
                id="tipper-name-col"
                value={nameColumn}
                onChange={(e) => handleColumnChange(Number(e.target.value), emailColumn)}
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
              <label htmlFor="tipper-email-col" className="mb-1 block text-sm font-medium text-slate-700">
                Spalte: E-Mail
              </label>
              <select
                id="tipper-email-col"
                value={emailColumn}
                onChange={(e) => handleColumnChange(nameColumn, Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              >
                {csv.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Spalte ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={createLoginsEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked
                    setCreateLoginsEnabled(enabled)
                    if (csv) setResults(buildResults(csv, nameColumn, emailColumn, enabled))
                  }}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-sm text-slate-700">
                  Für neue Spieler mit gültiger E-Mail-Adresse direkt einen Login (Rolle „Spieler") anlegen.
                </span>
              </label>

              {createLoginsEnabled && (
                <label className="flex items-start gap-3 border-t border-slate-100 pt-3">
                  <input
                    type="checkbox"
                    checked={sendInviteEmails}
                    onChange={(e) => setSendInviteEmails(e.target.checked)}
                    className="mt-1 h-5 w-5"
                  />
                  <span className="text-sm text-slate-700">
                    Direkt eine Passwort-Einrichtungs-E-Mail verschicken.{' '}
                    <strong>Das versendet bei vielen Zeilen entsprechend viele echte E-Mails an die Tipper.</strong>{' '}
                    Bleibt diese Option deaktiviert, werden die Logins ohne Versand angelegt – die Einladung kann
                    später jederzeit einzeln über „Passwort-Reset" in der Benutzerverwaltung nachgeholt werden.
                  </span>
                </label>
              )}
            </div>
          )}

          <p className="mb-2 text-sm text-slate-600">
            {results.length} Zeile(n) erkannt · {newPlayerCount} neue(r) Spieler
            {isAdmin && createLoginsEnabled && ` · ${newLoginCount} neue(r) Login(s)`} · {skippedCount} übersprungen
            (bereits vorhanden)
          </p>

          <ul className="mb-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {results.map((entry, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <input
                  type="checkbox"
                  checked={entry.included}
                  onChange={() => toggleRow(index)}
                  disabled={running || done}
                  className="h-5 w-5 shrink-0"
                />
                <span className="w-40 shrink-0 truncate text-sm text-slate-900">{entry.row.kicktippName}</span>
                <span className="min-w-[10rem] flex-1 truncate text-sm text-slate-500">
                  {entry.row.email ?? 'keine E-Mail'}
                </span>
                <span className="shrink-0 text-xs">
                  {entry.status === 'done' && <span className="text-emerald-600">✓ übernommen</span>}
                  {entry.status === 'error' && <span className="text-red-600">Fehler: {entry.message}</span>}
                  {entry.status === 'pending' && entry.row.playerExists && (
                    <span className="text-slate-400">Spieler existiert bereits</span>
                  )}
                  {entry.status === 'pending' && !entry.row.playerExists && (
                    <span className="text-emerald-700">Neuer Spieler</span>
                  )}
                  {entry.status === 'pending' && isAdmin && willCreateLogin(entry.row, createLoginsEnabled) && (
                    <span className="ml-2 text-blue-700">+ Login{sendInviteEmails ? ' (mit E-Mail)' : ' (ohne E-Mail)'}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {running && (
            <p className="mb-3 text-sm text-slate-500">
              Verarbeite... {processedCount} / {results.filter((r) => r.included).length}
            </p>
          )}
          {done && <p className="mb-3 text-sm font-medium text-emerald-600">Import abgeschlossen.</p>}

          <Button onClick={handleImport} disabled={running || done || (newPlayerCount === 0 && newLoginCount === 0)}>
            {running ? 'Importiere...' : 'Import übernehmen'}
          </Button>
        </>
      )}
    </div>
  )
}

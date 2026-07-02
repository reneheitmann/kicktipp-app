import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/SearchInput'
import { clearAppLogs, listAppLogs, LOG_LIMIT } from './logsApi'
import type { AppLog, LogLevel } from '../../types/database'

const levelTone: Record<LogLevel, 'positive' | 'warning' | 'negative'> = {
  info: 'positive',
  warn: 'warning',
  error: 'negative',
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'medium' })

export function LogsPage() {
  const [logs, setLogs] = useState<AppLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'alle' | LogLevel>('alle')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      setLogs(await listAppLogs())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logs konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleClear() {
    if (!confirm('Alle Logs unwiderruflich löschen?')) return
    setClearing(true)
    setError(null)
    try {
      await clearAppLogs()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setClearing(false)
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = logs
    .filter((l) => levelFilter === 'alle' || l.level === levelFilter)
    .filter((l) => !term || l.message.toLowerCase().includes(term) || l.source.toLowerCase().includes(term))

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Logs & Diagnose</h1>
        <Button variant="danger" onClick={handleClear} disabled={clearing || logs.length === 0}>
          {clearing ? 'Löschen...' : 'Logs leeren'}
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Zeigt die letzten {LOG_LIMIT} unbehandelten Fehler – im Frontend (Browser) und aus den Edge Functions (z. B.
        E-Mail-Versand). Für Supportzwecke gedacht, keine vollständige Aktivitäts-Historie. Einträge werden
        automatisch nach 30 Tagen entfernt.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Nachricht/Quelle durchsuchen..."
          className="max-w-xs"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as 'alle' | LogLevel)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none sm:w-40"
        >
          <option value="alle">Alle Level</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {logs.length === 0 ? 'Noch keine Logs vorhanden.' : 'Keine Treffer für die aktuelle Suche/Filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setExpandedId((id) => (id === log.id ? null : log.id))}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={levelTone[log.level]}>{log.level}</Badge>
                    <span className="text-xs font-medium text-slate-500">{log.source}</span>
                    <span className="text-xs text-slate-400">{dateFormatter.format(new Date(log.created_at))}</span>
                  </div>
                  <p className="truncate text-sm text-slate-900">{log.message}</p>
                </div>
              </button>
              {expandedId === log.id && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  {log.url && (
                    <p className="break-all">
                      <span className="font-medium">URL:</span> {log.url}
                    </p>
                  )}
                  {log.user_id && (
                    <p>
                      <span className="font-medium">User:</span> {log.user_id}
                    </p>
                  )}
                  {log.details && (
                    <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px]">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

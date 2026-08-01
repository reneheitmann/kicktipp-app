import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { navItems } from '../../components/layout/navItems'
import { getNavSettings, saveNavSettings } from './navSettingsApi'

const defaultLabelByTo = new Map(navItems.map((i) => [i.to, i.label]))

export function NavSettingsPage() {
  const { profile } = useAuth()
  const [order, setOrderState] = useState<string[]>([])
  // Zeigt für jeden Pfad immer einen Wert (überschriebenes Label oder das
  // Code-Default) – ein leeres Eingabefeld ohne erkennbaren Ausgangswert
  // wäre verwirrend. Gespeichert wird nur, was tatsächlich vom Default abweicht.
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    getNavSettings()
      .then(({ order: stored, labels: storedLabels }) => {
        const known = navItems.map((i) => i.to)
        // Gespeicherte Reihenfolge kann veraltete Einträge enthalten (Route
        // entfernt) oder neue Einträge fehlen (noch nie gespeichert) – hier
        // einmalig zu einer vollständigen, gültigen Liste zusammenführen.
        const valid = stored.filter((to) => known.includes(to))
        const missing = known.filter((to) => !valid.includes(to))
        setOrderState([...valid, ...missing])
        setLabels(Object.fromEntries(known.map((to) => [to, storedLabels[to] ?? defaultLabelByTo.get(to) ?? to])))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrderState(next)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      const overrides = Object.fromEntries(
        Object.entries(labels).filter(([to, label]) => label.trim() && label.trim() !== defaultLabelByTo.get(to)),
      )
      await saveNavSettings({ order, labels: overrides }, profile.id)
      setInfo('Gespeichert.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Menü verwalten</h1>
      <p className="mb-6 text-sm text-slate-500">
        Legt Reihenfolge und Bezeichnung der Menüpunkte fest – gilt für alle User, unabhängig von deren Rolle. Ob ein
        Menüpunkt für eine Rolle überhaupt sichtbar ist, wird weiterhin über Rollen & Berechtigungen gesteuert. Ein
        leeres oder auf den Original-Text zurückgesetztes Feld verwendet wieder die Standard-Bezeichnung.
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mb-4 text-sm text-emerald-700">{info}</p>}

      <ul className="mb-4 max-w-lg divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {order.map((to, index) => (
          <li key={to} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <input
                value={labels[to] ?? ''}
                onChange={(e) => setLabels((prev) => ({ ...prev, [to]: e.target.value }))}
                aria-label={`Bezeichnung für ${defaultLabelByTo.get(to) ?? to}`}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <p className="mt-1 truncate text-xs text-slate-500">{to}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`${defaultLabelByTo.get(to) ?? to} nach oben verschieben`}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`${defaultLabelByTo.get(to) ?? to} nach unten verschieben`}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Speichern...' : 'Speichern'}
      </Button>
    </div>
  )
}

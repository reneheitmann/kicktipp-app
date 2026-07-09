import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../auth/useAuth'
import { getSessionPolicy, saveSessionPolicy } from './sessionPolicyApi'

export function SessionPolicyPage() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [maxDurationHours, setMaxDurationHours] = useState(8)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [confirmingSave, setConfirmingSave] = useState(false)

  useEffect(() => {
    getSessionPolicy()
      .then((policy) => {
        setMaxDurationHours(policy.max_duration_hours)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Richtlinie konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setConfirmingSave(true)
  }

  async function confirmSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await saveSessionPolicy({ max_duration_hours: maxDurationHours, updated_by: profile.id })
      setInfo('Sitzungs-Zeitlimit gespeichert.')
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
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Sitzungsdauer</h1>
      <p className="mb-6 text-sm text-slate-500">
        Nach dieser Zeit wird jede einzelne angemeldete Sitzung automatisch beendet – unabhängig davon, ob sie aktiv
        genutzt wird. Andere gleichzeitig angemeldete Geräte desselben Nutzers sind davon nicht betroffen.
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mb-4 text-sm text-emerald-700">{info}</p>}

      <form className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="max-duration-hours" className="mb-1 block text-sm font-medium text-slate-700">
            Sitzungsdauer (Stunden)
          </label>
          <input
            id="max-duration-hours"
            type="number"
            min={1}
            max={168}
            value={maxDurationHours}
            onChange={(e) => setMaxDurationHours(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">Zwischen 1 und 168 Stunden (7 Tage). Standard: 8 Stunden.</p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </form>

      {confirmingSave && (
        <ConfirmDialog
          title="Sitzungsdauer speichern?"
          message="Gilt sofort app-weit für alle laufenden und künftigen Sitzungen."
          confirmLabel="Speichern"
          onConfirm={confirmSave}
          onClose={() => setConfirmingSave(false)}
        />
      )}
    </div>
  )
}

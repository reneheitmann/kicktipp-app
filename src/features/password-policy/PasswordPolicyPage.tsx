import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../auth/useAuth'
import { describePasswordPolicy } from '../../lib/passwordValidation'
import { getPasswordPolicy, savePasswordPolicy } from './passwordPolicyApi'

export function PasswordPolicyPage() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [minLength, setMinLength] = useState(8)
  const [minClasses, setMinClasses] = useState(3)
  const [reuseDays, setReuseDays] = useState(60)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [confirmingSave, setConfirmingSave] = useState(false)

  useEffect(() => {
    getPasswordPolicy()
      .then((policy) => {
        setMinLength(policy.min_length)
        setMinClasses(policy.min_character_classes)
        setReuseDays(policy.reuse_days)
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
      await savePasswordPolicy({
        min_length: minLength,
        min_character_classes: minClasses,
        reuse_days: reuseDays,
        updated_by: profile.id,
      })
      setInfo('Passwort-Richtlinie gespeichert.')
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
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Passwort-Richtlinie</h1>
      <p className="mb-6 text-sm text-slate-500">
        Gilt für die Passwortänderung im eigenen Profil sowie für neu angelegte Benutzer (nicht für den
        automatisch generierten Platzhalter bei „Per E-Mail einladen" – der wird nie sichtbar und sofort durch das
        vom User selbst gewählte Passwort ersetzt).
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mb-4 text-sm text-emerald-700">{info}</p>}

      <form className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="min-length" className="mb-1 block text-sm font-medium text-slate-700">
            Mindestlänge
          </label>
          <input
            id="min-length"
            type="number"
            min={6}
            max={128}
            value={minLength}
            onChange={(e) => setMinLength(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="min-classes" className="mb-1 block text-sm font-medium text-slate-700">
            Erforderliche Zeichenarten (von 4)
          </label>
          <select
            id="min-classes"
            value={minClasses}
            onChange={(e) => setMinClasses(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} von 4
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Großbuchstaben, Kleinbuchstaben, Zahlen, Sonderzeichen.</p>
        </div>

        <div>
          <label htmlFor="reuse-days" className="mb-1 block text-sm font-medium text-slate-700">
            Wiederverwendungssperre (Tage)
          </label>
          <input
            id="reuse-days"
            type="number"
            min={0}
            max={3650}
            value={reuseDays}
            onChange={(e) => setReuseDays(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">0 deaktiviert die Sperre.</p>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Vorschau: {describePasswordPolicy({ min_length: minLength, min_character_classes: minClasses, reuse_days: reuseDays })}
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </form>

      {confirmingSave && (
        <ConfirmDialog
          title="Passwort-Richtlinie speichern?"
          message="Gilt sofort app-weit für alle künftigen Passwortänderungen und neu angelegten Benutzer."
          confirmLabel="Speichern"
          onConfirm={confirmSave}
          onClose={() => setConfirmingSave(false)}
        />
      )}
    </div>
  )
}

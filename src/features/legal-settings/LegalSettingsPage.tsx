import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../auth/useAuth'
import { getLegalSettings, saveLegalSettings } from './legalSettingsApi'

const EMPTY = {
  operator_name: '',
  operator_address: '',
  operator_email: '',
  operator_phone: '',
  hosting_location: '',
  hosting_location_frontend: '',
}

export function LegalSettingsPage() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [confirmingSave, setConfirmingSave] = useState(false)

  useEffect(() => {
    getLegalSettings()
      .then((settings) => {
        setForm({
          operator_name: settings.operator_name,
          operator_address: settings.operator_address,
          operator_email: settings.operator_email,
          operator_phone: settings.operator_phone,
          hosting_location: settings.hosting_location,
          hosting_location_frontend: settings.hosting_location_frontend,
        })
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Angaben konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  function updateField(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

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
      await saveLegalSettings({ ...form, updated_by: profile.id })
      setInfo('Angaben gespeichert.')
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
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Datenschutz &amp; Impressum</h1>
      <p className="mb-6 text-sm text-slate-500">
        Diese Angaben erscheinen ohne Login auf den öffentlichen Seiten{' '}
        <a href="/datenschutz" target="_blank" rel="noreferrer" className="underline">
          /datenschutz
        </a>{' '}
        und{' '}
        <a href="/impressum" target="_blank" rel="noreferrer" className="underline">
          /impressum
        </a>
        .
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mb-4 text-sm text-emerald-700">{info}</p>}

      <form className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="legal-operator-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name des Betreibers
          </label>
          <input
            id="legal-operator-name"
            value={form.operator_name}
            onChange={(e) => updateField('operator_name', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="legal-operator-address" className="mb-1 block text-sm font-medium text-slate-700">
            Anschrift
          </label>
          <textarea
            id="legal-operator-address"
            rows={2}
            value={form.operator_address}
            onChange={(e) => updateField('operator_address', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="legal-operator-email" className="mb-1 block text-sm font-medium text-slate-700">
            Kontakt-E-Mail
          </label>
          <input
            id="legal-operator-email"
            type="email"
            value={form.operator_email}
            onChange={(e) => updateField('operator_email', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="legal-operator-phone" className="mb-1 block text-sm font-medium text-slate-700">
            Telefon <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="legal-operator-phone"
            value={form.operator_phone}
            onChange={(e) => updateField('operator_phone', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="legal-hosting-location" className="mb-1 block text-sm font-medium text-slate-700">
            Hosting-Standort der Datenbank (Supabase)
          </label>
          <input
            id="legal-hosting-location"
            value={form.hosting_location}
            onChange={(e) => updateField('hosting_location', e.target.value)}
            placeholder="z. B. EU (Frankfurt)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="legal-hosting-location-frontend" className="mb-1 block text-sm font-medium text-slate-700">
            Hosting-Standort der Weboberfläche
          </label>
          <input
            id="legal-hosting-location-frontend"
            value={form.hosting_location_frontend}
            onChange={(e) => updateField('hosting_location_frontend', e.target.value)}
            placeholder="z. B. eigener Server in Deutschland"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </form>

      {confirmingSave && (
        <ConfirmDialog
          title="Angaben speichern?"
          message="Wird sofort auf den öffentlichen Datenschutz-/Impressum-Seiten sichtbar, auch ohne Login."
          confirmLabel="Speichern"
          onConfirm={confirmSave}
          onClose={() => setConfirmingSave(false)}
        />
      )}
    </div>
  )
}

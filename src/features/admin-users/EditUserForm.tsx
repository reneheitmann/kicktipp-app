import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { adminUpdateUser } from './adminUpdateUser'
import type { Profile } from '../../types/database'

export function EditUserForm({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [vorname, setVorname] = useState(profile.vorname ?? '')
  const [nachname, setNachname] = useState(profile.nachname ?? '')
  const [email, setEmail] = useState(profile.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName || !trimmedEmail) {
      setError('Name und E-Mail sind erforderlich.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await adminUpdateUser({
        userId: profile.id,
        name: trimmedName,
        vorname: vorname.trim() || undefined,
        nachname: nachname.trim() || undefined,
        email: trimmedEmail,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Benutzer bearbeiten" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="edit-user-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="edit-user-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="edit-user-vorname" className="mb-1 block text-sm font-medium text-slate-700">
              Vorname
            </label>
            <input
              id="edit-user-vorname"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="edit-user-nachname" className="mb-1 block text-sm font-medium text-slate-700">
              Nachname
            </label>
            <input
              id="edit-user-nachname"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-400">
          Optional – wird für die Personalisierung von E-Mails genutzt (Variablen {'{{Vorname}}'}/{'{{Nachname}}'}).
        </p>

        <div>
          <label htmlFor="edit-user-email" className="mb-1 block text-sm font-medium text-slate-700">
            E-Mail
          </label>
          <input
            id="edit-user-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Ändert auch die Login-Adresse – der Benutzer meldet sich künftig mit dieser E-Mail an.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import { useState, type FormEvent } from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { addInstance, activateInstance, type SavedInstance } from '../lib/instanceStore'

interface AddInstanceDialogProps {
  onClose: () => void
  onConnected: (instance: SavedInstance) => void
}

/**
 * Domain-Eingabe -> instance-info.json abrufen/validieren -> aufgelöste
 * supabase_url sichtbar bestätigen lassen, bevor die Instanz aktiv wird
 * (siehe docs/mobile-app.md, "instance-info.json-Validierung" – bewusste
 * Transparenz-Maßnahme, kein stiller Trust-Sprung auf eine fremde Domain).
 */
export function AddInstanceDialog({ onClose, onConnected }: AddInstanceDialogProps) {
  const [url, setUrl] = useState('')
  const [pendingInstance, setPendingInstance] = useState<SavedInstance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await addInstance(url)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPendingInstance(result.instance)
  }

  async function handleConnect() {
    if (!pendingInstance) return
    setSubmitting(true)
    const activated = await activateInstance(pendingInstance.id)
    setSubmitting(false)
    if (activated) onConnected(activated)
  }

  if (pendingInstance) {
    return (
      <Modal title="Instanz gefunden" onClose={onClose}>
        <div className="space-y-4">
          <dl className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{pendingInstance.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Adresse</dt>
              <dd className="font-medium text-slate-900">{pendingInstance.url}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Backend (Supabase-Projekt)</dt>
              <dd className="font-medium text-slate-900 break-all">{pendingInstance.supabaseUrl}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            Prüfe, ob dir diese Adressen bekannt vorkommen, bevor du dich mit deinen Zugangsdaten anmeldest.
          </p>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="button" className="flex-1" disabled={submitting} onClick={handleConnect}>
              {submitting ? 'Verbinde...' : 'Verbinden'}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Instanz hinzufügen" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleLookup}>
        <div>
          <label htmlFor="instance-url" className="mb-1 block text-sm font-medium text-slate-700">
            Adresse der Instanz
          </label>
          <input
            id="instance-url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://gewinnauswertung.magicprus.de"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Suche...' : 'Weiter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

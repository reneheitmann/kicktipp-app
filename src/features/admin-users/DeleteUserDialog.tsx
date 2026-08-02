import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Profile } from '../../types/database'

interface DeleteUserDialogProps {
  profile: Profile
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteUserDialog({ profile, onClose, onConfirm }: DeleteUserDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canDelete = confirmText.trim() === profile.name

  async function handleDelete() {
    if (!canDelete) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Benutzer endgültig löschen" onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Damit werden Sitzungen, Passwort-Historie und die Verknüpfung mit Spielern dieses Kontos unwiderruflich
          gelöscht. Verknüpfte Spieler selbst bleiben bestehen (nur die Login-Verknüpfung verschwindet). Das kann
          nicht rückgängig gemacht werden.
        </p>
        <div>
          <label htmlFor="confirm-user-name" className="mb-1 block text-sm font-medium text-slate-700">
            Gib zur Bestätigung den Namen „{profile.name}" ein
          </label>
          <input
            id="confirm-user-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" variant="danger" className="flex-1" disabled={!canDelete || submitting} onClick={handleDelete}>
            {submitting ? 'Löschen...' : 'Endgültig löschen'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

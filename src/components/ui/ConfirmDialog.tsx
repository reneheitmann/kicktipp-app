import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Bestätigungsdialog im App-Look statt des nativen window.confirm() – für
 *  Aktionen, die zwar nicht so schwerwiegend wie ein Saison-Löschen sind
 *  (siehe DeleteSeasonDialog, mit Tipp-Bestätigung), aber trotzdem eine
 *  bewusste Bestätigung statt der reflexartig weggeklickten Browser-Leiste
 *  verdienen. */
export function ConfirmDialog({ title, message, confirmLabel = 'Bestätigen', danger, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">{message}</p>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

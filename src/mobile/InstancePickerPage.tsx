import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AddInstanceDialog } from './AddInstanceDialog'
import { listInstances, removeInstance, type SavedInstance } from '../lib/instanceStore'

/** mobile only: "Instanz wählen" – siehe docs/mobile-app.md, Phase 3. */
export function InstancePickerPage({ onConnected }: { onConnected: (instance: SavedInstance) => void }) {
  const [instances, setInstances] = useState<SavedInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [removingInstance, setRemovingInstance] = useState<SavedInstance | null>(null)

  async function reload() {
    setInstances(await listInstances())
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function confirmRemove() {
    if (!removingInstance) return
    await removeInstance(removingInstance.id)
    await reload()
  }

  return (
    <div className="flex min-h-full flex-col p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Instanz wählen</h1>
      <p className="mb-6 text-sm text-slate-500">
        Wähle eine gespeicherte Instanz oder füge eine neue hinzu – jede Instanz ist eine eigenständige
        Kicktipp-Auswertung mit eigenen Daten.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : instances.length === 0 ? (
        <p className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Noch keine Instanz gespeichert.
        </p>
      ) : (
        <ul className="mb-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {instances.map((instance) => (
            <li key={instance.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => onConnected(instance)}
                className="min-w-0 flex-1 text-left hover:underline"
              >
                <p className="truncate font-medium text-slate-900">{instance.name}</p>
                <p className="truncate text-sm text-slate-500">{instance.url}</p>
              </button>
              <Button variant="danger" onClick={() => setRemovingInstance(instance)}>
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={() => setShowAddDialog(true)}>+ Instanz hinzufügen</Button>

      {showAddDialog && (
        <AddInstanceDialog
          onClose={() => setShowAddDialog(false)}
          onConnected={(instance) => {
            setShowAddDialog(false)
            onConnected(instance)
          }}
        />
      )}

      {removingInstance && (
        <ConfirmDialog
          title="Instanz entfernen?"
          message={`"${removingInstance.name}" (${removingInstance.url}) wird entfernt, inklusive der gespeicherten Zugangsdaten auf diesem Gerät.`}
          confirmLabel="Entfernen"
          danger
          onConfirm={confirmRemove}
          onClose={() => setRemovingInstance(null)}
        />
      )}
    </div>
  )
}

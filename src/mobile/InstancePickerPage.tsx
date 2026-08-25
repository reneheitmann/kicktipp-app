import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AddInstanceDialog } from './AddInstanceDialog'
import { activateInstance, listInstances, removeInstance, type SavedInstance } from '../lib/instanceStore'

/** mobile only: "Spielrunde wählen" – siehe docs/mobile-app.md, Phase 3. */
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

  async function connectTo(instance: SavedInstance) {
    const activated = await activateInstance(instance.id)
    if (activated) onConnected(activated)
  }

  return (
    <div
      className="flex min-h-full flex-col p-4 sm:p-6"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Spielrunde wählen</h1>
      <p className="mb-6 text-sm text-slate-500">
        Wähle eine gespeicherte Spielrunde oder füge eine neue hinzu – jede Spielrunde ist eine eigenständige
        Kicktipp-Auswertung mit eigenen Daten.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : instances.length === 0 ? (
        <p className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Noch keine Spielrunde gespeichert.
        </p>
      ) : (
        <ul className="mb-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {instances.map((instance) => (
            <li key={instance.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => connectTo(instance)}
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

      <Button onClick={() => setShowAddDialog(true)}>+ Spielrunde hinzufügen</Button>

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
          title="Spielrunde entfernen?"
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

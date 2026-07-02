import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/SearchInput'
import { PlayerForm } from './PlayerForm'
import { createPlayer, deletePlayer, listPlayers, updatePlayer } from './playersApi'
import type { Player } from '../../types/database'

export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  async function reload() {
    setLoading(true)
    try {
      setPlayers(await listPlayers())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spieler konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  function openCreate() {
    setEditingPlayer(undefined)
    setShowForm(true)
  }

  function openEdit(player: Player) {
    setEditingPlayer(player)
    setShowForm(true)
  }

  async function handleDelete(player: Player) {
    if (!confirm(`Spieler "${player.name}" wirklich löschen?`)) return
    try {
      await deletePlayer(player.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    }
  }

  const filteredPlayers = players.filter((player) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return player.name.toLowerCase().includes(term) || (player.kicktipp_name ?? '').toLowerCase().includes(term)
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Spieler</h1>
        <Button onClick={openCreate}>+ Spieler</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Spieler suchen..." className="mb-4 max-w-xs" />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : filteredPlayers.length === 0 ? (
        <p className="text-sm text-slate-500">
          {players.length === 0 ? 'Noch keine Spieler angelegt.' : 'Keine Treffer für die Suche.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredPlayers.map((player) => (
            <li key={player.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to={`/players/${player.id}`} className="min-w-0 hover:underline">
                <p className="truncate font-medium text-slate-900">{player.name}</p>
                <p className="truncate text-sm text-slate-500">
                  Kicktipp: {player.kicktipp_name || '—'}
                </p>
              </Link>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openEdit(player)}>
                  Bearbeiten
                </Button>
                <Button variant="danger" onClick={() => handleDelete(player)}>
                  Löschen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <PlayerForm
          player={editingPlayer}
          existingPlayers={players}
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            if (editingPlayer) {
              await updatePlayer(editingPlayer.id, input)
            } else {
              await createPlayer(input)
            }
            await reload()
          }}
        />
      )}
    </div>
  )
}

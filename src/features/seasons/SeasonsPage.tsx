import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../auth/useAuth'
import { SeasonForm } from './SeasonForm'
import { createSeason, listSeasons } from './seasonsApi'
import type { Season } from '../../types/database'

export function SeasonsPage() {
  const { profile } = useAuth()
  const canManage = profile?.role === 'admin' || profile?.role === 'spielleiter'

  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      setSeasons(await listSeasons())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saisons konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Saisons</h1>
        {canManage && <Button onClick={() => setShowForm(true)}>+ Saison</Button>}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : seasons.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Saisons angelegt.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {seasons.map((season) => (
            <li key={season.id}>
              <Link
                to={`/seasons/${season.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{season.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {season.start_date} – {season.end_date}
                  </p>
                </div>
                <Badge tone={season.status === 'aktiv' ? 'positive' : 'neutral'}>{season.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <SeasonForm
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await createSeason(input)
            await reload()
          }}
        />
      )}
    </div>
  )
}

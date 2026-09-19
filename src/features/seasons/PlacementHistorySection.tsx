import { useEffect, useRef, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CollapsibleSection } from '../../components/ui/CollapsibleSection'
import { SearchInput } from '../../components/ui/SearchInput'
import { useAuth } from '../auth/useAuth'
import { updateFavoritePlacementPlayers } from '../auth/myAccountApi'
import type { Matchday, MatchdayRanking, Player } from '../../types/database'

// Gleiche Palette wie SeasonComparisonPage.tsx – bewusst lokal dupliziert
// statt in ein gemeinsames Modul extrahiert, für zwei Vorkommen eines
// Acht-Farben-Arrays keine Indirektion wert.
const lineColors = ['#0f172a', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d']

// Gleiche Logik wie SeasonComparisonPage.tsx – für eine Zweizeilen-Funktion
// keine Indirektion wert.
function matchesSearch(player: Player, term: string): boolean {
  if (!term) return true
  return player.name.toLowerCase().includes(term) || (player.kicktipp_name ?? '').toLowerCase().includes(term)
}

interface PlacementHistorySectionProps {
  matchdays: Matchday[]
  matchdayRankings: MatchdayRanking[]
  /** Eigene, mit dem Login verknüpfte Spieler dieser Saison (siehe
   *  SeasonDetailPage.tsx) – immer angezeigt, nicht abwählbar. */
  ownPlayers: Player[]
  /** Übrige Teilnehmer dieser Saison (ohne eigene Spieler) – Kandidaten für
   *  die optionale, speicherbare Zusatzauswahl unten. */
  otherPlayers: Player[]
}

/** Platzierungsverlauf der eigenen, mit dem Login verknüpften Spieler über
 *  die abgerechneten Spieltage dieser Saison (Wochenform, nicht die
 *  kumulierte Gesamtwertungs-Position) – optional ergänzt um selbst
 *  ausgewählte weitere Teilnehmer dieser Saison, deren Auswahl sich am
 *  eigenen Profil speichern lässt (0076_favorite_placement_players.sql). */
export function PlacementHistorySection({ matchdays, matchdayRankings, ownPlayers, otherPlayers }: PlacementHistorySectionProps) {
  const { profile, refreshProfile } = useAuth()
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set())
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // Panel ist standardmäßig komplett unsichtbar (kein Block, keine Titelzeile)
  // - nur der Knopf in der Chart-Ecke schaltet es sichtbar/unsichtbar.
  const [showPicker, setShowPicker] = useState(false)
  const saveInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Vorauswahl beim ersten Laden: ausschließlich die selbst gespeicherten
  // Favoriten, geschnitten mit den tatsächlichen Teilnehmern dieser Saison -
  // ein gespeicherter Spieler, der die Saison inzwischen verlassen hat,
  // erscheint dadurch automatisch nicht mehr.
  useEffect(() => {
    if (otherPlayers.length === 0 || selectedExtraIds.size > 0 || !profile) return
    const favoriteIds = new Set(profile.favorite_placement_player_ids)
    const favorites = otherPlayers.filter((p) => favoriteIds.has(p.id))
    if (favorites.length > 0) setSelectedExtraIds(new Set(favorites.map((p) => p.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherPlayers, profile])

  useEffect(
    () => () => {
      if (saveInfoTimeoutRef.current) clearTimeout(saveInfoTimeoutRef.current)
    },
    [],
  )

  function toggleExtra(playerId: string) {
    setSelectedExtraIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  async function handleSaveFavorites() {
    if (!profile) return
    try {
      await updateFavoritePlacementPlayers(profile.id, [...selectedExtraIds])
      await refreshProfile()
      setSaveInfo('Gespeichert.')
    } catch {
      // ponytail: kein eigener Fehlerkanal, saveInfo trägt auch die
      // Fehlermeldung – Speichern schlägt praktisch nur bei Netzwerkausfall fehl.
      setSaveInfo('Fehler beim Speichern.')
    } finally {
      if (saveInfoTimeoutRef.current) clearTimeout(saveInfoTimeoutRef.current)
      saveInfoTimeoutRef.current = setTimeout(() => setSaveInfo(null), 2000)
    }
  }

  const chartPlayers = [...ownPlayers, ...otherPlayers.filter((p) => selectedExtraIds.has(p.id))]
  // Nur die angezeigte Liste filtern - eine bereits ausgewählte, aber gerade
  // weggefilterte Person bleibt ausgewählt (chartPlayers oben hängt an der
  // ungefilterten otherPlayers), verschwindet also nicht heimlich aus dem Chart.
  const filteredOtherPlayers = otherPlayers.filter((p) => matchesSearch(p, search.trim().toLowerCase()))

  const sortedMatchdays = [...matchdays]
    .filter((m) => m.status === 'abgerechnet')
    .sort((a, b) => a.nummer - b.nummer)

  const chartData = sortedMatchdays.map((m) => {
    const row: Record<string, number | string> = { name: `Spieltag ${m.nummer}` }
    for (const player of chartPlayers) {
      const ranking = matchdayRankings.find((r) => r.matchday_id === m.id && r.player_id === player.id)
      // Bewusst kein Default auf 0 – 0 wäre kein gültiger Platz und würde
      // fälschlich ganz oben in der (umgekehrten) Y-Achse erscheinen.
      // Fehlt der Wert, überspringt connectNulls unten die Lücke.
      if (ranking) row[player.name] = ranking.rang
    }
    return row
  })

  return (
    <CollapsibleSection title="Platzierungsverlauf">
      <p className="mb-3 text-sm text-slate-500">
        Zeigt die Platzierung je abgerechnetem Spieltag für deine verknüpften Spieler dieser Saison – optional
        ergänzt um weitere selbst ausgewählte Teilnehmer.
      </p>
      <div className="relative mb-3 h-72 w-full rounded-xl border border-slate-200 bg-white p-4">
        {otherPlayers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker((prev) => !prev)}
            className="absolute bottom-1 right-1 z-10 rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px] font-medium leading-none text-slate-700 hover:bg-slate-50"
          >
            Spieler ergänzen{selectedExtraIds.size > 0 && ` (${selectedExtraIds.size})`}
          </button>
        )}
        {sortedMatchdays.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Noch keine abgerechneten Spieltage.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis reversed allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `Platz ${value}`} />
              <Legend />
              {chartPlayers.map((player, i) => (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={player.name}
                  stroke={lineColors[i % lineColors.length]}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {showPicker && otherPlayers.length > 0 && (
        <div className="mb-3 w-full rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Weitere Teilnehmer ({selectedExtraIds.size} ausgewählt)</p>
            <div className="flex shrink-0 items-center gap-2">
              {saveInfo && <span className="text-xs text-emerald-700">{saveInfo}</span>}
              <button
                type="button"
                onClick={handleSaveFavorites}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Als Standard speichern
              </button>
            </div>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Name oder Kicktipp-Name suchen..." className="mb-2" />
          <div className="max-h-64 overflow-y-auto">
            {filteredOtherPlayers.length === 0 ? (
              <p className="px-1 py-2 text-sm text-slate-500">Keine Treffer.</p>
            ) : (
              filteredOtherPlayers.map((player) => (
                <label key={player.id} className="flex items-center gap-2 px-1 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedExtraIds.has(player.id)}
                    onChange={() => toggleExtra(player.id)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {player.name}
                    {player.kicktipp_name && <span className="text-slate-400"> · {player.kicktipp_name}</span>}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}

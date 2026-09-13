import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CollapsibleSection } from '../../components/ui/CollapsibleSection'
import type { Matchday, MatchdayRanking, Player } from '../../types/database'

// Gleiche Palette wie SeasonComparisonPage.tsx – bewusst lokal dupliziert
// statt in ein gemeinsames Modul extrahiert, für zwei Vorkommen eines
// Acht-Farben-Arrays keine Indirektion wert.
const lineColors = ['#0f172a', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d']

interface PlacementHistorySectionProps {
  matchdays: Matchday[]
  matchdayRankings: MatchdayRanking[]
  /** Bereits vom Aufrufer auf "Teilnehmer dieser Saison UND mit dem eigenen
   *  Login verknüpft" gefiltert (siehe SeasonDetailPage.tsx) – diese
   *  Komponente übernimmt nur noch die Darstellung. */
  ownPlayers: Player[]
}

/** Platzierungsverlauf der eigenen, mit dem Login verknüpften Spieler über
 *  die abgerechneten Spieltage dieser Saison (Wochenform, nicht die
 *  kumulierte Gesamtwertungs-Position). */
export function PlacementHistorySection({ matchdays, matchdayRankings, ownPlayers }: PlacementHistorySectionProps) {
  const sortedMatchdays = [...matchdays]
    .filter((m) => m.status === 'abgerechnet')
    .sort((a, b) => a.nummer - b.nummer)

  const chartData = sortedMatchdays.map((m) => {
    const row: Record<string, number | string> = { name: `Spieltag ${m.nummer}` }
    for (const player of ownPlayers) {
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
        Zeigt die Platzierung je abgerechnetem Spieltag für deine verknüpften Spieler dieser Saison.
      </p>
      <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-4">
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
              {ownPlayers.map((player, i) => (
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
    </CollapsibleSection>
  )
}

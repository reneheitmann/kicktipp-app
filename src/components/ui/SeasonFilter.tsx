import type { Season } from '../../types/database'

interface SeasonFilterProps {
  seasons: Season[]
  value: string
  onChange: (seasonId: string) => void
}

/** Saison-Filter: leerer Wert = "Alle Saisons" (Aggregat über alle Saisons). */
export function SeasonFilter({ seasons, value, onChange }: SeasonFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
    >
      <option value="">Alle Saisons</option>
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}

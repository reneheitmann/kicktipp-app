interface SortableThProps {
  columnKey: string
  label: string
  activeKey: string
  direction: 'asc' | 'desc'
  onSort: (key: string) => void
  align?: 'left' | 'right'
}

/** Sortierbare, beim Scrollen fixierte Tabellen-Kopfzelle (siehe SeasonBalancesPage/SeasonComparisonPage). */
export function SortableTh({ columnKey, label, activeKey, direction, onSort, align = 'left' }: SortableThProps) {
  const active = activeKey === columnKey
  return (
    <th className={`sticky top-0 z-10 bg-white px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-slate-900' : ''} ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        {label}
        <span className="w-3 text-xs text-slate-400">{active ? (direction === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )
}

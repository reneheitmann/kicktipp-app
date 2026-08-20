interface SortableThProps {
  columnKey: string
  label: string
  activeKey: string
  direction: 'asc' | 'desc'
  onSort: (key: string) => void
  align?: 'left' | 'right'
  /** Zusätzliche Klassen für die <th> selbst, z. B. "w-px whitespace-nowrap"
   *  um eine Spalte auf ihren Inhalt statt auf die Tabellenbreite zu schrumpfen. */
  className?: string
}

/**
 * Sortierbare Tabellen-Kopfzelle. Die Fixierung beim Scrollen übernimmt der
 * umgebende StickyTableScroll-Container (per JS, nicht CSS `sticky` – siehe
 * dort), diese Zelle braucht dafür nur noch einen eigenen Hintergrund, damit
 * durchscrollende Zeilen nicht durchscheinen.
 */
export function SortableTh({ columnKey, label, activeKey, direction, onSort, align = 'left', className = '' }: SortableThProps) {
  const active = activeKey === columnKey
  return (
    <th
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`bg-white px-2 py-2 text-xs font-medium sm:px-4 sm:py-3 sm:text-sm ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-slate-900' : ''} ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        {label}
        <span className="w-3 text-xs text-slate-500">{active ? (direction === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )
}

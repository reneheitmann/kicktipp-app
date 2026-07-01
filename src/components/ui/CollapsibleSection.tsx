import { useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  /** Optionale Anzahl neben dem Titel (z. B. Teilnehmerzahl), auch im eingeklappten Zustand sichtbar. */
  count?: number
  /** Buttons/Filter neben dem Titel – bleiben unabhängig vom Auf-/Zuklappen sichtbar und bedienbar. */
  actions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/** Auf-/zuklappbarer Abschnitt für die Saison-Detail-Seite, damit die Übersicht bei vielen Teilnehmern/Spieltagen nicht überladen wirkt. */
export function CollapsibleSection({ title, count, actions, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-base font-semibold text-slate-900"
        >
          <span className={`inline-block text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          {title}
          {count !== undefined && <span className="font-normal text-slate-400">({count})</span>}
        </button>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {open && children}
    </div>
  )
}

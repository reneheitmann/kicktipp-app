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

const STORAGE_PREFIX = 'kicktipp_collapsible_open_'

// Global statt pro Saison gemerkt (Storage-Key hängt nur am Titel, nicht an
// einer Saison-ID) – die Auf-/Zuklapp-Präferenz ("ich will Gewinnverteilung
// nie sofort sehen") ist eine persönliche Vorliebe, keine saisonspezifische
// Einstellung.
function getStoredOpen(title: string, defaultOpen: boolean): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + title)
    return stored === null ? defaultOpen : stored === 'true'
  } catch {
    return defaultOpen
  }
}

/** Auf-/zuklappbarer Abschnitt für die Saison-Detail-Seite, damit die Übersicht bei vielen Teilnehmern/Spieltagen nicht überladen wirkt. */
export function CollapsibleSection({ title, count, actions, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => getStoredOpen(title, defaultOpen))

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_PREFIX + title, String(next))
      } catch {
        // z. B. privates Fenster ohne Storage-Zugriff – Zustand bleibt dann
        // nur für die aktuelle Sitzung erhalten, kein Absturz nötig.
      }
      return next
    })
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
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

import { useEffect, useRef, type ReactNode } from 'react'

interface StickyTableScrollProps {
  /** Klassen für den scrollenden Innen-Container (z. B. max-h/overflow/scroll-fade-x). */
  className?: string
  children: ReactNode
}

/**
 * Scroll-Container für Tabellen mit eigenem vertikalem Scroll-Fenster
 * (max-h + overflow-auto). Pinnt die <thead> beim Scrollen manuell per
 * position:fixed statt CSS `position: sticky` – sticky ist innerhalb eines
 * Scroll-Containers, der selbst im scrollenden <main> verschachtelt liegt,
 * auf iOS Safari nachweislich unzuverlässig (isoliert per Playwright
 * reproduziert: schon einfaches overflow-x:auto auf einem Vorfahren
 * verhindert, dass sticky sich an einen weiter außen liegenden
 * Scroll-Container bindet – unabhängig von border-radius).
 *
 * Der äußere Wrapper bekommt `transform` + `overflow-hidden`, damit
 * `position: fixed` sich relativ zu IHM statt zum Viewport verhält
 * (Standard-Technik, um fixed-Elemente an einen Container zu binden und am
 * Rand abzuschneiden) – dadurch bleibt die Kopfzeile beim Scrollen der
 * Seite automatisch korrekt positioniert, ganz ohne eigene
 * Vertikal-Berechnung im Scroll-Handler.
 */
export function StickyTableScroll({ className = '', children }: StickyTableScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const thead = container?.querySelector('thead')
    const table = container?.querySelector('table')
    if (!container || !(thead instanceof HTMLElement) || !table) return

    function update() {
      if (!container || !(thead instanceof HTMLElement) || !table) return
      const pinned = container.scrollTop > 0
      if (pinned) {
        thead.style.position = 'fixed'
        thead.style.top = '0px'
        thead.style.left = '0px'
        thead.style.width = `${table.offsetWidth}px`
        thead.style.transform = `translateX(${-container.scrollLeft}px)`
        thead.style.zIndex = '10'
      } else {
        thead.style.position = ''
        thead.style.top = ''
        thead.style.left = ''
        thead.style.width = ''
        thead.style.transform = ''
        thead.style.zIndex = ''
      }
    }

    update()
    container.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white [transform:translateZ(0)]">
      <div ref={containerRef} className={className}>
        {children}
      </div>
    </div>
  )
}

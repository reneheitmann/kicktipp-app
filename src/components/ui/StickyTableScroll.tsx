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
 * `position: fixed` "blockifiziert" laut CSS-Spec ein Element mit
 * `display: table-header-group` (das <thead>) zu `display: block` – dadurch
 * fällt die Kopfzeile aus dem Tabellen-Spaltenlayout und verliert die
 * Breiten-Synchronisation mit <tbody> (sichtbar als "kaputter" Tabellenkopf
 * beim Scrollen). Fix: die Spaltenbreiten der <th> einmalig messen, SOLANGE
 * <thead> noch normal im Tabellenlayout steht (also vor dem Pinnen), und
 * beim Pinnen selbst <thead>/<tr> auf block/flex umstellen und jedem <th>
 * die gemessene Breite explizit als Pixelwert mitgeben – das rekonstruiert
 * die Kopfzeile als eigenständige, breiten-exakte Zeile statt sich auf die
 * (durch die Blockifizierung ohnehin gebrochene) Tabellen-Spaltensync zu
 * verlassen.
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

    let cachedThWidths: number[] | null = null

    function pin() {
      if (!container || !(thead instanceof HTMLElement) || !table) return
      const ths = [...thead.querySelectorAll('th')]
      if (!cachedThWidths) {
        cachedThWidths = ths.map((th) => th.getBoundingClientRect().width)
      }
      thead.style.position = 'fixed'
      thead.style.top = '0px'
      thead.style.left = '0px'
      thead.style.width = `${table.offsetWidth}px`
      thead.style.transform = `translateX(${-container.scrollLeft}px)`
      thead.style.zIndex = '10'
      thead.style.display = 'block'
      const tr = thead.querySelector('tr')
      if (tr instanceof HTMLElement) tr.style.display = 'flex'
      ths.forEach((th, i) => {
        th.style.display = 'block'
        th.style.flex = 'none'
        th.style.boxSizing = 'border-box'
        th.style.width = `${cachedThWidths?.[i] ?? 0}px`
      })
    }

    function unpin() {
      if (!(thead instanceof HTMLElement)) return
      cachedThWidths = null
      thead.style.position = ''
      thead.style.top = ''
      thead.style.left = ''
      thead.style.width = ''
      thead.style.transform = ''
      thead.style.zIndex = ''
      thead.style.display = ''
      const tr = thead.querySelector('tr')
      if (tr instanceof HTMLElement) tr.style.display = ''
      thead.querySelectorAll('th').forEach((th) => {
        if (!(th instanceof HTMLElement)) return
        th.style.display = ''
        th.style.flex = ''
        th.style.boxSizing = ''
        th.style.width = ''
      })
    }

    function update() {
      if (!container) return
      if (container.scrollTop > 0) pin()
      else unpin()
    }

    function handleResize() {
      // Erst unpin() (setzt <thead> zurück ins normale Tabellenlayout UND
      // verwirft den Breiten-Cache), damit ein direkt folgendes erneutes
      // Pinnen die <th>-Breiten frisch aus dem echten (durch den Resize
      // ggf. veränderten) Tabellenlayout misst, statt versehentlich die
      // bereits fixierten/blockifizierten (und damit falschen) Breiten
      // der vorherigen Pinnung zu übernehmen.
      unpin()
      update()
    }

    update()
    container.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', handleResize)
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

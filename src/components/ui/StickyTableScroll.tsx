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
 * fällt die Kopfzeile aus dem Tabellen-Spaltenlayout. Zwei Ansätze wurden
 * live gegen Dev verifiziert und verworfen, bevor die jetzige Lösung
 * stand hielt:
 *
 * 1. Nur <th>-Breiten einmalig cachen und beim Pinnen aufprägen: <tbody>
 *    berechnet seine Spaltenbreiten nach Entfernen des <thead> aus dem
 *    Tabellen-Layout eigenständig neu (table-layout: auto, der Default) -
 *    bei Spalten, deren Kopfzeilen-Text breiter ist als der Zelleninhalt
 *    (z. B. "Beiträge gesamt" vs. "148,00 €"), schrumpft <tbody> dadurch
 *    schmaler als die weiterhin auf dem alten Wert stehende Kopfzelle.
 * 2. table-layout: fixed + Breiten zusätzlich auf die ERSTE <tbody>-Zeile
 *    schreiben (die laut Spec bei table-layout:fixed die Spaltenbreiten
 *    aller Zeilen bestimmt, sobald <thead> nicht mehr teilnimmt): schlägt
 *    fehl, sobald sich die Zeilenreihenfolge NACH dem Locking noch ändert
 *    (hier: Zeilen werden zunächst in einer Reihenfolge gerendert, kurz
 *    danach sortiert <tbody> per asynchron nachgeladener Kontostand-Berechnung
 *    um - die ursprünglich "erste" Zeile ist dann nicht mehr an Position 1,
 *    eine ANDERE, nie mit Breite versehene Zeile rutscht nach - live via
 *    MutationObserver bestätigt).
 *
 * Fix: `<colgroup>` mit expliziten `<col style="width">` je Spalte, als
 * erstes Kind der <table> eingefügt (siehe lockColumnWidths()). Anders als
 * "erste-Zeile"-Breiten ist ein <colgroup> an die SPALTENPOSITION gebunden,
 * nicht an eine bestimmte Zeile/Identität - unempfindlich gegenüber Zeilen-
 * Umsortierung, -Einfügung oder -Löschung danach. `table-layout: fixed`
 * zusammen mit einem <colgroup> ist damit die verlässliche Kombination.
 * Das gepinnte (blockifizierte) <thead> selbst nimmt am Tabellen-Layout
 * nicht mehr teil und wird vom <colgroup> daher NICHT erfasst - seine
 * <th>-Zellen bekommen deshalb zusätzlich beim Pinnen dieselben Breiten
 * direkt als Inline-Style aufgeprägt (siehe pin()).
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
    if (!container || !(thead instanceof HTMLElement) || !(table instanceof HTMLTableElement)) return

    let columnWidths: number[] = []

    // Misst die aktuell vom Browser berechneten (aus Kopf- UND Zelleninhalt
    // kombiniert ermittelten) Spaltenbreiten und schreibt sie als <colgroup>
    // fest - spaltenpositions-, nicht zeilenbasiert, siehe Kommentar oben.
    // Muss vor dem Messen die alte Sperre (colgroup + table-layout)
    // entfernen, sonst würde eine bereits gesperrte Vorbreite die
    // Neuberechnung verfälschen (relevant bei erneutem Aufruf durch
    // handleResize()).
    function lockColumnWidths() {
      if (!(thead instanceof HTMLElement) || !(table instanceof HTMLTableElement)) return
      table.querySelectorAll(':scope > colgroup[data-sticky-widths]').forEach((el) => el.remove())
      table.style.tableLayout = 'auto'
      const ths = [...thead.querySelectorAll('th')]
      columnWidths = ths.map((th) => th.getBoundingClientRect().width)

      const colgroup = document.createElement('colgroup')
      colgroup.setAttribute('data-sticky-widths', '')
      for (const width of columnWidths) {
        const col = document.createElement('col')
        col.style.width = `${width}px`
        colgroup.appendChild(col)
      }
      table.insertBefore(colgroup, table.firstChild)
      table.style.tableLayout = 'fixed'
    }

    function pin() {
      if (!container || !(thead instanceof HTMLElement) || !table) return
      thead.style.position = 'fixed'
      thead.style.top = '0px'
      thead.style.left = '0px'
      thead.style.width = `${table.offsetWidth}px`
      thead.style.transform = `translateX(${-container.scrollLeft}px)`
      thead.style.zIndex = '10'
      thead.style.display = 'block'
      const tr = thead.querySelector('tr')
      if (tr instanceof HTMLElement) tr.style.display = 'flex'
      // <colgroup> erfasst nur noch am Tabellen-Layout teilnehmende Zeilen -
      // das blockifizierte <thead> braucht seine Breiten deshalb direkt.
      thead.querySelectorAll('th').forEach((th, i) => {
        if (!(th instanceof HTMLElement)) return
        th.style.display = 'block'
        th.style.flex = 'none'
        th.style.boxSizing = 'border-box'
        th.style.width = `${columnWidths[i] ?? 0}px`
      })
    }

    function unpin() {
      if (!(thead instanceof HTMLElement)) return
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
      lockColumnWidths()
      update()
    }

    lockColumnWidths()
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

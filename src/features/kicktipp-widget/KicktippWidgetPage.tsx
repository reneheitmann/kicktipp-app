import { useEffect, useRef } from 'react'

// Offizielles Kicktipp-Einbindungs-Script (siehe
// https://www.kicktipp.de/magicprus/integration/beispiel) – bewusst per
// dynamisch erzeugtem <script>-Tag statt statisch in index.html, damit es
// nur auf dieser Route geladen wird. Das Script selbst nutzt kein
// document.write() (das würde beim dynamischen Nachladen die ganze Seite
// löschen), sondern findet sich über document.currentScript und fügt sein
// <iframe> per insertBefore direkt neben sich selbst ein – dadurch landet es
// zuverlässig innerhalb des hier per Ref kontrollierten Containers.
const KICKTIPP_WIDGET_SRC = 'https://www.kicktipp.de/magicprus/javascript'

export function KicktippWidgetPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const script = document.createElement('script')
    script.src = KICKTIPP_WIDGET_SRC
    script.async = true
    container.appendChild(script)
    return () => {
      container.innerHTML = ''
    }
  }, [])

  return <div ref={containerRef} />
}

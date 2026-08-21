import { useEffect, useId, useRef, type ReactNode } from 'react'

// Alle innerhalb des Modals per Tab erreichbaren Elemente – Grundlage für
// initialen Fokus und den Fokus-Trap unten. Keine neue Abhängigkeit nötig,
// deckt die in diesem Projekt tatsächlich vorkommenden Modal-Inhalte
// (Buttons, Links, Formularfelder) ab.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Fokus beim Öffnen auf das erste fokussierbare Element setzen (in der
  // bestehenden Struktur meist der Schließen-Button, da er vor den Kindern
  // im DOM steht) und beim Schließen zurück auf das Element, das das Modal
  // geöffnet hat – ohne das würde ein Tastatur-/Screenreader-Nutzer nach dem
  // Schließen wieder ganz oben in der Seite landen statt am Auslöser.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    focusable?.[0]?.focus()

    return () => {
      previouslyFocused?.focus()
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // Fokus-Trap: Tab/Shift+Tab am jeweiligen Rand der fokussierbaren
      // Elemente zum anderen Ende springen lassen, statt den Fokus aus dem
      // Modal in den (durch den Backdrop verdeckten) Rest der Seite
      // entkommen zu lassen.
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

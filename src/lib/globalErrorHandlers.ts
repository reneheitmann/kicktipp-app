import { logToServer, serializeError } from './logging'

// Einmalig beim App-Start registriert (siehe main.tsx). Fängt Fehler ab, die
// React nicht ohnehin schon über eine ErrorBoundary sieht – z. B. Fehler in
// Event-Handlern außerhalb von React oder unbehandelte Promise-Rejections
// (etwa ein vergessenes .catch() bei einem Supabase-Aufruf).
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    const { stack } = serializeError(event.error)
    logToServer('error', 'frontend', event.message || 'Unbehandelter Fehler', {
      stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const { message, stack } = serializeError(event.reason)
    logToServer('error', 'frontend', `Unhandled Promise Rejection: ${message}`, { stack })
  })
}

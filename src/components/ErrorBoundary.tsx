import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logToServer } from '../lib/logging'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Fängt Fehler beim Rendern ab, die sonst die komplette App auf eine leere
// weiße Seite abstürzen lassen würden (React entfernt bei einem Render-Fehler
// standardmäßig den gesamten betroffenen Teilbaum). Loggt den Fehler für den
// Admin und zeigt stattdessen einen freundlichen Hinweis mit Neuladen-Option.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logToServer('error', 'frontend-render', error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Etwas ist schiefgelaufen</h1>
          <p className="max-w-sm text-sm text-slate-500">
            Der Fehler wurde protokolliert. Bitte lade die Seite neu; falls das Problem bestehen bleibt, wende dich
            an den Administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            Seite neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

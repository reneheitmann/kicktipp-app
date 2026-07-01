import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Seite nicht gefunden</h1>
      <Link to="/" className="text-sm font-medium text-slate-900 underline">
        Zurück zur Übersicht
      </Link>
    </div>
  )
}

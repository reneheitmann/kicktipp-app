import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

// Kein echter Dead-End: unabhängig davon, wie ein User hier landet (fehlende
// Rolle/Rechte, oder – siehe Bug, der das hier ausgelöst hat – eine leere
// visibleNavItems-Liste durch eine fehlerhafte "Als Spieler anzeigen"-Vorschau
// –, muss immer ein Weg zurück ins eigene Profil bzw. zum Abmelden bleiben.
export function UnauthorizedPage() {
  const { profile, viewAsUser, setViewAsUser, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Kein Zugriff</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Du hast nicht die erforderliche Rolle, um diesen Bereich zu sehen.
      </p>

      {viewAsUser && (
        <button
          onClick={() => setViewAsUser(false)}
          className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
        >
          Vorschau „Als Spieler anzeigen" beenden
        </button>
      )}

      {profile && (
        <Link to="/profil" className="text-sm font-medium text-slate-900 underline">
          Mein Profil
        </Link>
      )}

      <button onClick={signOut} className="text-sm font-medium text-slate-500 hover:underline">
        Abmelden
      </button>
    </div>
  )
}

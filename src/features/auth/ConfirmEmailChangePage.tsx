import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppBranding } from '../app-settings/useAppBranding'
import { confirmEmailChange } from './myAccountApi'

// Öffentliche Route (kein ProtectedRoute), erreichbar über den Link aus der
// Bestätigungsmail von update-own-email – der Link kann auch in einem
// anderen Browser/Gerät als dem aktuell angemeldeten geöffnet werden.
export function ConfirmEmailChangePage() {
  const { appName } = useAppBranding()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link ist ungültig oder abgelaufen.')
      return
    }
    confirmEmailChange(token)
      .then((email) => {
        setStatus('success')
        setMessage(email)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Bestätigung fehlgeschlagen.')
      })
  }, [token])

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">{appName}</h1>

        {status === 'pending' && <p className="text-sm text-slate-500">Bestätige E-Mail-Adresse...</p>}

        {status === 'success' && (
          <>
            <p className="mb-4 text-sm text-emerald-700">
              Deine neue E-Mail-Adresse <strong>{message}</strong> wurde bestätigt und ist ab sofort dein Login.
            </p>
            <Link to="/login" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              Zur Anmeldung
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p role="alert" className="mb-4 text-sm text-red-600">
              {message}
            </p>
            <Link to="/profil" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              Zurück zum Profil
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

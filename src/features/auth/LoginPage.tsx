import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useAppBranding } from '../app-settings/useAppBranding'
import { visibleNavItems } from '../../components/layout/navItems'
import { requestPasswordReset } from './passwordResetApi'

export function LoginPage() {
  const { session, profile, loading, can, signIn } = useAuth()
  const { appName } = useAppBranding()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  if (session) {
    // Übersicht ("/") kann per page.dashboard.view für eine Rolle ausgeblendet
    // sein – ein blindes Redirect dorthin würde diese Rolle bei jedem Login
    // sofort auf /unauthorized umleiten. Stattdessen zum ersten für die Rolle
    // sichtbaren Menüpunkt navigieren (gleiche Reihenfolge wie im Menü selbst).
    if (loading || !profile) {
      return <div className="flex h-full items-center justify-center p-8 text-slate-500">Lade...</div>
    }
    const target = visibleNavItems(profile.role, can)[0]?.to ?? '/unauthorized'
    return <Navigate to={target} replace />
  }

  const disabledHint = (location.state as { reason?: string } | null)?.reason === 'disabled'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError('Anmeldung fehlgeschlagen. E-Mail oder Passwort prüfen.')
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault()
    setResetSubmitting(true)
    setResetError(null)
    try {
      await requestPasswordReset(resetEmail.trim())
      setResetSent(true)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen.')
    } finally {
      setResetSubmitting(false)
    }
  }

  function backToLogin() {
    setMode('login')
    setResetEmail('')
    setResetError(null)
    setResetSent(false)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">{appName}</h1>

        {mode === 'login' ? (
          <>
            <p className="mb-6 text-sm text-slate-500">Bitte melde dich mit deinen Zugangsdaten an.</p>

            {disabledHint && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Dein Konto wurde deaktiviert. Bitte wende dich an den Administrator.
              </p>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Passwort
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? 'Anmelden...' : 'Anmelden'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Noch kein Zugang? Wende dich an deinen Spielleiter oder Administrator.
            </p>
          </>
        ) : resetSent ? (
          <>
            <p className="mb-6 text-sm text-slate-500">
              Falls zu <span className="font-medium text-slate-700">{resetEmail}</span> ein Konto existiert, wurde
              soeben ein Link zum Zurücksetzen des Passworts verschickt. Bitte E-Mail-Postfach prüfen.
            </p>
            <button
              type="button"
              onClick={backToLogin}
              className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-base font-medium text-slate-900 transition hover:bg-slate-200"
            >
              Zurück zur Anmeldung
            </button>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-500">
              Gib deine E-Mail-Adresse ein – wir schicken dir einen Link zum Zurücksetzen des Passworts.
            </p>

            <form className="space-y-4" onSubmit={handleResetSubmit}>
              <div>
                <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-slate-700">
                  E-Mail
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                />
              </div>

              {resetError && <p className="text-sm text-red-600">{resetError}</p>}

              <button
                type="submit"
                disabled={resetSubmitting}
                className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50"
              >
                {resetSubmitting ? 'Senden...' : 'Reset-Link senden'}
              </button>
              <button
                type="button"
                onClick={backToLogin}
                className="w-full text-center text-sm font-medium text-slate-500 hover:underline"
              >
                Zurück zur Anmeldung
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

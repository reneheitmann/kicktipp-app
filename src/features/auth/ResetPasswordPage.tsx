import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from './useAuth'
import { useAppBranding } from '../app-settings/useAppBranding'
import { updateOwnPassword } from './myAccountApi'
import { getPasswordPolicy } from '../password-policy/passwordPolicyApi'
import { describePasswordPolicy, validatePasswordAgainstPolicy } from '../../lib/passwordValidation'
import type { PasswordPolicy } from '../../types/database'

// Wird von App.tsx unabhängig von der aktuellen Route angezeigt, sobald
// AuthProvider ein PASSWORD_RECOVERY-Event erkannt hat (Klick auf einen
// Passwort-Reset-Link, egal ob selbst oder vom Admin ausgelöst) – siehe
// AuthContext.ts für die Begründung, warum das nicht einfach direkt einloggt.
export function ResetPasswordPage() {
  const { clearPasswordRecovery } = useAuth()
  const { appName } = useAppBranding()
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getPasswordPolicy()
      .then(setPasswordPolicy)
      .catch(() => {
        // Serverseitig greift trotzdem der dortige Default – hier nur
        // relevant für die client-seitige Vorab-Prüfung/Anzeige.
      })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (passwordPolicy) {
      const policyError = validatePasswordAgainstPolicy(newPassword, passwordPolicy)
      if (policyError) {
        setError(policyError)
        return
      }
    }
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updateOwnPassword(newPassword)
      clearPasswordRecovery()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">{appName}</h1>
        <p className="mb-6 text-sm text-slate-500">Bitte lege ein neues Passwort für dein Konto fest.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reset-new-password" className="mb-1 block text-sm font-medium text-slate-700">
              Neues Passwort
            </label>
            <input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
            {passwordPolicy && <p className="mt-1 text-xs text-slate-500">{describePasswordPolicy(passwordPolicy)}</p>}
          </div>
          <div>
            <label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Neues Passwort bestätigen
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? 'Speichern...' : 'Passwort speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}

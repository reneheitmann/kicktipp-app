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
  const { clearPasswordRecovery, session, profile } = useAuth()
  const { appName } = useAppBranding()
  // Siehe passwordResetApi.ts: reason=invite unterscheidet "neues Konto
  // einladen" von "Passwort vergessen" – technisch derselbe Recovery-Link,
  // nur der Text auf dieser Seite unterscheidet sich.
  const isInvite = new URLSearchParams(window.location.search).get('reason') === 'invite'
  const accountEmail = session?.user.email
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

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
        <p className="mb-4 text-sm text-slate-500">
          {isInvite
            ? `Willkommen! Für dich wurde ein Konto angelegt. Lege jetzt ein Passwort fest, um dich zum ersten Mal anzumelden – ohne dieses Passwort kannst du dich nicht einloggen.`
            : `Lege ein neues Passwort fest, um dich wieder anmelden zu können – ohne dieses Passwort geht es nicht weiter.`}
        </p>

        {(profile?.name || accountEmail) && (
          <div className="mb-6 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            {profile?.name && <p className="font-medium text-slate-900">{profile.name}</p>}
            {accountEmail && <p className="text-slate-500">{accountEmail}</p>}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-slate-700">
                Neues Passwort
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="text-xs text-slate-500 hover:underline"
              >
                {showPasswords ? 'Verbergen' : 'Anzeigen'}
              </button>
            </div>
            <input
              id="reset-new-password"
              type={showPasswords ? 'text' : 'password'}
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
              type={showPasswords ? 'text' : 'password'}
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

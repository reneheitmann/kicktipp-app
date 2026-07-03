import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { generateRandomPassword } from '../../lib/randomPassword'
import { adminCreateUser } from './adminCreateUser'
import { requestPasswordReset } from '../auth/passwordResetApi'
import { getPasswordPolicy } from '../password-policy/passwordPolicyApi'
import { describePasswordPolicy, validatePasswordAgainstPolicy } from '../../lib/passwordValidation'
import type { PasswordPolicy, UserRole } from '../../types/database'

export function CreateUserForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [inviteByEmail, setInviteByEmail] = useState(false)
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getPasswordPolicy()
      .then(setPasswordPolicy)
      .catch(() => {
        // Ohne geladene Richtlinie greift serverseitig trotzdem der dortige
        // Default (siehe admin-create-user) – hier nur relevant für die
        // client-seitige Vorab-Prüfung/Anzeige.
      })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!inviteByEmail && passwordPolicy) {
      const policyError = validatePasswordAgainstPolicy(password, passwordPolicy)
      if (policyError) {
        setError(policyError)
        return
      }
    }
    setSubmitting(true)
    setError(null)
    try {
      const usedPassword = inviteByEmail ? generateRandomPassword() : password
      await adminCreateUser({
        name: name.trim(),
        vorname: vorname.trim() || undefined,
        nachname: nachname.trim() || undefined,
        email: email.trim(),
        password: usedPassword,
        role,
        isGeneratedPlaceholder: inviteByEmail,
      })
      if (inviteByEmail) {
        await requestPasswordReset(email.trim())
      }
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnte nicht angelegt werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Benutzer anlegen" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="user-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="user-vorname" className="mb-1 block text-sm font-medium text-slate-700">
              Vorname
            </label>
            <input
              id="user-vorname"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="user-nachname" className="mb-1 block text-sm font-medium text-slate-700">
              Nachname
            </label>
            <input
              id="user-nachname"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Optional – wird für die Personalisierung von E-Mails genutzt (Variablen {'{{Vorname}}'}/{'{{Nachname}}'}).
        </p>

        <div>
          <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-slate-700">
            E-Mail
          </label>
          <input
            id="user-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Passwort-Einrichtung</span>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="user-password-mode"
                checked={!inviteByEmail}
                onChange={() => setInviteByEmail(false)}
                className="mt-0.5 h-5 w-5"
              />
              Passwort selbst festlegen (kein E-Mail-Versand)
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="user-password-mode"
                checked={inviteByEmail}
                onChange={() => setInviteByEmail(true)}
                className="mt-0.5 h-5 w-5"
              />
              Per E-Mail einladen (Nutzer legt eigenes Passwort fest)
            </label>
          </div>
        </div>

        {!inviteByEmail && (
          <div>
            <label htmlFor="user-password" className="mb-1 block text-sm font-medium text-slate-700">
              Initiales Passwort
            </label>
            <input
              id="user-password"
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              {passwordPolicy
                ? describePasswordPolicy({ ...passwordPolicy, reuse_days: 0 })
                : 'Mind. 8 Zeichen.'}{' '}
              Der Nutzer sollte es nach dem ersten Login ändern.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-slate-700">
            Rolle
          </label>
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          >
            <option value="user">Spieler (User)</option>
            <option value="spielleiter">Spielleiter</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Anlegen...' : 'Anlegen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

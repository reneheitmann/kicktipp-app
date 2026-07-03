import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { getEmailSettings, saveEmailSettings, sendTestEmail } from './emailSettingsApi'
import type { SmtpEncryption } from '../../types/database'

const encryptionLabels: Record<SmtpEncryption, string> = {
  none: 'Keine',
  starttls: 'STARTTLS',
  tls: 'TLS (implizit)',
}

export function EmailSettingsPage() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [hasPassword, setHasPassword] = useState(false)
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [encryption, setEncryption] = useState<SmtpEncryption>('starttls')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<string | null>(null)

  useEffect(() => {
    getEmailSettings()
      .then((settings) => {
        if (settings) {
          setHost(settings.smtp_host)
          setPort(settings.smtp_port)
          setUsername(settings.smtp_username ?? '')
          setEncryption(settings.smtp_encryption)
          setSenderEmail(settings.sender_email)
          setSenderName(settings.sender_name ?? '')
          setHasPassword(settings.has_password)
        }
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await saveEmailSettings({
        smtp_host: host.trim(),
        smtp_port: port,
        smtp_username: username.trim() || null,
        smtp_password: password || undefined,
        smtp_encryption: encryption,
        sender_email: senderEmail.trim(),
        sender_name: senderName.trim() || null,
        updated_by: profile.id,
      })
      if (password) setHasPassword(true)
      setPassword('')
      setInfo('Einstellungen gespeichert.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) return
    setSendingTest(true)
    setTestError(null)
    setTestInfo(null)
    try {
      await sendTestEmail(testEmail.trim())
      setTestInfo(`Test-E-Mail an ${testEmail.trim()} gesendet.`)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test-E-Mail konnte nicht gesendet werden.')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">E-Mail-Versand</h1>

      <form className="mb-6 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="smtp-host" className="mb-1 block text-sm font-medium text-slate-700">
              SMTP-Host
            </label>
            <input
              id="smtp-host"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="smtp-port" className="mb-1 block text-sm font-medium text-slate-700">
              Port
            </label>
            <input
              id="smtp-port"
              type="number"
              required
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="smtp-encryption" className="mb-1 block text-sm font-medium text-slate-700">
            Verschlüsselung
          </label>
          <select
            id="smtp-encryption"
            value={encryption}
            onChange={(e) => setEncryption(e.target.value as SmtpEncryption)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none sm:w-64"
          >
            {Object.entries(encryptionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="smtp-username" className="mb-1 block text-sm font-medium text-slate-700">
              Benutzername
            </label>
            <input
              id="smtp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="smtp-password" className="mb-1 block text-sm font-medium text-slate-700">
              Passwort
            </label>
            <input
              id="smtp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasPassword ? '••••••••  (unverändert lassen = leer)' : ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sender-email" className="mb-1 block text-sm font-medium text-slate-700">
              Absender-E-Mail
            </label>
            <input
              id="sender-email"
              type="email"
              required
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="sender-name" className="mb-1 block text-sm font-medium text-slate-700">
              Absender-Name
            </label>
            <input
              id="sender-name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Kicktipp Spielrunde"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Speichert...' : 'Speichern'}
        </Button>
      </form>

      <div className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Test-E-Mail senden</h2>
        <p className="text-sm text-slate-500">Prüft die gespeicherte Konfiguration mit einer echten Test-E-Mail.</p>
        {testError && <p className="text-sm text-red-600">{testError}</p>}
        {testInfo && <p className="text-sm text-emerald-700">{testInfo}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="empfänger@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none sm:flex-1"
          />
          <Button variant="secondary" onClick={handleSendTest} disabled={sendingTest || !testEmail.trim()}>
            {sendingTest ? 'Sendet...' : 'Senden'}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../auth/useAuth'
import { getEmailSettings, saveEmailSettings, sendTestEmail } from './emailSettingsApi'
import type { EmailProvider, SmtpEncryption } from '../../types/database'

const encryptionLabels: Record<SmtpEncryption, string> = {
  none: 'Keine',
  starttls: 'STARTTLS',
  tls: 'TLS (implizit)',
}

const providerLabels: Record<EmailProvider, string> = {
  smtp: 'SMTP (eigener Mailserver)',
  brevo: 'Brevo (API)',
}

export function EmailSettingsPage() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState<EmailProvider>('smtp')
  const [hasPassword, setHasPassword] = useState(false)
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [encryption, setEncryption] = useState<SmtpEncryption>('starttls')
  const [hasBrevoApiKey, setHasBrevoApiKey] = useState(false)
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState<number | ''>('')
  const [imapSentFolder, setImapSentFolder] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [confirmingSave, setConfirmingSave] = useState(false)

  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<string | null>(null)

  useEffect(() => {
    getEmailSettings()
      .then((settings) => {
        if (settings) {
          setProvider(settings.provider)
          setHost(settings.smtp_host ?? '')
          setPort(settings.smtp_port ?? 587)
          setUsername(settings.smtp_username ?? '')
          setEncryption(settings.smtp_encryption)
          setHasBrevoApiKey(settings.has_brevo_api_key)
          setSenderEmail(settings.sender_email)
          setSenderName(settings.sender_name ?? '')
          setImapHost(settings.imap_host ?? '')
          setImapPort(settings.imap_port ?? '')
          setImapSentFolder(settings.imap_sent_folder ?? '')
          setHasPassword(settings.has_password)
        }
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setConfirmingSave(true)
  }

  async function confirmSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await saveEmailSettings({
        provider,
        smtp_host: provider === 'smtp' ? host.trim() : null,
        smtp_port: provider === 'smtp' ? port : null,
        smtp_username: username.trim() || null,
        smtp_password: password || undefined,
        smtp_encryption: encryption,
        brevo_api_key: brevoApiKey || undefined,
        sender_email: senderEmail.trim(),
        sender_name: senderName.trim() || null,
        imap_host: imapHost.trim() || null,
        imap_port: imapPort === '' ? null : imapPort,
        imap_sent_folder: imapSentFolder.trim() || null,
        updated_by: profile.id,
      })
      if (password) setHasPassword(true)
      if (brevoApiKey) setHasBrevoApiKey(true)
      setPassword('')
      setBrevoApiKey('')
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
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}

        <div>
          <label htmlFor="email-provider" className="mb-1 block text-sm font-medium text-slate-700">
            Versandart
          </label>
          <select
            id="email-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as EmailProvider)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none sm:w-64"
          >
            {Object.entries(providerLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {provider === 'smtp' && (
          <>
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
          </>
        )}

        {provider === 'brevo' && (
          <div>
            <label htmlFor="brevo-api-key" className="mb-1 block text-sm font-medium text-slate-700">
              Brevo-API-Key
            </label>
            <input
              id="brevo-api-key"
              type="password"
              required={!hasBrevoApiKey}
              value={brevoApiKey}
              onChange={(e) => setBrevoApiKey(e.target.value)}
              placeholder={hasBrevoApiKey ? '••••••••  (unverändert lassen = leer)' : ''}
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
        )}

        {provider === 'brevo' && (
          <p className="text-sm text-slate-500">
            Benutzername/Passwort werden bei Brevo nicht zum Versand benötigt, nur optional für die
            "Gesendet-Ordner"-Ablage weiter unten (IMAP-Login desselben Postfachs).
          </p>
        )}

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

        <div className="border-t border-slate-200 pt-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Kopie im Gesendet-Ordner ablegen (optional)</h2>
          <p className="mb-3 text-sm text-slate-500">
            Reiner SMTP-Versand legt selbst keine Kopie im Postfach ab. Trage hier die IMAP-Zugangsdaten desselben
            Postfachs ein (Benutzername/Passwort oben werden wiederverwendet), um versendete E-Mails zusätzlich im
            angegebenen Ordner abzulegen. Den exakten Ordnernamen findest du in deinem Mail-Programm (z. B. "Sent",
            "INBOX.Sent" oder "Gesendet"). Leer lassen deaktiviert die Funktion.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="imap-host" className="mb-1 block text-sm font-medium text-slate-700">
                IMAP-Host
              </label>
              <input
                id="imap-host"
                value={imapHost}
                onChange={(e) => setImapHost(e.target.value)}
                placeholder="imap.example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="imap-port" className="mb-1 block text-sm font-medium text-slate-700">
                Port
              </label>
              <input
                id="imap-port"
                type="number"
                min={1}
                max={65535}
                value={imapPort}
                onChange={(e) => setImapPort(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="993"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="imap-sent-folder" className="mb-1 block text-sm font-medium text-slate-700">
              Gesendet-Ordner
            </label>
            <input
              id="imap-sent-folder"
              value={imapSentFolder}
              onChange={(e) => setImapSentFolder(e.target.value)}
              placeholder="Sent"
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
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
        {testError && <p role="alert" className="text-sm text-red-600">{testError}</p>}
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

      {confirmingSave && (
        <ConfirmDialog
          title="SMTP-Einstellungen speichern?"
          message="Der E-Mail-Versand der gesamten App nutzt danach sofort diese Konfiguration. Bei einem Fehler kommen ab jetzt keine E-Mails mehr an."
          confirmLabel="Speichern"
          onConfirm={confirmSave}
          onClose={() => setConfirmingSave(false)}
        />
      )}
    </div>
  )
}

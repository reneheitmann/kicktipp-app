import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { sendContactMessage } from './contactApi'

export function ContactPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setError('Betreff und Nachricht dürfen nicht leer sein.')
      return
    }
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      await sendContactMessage(subject.trim(), message.trim())
      setSuccess('Nachricht wurde verschickt.')
      setSubject('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nachricht konnte nicht verschickt werden.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Kontakt</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-4 text-sm text-slate-500">
          Nachricht an den Spielleiter senden – die Antwort geht direkt an deine hinterlegte E-Mail-Adresse.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium text-slate-700">
              Betreff
            </label>
            <input
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-slate-700">
              Nachricht
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}

          <Button type="submit" disabled={sending}>
            {sending ? 'Wird verschickt...' : 'Nachricht senden'}
          </Button>
        </form>
      </div>
    </div>
  )
}

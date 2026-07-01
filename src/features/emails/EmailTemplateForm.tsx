import { useRef, useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { insertVariableAtCursor, templateVariables } from './templateVariables'
import type { EmailTemplate } from '../../types/database'

interface EmailTemplateFormProps {
  template?: EmailTemplate
  onClose: () => void
  onSubmit: (input: { name: string; subject: string; body_text: string }) => Promise<void>
}

export function EmailTemplateForm({ template, onClose, onSubmit }: EmailTemplateFormProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [bodyText, setBodyText] = useState(template?.body_text ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [lastFocused, setLastFocused] = useState<'subject' | 'body'>('body')

  function insertToken(token: string) {
    if (lastFocused === 'subject') {
      insertVariableAtCursor(subjectRef.current, subject, setSubject, token)
    } else {
      insertVariableAtCursor(bodyRef.current, bodyText, setBodyText, token)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedSubject = subject.trim()
    const trimmedBody = bodyText.trim()
    if (!trimmedName || !trimmedSubject || !trimmedBody) {
      setError('Name, Betreff und Text sind erforderlich.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: trimmedName, subject: trimmedSubject, body_text: trimmedBody })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={template ? 'Vorlage bearbeiten' : 'Vorlage anlegen'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="template-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="template-subject" className="mb-1 block text-sm font-medium text-slate-700">
            Betreff
          </label>
          <input
            id="template-subject"
            ref={subjectRef}
            value={subject}
            onFocus={() => setLastFocused('subject')}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="template-body" className="mb-1 block text-sm font-medium text-slate-700">
            Text
          </label>
          <textarea
            id="template-body"
            ref={bodyRef}
            value={bodyText}
            onFocus={() => setLastFocused('body')}
            onChange={(e) => setBodyText(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">
            Variable einfügen (an der Cursor-Position in Betreff oder Text):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templateVariables.map((v) => (
              <button
                key={v.token}
                type="button"
                title={v.description}
                onClick={() => insertToken(v.token)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

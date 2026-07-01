import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmailTemplateForm } from './EmailTemplateForm'
import { createEmailTemplate, deleteEmailTemplate, listEmailTemplates, updateEmailTemplate } from './emailTemplatesApi'
import type { EmailTemplate } from '../../types/database'

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      setTemplates(await listEmailTemplates())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vorlagen konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  function openCreate() {
    setEditingTemplate(undefined)
    setShowForm(true)
  }

  function openEdit(template: EmailTemplate) {
    setEditingTemplate(template)
    setShowForm(true)
  }

  async function handleDelete(template: EmailTemplate) {
    if (!confirm(`Vorlage "${template.name}" wirklich löschen?`)) return
    try {
      await deleteEmailTemplate(template.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <Link to="/emails/senden" className="mb-3 inline-block text-sm text-slate-500 hover:underline">
        ← Zurück zu E-Mail versenden
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">E-Mail-Vorlagen</h1>
        <Button onClick={openCreate}>+ Vorlage</Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Lade...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Vorlagen angelegt.</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{template.name}</p>
                <p className="truncate text-sm text-slate-500">{template.subject}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => openEdit(template)}>
                  Bearbeiten
                </Button>
                <Button variant="danger" onClick={() => handleDelete(template)}>
                  Löschen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <EmailTemplateForm
          template={editingTemplate}
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            if (editingTemplate) {
              await updateEmailTemplate(editingTemplate.id, input)
            } else {
              await createEmailTemplate(input)
            }
            await reload()
          }}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppBranding } from '../features/app-settings/useAppBranding'
import { useAuth } from '../features/auth/useAuth'
import { getLegalSettings } from '../features/legal-settings/legalSettingsApi'
import type { LegalSettings } from '../types/database'

const PLACEHOLDER = '– noch nicht hinterlegt –'

function field(value: string | undefined): string {
  return value?.trim() ? value : PLACEHOLDER
}

// Ohne Login erreichbar (siehe App.tsx) – die Impressumspflicht (§ 5 TMG)
// gilt unabhängig vom Login-Status. Betreiber-/Kontaktangaben kommen aus
// legal_settings (Admin-Bereich > Datenschutz & Impressum, siehe
// LegalSettingsPage.tsx) statt fest im Code zu stehen.
export function ImpressumPage() {
  const { appName } = useAppBranding()
  const { profile } = useAuth()
  const [legal, setLegal] = useState<LegalSettings | null>(null)

  useEffect(() => {
    getLegalSettings()
      .then(setLegal)
      .catch(() => setLegal(null))
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Impressum</h1>
      <p className="mb-6 text-sm text-slate-500">Angaben gemäß § 5 TMG für {appName}.</p>

      {profile?.role === 'admin' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Nur für dich als Admin sichtbar: Betreiber-/Hosting-Angaben unter{' '}
            <Link to="/admin/legal" className="underline">
              Datenschutz &amp; Impressum
            </Link>{' '}
            pflegen.
          </p>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Diensteanbieter</h2>
        <p className="text-sm text-slate-700">
          {field(legal?.operator_name)}
          <br />
          {field(legal?.operator_address)}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Kontakt</h2>
        <p className="text-sm text-slate-700">
          E-Mail: {field(legal?.operator_email)}
          <br />
          Telefon: {legal?.operator_phone?.trim() || 'entfällt'}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Verantwortlich für den Inhalt</h2>
        <p className="text-sm text-slate-700">{field(legal?.operator_name)} (Anschrift wie oben)</p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-slate-900">Hinweis</h2>
        <p className="text-sm text-slate-700">
          {appName} ist ein nicht-kommerzielles, privates Verwaltungstool für eine geschlossene, von der
          Spielleitung eingeladene Kicktipp-Spielrunde und richtet sich nicht an die Öffentlichkeit.
        </p>
      </section>
    </div>
  )
}

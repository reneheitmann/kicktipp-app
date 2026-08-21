import { useAppBranding } from '../features/app-settings/useAppBranding'

// Ohne Login erreichbar (siehe App.tsx) – die Impressumspflicht (§ 5 TMG)
// gilt unabhängig vom Login-Status. Enthält bewusst Platzhalter statt
// erfundener Angaben, siehe Hinweis-Box unten.
export function ImpressumPage() {
  const { appName } = useAppBranding()

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Impressum</h1>
      <p className="mb-6 text-sm text-slate-500">Angaben gemäß § 5 TMG für {appName}.</p>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <strong>Hinweis für den Betreiber:</strong> Diese Seite enthält noch Platzhalter (in eckigen Klammern),
          die vor dem Livegang ausgefüllt werden müssen – siehe Liste am Ende der Datenschutzerklärung.
        </p>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Diensteanbieter</h2>
        <p className="text-sm text-slate-700">
          [BETREIBER_NAME]
          <br />
          [BETREIBER_ADRESSE]
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Kontakt</h2>
        <p className="text-sm text-slate-700">
          E-Mail: [BETREIBER_KONTAKT_EMAIL]
          <br />
          Telefon: [BETREIBER_TELEFON] <span className="text-slate-500">(optional)</span>
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Verantwortlich für den Inhalt</h2>
        <p className="text-sm text-slate-700">
          [BETREIBER_NAME] (Anschrift wie oben)
        </p>
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

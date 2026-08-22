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

// Ohne Login erreichbar (siehe App.tsx – Route liegt bewusst außerhalb von
// ProtectedRoute), da die Informationspflicht nach Art. 13 DSGVO schon vor
// der Anmeldung gilt (z. B. auf der Login-Seite, wo bereits eine E-Mail-
// Adresse eingegeben wird). Betreiber-/Hosting-Angaben kommen aus
// legal_settings (Admin-Bereich > Datenschutz & Impressum, siehe
// LegalSettingsPage.tsx), der übrige Inhalt richtet sich nach der
// tatsächlichen Datenverarbeitung dieser App (siehe supabase/migrations/,
// supabase/functions/) – bei neuen Features, die personenbezogene Daten
// verarbeiten, muss dieser Text mitgepflegt werden.
export function DatenschutzPage() {
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
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Datenschutzerklärung</h1>
      <p className="mb-6 text-sm text-slate-500">Gilt für {appName}, die Verwaltungs-Webapp dieser privaten Kicktipp-Spielrunde.</p>

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
        <h2 className="mb-2 text-base font-semibold text-slate-900">1. Verantwortlicher</h2>
        <p className="text-sm text-slate-700">
          Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:
          <br />
          {field(legal?.operator_name)}
          <br />
          {field(legal?.operator_address)}
          <br />
          {field(legal?.operator_email)}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">2. Überblick: welche Daten diese App verarbeitet</h2>
        <p className="mb-2 text-sm text-slate-700">
          {appName} ist ein internes Verwaltungstool für eine private, nicht-öffentliche Kicktipp-Spielrunde. Das
          eigentliche Tippen findet weiterhin auf kicktipp.de statt – diese App bildet nur die Verwaltung/Abrechnung
          drumherum ab. Zugang haben ausschließlich von der Spielleitung eingeladene Mitspieler.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Konto-/Anmeldedaten: Name, E-Mail-Adresse, Passwort (verschlüsselt gespeichert), Rolle</li>
          <li>Spieler-Stammdaten: Name, Kicktipp-Nutzername</li>
          <li>Finanzdaten der Spielrunde: Einsätze, Ein-/Auszahlungen, Gewinne, Kontostände</li>
          <li>Technische Diagnosedaten: Fehlerprotokolle, Sitzungsdauer</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">3. Nutzerkonto und Anmeldung</h2>
        <p className="mb-2 text-sm text-slate-700">
          Bei der Anlage eines Kontos (durch die Spielleitung) werden Name und E-Mail-Adresse gespeichert; das
          Passwort wird ausschließlich verschlüsselt (gehasht) abgelegt und ist auch für uns nicht einsehbar. Diese
          Daten werden benötigt, um dich anzumelden, dich als Absender/Empfänger von Nachrichten zu identifizieren
          und dir dein eigenes Konto zuzuordnen. Rechtsgrundlage ist die Erfüllung der zwischen den Mitspielern
          bestehenden Vereinbarung zur gemeinsamen Verwaltung der Tipprunde (Art. 6 Abs. 1 lit. b bzw. f DSGVO,
          berechtigtes Interesse an einer funktionierenden gemeinsamen Verwaltung).
        </p>
        <p className="text-sm text-slate-700">
          Zusätzlich wird die Dauer deiner Sitzung serverseitig erfasst (Beginn deines Logins), um dich nach einer
          admin-konfigurierten Zeit automatisch abzumelden – ein übliches Sicherheitsmerkmal, keine Verhaltens-
          Auswertung.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">4. Spieler- und Finanzdaten der Spielrunde</h2>
        <p className="mb-2 text-sm text-slate-700">
          Für jeden Mitspieler werden Name und – sofern angegeben – der bei Kicktipp.de verwendete Nutzername
          gespeichert, um Ergebnisse und Einsätze der offiziellen Kicktipp-Runde diesem Spieler zuordnen zu können.
          Ein Spieler-Eintrag kann, muss aber nicht mit einem eigenen Nutzerkonto (Login) verknüpft sein.
        </p>
        <p className="text-sm text-slate-700">
          Zusätzlich werden alle für die Abrechnung der Spielrunde nötigen Finanzbewegungen geführt: Einsätze pro
          Spieltag/Saison, tatsächlich geleistete Ein- und Auszahlungen sowie ausgeschüttete Gewinne. Diese Daten
          sind für jeden Mitspieler ausschließlich zu seinen eigenen Buchungen einsehbar; die Spielleitung sieht
          alle Buchungen, da sie die Abrechnung der Spielrunde verantwortet.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">5. E-Mail-Versand</h2>
        <p className="mb-2 text-sm text-slate-700">
          Für Einzel- und Massen-Mails an Mitspieler (z. B. Passwort-Reset, Benachrichtigungen, Rundmails der
          Spielleitung) betreiben wir einen eigenen SMTP-Mailversand – es wird kein Drittanbieter-Mailversanddienst
          eingesetzt. Optional legt ein ebenfalls selbst betriebener IMAP-Client eine Kopie versendeter E-Mails im
          Gesendet-Ordner des zugehörigen Postfachs ab, damit Rundmails im normalen Mailprogramm nachvollziehbar
          bleiben. Dabei werden ausschließlich Nachrichten archiviert, die diese App selbst verschickt hat.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">6. Diagnose- und Fehlerprotokolle</h2>
        <p className="text-sm text-slate-700">
          Damit technische Fehler nachvollzogen werden können, ohne dass betroffene Nutzer selbst Browser-Details
          heraussuchen müssen, protokolliert die App unbehandelte Fehler serverseitig (Fehlermeldung, betroffene
          Seite, ggf. deine Nutzer-ID, falls angemeldet). Diese Protokolle sind ausschließlich für Administratoren
          einsehbar und werden automatisch nach 30 Tagen gelöscht.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">7. Eingebettetes Kicktipp.de-Widget</h2>
        <p className="text-sm text-slate-700">
          Auf der Seite „Kicktipp" bindet diese App ein offizielles Einbindungs-Script von kicktipp.de (Kicktipp
          GmbH) ein, das die eigentliche Tipprunden-Übersicht als Widget lädt. Dabei wird eine Verbindung zu
          Servern von kicktipp.de aufgebaut, wodurch technische Daten (z. B. deine IP-Adresse) an Kicktipp
          übertragen werden können. Es gelten zusätzlich die Datenschutzbestimmungen von Kicktipp.de. Diese Seite
          wird nur aufgerufen, wenn du sie aktiv im Menü öffnest.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">8. Lokale Speicherung im Browser</h2>
        <p className="text-sm text-slate-700">
          Einige persönliche Anzeige-Einstellungen (z. B. auf-/zugeklappte Bereiche, eine gemerkte Favoriten-Auswahl
          im Saisonvergleich) werden ausschließlich lokal in deinem Browser gespeichert (localStorage), nicht auf
          unseren Servern. Diese Daten verlassen dein Gerät nicht und dienen nur deinem eigenen Bedienkomfort.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">9. Hosting und Auftragsverarbeitung</h2>
        <p className="mb-2 text-sm text-slate-700">
          Für Datenbank, Anmeldung (Auth), Datei-Speicher und die serverseitige Programmlogik (Edge Functions)
          nutzen wir <strong>Supabase</strong> als technischen Dienstleister (Auftragsverarbeiter gemäß Art. 28
          DSGVO). Der Speicherort der Datenbank ist: {field(legal?.hosting_location)}. Mit Supabase besteht ein
          Auftragsverarbeitungsvertrag.
        </p>
        <p className="text-sm text-slate-700">
          Die Weboberfläche selbst (dieses Frontend) wird auf eigener Infrastruktur des Betreibers gehostet
          ({field(legal?.hosting_location_frontend)}).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">10. Speicherdauer</h2>
        <p className="text-sm text-slate-700">
          Konto-, Spieler- und Finanzdaten werden gespeichert, solange du Mitglied der Spielrunde bist bzw. solange
          es für die Nachvollziehbarkeit der Abrechnung erforderlich ist. Bei Löschung deines Kontos durch die
          Spielleitung werden Sitzungen und Passwort-Historie mitgelöscht; bereits verbuchte Finanztransaktionen
          bleiben aus Nachvollziehbarkeitsgründen für die Spielrunde erhalten. Diagnose-Logs werden automatisch
          nach 30 Tagen gelöscht (siehe Punkt 6).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">11. Deine Rechte</h2>
        <p className="mb-2 text-sm text-slate-700">
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung
          der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21) bezüglich deiner
          personenbezogenen Daten. Eine einfache Übersicht deiner eigenen Daten kannst du dir jederzeit selbst unter{' '}
          <Link to="/profil" className="underline">
            Mein Profil
          </Link>{' '}
          („Meine Daten herunterladen") anzeigen bzw. herunterladen. Für weitergehende Anfragen (z. B. Löschung)
          wende dich an {field(legal?.operator_email)}. Du hast außerdem das Recht, dich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">12. Kontakt für Datenschutzfragen</h2>
        <p className="text-sm text-slate-700">Bei Fragen zum Datenschutz wende dich an: {field(legal?.operator_email)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-slate-900">13. Mobile App (iOS/Android)</h2>
        <p className="mb-2 text-sm text-slate-700">
          Nutzt du die mobile App statt der Weboberfläche, gilt zusätzlich: Meldest du dich in der App bei einer
          oder mehreren Instanzen dieser Anwendung an (jede Instanz eine eigenständige Kicktipp-Spielrunde mit
          eigener Adresse), werden deine Zugangsdaten (Anmelde-Sitzung) für jede Instanz getrennt im
          hardware-verschlüsselten Bereich deines Geräts gespeichert (iOS Schlüsselbund/Android Keystore) – nicht
          in einfachen, unverschlüsselten App-Einstellungen. Welche Instanzen du auf deinem Gerät hinzugefügt hast,
          wird an keinen zentralen Server gemeldet; das bleibt ausschließlich lokal auf deinem Gerät und ist für
          uns nicht einsehbar.
        </p>
        <p className="text-sm text-slate-700">
          Erteilst du die Berechtigung für Benachrichtigungen, wird ein von deinem Gerät ausgegebenes,
          eindeutiges Push-Token gespeichert (verknüpft mit deinem Konto), um dir gezielt Benachrichtigungen zu
          neuen Kontaktnachrichten und abgeschlossenen Gewinnberechnungen zusenden zu können. Die Zustellung läuft
          über Firebase Cloud Messaging (Google) als technischen Dienstleister. Du kannst diese Verarbeitung
          jederzeit widerrufen, indem du die Benachrichtigungs-Berechtigung in den Geräte-Einstellungen deaktivierst
          oder die betreffende Instanz in der App entfernst – das löscht auch dein Push-Token und deine dort
          gespeicherten Zugangsdaten.
        </p>
      </section>
    </div>
  )
}

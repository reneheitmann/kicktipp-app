# Kicktipp Spielrunde – Verwaltungs-Webapp

Verwaltet Spieler, Guthaben, Einsätze, Gewinnverteilung und Saisons einer privaten
Kicktipp.de-Spielrunde. Das eigentliche Tippen läuft weiterhin über Kicktipp.de –
diese App bildet ausschließlich die Verwaltung/Abrechnung drumherum ab.

## Funktionsumfang

- **Saisons & Spieltage** – Anlegen, Kopieren, Spieltag-Import aus Kicktipp,
  Gesamtwertung, Saisonvergleich (Liniendiagramm über mehrere Saisons, zeigt
  jedem aktiven Nutzer jeden aktiven Spieler mit Kicktipp-Name-Spalte und
  Suche nach Name/Kicktipp-Name – der Gesamtsaldo je Spieler kommt über eine
  security-definer-Funktion, die nur die fertig berechnete Summe offenlegt,
  Einsätze/Zahlungen einzelner Spieler bleiben weiterhin privat; eigene
  Standardauswahl statt der größten Gewinner/Verlierer als Favoriten
  speicherbar, nur im eigenen Browser).
  Lebenszyklus Entwurf → Aktiv → Abgeschlossen → Archiviert: Entwurf/Archiviert
  sind für normale Nutzer unsichtbar und zählen nicht in saisonübergreifenden
  Geld-Summen mit (Ausnahme: Nutzer mit `accounts.manage` sehen Entwurf-Saisons
  bereits in den Geld-Summen, um Zahlungen während der Vorbereitung zu
  erfassen); Abgeschlossen/Archiviert sperrt weitere Bearbeitung
  (Teilnehmer, Gewinnregelung, Spieltage) – einzige Ausnahme bleibt der
  Status-Schalter selbst, um eine Saison wieder zu öffnen
- **Guthaben & Einsätze** – Kontenübersicht, Transaktionen, Ein-/Auszahlungen,
  automatische Gewinnverteilung nach konfigurierbaren Auszahlungsregeln
- **Spielerverwaltung** – Spieler-Stammdaten inkl. Kicktipp-Namen-Mapping,
  Deaktivieren (blendet den Spieler aus allen Ansichten/Massenmails aus, ohne
  historische Daten zu löschen, weiterhin reaktivierbar); Verknüpfung mit
  Benutzerkonten – per granularem Recht (`players.link_logins`) auch an
  Spielleiter delegierbar
- **Kicktipp-Import** – Tabellen-Import aus Kicktipp.de (Teilnehmer/Tipper)
- **Kicktipp-Seite** – bettet die Kicktipp-Gruppenseite direkt per offiziellem
  Kicktipp-Widget-Script ein (eigener Menüpunkt, kein separater Tab nötig)
- **Menü verwalten** – admin-editierbare Reihenfolge und Bezeichnungen der
  Menüpunkte, gilt app-weit für alle Rollen
- **Benutzerverwaltung** – Rollen (`admin`, `spielleiter`, `user`), Sperren,
  endgültiges Löschen (Tipp-Bestätigung, kaskadiert Sitzungen/Passwort-
  Historie/Spieler-Verknüpfungen, verknüpfte Spieler selbst bleiben
  bestehen), Passwort-Reset, letzter Login; per granularem Recht
  (`users.manage`) auch an Spielleiter delegierbar, Admin-Konten bleiben
  davon immer ausgenommen; echter Rollenwechsel (Admin → Spielleiter oder
  Spieler, Spielleiter → Spieler; keine reine Client-Vorschau, jederzeit
  rückgängig)
- **Mein Profil** – Name, Passwort und E-Mail-Adresse (per Bestätigungslink)
  selbst ändern; Selbstauskunft per Klick als JSON-Datei herunterladbar
  (Profil, verknüpfte Spieler, eigene Transaktionen/Zahlungen)
- **Datenschutz & Impressum** – ohne Login erreichbar (Informationspflicht
  gilt schon vor der Anmeldung), verlinkt aus Konto-Menü und Login-Seite;
  Betreiber-/Hosting-Angaben admin-editierbar zur Laufzeit (Admin-Bereich >
  Datenschutz & Impressum), kein Code-Deployment für Adressänderungen nötig
- **Feingranulare Berechtigungen** – rollenbasierte Rechte pro Seite/Aktion,
  unabhängig von den drei Basisrollen konfigurierbar
- **E-Mail-Versand** – Einzel-/Massen-Mails an Spieler mit Vorlagen, zwei
  admin-umschaltbare Versandarten (eigener SMTP-Client ohne
  Drittanbieter-Mailversand, oder wahlweise Brevo als API-basierter
  Versand); bei SMTP legt ein eigener IMAP-Client optional zusätzlich eine
  Kopie im admin-konfigurierten Gesendet-Ordner des Postfachs ab (reiner
  SMTP-Versand macht das sonst nicht von selbst). Passwort-Reset- und
  Benutzer-Neuanlage-Einladungsmail nutzen eigene, admin-editierbare
  System-Vorlagen (genau eine je Anlass, über dieselbe Vorlagenmaske wie
  die Massenmail-Vorlagen)
- **Kontakt** – Formular für jeden User, verschickt eine Nachricht per E-Mail
  an den Spielleiter (Antworten geht direkt an den Absender)
- **Hilfe** – erklärt für jeden User kurz, was die App macht, und verlinkt auf
  die offizielle Kicktipp-Runde auf kicktipp.de
- **Erscheinungsbild** – App-Name, Icon/Favicon und Primärfarbe zur Laufzeit
  admin-konfigurierbar
- **Passwort-Richtlinie** – Mindestlänge, Zeichenklassen, Wiederverwendungssperre
- **Sitzungsdauer** – admin-konfigurierbares Session-Timeout (Standard 8h),
  client- und serverseitig erzwungen
- **Logs & Diagnose** – client- und serverseitige Fehlerprotokollierung, einsehbar
  im Admin-Bereich
- **Excel-Export** für Auswertungen
- **Native iOS-/Android-App** (Capacitor, `mobile/`) – derselbe Web-Code wie
  oben, zusätzlich fähig, mehrere unabhängige Spielrunden (je eine eigene
  Domain + eigenes Supabase-Projekt) auf einem Gerät zu speichern und
  jederzeit zu wechseln (antippbar über den App-Titel im Header bzw. auf
  dem Login-Screen), inkl. Push-Benachrichtigungen (Firebase Cloud
  Messaging) und verschlüsselter lokaler Zugangsdaten-Ablage (iOS Keychain
  / Android Keystore). Details: [`docs/mobile-app.md`](docs/mobile-app.md).

## Tech-Stack

- React 19 + TypeScript + Vite 8, Tailwind CSS v4 (mobile-first)
- React Router 7 (rollenbasiertes, geschütztes Routing)
- Recharts (Diagramme), ExcelJS (Export)
- Supabase (Postgres + Auth + Storage + Edge Functions), abgesichert über
  RLS-Policies auf jeder Tabelle
- Capacitor (native iOS-/Android-App aus demselben Web-Code, siehe
  [`docs/mobile-app.md`](docs/mobile-app.md))
- Deployment: Docker (nginx) auf Unraid, Auto-Update per Watchtower

## Lokale Entwicklung

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. `.env` aus `.env.example` anlegen und mit den Zugangsdaten des
   Supabase-Entwicklungsprojekts befüllen (Project Settings > API):
   ```bash
   cp .env.example .env
   ```
3. Migrationen aus `supabase/migrations/` in der angegebenen Reihenfolge im
   SQL-Editor des Supabase-Projekts ausführen (oder via Supabase CLI, siehe unten).
4. Allerersten Admin-Account anlegen: in Supabase Studio unter
   **Authentication > Users > Add user** einen Login erstellen, danach
   `supabase/bootstrap_first_admin.sql` (E-Mail anpassen) im SQL-Editor ausführen.
5. Dev-Server starten (per `--host` auch von Handy/Tablet im selben Netz erreichbar):
   ```bash
   npm run dev
   ```

Weitere Scripts: `npm run build` (Typecheck + Produktions-Build), `npm run test`
(Vitest, Unit-Tests für Berechnungen und Auth-Logik), `npm run lint`
(oxlint), `npm run preview` (Produktions-Build lokal ansehen).

### Mit Supabase CLI (Migrationen + Edge Functions)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push --linked
supabase functions deploy <function-name>
```

pgTAP-Tests für die kritischen Postgres-Funktionen (aktuell: die
Gewinnberechnung, `supabase/tests/database/`) laufen lokal gegen eine
frische, aus den Migrationen aufgebaute Datenbank (braucht Docker):

```bash
supabase start
supabase test db --local supabase/tests/database
```

Läuft außerdem automatisch in CI bei jeder Änderung unter `supabase/**`
(`.github/workflows/db-tests.yml`).

Alle Edge Functions (`admin-create-user`, `admin-update-user`,
`admin-delete-user`, `update-own-password`, `update-own-email`,
`confirm-email-change`, `send-email`, `send-bulk-email`, `send-password-reset`,
`send-contact-message`, `send-push-notification`) nutzen `SUPABASE_URL` und
`SUPABASE_SERVICE_ROLE_KEY`,
die Supabase Edge Functions automatisch zur Verfügung stehen. Zusätzlich
braucht das Projekt das Secret `ALLOWED_ORIGINS` (kommagetrennte Liste
erlaubter Origins für CORS und Redirect-Allowlist, siehe
`supabase/functions/_shared/cors.ts`), gesetzt per
`supabase secrets set ALLOWED_ORIGINS=... --project-ref <project-ref>`.
SMTP-Zugangsdaten bzw. der Brevo-API-Key kommen dagegen nicht aus Secrets,
sondern werden in der Datenbank verwaltet (Admin-Bereich > E-Mail-Einstellungen).

## Projektstruktur

```
src/
  App.tsx                  Router-Konfiguration (Routen + Rollen-/Berechtigungs-Gates)
  components/layout/       Responsive App-Shell (Sidebar Desktop / Bottom-Nav Mobile)
  components/ui/           Wiederverwendbare UI-Bausteine (Button, Modal, ConfirmDialog, ...)
  features/auth/           Login, Session-/Rollen-Context, Rollenwechsel, geschütztes Routing
  features/seasons/        Saisons, Spieltage, Einsätze, Gesamtwertung
  features/balances/       Kontenstände, Transaktionen, Saisonvergleich
  features/players/        Spielerverwaltung, Kicktipp-Namen-Mapping
  features/payouts/        Auszahlungsregeln
  features/rankings/       Platzierungen & Gewinnberechnung (Spieltag + Gesamtwertung)
  features/kicktipp-import/ Tabellen-Import aus Kicktipp.de
  features/admin-users/    Benutzerverwaltung (Rolle, Sperren, Passwort-Reset, Anlegen)
  features/permissions/    Feingranulare Rollen-/Rechteverwaltung
  features/emails/         E-Mail-Versand + Vorlagen
  features/email-settings/ SMTP-Konfiguration
  features/app-settings/   Erscheinungsbild (Name, Icon, Primärfarbe), Branding-Provider
  features/password-policy/ Passwort-Richtlinie
  features/session-policy/ Admin-konfigurierbares Session-Timeout
  features/logs/           Fehler-/Diagnose-Logs
  features/contact/        Kontaktformular (Mail an den Spielleiter)
  features/kicktipp-widget/ Eingebettete Kicktipp-Seite (offizielles Widget-Script)
  features/nav-settings/   Admin-editierbare Menü-Reihenfolge
  lib/                     Supabase-Client, Formatierung, Logging, Validierung
  pages/                   Einfache Seiten ohne eigenes Feature-Modul
  types/                   Handgepflegte DB-Typen
supabase/
  migrations/              SQL-Migrationen (fortlaufend nummeriert)
  functions/                Edge Functions
  bootstrap_first_admin.sql
mobile/                    Capacitor-Projekt (iOS/Android), teilt sich src/
                            mit der Web-Version, siehe docs/mobile-app.md
docs/
  unraid-deployment.md     Deployment-Anleitung für Unraid/Docker
  mobile-app.md            Architektur/Sicherheitsmodell der nativen App
  mobile-store-setup.md    Schritt-für-Schritt-Anleitung für App Store/Play Store
  go-live-checklist.md     Checkliste für den ersten Produktions-Rollout
  rls-history.md           Historie der RLS-Policy-Entscheidungen
```

## Rollen & Berechtigungen

Drei Basisrollen (`admin`, `spielleiter`, `user`), serverseitig über Postgres
RLS abgesichert (nicht nur im Frontend versteckt) – siehe
`supabase/migrations/0001_roles_profiles.sql`. Zusätzlich existiert ein
feingranulares Berechtigungssystem (`role_permissions`-Tabelle), über das
einzelne Seiten/Aktionen unabhängig von der Basisrolle freigeschaltet werden
können (**Rollen & Berechtigungen** im Admin-Bereich) – das schließt die
Benutzerverwaltung selbst mit ein (`users.manage`): ein Spielleiter mit
diesem Recht kann Benutzer anlegen/bearbeiten/sperren, Admin-Konten bleiben
dabei serverseitig (RLS + Trigger + Edge Functions) immer ausgenommen, auch
vor einer Rechteausweitung zum Admin. Admins können sich
zudem real in die Rolle „Spielleiter" oder „Spieler" versetzen, Spielleiter
nur in „Spieler" (kein Weg zu „Admin" – das wäre eine Rechteausweitung statt
einer Vorschau „nach unten"), jeweils jederzeit rückgängig zu machen.

## Branches & Deployment

- **`beta`** – aktiver Entwicklungsbranch, Standard-Ziel für Commits/Pushes.
- **`main`** – Produktion, wird bewusst per Merge von `beta` befördert. Die
  Version in `package.json` wird dabei automatisch erhöht (Minor bei neuer
  DB-Migration, sonst Patch).

Vor jedem Push nach `beta` oder `main`: `npm run test`, `npx tsc --noEmit`
und `npm run lint` sollten lokal fehlerfrei laufen (CI erzwingt Test und
Lint zusätzlich als Build-Gate, siehe `docker-publish.yml`; der Typecheck
läuft dort nur implizit über `npm run build`).

Ein Push nach `main` **oder** `beta` baut immer **ein einziges** Docker-Image
(`:latest`), das beide Versionen gleichzeitig enthält: `main` unter `/`,
`beta` unter `/beta/` – ausgeliefert von einem einzelnen Container, kein
separates Beta-Deployment mehr. Wer die Beta-Version sehen darf, entscheidet
das granulare Recht `beta.access` (vergeben über **Rollen & Berechtigungen**);
der Wechsel passiert über einen Link im eigenen Profil.

`main` und `beta` teilen sich weiterhin ein einzelnes Supabase-Projekt (ein
eigenes Beta-Projekt scheiterte am 2-Projekte-Limit des Free-Tiers). **Fester
Bestandteil des eigenen Checklisten-Ablaufs, nicht optional:** vor jedem Push,
der eine neue Datei unter `supabase/migrations/` enthält, wird zuerst über
den manuellen GitHub-Actions-Workflow `db-backup.yml` ein GPG-verschlüsseltes
Backup gezogen, bevor `supabase db push --linked` läuft (Restore-Ablauf:
[`docs/unraid-deployment.md`](docs/unraid-deployment.md), Teil 4).

Für lokale Entwicklung gibt es ein drittes, eigenständiges Supabase-Projekt
("Kicktipp Dev"), auf das `.env` lokal zeigt (siehe `.env.example`). Seine
Daten (inkl. `auth.users`) lassen sich jederzeit per manuellem
GitHub-Actions-Workflow `sync-dev-from-prod.yml` komplett aus Prod
auffrischen – überschreibt dabei den kompletten Dev-Datenbestand.
Klarnamen und E-Mail-Adressen werden dabei automatisch durch synthetische
Platzhalter ersetzt (`supabase/anonymize_dev_data.sql`, Zweckbindungsgrundsatz
DSGVO) – IDs/Verknüpfungen zwischen den Tabellen bleiben dabei erhalten.

Zusätzlich gibt es einen **komplett eigenständigen dritten Container** nur
für Dev (`.github/workflows/deploy-dev.yml`, `Dockerfile.dev`,
`nginx.dev.conf.template`, Image-Tag `:dev`) – bewusst kein Bezug zu
main/beta, weder im Image noch im Netzwerk-Traffic (eigenes Backend, eigene
Domain/IP empfohlen). Baut bei jedem Push nach `beta` (die Dev-Datenbank
trackt die aktive Entwicklung), unabhängig vom main/beta-Workflow. Praktisch
z. B. für eine zweite, unabhängige Spielrunde zum Testen des mobilen
Instanz-Wechsels.

Bei jedem Push nach `main` oder `beta` baut `.github/workflows/docker-publish.yml`
beide Branches unabhängig voneinander und veröffentlicht das gemeinsame Image
zu GHCR; ein Watchtower-Container auf dem Ziel-Unraid-Host zieht neue Images
automatisch. **Ausnahme:** Besteht der Push nur aus einem `[skip ci]`-Commit
(automatischer Versions-Bump auf `main`, oder ein Fast-Forward-Merge, der
zufällig genau darauf landet) – dann baut GitHub Actions absichtlich nicht
(verhindert eine Bump-Endlosschleife auf `main`), das deployte Image bleibt
dann auf dem alten Stand, bis der Build manuell nachgetriggert wird:
`gh workflow run docker-publish.yml --ref beta` (bzw. `--ref main`). Details
zum Deployment: [`docs/unraid-deployment.md`](docs/unraid-deployment.md).

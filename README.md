# Kicktipp Spielrunde – Verwaltungs-Webapp

Verwaltet Spieler, Guthaben, Einsätze, Gewinnverteilung und Saisons einer privaten
Kicktipp.de-Spielrunde. Das eigentliche Tippen läuft weiterhin über Kicktipp.de –
diese App bildet ausschließlich die Verwaltung/Abrechnung drumherum ab.

## Funktionsumfang

- **Saisons & Spieltage** – Anlegen, Kopieren, Spieltag-Import aus Kicktipp,
  Gesamtwertung, Saisonvergleich (Liniendiagramm über mehrere Saisons)
- **Guthaben & Einsätze** – Kontenübersicht, Transaktionen, Ein-/Auszahlungen,
  automatische Gewinnverteilung nach konfigurierbaren Auszahlungsregeln
- **Spielerverwaltung** – Spieler-Stammdaten inkl. Kicktipp-Namen-Mapping,
  Verknüpfung mit Benutzerkonten
- **Kicktipp-Import** – Tabellen-Import aus Kicktipp.de (Teilnehmer/Tipper)
- **Benutzerverwaltung** – Rollen (`admin`, `spielleiter`, `user`), Sperren,
  Passwort-Reset, echter Rollenwechsel („als Spieler agieren", keine reine
  Client-Vorschau)
- **Feingranulare Berechtigungen** – rollenbasierte Rechte pro Seite/Aktion,
  unabhängig von den drei Basisrollen konfigurierbar
- **E-Mail-Versand** – Einzel-/Massen-Mails an Spieler mit Vorlagen, eigener
  SMTP-Client (kein Drittanbieter-Mailversand)
- **Erscheinungsbild** – App-Name, Icon/Favicon und Primärfarbe zur Laufzeit
  admin-konfigurierbar
- **Passwort-Richtlinie** – Mindestlänge, Zeichenklassen, Wiederverwendungssperre
- **Logs & Diagnose** – client- und serverseitige Fehlerprotokollierung, einsehbar
  im Admin-Bereich
- **Excel-Export** für Auswertungen

## Tech-Stack

- React 19 + TypeScript + Vite 8, Tailwind CSS v4 (mobile-first)
- React Router 7 (rollenbasiertes, geschütztes Routing)
- Recharts (Diagramme), ExcelJS (Export)
- Supabase (Postgres + Auth + Storage + Edge Functions), abgesichert über
  RLS-Policies auf jeder Tabelle
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

Weitere Scripts: `npm run build` (Typecheck + Produktions-Build), `npm run lint`
(oxlint), `npm run preview` (Produktions-Build lokal ansehen).

### Mit Supabase CLI (Migrationen + Edge Functions)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push --linked
supabase functions deploy <function-name>
```

Alle Edge Functions (`admin-create-user`, `admin-update-user`,
`update-own-password`, `send-email`, `send-bulk-email`,
`send-password-reset`) benötigen keine zusätzlichen Secrets –
`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stehen Supabase Edge Functions
automatisch zur Verfügung.

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
  features/kicktipp-import/ Tabellen-Import aus Kicktipp.de
  features/admin-users/    Benutzerverwaltung (Rolle, Sperren, Passwort-Reset, Anlegen)
  features/permissions/    Feingranulare Rollen-/Rechteverwaltung
  features/emails/         E-Mail-Versand + Vorlagen
  features/email-settings/ SMTP-Konfiguration
  features/app-settings/   Erscheinungsbild (Name, Icon, Primärfarbe), Branding-Provider
  features/password-policy/ Passwort-Richtlinie
  features/logs/           Fehler-/Diagnose-Logs
  lib/                     Supabase-Client, Formatierung, Logging, Validierung
  pages/                   Einfache Seiten ohne eigenes Feature-Modul
  types/                   Handgepflegte DB-Typen
supabase/
  migrations/              SQL-Migrationen (fortlaufend nummeriert)
  functions/                Edge Functions
  bootstrap_first_admin.sql
docs/
  unraid-deployment.md     Deployment-Anleitung für Unraid/Docker
```

## Rollen & Berechtigungen

Drei Basisrollen (`admin`, `spielleiter`, `user`), serverseitig über Postgres
RLS abgesichert (nicht nur im Frontend versteckt) – siehe
`supabase/migrations/0001_roles_profiles.sql`. Zusätzlich existiert ein
feingranulares Berechtigungssystem (`role_permissions`-Tabelle), über das
einzelne Seiten/Aktionen unabhängig von der Basisrolle freigeschaltet werden
können (**Rollen & Berechtigungen** im Admin-Bereich). Admins und Spielleiter
können sich zudem real in die Rolle „Spieler" versetzen und wieder zurück,
um die App aus Nutzersicht zu sehen.

## Branches & Deployment

- **`beta`** – aktiver Entwicklungsbranch, Standard-Ziel für Commits/Pushes.
  Baut ein Docker-Image mit Tag `:beta` (eigener Test-Container).
- **`main`** – Produktion, wird bewusst per Merge von `beta` befördert.
  Baut das Docker-Image mit Tag `:latest`; die Version in `package.json`
  wird dabei automatisch erhöht (Minor bei neuer DB-Migration, sonst Patch).

`main` und `beta` teilen sich ein einzelnes Supabase-Projekt (keine getrennten
Umgebungen) – vor jeder Migration wird über den manuellen GitHub-Actions-Workflow
`db-backup.yml` ein GPG-verschlüsseltes Backup gezogen.

Beide Branches werden bei jedem Push automatisch als Docker-Image gebaut und
zu GHCR veröffentlicht (`.github/workflows/docker-publish.yml`); ein
Watchtower-Container auf dem Ziel-Unraid-Host zieht neue Images automatisch.
Details zum Deployment: [`docs/unraid-deployment.md`](docs/unraid-deployment.md).

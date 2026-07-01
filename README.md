# Kicktipp Spielrunde – Verwaltungs-Webapp

Verwaltet Spieler, Guthaben, Einsätze, Gewinnverteilung und Saisons einer privaten
Kicktipp.de-Spielrunde. Das eigentliche Tippen läuft weiterhin über Kicktipp.de –
diese App bildet ausschließlich die Verwaltung/Abrechnung drumherum ab.

**Status: MVP-Vertical-Slice (Schritte 1–5).** Benutzerverwaltung + Spielerverwaltung
sind funktionsfähig. Saisons, Einsätze, Gewinnverteilung, Kicktipp-Import, Auswertungen
und Excel-Export folgen in weiteren Ausbauschritten.

## Tech-Stack

- React 19 + TypeScript + Vite, Tailwind CSS v4 (mobile-first)
- React Router 7 (rollenbasiertes, geschütztes Routing)
- Supabase (Postgres + Auth + Edge Functions), abgesichert über RLS-Policies

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

### Mit Supabase CLI (optional, für Migrationen + Edge Function)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy admin-create-user
```

Die Edge Function `admin-create-user` benötigt keine zusätzlichen Secrets –
`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stehen Supabase Edge Functions
automatisch zur Verfügung.

## Projektstruktur

```
src/
  App.tsx              Router-Konfiguration (Routen + Rollen-Gates)
  components/layout/   Responsive App-Shell (Sidebar Desktop / Bottom-Nav Mobile)
  components/ui/       Wiederverwendbare UI-Bausteine (Button, Modal, ...)
  features/auth/       Login, Session-/Rollen-Context, geschütztes Routing
  features/players/    Spielerverwaltung inkl. Kicktipp-Namen-Mapping-Feld
  features/admin-users/ Benutzerverwaltung (Rolle, Sperren, Passwort-Reset, Anlegen)
  lib/                 Supabase-Client
  pages/               Einfache Seiten ohne eigenes Feature-Modul
  types/                Handgepflegte DB-Typen (Platzhalter für `supabase gen types`)
supabase/
  migrations/          SQL-Migrationen (Rollen/Profiles, Spieler)
  functions/           Edge Functions (admin-create-user)
  bootstrap_first_admin.sql
```

## Rollensystem

Drei Rollen (`admin`, `spielleiter`, `user`), serverseitig über Postgres RLS
abgesichert (nicht nur im Frontend versteckt) – siehe `supabase/migrations/0001_roles_profiles.sql`.

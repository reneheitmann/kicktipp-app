-- Admin-editierbare Betreiber-/Hosting-Angaben für Datenschutzerklärung und
-- Impressum (siehe DatenschutzPage.tsx/ImpressumPage.tsx) – vorher fest im
-- Code als [PLATZHALTER] hinterlegt, jetzt zur Laufzeit im Admin-Bereich
-- pflegbar, ohne neuen Docker-Build.
--
-- Singleton-Tabelle nach demselben Muster wie app_settings (0027): SELECT
-- bewusst öffentlich (auch für nicht angemeldete Besucher), da Datenschutz/
-- Impressum ohne Login erreichbar sein müssen. Schreiben bleibt hart auf
-- Admin verdrahtet (Selbstschutz-Prinzip dieses Projekts, wie
-- Benutzerverwaltung/E-Mail-Einstellungen/Rollen-Modul).
create table public.legal_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000006',
  operator_name text not null default '',
  operator_address text not null default '',
  operator_email text not null default '',
  operator_phone text not null default '',
  hosting_location text not null default '',
  hosting_location_frontend text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint legal_settings_singleton check (id = '00000000-0000-0000-0000-000000000006')
);

alter table public.legal_settings enable row level security;

create policy legal_settings_select on public.legal_settings
  for select
  using (true);

create policy legal_settings_insert on public.legal_settings
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy legal_settings_update on public.legal_settings
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

-- Leere Zeile direkt anlegen (statt Insert dem Frontend zu überlassen), damit
-- Datenschutz-/Impressum-Seite ab der ersten Migration ohne "noch keine Zeile
-- vorhanden"-Sonderfall funktionieren – leere Felder werden dort als "noch
-- nicht hinterlegt" angezeigt, bis ein Admin sie ausfüllt.
insert into public.legal_settings (id) values ('00000000-0000-0000-0000-000000000006');

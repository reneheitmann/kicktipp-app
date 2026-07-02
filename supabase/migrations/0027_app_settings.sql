-- Zur Laufzeit änderbares App-Branding (Anzeigename, Icon, Primärfarbe) –
-- ersetzt die bisher fest im Code verdrahteten Werte, damit Admins das ohne
-- neuen Docker-Build anpassen können.
--
-- Singleton-Tabelle nach demselben Muster wie email_settings (0017), aber
-- mit einer bewussten Abweichung: SELECT ist öffentlich (auch für nicht
-- angemeldete Besucher), da die Login-Seite Name/Icon schon vor dem Login
-- anzeigen muss. Schreiben bleibt hart auf Admin verdrahtet (Selbstschutz-
-- Prinzip dieses Projekts, wie Benutzerverwaltung/E-Mail-Einstellungen/
-- Rollen-Modul).
create table public.app_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000002',
  app_name text not null default 'Kicktipp Spielrunde',
  icon_url text,
  primary_color text not null default '#0f172a',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint app_settings_singleton check (id = '00000000-0000-0000-0000-000000000002')
);

alter table public.app_settings enable row level security;

create policy app_settings_select on public.app_settings
  for select
  using (true);

create policy app_settings_insert on public.app_settings
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy app_settings_update on public.app_settings
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

-- Direkt eine Zeile mit den heutigen Werten anlegen, damit das Erscheinungs-
-- bild ab der ersten Migration exakt dem bisherigen Stand entspricht, ohne
-- dass das Frontend einen "noch nicht konfiguriert"-Sonderfall behandeln muss.
insert into public.app_settings (id, app_name, icon_url, primary_color)
values ('00000000-0000-0000-0000-000000000002', 'Kicktipp Spielrunde', null, '#0f172a');

-- Storage-Bucket für das Icon (öffentlich lesbar, damit das Favicon ohne
-- Anmeldung ladbar ist; Schreiben nur Admin). Fester Dateiname mit upsert
-- beim Hochladen (siehe appSettingsApi.ts), damit keine verwaisten Dateien
-- entstehen.
insert into storage.buckets (id, name, public)
values ('app-assets', 'app-assets', true);

create policy app_assets_select on storage.objects
  for select
  using (bucket_id = 'app-assets');

create policy app_assets_insert on storage.objects
  for insert
  with check (
    bucket_id = 'app-assets'
    and public.current_user_role() = 'admin'
    and public.current_user_active()
  );

create policy app_assets_update on storage.objects
  for update
  using (
    bucket_id = 'app-assets'
    and public.current_user_role() = 'admin'
    and public.current_user_active()
  )
  with check (
    bucket_id = 'app-assets'
    and public.current_user_role() = 'admin'
    and public.current_user_active()
  );

create policy app_assets_delete on storage.objects
  for delete
  using (
    bucket_id = 'app-assets'
    and public.current_user_role() = 'admin'
    and public.current_user_active()
  );

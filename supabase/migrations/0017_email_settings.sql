-- SMTP-Konfiguration für den E-Mail-Versand der App (Einladungen, künftige
-- Benachrichtigungen wie Zahlungserinnerungen), unabhängig vom in Supabase Auth
-- hinterlegten Standard-Mailversand.
--
-- Singleton-Tabelle: feste, fest verdrahtete id, damit nie mehr als eine Zeile
-- existieren kann (kein zusätzlicher Trigger nötig, der Primary-Key-Constraint
-- reicht). Die App liest/schreibt immer genau diese eine Zeile per Upsert.
--
-- Nur Admins dürfen die Einstellungen lesen/ändern (enthält das SMTP-Passwort).
-- Edge Functions lesen die Zeile ohnehin über den service_role-Key und sind
-- damit von dieser RLS nicht betroffen.

create type public.smtp_encryption as enum ('none', 'starttls', 'tls');

create table public.email_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  smtp_host text not null,
  smtp_port integer not null check (smtp_port > 0 and smtp_port <= 65535),
  smtp_username text,
  smtp_password text,
  smtp_encryption public.smtp_encryption not null default 'starttls',
  sender_email text not null,
  sender_name text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint email_settings_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

alter table public.email_settings enable row level security;

create policy email_settings_select on public.email_settings
  for select
  using (public.current_user_role() = 'admin' and public.current_user_active());

create policy email_settings_insert on public.email_settings
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy email_settings_update on public.email_settings
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

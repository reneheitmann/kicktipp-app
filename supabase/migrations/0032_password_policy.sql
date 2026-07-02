-- Konfigurierbare Passwort-Richtlinie: Mindestlänge, Mindestanzahl erfüllter
-- Zeichenarten (Großbuchstaben/Kleinbuchstaben/Zahlen/Sonderzeichen, immer
-- diese 4, konfigurierbar ist nur wie viele davon Pflicht sind) und eine
-- Wiederverwendungssperre in Tagen. Wie email_settings/app_settings ein
-- Singleton, Schreibzugriff bewusst hart auf admin (nicht über
-- role_permissions, gleicher Selbstschutz-Grund wie in 0022 dokumentiert).
-- Lesen ist für jeden aktiven User erlaubt, da das Passwort-Ändern-Formular
-- (auch für normale User) die aktuelle Richtlinie anzeigen muss.

create table public.password_policy (
  id uuid primary key default '00000000-0000-0000-0000-000000000003',
  min_length integer not null default 8 check (min_length between 6 and 128),
  min_character_classes integer not null default 3 check (min_character_classes between 1 and 4),
  reuse_days integer not null default 60 check (reuse_days between 0 and 3650),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint password_policy_singleton check (id = '00000000-0000-0000-0000-000000000003')
);

alter table public.password_policy enable row level security;

create policy password_policy_select on public.password_policy
  for select
  using (public.current_user_active());

create policy password_policy_insert on public.password_policy
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy password_policy_update on public.password_policy
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

insert into public.password_policy (id) values ('00000000-0000-0000-0000-000000000003');

-- Passwort-Historie für die Wiederverwendungssperre: enthält ausschließlich
-- bcrypt-Hashes (pgcrypto, bereits seit 0001 aktiviert), niemals Klartext.
-- Bewusst KEINE RLS-Policies – die Tabelle ist damit für jeden Client
-- (auch Admins über den normalen Client) komplett unzugänglich, nur die
-- Edge Functions (service_role, umgeht RLS) und die beiden untenstehenden
-- SECURITY DEFINER-Funktionen dürfen sie lesen/schreiben.
create table public.password_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.password_history enable row level security;

create index password_history_user_id_created_at_idx on public.password_history (user_id, created_at desc);

-- Prüft, ob p_candidate innerhalb des konfigurierten Wiederverwendungs-
-- Fensters bereits als Passwort desselben Users verwendet wurde. Bewusst nur
-- für service_role ausführbar (Edge Functions) – ein normaler authenticated
-- Client dürfte sonst für BELIEBIGE user_id durchprobieren, ob ein geratenes
-- Passwort zu jemandes Historie passt (Orakel-Angriff).
create or replace function public.check_password_reuse(p_user_id uuid, p_candidate text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reuse_days integer;
begin
  select reuse_days into v_reuse_days from public.password_policy limit 1;
  if v_reuse_days is null or v_reuse_days <= 0 then
    return false;
  end if;

  return exists (
    select 1 from public.password_history
    where user_id = p_user_id
      and created_at >= now() - (v_reuse_days || ' days')::interval
      and password_hash = crypt(p_candidate, password_hash)
  );
end;
$$;

revoke all on function public.check_password_reuse(uuid, text) from public;
grant execute on function public.check_password_reuse(uuid, text) to service_role;

create or replace function public.record_password_history(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.password_history (user_id, password_hash)
  values (p_user_id, crypt(p_password, gen_salt('bf')));
end;
$$;

revoke all on function public.record_password_history(uuid, text) from public;
grant execute on function public.record_password_history(uuid, text) to service_role;

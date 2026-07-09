-- Admin-konfigurierbares Sitzungs-Zeitlimit (Default 8 Stunden). Wie
-- email_settings/app_settings/password_policy ein Singleton, Schreibzugriff
-- bewusst hart auf admin (nicht über role_permissions, gleicher
-- Selbstschutz-Grund wie in 0022 dokumentiert). Lesen ist für jeden aktiven
-- User erlaubt, da der clientseitige Timeout-Check die konfigurierte Dauer
-- kennen muss.
create table public.session_policy (
  id uuid primary key default '00000000-0000-0000-0000-000000000004',
  max_duration_hours integer not null default 8 check (max_duration_hours between 1 and 168),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint session_policy_singleton check (id = '00000000-0000-0000-0000-000000000004')
);

alter table public.session_policy enable row level security;

create policy session_policy_select on public.session_policy
  for select
  using (public.current_user_active());

create policy session_policy_insert on public.session_policy
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy session_policy_update on public.session_policy
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

insert into public.session_policy (id) values ('00000000-0000-0000-0000-000000000004');

-- Startzeitpunkt je einzelner Sitzung (JWT session_id-Claim, bleibt über alle
-- Access-Token-Refreshes hinweg stabil). Bewusst KEINE Policies für normale
-- Clients (analog password_history in 0032) – nur die beiden SECURITY
-- DEFINER-Funktionen unten dürfen lesen/schreiben, kein Client darf fremde
-- oder die eigene Sitzungs-Startzeit direkt manipulieren.
create table public.user_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.user_sessions enable row level security;

create index user_sessions_user_id_idx on public.user_sessions (user_id);

-- Prüft, ob die aktuelle Sitzung (JWT session_id) noch innerhalb der
-- konfigurierten Sitzungsdauer liegt. Fällt bewusst "fail open" (true)
-- zurück, wenn der session_id-Claim fehlt oder die Sitzung noch nicht
-- registriert wurde (kurzes Fenster direkt nach dem Login, siehe
-- register_session()) – die clientseitige Prüfung in AuthProvider.tsx
-- bleibt in diesen Randfällen die primäre Durchsetzung, diese Funktion ist
-- die zusätzliche serverseitige Absicherung, kein alleiniger Türsteher.
create or replace function public.current_session_valid()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_session_id uuid;
  v_started_at timestamptz;
  v_max_hours integer;
begin
  v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  if v_session_id is null then
    return true;
  end if;

  select started_at into v_started_at from public.user_sessions where session_id = v_session_id;
  if v_started_at is null then
    return true;
  end if;

  select max_duration_hours into v_max_hours from public.session_policy limit 1;
  return now() - v_started_at <= (coalesce(v_max_hours, 8) || ' hours')::interval;
end;
$$;

-- Registriert die aktuelle Sitzung beim ersten Aufruf (on conflict do
-- nothing: spätere Aufrufe bei Reload/Token-Refresh sind No-Ops und
-- verlängern die Frist nicht). Räumt beiläufig eigene Sitzungen älter als
-- 30 Tage auf, kein separater Cron-Job nötig bei dieser App-Größe.
create or replace function public.register_session()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  if v_session_id is null or auth.uid() is null then
    return;
  end if;

  insert into public.user_sessions (session_id, user_id, started_at)
  values (v_session_id, auth.uid(), now())
  on conflict (session_id) do nothing;

  delete from public.user_sessions
  where user_id = auth.uid() and started_at < now() - interval '30 days';
end;
$$;

revoke all on function public.register_session() from public;
grant execute on function public.register_session() to authenticated;

-- Zentrale RLS-Gate-Funktion (siehe 0001_roles_profiles.sql) wird um die
-- Sitzungs-Ablauf-Prüfung erweitert – da current_user_active() bereits in
-- praktisch jeder Policy der App verwendet wird, sperrt eine abgelaufene
-- Sitzung damit automatisch überall, ohne dass eine einzige bestehende
-- Policy angefasst werden muss.
create or replace function public.current_user_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((select is_active from public.profiles where id = auth.uid()), false)
    and public.current_session_valid();
$$;

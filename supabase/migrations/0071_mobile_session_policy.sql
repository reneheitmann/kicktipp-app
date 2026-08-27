-- Eigenes, deutlich längeres Sitzungslimit für die mobile App (iOS/Android,
-- siehe mobile/) zusätzlich zum bestehenden Web-Limit (max_duration_hours,
-- 0043_session_policy.sql): ein Handy bleibt typischerweise über Tage/
-- Wochen eingeloggt ("wie eine normale App"), während das Web-Limit bewusst
-- kurz gehalten wird (max. 7 Tage). Eigene, höhere Obergrenze (bis zu einem
-- Jahr statt 7 Tage), admin-konfigurierbar wie das bestehende Feld.
alter table public.session_policy
  add column mobile_max_duration_hours integer not null default 720
    check (mobile_max_duration_hours between 1 and 8760);

-- user_sessions braucht eine Plattform-Markierung, damit
-- current_session_valid() weiß, welches der beiden Limits für die jeweilige
-- Sitzung gilt – ohne diese Spalte würde jede Sitzung serverseitig
-- weiterhin gegen max_duration_hours (Web) geprüft: das mobile Limit hätte
-- dann nur clientseitig Wirkung (siehe AuthProvider.tsx), RLS-Zugriffe der
-- mobile App würden aber spätestens nach dem Web-Limit fehlschlagen, obwohl
-- die App den User eigentlich noch länger eingeloggt lassen will/soll.
create type public.session_platform as enum ('web', 'mobile');

alter table public.user_sessions
  add column platform public.session_platform not null default 'web';

-- Alte Signatur (ohne Plattform-Argument) entfernen – ein Aufruf ohne
-- Argument (z. B. durch einen noch nicht aktualisierten Client) soll klar
-- fehlschlagen statt still mit der falschen Standard-Plattform zu laufen.
drop function if exists public.register_session();

create or replace function public.register_session(p_platform public.session_platform default 'web')
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

  insert into public.user_sessions (session_id, user_id, started_at, platform)
  values (v_session_id, auth.uid(), now(), p_platform)
  on conflict (session_id) do nothing;

  -- Aufräum-Fenster von 30 auf 400 Tage angehoben: das neue mobile Limit
  -- kann bis zu 365 Tage (8760h) betragen – die Zeilen dürfen nicht schon
  -- vorher verschwinden (current_session_valid() fällt sonst "fail open"
  -- zurück, siehe dort, macht die Sitzung dann ungewollt zeitlich
  -- unbegrenzt statt sie korrekt ablaufen zu lassen).
  delete from public.user_sessions
  where user_id = auth.uid() and started_at < now() - interval '400 days';
end;
$$;

revoke all on function public.register_session(public.session_platform) from public;
grant execute on function public.register_session(public.session_platform) to authenticated;

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
  v_platform public.session_platform;
  v_max_hours integer;
begin
  v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  if v_session_id is null then
    return true;
  end if;

  select started_at, platform into v_started_at, v_platform
  from public.user_sessions where session_id = v_session_id;
  if v_started_at is null then
    return true;
  end if;

  if v_platform = 'mobile' then
    select mobile_max_duration_hours into v_max_hours from public.session_policy limit 1;
  else
    select max_duration_hours into v_max_hours from public.session_policy limit 1;
  end if;

  return now() - v_started_at <= (coalesce(v_max_hours, 8) || ' hours')::interval;
end;
$$;

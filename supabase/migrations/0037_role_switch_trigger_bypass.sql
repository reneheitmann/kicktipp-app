-- Behebt einen Bug in 0036: der BEFORE-UPDATE-Trigger aus 0010
-- (protect_profile_privileged_fields) setzt role/is_active bei jedem Update
-- zurück, sobald die AKTUELLE Rolle zum Zeitpunkt des Trigger-Laufs nicht
-- 'admin' ist – als Schutz gegen Selbst-Hochstufung durch normale User. Das
-- greift aber auch bei switch_back_to_base_role(): dort ist die aktuelle
-- Rolle zu diesem Zeitpunkt noch 'user' (die Funktion versucht ja gerade,
-- sie zurück auf z. B. 'admin' zu setzen), der Trigger erkennt also
-- fälschlich "kein Admin" und wirft die role-Änderung wieder zurück – nur
-- base_role wird geändert (nicht vom Trigger geschützt), role bleibt
-- fälschlich 'user' hängen. Empirisch auf der Produktions-DB bestätigt.
--
-- Fix: ein transaktionslokales Session-Flag, das genau diese beiden bereits
-- selbst geprüften Funktionen setzen, bevor sie profiles aktualisieren – der
-- Trigger überspringt seinen Schutz nur, wenn dieses Flag gesetzt ist. Für
-- jeden anderen Aufrufer (normaler Client-Update, auch über die
-- profiles_update_own-Policy) bleibt der Schutz unverändert scharf.

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if public.current_user_role() <> 'admin'
     and coalesce(current_setting('app.role_switch_in_progress', true), 'false') <> 'true' then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create or replace function public.switch_to_user_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_base_role public.user_role;
begin
  select role, base_role into v_role, v_base_role
  from public.profiles
  where id = auth.uid()
  for update;

  if v_role is null then
    raise exception 'Profil nicht gefunden.';
  end if;

  if v_base_role is not null then
    raise exception 'Bereits im Spieler-Modus.';
  end if;

  if v_role not in ('admin', 'spielleiter') then
    raise exception 'Nur Admin/Spielleiter können in die Spieler-Rolle wechseln.';
  end if;

  perform set_config('app.role_switch_in_progress', 'true', true);

  update public.profiles
  set role = 'user', base_role = v_role
  where id = auth.uid();
end;
$$;

create or replace function public.switch_back_to_base_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_role public.user_role;
begin
  select base_role into v_base_role
  from public.profiles
  where id = auth.uid()
  for update;

  if v_base_role is null then
    raise exception 'Kein Rollenwechsel aktiv.';
  end if;

  perform set_config('app.role_switch_in_progress', 'true', true);

  update public.profiles
  set role = v_base_role, base_role = null
  where id = auth.uid();
end;
$$;

drop function if exists public.debug_switch_back();

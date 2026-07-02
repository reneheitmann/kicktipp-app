-- Echter Rollenwechsel für Admin/Spielleiter in die Rolle "user" und zurück,
-- ersetzt die bisherige rein clientseitige "Spieler-Vorschau" (viewAsUser),
-- die nur can()-Ergebnisse simulierte, aber die echte DB-Session admin ließ –
-- RLS griff dadurch nie wirklich mit (siehe die Nachbau-Patches, die genau
-- deswegen kurz zuvor in seasonVisibility.ts nötig waren). Ein echter Wechsel
-- ändert profiles.role tatsächlich, sodass jede bestehende RLS-Policy correct
-- greift, ganz ohne solche Sonderfälle im Frontend nachzubauen.

alter table public.profiles add column base_role public.user_role;

comment on column public.profiles.base_role is
  'Ursprüngliche Rolle, während switch_to_user_role() aktiv ist (NULL = normaler Zustand, keine gewechselte Rolle). Wird von switch_back_to_base_role() zum Zurückwechseln genutzt.';

-- SECURITY DEFINER statt eines normalen Updates über die profiles_update-
-- Policy: die Policy prüft "with check (current_user_role() = 'admin')" –
-- bei einem Self-Update auf die eigene Zeile sieht current_user_role()
-- innerhalb desselben Statements bereits die NEUE Rolle, ein Wechsel auf
-- 'user' würde die eigene WITH-CHECK-Bedingung also selbst zu Fall bringen
-- (klassische RLS-Rekursionsfalle). Die Funktion prüft die Berechtigung
-- deshalb selbst, vor der Änderung, und ist ausschließlich auf auth.uid()
-- beschränkt (kein Parameter für eine fremde user_id).
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

  update public.profiles
  set role = v_base_role, base_role = null
  where id = auth.uid();
end;
$$;

grant execute on function public.switch_to_user_role() to authenticated;
grant execute on function public.switch_back_to_base_role() to authenticated;

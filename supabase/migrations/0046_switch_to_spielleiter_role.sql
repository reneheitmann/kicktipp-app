-- Erweitert den echten Rollenwechsel aus 0036/0037: bisher konnten
-- Admin/Spielleiter nur in die Rolle "user" wechseln. Der Mechanismus
-- (Basis-Rolle merken, Rolle setzen, später zurückwechseln) war dabei
-- bereits rollen-unabhängig, nur die Zielrolle war hart auf 'user' codiert.
-- switch_to_user_role() wird durch eine parametrisierte Variante mit
-- Hierarchie-Prüfung ersetzt: admin -> spielleiter oder user,
-- spielleiter -> nur user (kein Weg zu admin, das wäre eine
-- Rechteausweitung statt einer Vorschau "nach unten").
create or replace function public.switch_to_role(p_target_role public.user_role)
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
    raise exception 'Bereits im Rollenwechsel-Modus.';
  end if;

  if v_role = 'admin' then
    if p_target_role not in ('spielleiter', 'user') then
      raise exception 'Nur Wechsel zu Spielleiter oder Spieler möglich.';
    end if;
  elsif v_role = 'spielleiter' then
    if p_target_role <> 'user' then
      raise exception 'Nur Wechsel zur Spieler-Rolle möglich.';
    end if;
  else
    raise exception 'Nur Admin/Spielleiter können die Rolle wechseln.';
  end if;

  -- Session-lokales Flag (siehe 0037): protect_profile_privileged_fields()
  -- überspringt seinen Selbst-Hochstufungsschutz nur, wenn dieses Flag
  -- gesetzt ist, unabhängig von der Zielrolle.
  perform set_config('app.role_switch_in_progress', 'true', true);

  update public.profiles
  set role = p_target_role, base_role = v_role
  where id = auth.uid();
end;
$$;

grant execute on function public.switch_to_role(public.user_role) to authenticated;

drop function if exists public.switch_to_user_role();

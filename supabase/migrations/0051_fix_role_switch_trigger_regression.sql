-- Behebt eine Regression aus 0050_users_manage_permission.sql: die dortige
-- create-or-replace-Neufassung von protect_profile_privileged_fields() hat
-- den in 0037 eingeführten Bypass über app.role_switch_in_progress verloren
-- (0050 wurde versehentlich auf Basis der ursprünglichen 0010-Fassung
-- geschrieben, ohne die zwischenzeitliche 0037-Änderung zu berücksichtigen).
--
-- Auswirkung: switch_back_to_base_role() (die "Zurück zu Administrator"/
-- "Zurück zu Spielleiter"-Funktion aus 0037/0046) schlug für jeden fehl, der
-- gerade in eine niedrigere Rolle gewechselt war und dort nicht zufällig
-- users.manage besaß – der Trigger erkannte fälschlich "kein Admin, keine
-- Berechtigung" und setzte role beim Zurückwechseln wieder auf den alten
-- (niedrigeren) Wert zurück, exakt der Bug, den 0037 ursprünglich behoben
-- hatte. Empirisch reproduziert: ein Admin, der versuchsweise per
-- switch_to_role('spielleiter') in die Spielleiter-Rolle wechselte, kam über
-- die App nicht mehr zurück.
--
-- Fix: den Flag-Bypass zuerst prüfen (identisch zu 0037), erst danach admin-
-- bzw. users.manage-Zweig wie in 0050.

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.role_switch_in_progress', true), 'false') = 'true' then
    return new;
  end if;

  if public.current_user_role() = 'admin' then
    return new;
  end if;

  if public.current_user_has_permission('users.manage') and old.role <> 'admin' and new.role <> 'admin' then
    return new;
  end if;

  new.role := old.role;
  new.is_active := old.is_active;
  return new;
end;
$$;

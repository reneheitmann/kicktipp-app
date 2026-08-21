-- SICHERHEITSKRITISCH, siehe auch supabase/tests/database/role_switch.test.sql:
-- diese Funktion wurde bereits einmal durch eine unabhängige, fachlich
-- nicht damit zusammenhängende Migration (0050_users_manage_permission.sql)
-- versehentlich auf eine ältere Fassung zurückgesetzt, wodurch der
-- Rollenwechsel-Bypass aus 0037_role_switch_trigger_bypass.sql verloren
-- ging (0050 wurde auf Basis der ursprünglichen 0010-Fassung geschrieben,
-- ohne die zwischenzeitliche 0037-Änderung zu berücksichtigen) – siehe
-- 0051_fix_role_switch_trigger_regression.sql für die Korrektur und die
-- volle Fehlerbeschreibung. Diese Migration ändert an der Logik von 0051
-- nichts, ergänzt nur diesen Kommentar, damit er dauerhaft an der Funktion
-- hängt (ein Kommentar in einer älteren, bereits angewendeten Migration
-- würde bei einem künftigen create-or-replace nicht automatisch
-- mitkopiert, siehe genau dieses Muster als Ursache der 0050-Regression).
--
-- Vor jeder erneuten create-or-replace-Änderung an dieser Funktion:
-- 1. Diese Migration (letzte Fassung) als Ausgangspunkt nehmen, nicht 0010
--    oder 0037 – beide sind ältere Zwischenstände.
-- 2. supabase/tests/database/role_switch.test.sql muss danach weiterhin
--    grün sein (prüft genau den 0051-Regressionspfad end-to-end, inkl.
--    Spielleiter- und users.manage-Fällen).
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

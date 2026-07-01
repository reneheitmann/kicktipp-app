-- Erlaubt jedem aktiven User, das eigene Profil zu bearbeiten (Name) – die
-- "eigene Benutzerverwaltung" als einzige Ausnahme vom sonst reinen
-- Lesezugriff für die Rolle "user". Rolle und Sperrstatus dürfen dabei
-- niemals durch den User selbst verändert werden (sonst könnte sich z. B.
-- ein User selbst zum Admin machen oder eine Sperre aufheben) – ein
-- BEFORE-UPDATE-Trigger setzt diese beiden Felder bei Nicht-Admins immer auf
-- den bisherigen Wert zurück, unabhängig davon, was im Update mitgeschickt
-- wurde. Admins bleiben über die bestehende profiles_update-Policy weiterhin
-- uneingeschränkt.

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if public.current_user_role() <> 'admin' then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileged_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

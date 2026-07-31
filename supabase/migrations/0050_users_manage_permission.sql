-- Öffnet die Benutzerverwaltung (bisher hart auf role = 'admin' verdrahtet)
-- für Spielleiter, sofern ein Admin ihnen das granulare Recht 'users.manage'
-- explizit gewährt (siehe permissionCatalog.ts, Rollen & Berechtigungen).
--
-- Anders als bei den bisherigen *.manage-Rechten (0022) ist hier eine echte
-- Rechteausweitungsgefahr zu schließen: ohne weitere Sperre könnte ein
-- berechtigter Spielleiter über die normale Bearbeiten-UI jedem (auch sich
-- selbst) die Rolle 'admin' geben, oder ein bestehendes Admin-Konto
-- editieren/sperren. Deshalb bleiben Admin-Zeilen für 'users.manage' ohne
-- echte Admin-Rolle komplett tabu – sowohl in der RLS-Policy als auch im
-- Trigger, der bislang ausschließlich role='admin' privilegierte.
--
-- 'page.users.view' folgt dem Muster aus 0029 (Sichtbarkeits-Schalter,
-- unabhängig von der Aktionsrecht-Prüfung, UND-verknüpft im Frontend).

alter table public.role_permissions
  drop constraint role_permissions_permission_key_check;

alter table public.role_permissions
  add constraint role_permissions_permission_key_check check (permission_key in (
    'seasons.manage',
    'matchdays.manage',
    'participants.manage',
    'matchday_entries.manage',
    'payouts.manage',
    'rankings.manage',
    'players.manage',
    'accounts.manage',
    'balance_transfer.manage',
    'import.use',
    'email.send',
    'page.dashboard.view',
    'page.seasons.view',
    'page.vergleich.view',
    'page.players.view',
    'page.accounts.view',
    'page.import.view',
    'page.email_send.view',
    'users.manage',
    'page.users.view'
  ));

-- Seed: admin unverändert erlaubt (heutiges Verhalten), spielleiter/user
-- bewusst false – anders als die 0022-Legacy-Rechte war Benutzerverwaltung
-- für Spielleiter nie erlaubt, das ändert sich erst durch aktives Freigeben.
insert into public.role_permissions (role, permission_key, granted)
select r.role, k.permission_key, r.granted
from (
  values
    ('admin'::public.user_role, true),
    ('spielleiter'::public.user_role, false),
    ('user'::public.user_role, false)
) as r(role, granted)
cross join (
  values ('users.manage'), ('page.users.view')
) as k(permission_key);

-- profiles_select: berechtigte Spielleiter dürfen alle Profile lesen (auch
-- Admin-Zeilen, für UI-Transparenz – der Schreibschutz kommt aus der
-- Update-Policy/dem Trigger unten, nicht aus dem Verstecken von Zeilen).
alter policy profiles_select on public.profiles
  using (
    id = auth.uid()
    or (public.current_user_role() = 'admin' and public.current_user_active())
    or (public.current_user_has_permission('users.manage') and public.current_user_active())
  );

-- profiles_update: zusätzlicher Zweig für users.manage, aber sowohl in
-- using (Ziel-Zeile) als auch with check (neue Zeile) mit "role <> 'admin'"
-- abgesichert – ein berechtigter Spielleiter kann damit weder ein
-- bestehendes Admin-Konto anfassen noch irgendjemanden zu 'admin' machen.
alter policy profiles_update on public.profiles
  using (
    (public.current_user_role() = 'admin' and public.current_user_active())
    or (public.current_user_has_permission('users.manage') and public.current_user_active() and role <> 'admin')
  )
  with check (
    (public.current_user_role() = 'admin' and public.current_user_active())
    or (public.current_user_has_permission('users.manage') and public.current_user_active() and role <> 'admin')
  );

-- Trigger-Defense-in-Depth: bislang durften ausschließlich echte Admins
-- role/is_active verändern (alles andere wurde stillschweigend auf den
-- alten Wert zurückgesetzt). Jetzt zusätzlich erlaubt für users.manage,
-- aber weiterhin hart blockiert, sobald altes oder neues role='admin' ist.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
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

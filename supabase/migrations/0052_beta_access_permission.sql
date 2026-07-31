-- Neues granulares Recht 'beta.access': schaltet den Zugriff auf das
-- Beta-Bundle frei (ausgeliefert unter /beta/ desselben Containers, siehe
-- App.tsx/vite.config.ts) – anders als bei den bisherigen Modulen ist Beta
-- keine Seite *innerhalb* der App, sondern ein eigenes, komplettes Bundle,
-- daher reicht ein einzelner Schlüssel ohne gepaarte page.*.view-Berechtigung.
--
-- Seed: admin=true (Admins haben ohnehin überall Zugriff), spielleiter/user
-- bewusst false – Opt-in, ein Admin muss es über Rollen & Berechtigungen
-- aktiv vergeben.

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
    'page.users.view',
    'beta.access'
  ));

insert into public.role_permissions (role, permission_key, granted)
values
  ('admin', 'beta.access', true),
  ('spielleiter', 'beta.access', false),
  ('user', 'beta.access', false);

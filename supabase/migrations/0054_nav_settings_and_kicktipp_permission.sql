-- Zwei zusammengehörige Ergänzungen im selben Feature-Paket:
--
-- 1. 'page.kicktipp.view' – neue Inhaltsseite, die die Kicktipp-Gruppenseite
--    per offiziellem Kicktipp-Widget-Script einbettet (siehe
--    src/features/kicktipp-widget/KicktippWidgetPage.tsx). Reine
--    Anzeigeseite ohne Schreibzugriff, daher wie Dashboard/Saisons/Vergleich
--    nur ein page.*.view-Schlüssel ohne gepaartes Aktionsrecht. Seed: für
--    alle drei Rollen true (per Default sichtbar, admin kann sie pro Rolle
--    ausblenden).
--
-- 2. 'nav_settings' – admin-editierbare Menü-Reihenfolge. Singleton-Tabelle
--    nach demselben Muster wie session_policy/app_settings/password_policy:
--    Lesen für jeden aktiven User (jeder braucht die Reihenfolge für die
--    eigene Navigation), Schreiben hart auf admin verdrahtet (nicht über
--    role_permissions – gleicher Selbstschutz-Grund wie bei
--    app_settings/email_settings, siehe 0022: eine global wirksame
--    Einstellung mit großem Blast-Radius, kein Vorteil durch
--    Delegierbarkeit). item_order ist ein einfaches Array von
--    navItems.ts-"to"-Pfaden, wird bei jeder Änderung komplett neu
--    geschrieben statt einer Zeile pro Menüpunkt – die Liste ist klein.

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
    'beta.access',
    'page.kicktipp.view'
  ));

insert into public.role_permissions (role, permission_key, granted)
values
  ('admin', 'page.kicktipp.view', true),
  ('spielleiter', 'page.kicktipp.view', true),
  ('user', 'page.kicktipp.view', true);

create table public.nav_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000005',
  item_order text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint nav_settings_singleton check (id = '00000000-0000-0000-0000-000000000005')
);

alter table public.nav_settings enable row level security;

create policy nav_settings_select on public.nav_settings
  for select
  using (public.current_user_active());

create policy nav_settings_insert on public.nav_settings
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy nav_settings_update on public.nav_settings
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

insert into public.nav_settings (id) values ('00000000-0000-0000-0000-000000000005');

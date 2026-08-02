-- Spielleiter sollen (opt-in, admin-delegiert) Logins mit Spielern
-- verknüpfen/trennen können, z. B. wenn ein Elternteil den Zugang für ein
-- Kind verwaltet. Bisher war player_profile_links (0041) hart admin-only
-- verdrahtet. Gleiches Delegations-Muster wie users.manage (0050): neuer
-- Permission-Key, Standard admin=true/spielleiter=false/user=false, RLS
-- bekommt einen zusätzlichen current_user_has_permission()-Zweig neben dem
-- unveränderten Admin-Zweig.
--
-- Sicherheitsfund: is_own_player() (0041) prüft direkt gegen
-- player_profile_links, und darauf bauen die Lese-Policies von
-- season_participants/matchday_entries/transactions/zahlungen auf. Ohne
-- Schutz könnte sich ein nur mit players.link_logins ausgestatteter
-- Spielleiter selbst mit einem beliebigen Spieler verknüpfen und dessen
-- private Finanzdaten lesen – eine Rechteausweitung. Deshalb blockiert der
-- Insert-Zweig zusätzlich profile_id = auth.uid() (nur in der
-- Berechtigungs-Variante; ein echter Admin darf sich weiterhin selbst
-- verknüpfen). Der Delete-Zweig braucht diesen Schutz nicht.

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
    'page.kicktipp.view',
    'players.link_logins'
  ));

insert into public.role_permissions (role, permission_key, granted)
values
  ('admin', 'players.link_logins', true),
  ('spielleiter', 'players.link_logins', false),
  ('user', 'players.link_logins', false);

alter policy player_profile_links_insert on public.player_profile_links
  with check (
    ((select current_user_role()) = 'admin' and (select current_user_active()))
    or (
      (select current_user_has_permission('players.link_logins'))
      and (select current_user_active())
      and profile_id <> (select auth.uid())
    )
  );

alter policy player_profile_links_delete on public.player_profile_links
  using (
    ((select current_user_role()) = 'admin' and (select current_user_active()))
    or ((select current_user_has_permission('players.link_logins')) and (select current_user_active()))
  );

-- Performance-Audit (siehe pg_stat_statements): drei Ursachen identifiziert,
-- keine davon ist Datenvolumen (alle Tabellen < 3.100 Zeilen). Diese
-- Migration behebt die beiden DB-seitigen Ursachen, reine
-- Verhaltensgleichheit (keine Policy ändert WAS erlaubt ist, nur WIE
-- effizient Postgres es auswertet).

-- 1) Fehlende Indizes auf FK-Spalten, die tatsächlich gefiltert werden.
create index season_participants_player_id_idx on public.season_participants (player_id);
create index matchday_entries_player_id_idx on public.matchday_entries (player_id);
create index transactions_matchday_id_idx on public.transactions (matchday_id);
create index matchday_rankings_player_id_idx on public.matchday_rankings (player_id);
create index season_rankings_player_id_idx on public.season_rankings (player_id);

-- 2) RLS-Policy-Funktionsaufrufe cachen: `fn(...)` -> `(select fn(...))`.
-- Offizielles Supabase-RLS-Performance-Pattern (siehe
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select-statements) –
-- ohne das Wrapping kann Postgres current_user_role()/current_user_active()/
-- current_user_has_permission()/is_own_player()/is_season_participant()
-- nicht zuverlässig pro Statement cachen. ALTER POLICY ändert nur den
-- USING/WITH-CHECK-Ausdruck, nicht Policy-Identität, Rechte oder Befehlstyp.

alter policy app_logs_delete on public.app_logs
  using ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy app_logs_select on public.app_logs
  using ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy app_settings_insert on public.app_settings
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy app_settings_update on public.app_settings
  using ((select current_user_role()) = 'admin' and (select current_user_active()))
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy email_settings_insert on public.email_settings
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy email_settings_select on public.email_settings
  using ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy email_settings_update on public.email_settings
  using ((select current_user_role()) = 'admin' and (select current_user_active()))
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy email_templates_delete on public.email_templates
  using ((select current_user_has_permission('email.send')) and (select current_user_active()));
alter policy email_templates_insert on public.email_templates
  with check ((select current_user_has_permission('email.send')) and (select current_user_active()));
alter policy email_templates_select on public.email_templates
  using ((select current_user_has_permission('email.send')) and (select current_user_active()));
alter policy email_templates_update on public.email_templates
  using ((select current_user_has_permission('email.send')) and (select current_user_active()))
  with check ((select current_user_has_permission('email.send')) and (select current_user_active()));

alter policy kicktipp_imports_delete on public.kicktipp_imports
  using ((select current_user_has_permission('import.use')) and (select current_user_active()));
alter policy kicktipp_imports_insert on public.kicktipp_imports
  with check ((select current_user_has_permission('import.use')) and (select current_user_active()));
alter policy kicktipp_imports_select on public.kicktipp_imports
  using ((select current_user_has_permission('import.use')) and (select current_user_active()));
alter policy kicktipp_imports_update on public.kicktipp_imports
  using ((select current_user_has_permission('import.use')) and (select current_user_active()))
  with check ((select current_user_has_permission('import.use')) and (select current_user_active()));

alter policy matchday_entries_delete on public.matchday_entries
  using ((select current_user_has_permission('matchday_entries.manage')) and (select current_user_active()));
alter policy matchday_entries_insert on public.matchday_entries
  with check ((select current_user_has_permission('matchday_entries.manage')) and (select current_user_active()));
alter policy matchday_entries_select on public.matchday_entries
  using (
    ((select current_user_role()) = any (array['admin'::user_role, 'spielleiter'::user_role]) and (select current_user_active()))
    or ((select is_own_player(player_id)) and (select current_user_active()))
  );
alter policy matchday_entries_update on public.matchday_entries
  using ((select current_user_has_permission('matchday_entries.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('matchday_entries.manage')) and (select current_user_active()));

alter policy matchday_rankings_delete on public.matchday_rankings
  using ((select current_user_has_permission('rankings.manage')) and (select current_user_active()));
alter policy matchday_rankings_insert on public.matchday_rankings
  with check ((select current_user_has_permission('rankings.manage')) and (select current_user_active()));
alter policy matchday_rankings_select on public.matchday_rankings
  using (
    ((select current_user_role()) = any (array['admin'::user_role, 'spielleiter'::user_role]) and (select current_user_active()))
    or ((select current_user_active()) and (exists (
      select 1 from matchdays m where m.id = matchday_rankings.matchday_id and (select is_season_participant(m.season_id))
    )))
  );
alter policy matchday_rankings_update on public.matchday_rankings
  using ((select current_user_has_permission('rankings.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('rankings.manage')) and (select current_user_active()));

alter policy matchdays_delete on public.matchdays
  using ((select current_user_has_permission('matchdays.manage')) and (select current_user_active()));
alter policy matchdays_insert on public.matchdays
  with check ((select current_user_has_permission('matchdays.manage')) and (select current_user_active()));
alter policy matchdays_select on public.matchdays
  using (
    ((select current_user_has_permission('matchdays.manage')) and (select current_user_active()))
    or ((select is_season_participant(season_id)) and (select current_user_active()))
  );
alter policy matchdays_update on public.matchdays
  using ((select current_user_has_permission('matchdays.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('matchdays.manage')) and (select current_user_active()));

alter policy password_policy_insert on public.password_policy
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy password_policy_select on public.password_policy
  using ((select current_user_active()));
alter policy password_policy_update on public.password_policy
  using ((select current_user_role()) = 'admin' and (select current_user_active()))
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy payout_rules_delete on public.payout_rules
  using ((select current_user_has_permission('payouts.manage')) and (select current_user_active()));
alter policy payout_rules_insert on public.payout_rules
  with check ((select current_user_has_permission('payouts.manage')) and (select current_user_active()));
alter policy payout_rules_select on public.payout_rules
  using ((select current_user_active()));
alter policy payout_rules_update on public.payout_rules
  using ((select current_user_has_permission('payouts.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('payouts.manage')) and (select current_user_active()));

alter policy player_profile_links_delete on public.player_profile_links
  using ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy player_profile_links_insert on public.player_profile_links
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy player_profile_links_select on public.player_profile_links
  using (
    ((select current_user_role()) = 'admin' and (select current_user_active()))
    or (profile_id = (select auth.uid()) and (select current_user_active()))
  );

alter policy players_delete on public.players
  using ((select current_user_has_permission('players.manage')) and (select current_user_active()));
alter policy players_insert on public.players
  with check ((select current_user_has_permission('players.manage')) and (select current_user_active()));
alter policy players_select on public.players
  using ((select current_user_active()));
alter policy players_update on public.players
  using ((select current_user_has_permission('players.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('players.manage')) and (select current_user_active()));

alter policy profiles_select on public.profiles
  using (id = (select auth.uid()) or ((select current_user_role()) = 'admin' and (select current_user_active())));
alter policy profiles_update on public.profiles
  using ((select current_user_role()) = 'admin' and (select current_user_active()))
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy role_permissions_delete on public.role_permissions
  using ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy role_permissions_insert on public.role_permissions
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy role_permissions_select on public.role_permissions
  using ((select current_user_active()));
alter policy role_permissions_update on public.role_permissions
  using ((select current_user_role()) = 'admin' and (select current_user_active()))
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy season_participants_delete on public.season_participants
  using ((select current_user_has_permission('participants.manage')) and (select current_user_active()));
alter policy season_participants_insert on public.season_participants
  with check ((select current_user_has_permission('participants.manage')) and (select current_user_active()));
alter policy season_participants_select on public.season_participants
  using (
    ((select current_user_role()) = any (array['admin'::user_role, 'spielleiter'::user_role]) and (select current_user_active()))
    or ((select is_own_player(player_id)) and (select current_user_active()))
  );
alter policy season_participants_update on public.season_participants
  using ((select current_user_has_permission('participants.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('participants.manage')) and (select current_user_active()));

alter policy season_rankings_delete on public.season_rankings
  using ((select current_user_has_permission('rankings.manage')) and (select current_user_active()));
alter policy season_rankings_insert on public.season_rankings
  with check ((select current_user_has_permission('rankings.manage')) and (select current_user_active()));
alter policy season_rankings_select on public.season_rankings
  using (
    ((select current_user_role()) = any (array['admin'::user_role, 'spielleiter'::user_role]) and (select current_user_active()))
    or ((select is_season_participant(season_id)) and (select current_user_active()))
  );
alter policy season_rankings_update on public.season_rankings
  using ((select current_user_has_permission('rankings.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('rankings.manage')) and (select current_user_active()));

alter policy seasons_delete on public.seasons
  using ((select current_user_has_permission('seasons.manage')) and (select current_user_active()));
alter policy seasons_insert on public.seasons
  with check ((select current_user_has_permission('seasons.manage')) and (select current_user_active()));
alter policy seasons_select on public.seasons
  using (
    ((select current_user_has_permission('seasons.manage')) and (select current_user_active()))
    or ((select is_season_participant(id)) and (select current_user_active()))
  );
alter policy seasons_update on public.seasons
  using ((select current_user_has_permission('seasons.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('seasons.manage')) and (select current_user_active()));

alter policy session_policy_insert on public.session_policy
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));
alter policy session_policy_select on public.session_policy
  using ((select current_user_active()));
alter policy session_policy_update on public.session_policy
  using ((select current_user_role()) = 'admin' and (select current_user_active()))
  with check ((select current_user_role()) = 'admin' and (select current_user_active()));

alter policy transactions_delete_korrektur on public.transactions
  using (typ = 'korrektur' and (select current_user_has_permission('balance_transfer.manage')) and (select current_user_active()));
alter policy transactions_delete_gewinn on public.transactions
  using (
    typ = any (array['gewinn_gesamt'::transaction_typ, 'gewinn_spieltag'::transaction_typ])
    and (select current_user_has_permission('rankings.manage')) and (select current_user_active())
  );
alter policy transactions_insert_gewinn on public.transactions
  with check (
    typ = any (array['gewinn_gesamt'::transaction_typ, 'gewinn_spieltag'::transaction_typ])
    and (select current_user_has_permission('rankings.manage')) and (select current_user_active())
  );
alter policy transactions_insert_korrektur on public.transactions
  with check (typ = 'korrektur' and (select current_user_has_permission('balance_transfer.manage')) and (select current_user_active()));
alter policy transactions_select on public.transactions
  using (
    ((select current_user_role()) = any (array['admin'::user_role, 'spielleiter'::user_role]) and (select current_user_active()))
    or ((select is_own_player(player_id)) and (select current_user_active()))
    or (
      typ = any (array['gewinn_gesamt'::transaction_typ, 'gewinn_spieltag'::transaction_typ])
      and (select is_season_participant(season_id)) and (select current_user_active())
    )
  );
alter policy transactions_update_gewinn on public.transactions
  using (
    typ = any (array['gewinn_gesamt'::transaction_typ, 'gewinn_spieltag'::transaction_typ])
    and (select current_user_has_permission('rankings.manage')) and (select current_user_active())
  )
  with check (
    typ = any (array['gewinn_gesamt'::transaction_typ, 'gewinn_spieltag'::transaction_typ])
    and (select current_user_has_permission('rankings.manage')) and (select current_user_active())
  );
alter policy transactions_update_korrektur on public.transactions
  using (typ = 'korrektur' and (select current_user_has_permission('balance_transfer.manage')) and (select current_user_active()))
  with check (typ = 'korrektur' and (select current_user_has_permission('balance_transfer.manage')) and (select current_user_active()));

alter policy zahlungen_delete on public.zahlungen
  using ((select current_user_has_permission('accounts.manage')) and (select current_user_active()));
alter policy zahlungen_insert on public.zahlungen
  with check ((select current_user_has_permission('accounts.manage')) and (select current_user_active()));
alter policy zahlungen_select on public.zahlungen
  using (
    ((select current_user_has_permission('accounts.manage')) and (select current_user_active()))
    or ((select is_own_player(player_id)) and (select current_user_active()))
  );
alter policy zahlungen_update on public.zahlungen
  using ((select current_user_has_permission('accounts.manage')) and (select current_user_active()))
  with check ((select current_user_has_permission('accounts.manage')) and (select current_user_active()));

-- 3) get_payout_pool() liefert zusätzlich has_payouts, damit
-- PayoutRulesEditor.tsx nicht mehr zwei getrennte Round-Trips
-- (get_payout_pool + hasPayouts) für dieselben (season_id, typ)-Parameter
-- braucht.
drop function if exists public.get_payout_pool(uuid, public.payout_typ);

create function public.get_payout_pool(p_season_id uuid, p_typ public.payout_typ)
returns table(pool numeric, has_payouts boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.current_user_active() then
    raise exception 'Nicht berechtigt.';
  end if;

  return query
  select
    coalesce((
      select sum(
        case
          when p_typ = 'gesamtsieg' then gesamtsieg_einsatz_betrag
          else spieltags_einsatz_betrag * (select count(*) from public.matchdays where season_id = p_season_id)
        end
      )
      from public.season_participants
      where season_id = p_season_id
    ), 0),
    exists (
      select 1 from public.transactions
      where season_id = p_season_id
        and typ = (case when p_typ = 'gesamtsieg' then 'gewinn_gesamt' else 'gewinn_spieltag' end)::public.transaction_typ
    );
end;
$$;

grant execute on function public.get_payout_pool(uuid, public.payout_typ) to authenticated;

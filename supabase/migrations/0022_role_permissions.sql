-- Granulare, pro Rolle konfigurierbare Berechtigungen: löst das bisherige
-- pauschale "admin+spielleiter dürfen alles" ab, das in ~40 RLS-Policies
-- hartcodiert war. Die Menge der Rollen selbst bleibt fix (admin/spielleiter/
-- user) – konfigurierbar wird stattdessen, welche der 10 unten aufgeführten
-- Funktionen jede Rolle ausüben darf.
--
-- Bewusst NICHT über role_permissions gesteuert (bleiben hart auf
-- current_user_role() = 'admin' verdrahtet, wie bisher): Benutzerverwaltung
-- (profiles), E-Mail-Einstellungen (email_settings) und dieses Modul selbst
-- (siehe Policies unten). Grund: würde eines dieser drei Rechte versehentlich
-- per UI entzogen, gäbe es ohne DB-Direktzugriff keinen Weg mehr zurück.
--
-- Ebenfalls bewusst unverändert: die admin/spielleiter-Lesezweige von
-- season_participants_select und matchday_entries_select. Diese bleiben
-- rollenbasiert, damit calculate_matchday_payout/calculate_season_payout
-- (SECURITY INVOKER) niemals durch ein entzogenes Schreibrecht
-- (participants.manage/matchday_entries.manage) einen unvollständigen Topf
-- berechnen – Lese- und Schreibrecht sind hier bewusst entkoppelt.

create table public.role_permissions (
  role public.user_role not null,
  permission_key text not null check (permission_key in (
    'seasons.manage',
    'matchdays.manage',
    'participants.manage',
    'matchday_entries.manage',
    'payouts.manage',
    'rankings.manage',
    'players.manage',
    'accounts.manage',
    'balance_transfer.manage',
    'import.use'
  )),
  granted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (role, permission_key)
);

alter table public.role_permissions enable row level security;

-- SELECT offen für alle aktiven User: jeder Client muss die Grants der
-- eigenen Rolle lesen können, um can() clientseitig zu berechnen.
create policy role_permissions_select on public.role_permissions
  for select
  using (public.current_user_active());

-- INSERT/UPDATE/DELETE hart auf admin verdrahtet, bewusst NICHT über
-- current_user_has_permission() (siehe Kommentar oben – Selbstschutz vor
-- Aussperrung).
create policy role_permissions_insert on public.role_permissions
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy role_permissions_update on public.role_permissions
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy role_permissions_delete on public.role_permissions
  for delete
  using (public.current_user_role() = 'admin' and public.current_user_active());

-- Seed-Daten, die das heutige Verhalten exakt nachbilden (admin und
-- spielleiter wurden bislang überall identisch behandelt; user hatte nie
-- Schreibrechte auf diese Funktionen). Diese Migration ändert also zunächst
-- kein einziges Verhalten – erst eine spätere Anpassung über die neue
-- "Rollen & Berechtigungen"-Seite verändert etwas.
insert into public.role_permissions (role, permission_key, granted)
select r.role, k.permission_key, r.granted
from (
  values
    ('admin'::public.user_role, true),
    ('spielleiter'::public.user_role, true),
    ('user'::public.user_role, false)
) as r(role, granted)
cross join (
  values
    ('seasons.manage'), ('matchdays.manage'), ('participants.manage'),
    ('matchday_entries.manage'), ('payouts.manage'), ('rankings.manage'),
    ('players.manage'), ('accounts.manage'), ('balance_transfer.manage'), ('import.use')
) as k(permission_key);

create or replace function public.current_user_has_permission(p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select granted from public.role_permissions
     where role = public.current_user_role() and permission_key = p_key),
    false
  );
$$;

-- players: players.manage
alter policy players_insert on public.players
  with check (public.current_user_has_permission('players.manage') and public.current_user_active());

alter policy players_update on public.players
  using (public.current_user_has_permission('players.manage') and public.current_user_active())
  with check (public.current_user_has_permission('players.manage') and public.current_user_active());

alter policy players_delete on public.players
  using (public.current_user_has_permission('players.manage') and public.current_user_active());

-- seasons: seasons.manage (umfasst auch gesamtwertung_status, da RLS keine
-- spaltengenaue Aufteilung einer einzelnen UPDATE-Policy erlaubt)
alter policy seasons_insert on public.seasons
  with check (public.current_user_has_permission('seasons.manage') and public.current_user_active());

alter policy seasons_update on public.seasons
  using (public.current_user_has_permission('seasons.manage') and public.current_user_active())
  with check (public.current_user_has_permission('seasons.manage') and public.current_user_active());

alter policy seasons_delete on public.seasons
  using (public.current_user_has_permission('seasons.manage') and public.current_user_active());

-- matchdays: matchdays.manage
alter policy matchdays_insert on public.matchdays
  with check (public.current_user_has_permission('matchdays.manage') and public.current_user_active());

alter policy matchdays_update on public.matchdays
  using (public.current_user_has_permission('matchdays.manage') and public.current_user_active())
  with check (public.current_user_has_permission('matchdays.manage') and public.current_user_active());

alter policy matchdays_delete on public.matchdays
  using (public.current_user_has_permission('matchdays.manage') and public.current_user_active());

-- season_participants: participants.manage (nur insert/update/delete; die
-- select-Policy mit dem admin/spielleiter-Lesezweig bleibt bewusst
-- unverändert, siehe Kommentar oben)
alter policy season_participants_insert on public.season_participants
  with check (public.current_user_has_permission('participants.manage') and public.current_user_active());

alter policy season_participants_update on public.season_participants
  using (public.current_user_has_permission('participants.manage') and public.current_user_active())
  with check (public.current_user_has_permission('participants.manage') and public.current_user_active());

alter policy season_participants_delete on public.season_participants
  using (public.current_user_has_permission('participants.manage') and public.current_user_active());

-- matchday_entries: matchday_entries.manage (select-Policy bleibt unverändert)
alter policy matchday_entries_insert on public.matchday_entries
  with check (public.current_user_has_permission('matchday_entries.manage') and public.current_user_active());

alter policy matchday_entries_update on public.matchday_entries
  using (public.current_user_has_permission('matchday_entries.manage') and public.current_user_active())
  with check (public.current_user_has_permission('matchday_entries.manage') and public.current_user_active());

alter policy matchday_entries_delete on public.matchday_entries
  using (public.current_user_has_permission('matchday_entries.manage') and public.current_user_active());

-- payout_rules: payouts.manage
alter policy payout_rules_insert on public.payout_rules
  with check (public.current_user_has_permission('payouts.manage') and public.current_user_active());

alter policy payout_rules_update on public.payout_rules
  using (public.current_user_has_permission('payouts.manage') and public.current_user_active())
  with check (public.current_user_has_permission('payouts.manage') and public.current_user_active());

alter policy payout_rules_delete on public.payout_rules
  using (public.current_user_has_permission('payouts.manage') and public.current_user_active());

-- matchday_rankings / season_rankings: rankings.manage
alter policy matchday_rankings_insert on public.matchday_rankings
  with check (public.current_user_has_permission('rankings.manage') and public.current_user_active());

alter policy matchday_rankings_update on public.matchday_rankings
  using (public.current_user_has_permission('rankings.manage') and public.current_user_active())
  with check (public.current_user_has_permission('rankings.manage') and public.current_user_active());

alter policy matchday_rankings_delete on public.matchday_rankings
  using (public.current_user_has_permission('rankings.manage') and public.current_user_active());

alter policy season_rankings_insert on public.season_rankings
  with check (public.current_user_has_permission('rankings.manage') and public.current_user_active());

alter policy season_rankings_update on public.season_rankings
  using (public.current_user_has_permission('rankings.manage') and public.current_user_active())
  with check (public.current_user_has_permission('rankings.manage') and public.current_user_active());

alter policy season_rankings_delete on public.season_rankings
  using (public.current_user_has_permission('rankings.manage') and public.current_user_active());

-- kicktipp_imports: import.use (hier auch select, da dieser Bereich schon
-- bisher komplett admin/spielleiter-exklusiv war, kein current_user_active()-
-- only Lesezugriff wie bei den meisten anderen Tabellen)
alter policy kicktipp_imports_select on public.kicktipp_imports
  using (public.current_user_has_permission('import.use') and public.current_user_active());

alter policy kicktipp_imports_insert on public.kicktipp_imports
  with check (public.current_user_has_permission('import.use') and public.current_user_active());

alter policy kicktipp_imports_update on public.kicktipp_imports
  using (public.current_user_has_permission('import.use') and public.current_user_active())
  with check (public.current_user_has_permission('import.use') and public.current_user_active());

alter policy kicktipp_imports_delete on public.kicktipp_imports
  using (public.current_user_has_permission('import.use') and public.current_user_active());

-- zahlungen: accounts.manage (select-Policy mit is_own_player-Zweig bleibt
-- unverändert, nur der admin/spielleiter-Zweig würde ohnehin identisch
-- aussehen wie bei transactions_select unten, daher hier ebenfalls belassen –
-- Zahlungen-Übersicht für alle Spieler läuft über accounts.manage via
-- listAllZahlungen(), das RLS-seitig aber ohnehin nur für berechtigte Rollen
-- sinnvolle Ergebnismengen liefert, siehe zahlungen_select unten)
alter policy zahlungen_select on public.zahlungen
  using (
    (public.current_user_has_permission('accounts.manage') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

alter policy zahlungen_insert on public.zahlungen
  with check (public.current_user_has_permission('accounts.manage') and public.current_user_active());

alter policy zahlungen_update on public.zahlungen
  using (public.current_user_has_permission('accounts.manage') and public.current_user_active())
  with check (public.current_user_has_permission('accounts.manage') and public.current_user_active());

alter policy zahlungen_delete on public.zahlungen
  using (public.current_user_has_permission('accounts.manage') and public.current_user_active());

-- transactions_select: nur der admin/spielleiter-Zweig wird ersetzt, die
-- is_own_player- und öffentliche-Gewinn-Zweige bleiben unverändert.
alter policy transactions_select on public.transactions
  using (
    (public.current_user_has_permission('accounts.manage') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
    or (typ in ('gewinn_gesamt', 'gewinn_spieltag') and public.current_user_active())
  );

-- transactions insert/update/delete für gewinn_*/korrektur: bisher eine
-- gemeinsame Policy pro Operation, wird nach typ in zwei aufgespalten
-- (rankings.manage für Gewinnbuchungen, balance_transfer.manage für
-- Saison-Überträge), da RLS-Policies pro Tabelle+Operation beliebig viele
-- sein dürfen und mit OR verknüpft werden – ALTER POLICY kann eine Policy
-- aber nicht in zwei aufteilen, daher hier DROP + CREATE statt ALTER.
drop policy transactions_insert_gewinn_korrektur on public.transactions;
drop policy transactions_update_gewinn_korrektur on public.transactions;
drop policy transactions_delete_gewinn_korrektur on public.transactions;

create policy transactions_insert_gewinn on public.transactions
  for insert
  with check (
    typ in ('gewinn_gesamt', 'gewinn_spieltag')
    and public.current_user_has_permission('rankings.manage')
    and public.current_user_active()
  );

create policy transactions_insert_korrektur on public.transactions
  for insert
  with check (
    typ = 'korrektur'
    and public.current_user_has_permission('balance_transfer.manage')
    and public.current_user_active()
  );

create policy transactions_update_gewinn on public.transactions
  for update
  using (
    typ in ('gewinn_gesamt', 'gewinn_spieltag')
    and public.current_user_has_permission('rankings.manage')
    and public.current_user_active()
  )
  with check (
    typ in ('gewinn_gesamt', 'gewinn_spieltag')
    and public.current_user_has_permission('rankings.manage')
    and public.current_user_active()
  );

create policy transactions_update_korrektur on public.transactions
  for update
  using (
    typ = 'korrektur'
    and public.current_user_has_permission('balance_transfer.manage')
    and public.current_user_active()
  )
  with check (
    typ = 'korrektur'
    and public.current_user_has_permission('balance_transfer.manage')
    and public.current_user_active()
  );

create policy transactions_delete_gewinn on public.transactions
  for delete
  using (
    typ in ('gewinn_gesamt', 'gewinn_spieltag')
    and public.current_user_has_permission('rankings.manage')
    and public.current_user_active()
  );

create policy transactions_delete_korrektur on public.transactions
  for delete
  using (
    typ = 'korrektur'
    and public.current_user_has_permission('balance_transfer.manage')
    and public.current_user_active()
  );

-- Platzierungen (Spieltag + Saison) und automatische Gewinnberechnung.
--
-- Rankings dürfen nur für tatsächliche Teilnehmer erfasst werden: die
-- zusammengesetzten Foreign Keys auf matchday_entries / season_participants
-- stellen das sicher und sorgen gleichzeitig für die richtige Cascade-Löschung
-- (Spieltag löschen -> Einsätze löschen -> Platzierungen löschen).
-- Ties (mehrere Spieler auf demselben Rang) sind bewusst erlaubt; die
-- Gewinnberechnung teilt den Anteil eines Rangs in diesem Fall gleichmäßig auf.

create table public.matchday_rankings (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null,
  player_id uuid not null,
  rang integer not null check (rang > 0),
  created_at timestamptz not null default now(),
  unique (matchday_id, player_id),
  foreign key (matchday_id, player_id) references public.matchday_entries (matchday_id, player_id) on delete cascade
);

alter table public.matchday_rankings enable row level security;

create policy matchday_rankings_select on public.matchday_rankings
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

create policy matchday_rankings_insert on public.matchday_rankings
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy matchday_rankings_update on public.matchday_rankings
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy matchday_rankings_delete on public.matchday_rankings
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create table public.season_rankings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null,
  player_id uuid not null,
  rang integer not null check (rang > 0),
  created_at timestamptz not null default now(),
  unique (season_id, player_id),
  foreign key (season_id, player_id) references public.season_participants (season_id, player_id) on delete cascade
);

alter table public.season_rankings enable row level security;

create policy season_rankings_select on public.season_rankings
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

create policy season_rankings_insert on public.season_rankings
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy season_rankings_update on public.season_rankings
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy season_rankings_delete on public.season_rankings
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

-- Gewinn_*/Korrektur-Buchungen dürfen (anders als Einsatz_*) direkt von
-- Admin/Spielleiter geschrieben werden: Gewinn_* normalerweise über die unten
-- stehenden Berechnungs-RPCs, Korrektur ausschließlich manuell. Einsatz_* bleibt
-- weiterhin ausschließlich trigger-verwaltet (siehe 0004_einsaetze.sql).
create policy transactions_insert_gewinn_korrektur on public.transactions
  for insert
  with check (
    typ in ('gewinn_gesamt', 'gewinn_spieltag', 'korrektur')
    and public.current_user_role() in ('admin', 'spielleiter')
    and public.current_user_active()
  );

create policy transactions_update_gewinn_korrektur on public.transactions
  for update
  using (
    typ in ('gewinn_gesamt', 'gewinn_spieltag', 'korrektur')
    and public.current_user_role() in ('admin', 'spielleiter')
    and public.current_user_active()
  )
  with check (
    typ in ('gewinn_gesamt', 'gewinn_spieltag', 'korrektur')
    and public.current_user_role() in ('admin', 'spielleiter')
    and public.current_user_active()
  );

create policy transactions_delete_gewinn_korrektur on public.transactions
  for delete
  using (
    typ in ('gewinn_gesamt', 'gewinn_spieltag', 'korrektur')
    and public.current_user_role() in ('admin', 'spielleiter')
    and public.current_user_active()
  );

-- Berechnet die Spieltags-Gewinnausschüttung aus den hinterlegten Platzierungen
-- und der Verteilungs-Konfiguration, bucht sie als gewinn_spieltag-Transaktionen
-- und ersetzt dabei eine zuvor berechnete Ausschüttung für denselben Spieltag
-- (idempotent, beliebig oft erneut auslösbar nach Korrektur der Platzierungen).
create or replace function public.calculate_matchday_payout(p_matchday_id uuid)
returns setof public.transactions
language plpgsql
as $$
declare
  v_season_id uuid;
  v_pot numeric;
begin
  select season_id into v_season_id from public.matchdays where id = p_matchday_id;
  if v_season_id is null then
    raise exception 'Spieltag % nicht gefunden.', p_matchday_id;
  end if;

  select coalesce(sum(spieltags_einsatz_betrag), 0) into v_pot
    from public.matchday_entries
    where matchday_id = p_matchday_id;

  delete from public.transactions
    where matchday_id = p_matchday_id and typ = 'gewinn_spieltag';

  return query
  with ranked as (
    select mr.player_id, mr.rang, count(*) over (partition by mr.rang) as tied_count
    from public.matchday_rankings mr
    where mr.matchday_id = p_matchday_id
  ),
  payout as (
    select
      r.player_id as player_id,
      r.rang as rang,
      round(v_pot * pr.prozent_anteil / 100 / r.tied_count, 2) as betrag
    from ranked r
    join public.payout_rules pr
      on pr.season_id = v_season_id and pr.typ = 'spieltag' and pr.rang = r.rang
  )
  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  select payout.player_id, v_season_id, p_matchday_id, 'gewinn_spieltag'::public.transaction_typ, payout.betrag,
         'Platz ' || payout.rang || ' (automatische Gewinnberechnung)'
  from payout
  where payout.betrag > 0
  returning *;
end;
$$;

grant execute on function public.calculate_matchday_payout(uuid) to authenticated;

-- Analog für die Gesamtsieg-Gewinnausschüttung einer Saison.
create or replace function public.calculate_season_payout(p_season_id uuid)
returns setof public.transactions
language plpgsql
as $$
declare
  v_pot numeric;
begin
  select coalesce(sum(gesamtsieg_einsatz_betrag), 0) into v_pot
    from public.season_participants
    where season_id = p_season_id;

  delete from public.transactions
    where season_id = p_season_id and typ = 'gewinn_gesamt';

  return query
  with ranked as (
    select sr.player_id, sr.rang, count(*) over (partition by sr.rang) as tied_count
    from public.season_rankings sr
    where sr.season_id = p_season_id
  ),
  payout as (
    select
      r.player_id as player_id,
      r.rang as rang,
      round(v_pot * pr.prozent_anteil / 100 / r.tied_count, 2) as betrag
    from ranked r
    join public.payout_rules pr
      on pr.season_id = p_season_id and pr.typ = 'gesamtsieg' and pr.rang = r.rang
  )
  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  select payout.player_id, p_season_id, null, 'gewinn_gesamt'::public.transaction_typ, payout.betrag,
         'Platz ' || payout.rang || ' (automatische Gewinnberechnung)'
  from payout
  where payout.betrag > 0
  returning *;
end;
$$;

grant execute on function public.calculate_season_payout(uuid) to authenticated;

create index matchday_rankings_matchday_id_idx on public.matchday_rankings (matchday_id);
create index season_rankings_season_id_idx on public.season_rankings (season_id);

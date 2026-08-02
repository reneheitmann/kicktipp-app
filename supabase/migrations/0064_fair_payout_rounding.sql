-- Behebt eine per pgTAP dokumentierte Rundungs-Drift (siehe "Szenario 6" in
-- supabase/tests/database/calculate_*_payout.test.sql): calculate_matchday_
-- payout()/calculate_season_payout() (0012_tie_aware_payout_calculation.sql)
-- runden bisher jeden Rang bzw. jede Gleichstand-Gruppe unabhängig per
-- round(..., 2), ohne Rest-Korrektur - die Summe der ausgezahlten Beträge
-- kann dadurch um 1+ Cent vom Topf abweichen (in beide Richtungen).
--
-- Eine Rest-Korrektur ist NICHT in jedem Fall ohne Kompromiss möglich:
-- Beispiel Topf 100,00 €, 3 Spieler teilen sich einen Rang zu 100 %.
-- 100,00 / 3 = 33,33...€ - entweder bekommt jeder gleich viel (3 × 33,33 =
-- 99,99, 1 Cent bleibt unausgezahlt) ODER die Summe stimmt exakt (100,00),
-- aber dann muss zwangsläufig einer der drei gleichplatzierten Spieler
-- einen Cent mehr bekommen als die anderen zwei - das widerspräche dem
-- eigentlichen Zweck von 0012 (Gleichstand-Fairness). Diese Migration gibt
-- der Gleichstand-Fairness bewusst den Vorrang: die Korrektur greift nur
-- auf Ebene ganzer Rang-/Gleichstand-GRUPPEN, nie auf Ebene einzelner
-- Spieler innerhalb einer Gruppe. Damit wird die Drift ZWISCHEN
-- unabhängigen Rängen/Gruppen eliminiert (der praktisch häufigste Fall),
-- Gleichstand-Mitglieder bekommen aber weiterhin IMMER exakt denselben
-- Betrag. Der Drift INNERHALB einer einzelnen, nicht glatt durch
-- tied_count teilbaren Gruppe (wie im 100€/3-Beispiel oben) bleibt daher
-- unverändert bestehen - das ist mathematisch unvermeidbar, sobald man
-- Gleichstand-Gleichbehandlung nicht aufgeben will.
--
-- Verfahren: "Largest Remainder"/Hamilton-Apportionment, das
-- Standardverfahren, um aus Prozentanteilen ganzzahlige Cent-Beträge
-- abzuleiten, deren Summe exakt einem Zielwert entspricht. Je Gruppe wird
-- zunächst der ungerundete Gesamtanteil berechnet (NICHT durch tied_count
-- geteilt), dann jeder Gruppe ihr abgerundeter Cent-Betrag zugewiesen; die
-- fehlenden Cents (Ziel-Cent-Summe minus Summe der Abrundungen) gehen an
-- die Gruppen mit dem größten Rundungsrest. Erst danach wird der (ggf.
-- korrigierte) Gruppen-Gesamtbetrag gleichmäßig durch tied_count geteilt -
-- identisch für jedes Mitglied, da rein aus Gruppendaten berechnet.
--
-- Kein Effekt auf bereits berechnete historische Auszahlungen - die
-- Funktionen laufen nur bei einem expliziten (Neu-)Aufruf.

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
  groups as (
    select
      r.rang as rang,
      r.tied_count as tied_count,
      v_pot
      * (
        select coalesce(sum(pr.prozent_anteil), 0)
        from public.payout_rules pr
        where pr.season_id = v_season_id and pr.typ = 'spieltag'
          and pr.rang >= r.rang and pr.rang < r.rang + r.tied_count
      )
      / 100 as exact_betrag
    from ranked r
    group by r.rang, r.tied_count
  ),
  groups_cents as (
    select
      rang, tied_count, exact_betrag,
      floor(exact_betrag * 100) as base_cents,
      (exact_betrag * 100) - floor(exact_betrag * 100) as remainder
    from groups
  ),
  totals as (
    select
      round(coalesce(sum(exact_betrag), 0), 2) * 100 as target_cents,
      coalesce(sum(base_cents), 0) as base_cents_sum
    from groups_cents
  ),
  groups_distributed as (
    select
      gc.rang,
      gc.tied_count,
      gc.base_cents
        + case
            when row_number() over (order by gc.remainder desc, gc.rang asc)
                 <= (select target_cents - base_cents_sum from totals)
            then 1 else 0
          end as group_cents
    from groups_cents gc
  ),
  payout as (
    select
      r.player_id as player_id,
      r.rang as rang,
      round((gd.group_cents / 100.0) / r.tied_count, 2) as betrag
    from ranked r
    join groups_distributed gd on gd.rang = r.rang
  )
  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  select payout.player_id, v_season_id, p_matchday_id, 'gewinn_spieltag'::public.transaction_typ, payout.betrag,
         'Platz ' || payout.rang || ' (automatische Gewinnberechnung)'
  from payout
  where payout.betrag > 0
  returning *;
end;
$$;

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
  groups as (
    select
      r.rang as rang,
      r.tied_count as tied_count,
      v_pot
      * (
        select coalesce(sum(pr.prozent_anteil), 0)
        from public.payout_rules pr
        where pr.season_id = p_season_id and pr.typ = 'gesamtsieg'
          and pr.rang >= r.rang and pr.rang < r.rang + r.tied_count
      )
      / 100 as exact_betrag
    from ranked r
    group by r.rang, r.tied_count
  ),
  groups_cents as (
    select
      rang, tied_count, exact_betrag,
      floor(exact_betrag * 100) as base_cents,
      (exact_betrag * 100) - floor(exact_betrag * 100) as remainder
    from groups
  ),
  totals as (
    select
      round(coalesce(sum(exact_betrag), 0), 2) * 100 as target_cents,
      coalesce(sum(base_cents), 0) as base_cents_sum
    from groups_cents
  ),
  groups_distributed as (
    select
      gc.rang,
      gc.tied_count,
      gc.base_cents
        + case
            when row_number() over (order by gc.remainder desc, gc.rang asc)
                 <= (select target_cents - base_cents_sum from totals)
            then 1 else 0
          end as group_cents
    from groups_cents gc
  ),
  payout as (
    select
      r.player_id as player_id,
      r.rang as rang,
      round((gd.group_cents / 100.0) / r.tied_count, 2) as betrag
    from ranked r
    join groups_distributed gd on gd.rang = r.rang
  )
  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  select payout.player_id, p_season_id, null, 'gewinn_gesamt'::public.transaction_typ, payout.betrag,
         'Platz ' || payout.rang || ' (automatische Gewinnberechnung)'
  from payout
  where payout.betrag > 0
  returning *;
end;
$$;

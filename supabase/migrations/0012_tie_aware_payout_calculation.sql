-- Korrigiert die Gewinnberechnung für Ränge mit Gleichstand (Ties): bisher
-- erhielten Spieler auf einem geteilten Rang nur den Anteil DIESES einen
-- Rangs, gleichmäßig unter ihnen aufgeteilt. Korrekt (Standard-"Competition
-- Ranking", wie auch Kicktipp selbst exportiert: z. B. drei Spieler auf Rang
-- 25, danach geht es regulär mit Rang 28 weiter) ist, dass die Plätze, die
-- durch den Gleichstand "verbraucht" werden (hier: 25, 26, 27), in der
-- Auszahlung niemandem sonst zustehen – ihre Gewinnanteile müssen daher dem
-- geteilten Rang zugeschlagen werden, bevor gleichmäßig unter den
-- gleichplatzierten Spielern aufgeteilt wird.
--
-- Beispiel: 3 Spieler teilen sich Rang 2 (besetzen damit faktisch die Plätze
-- 2, 3 und 4). Sind für Rang 2 = 20%, Rang 3 = 10%, Rang 4 = 5% konfiguriert,
-- erhält jeder der drei Spieler (20% + 10% + 5%) / 3 = 11,67% des Topfes,
-- nicht nur 20% / 3.
--
-- round(numeric, int) rundet in Postgres bereits kaufmännisch (Rundung von
-- Zehntel-Cent-Beträgen weg von Null statt zur geraden Ziffer), das bleibt
-- unverändert die Rundungsmethode für die finalen Auszahlungsbeträge.

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
      round(
        v_pot
        * (
          select coalesce(sum(pr.prozent_anteil), 0)
          from public.payout_rules pr
          where pr.season_id = v_season_id and pr.typ = 'spieltag'
            and pr.rang >= r.rang and pr.rang < r.rang + r.tied_count
        )
        / r.tied_count / 100,
        2
      ) as betrag
    from ranked r
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
  payout as (
    select
      r.player_id as player_id,
      r.rang as rang,
      round(
        v_pot
        * (
          select coalesce(sum(pr.prozent_anteil), 0)
          from public.payout_rules pr
          where pr.season_id = p_season_id and pr.typ = 'gesamtsieg'
            and pr.rang >= r.rang and pr.rang < r.rang + r.tied_count
        )
        / r.tied_count / 100,
        2
      ) as betrag
    from ranked r
  )
  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  select payout.player_id, p_season_id, null, 'gewinn_gesamt'::public.transaction_typ, payout.betrag,
         'Platz ' || payout.rang || ' (automatische Gewinnberechnung)'
  from payout
  where payout.betrag > 0
  returning *;
end;
$$;

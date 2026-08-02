-- Saisonvergleich soll jeden aktiven Spieler zeigen (nicht nur die eigenen
-- verknüpften), aber season_participants/transactions/zahlungen bleiben
-- bewusst "eigener Spieler"-privat (0018_public_rankings.sql,
-- 0028_season_participant_visibility.sql). Analog zu get_payout_pool()
-- (0021_payout_pool.sql) liefert diese Funktion nur den fertig berechneten
-- Gesamtsaldo je Spieler/Saison, ohne einzelne Einsatz-/Zahlungszeilen
-- offenzulegen. Die Formel bildet computePlayerBalances()
-- (src/features/balances/balanceCalculations.ts) 1:1 in SQL nach.

create or replace function public.get_player_season_balances(p_season_ids uuid[])
returns table(player_id uuid, season_id uuid, gesamt_saldo numeric)
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
  with matchday_counts as (
    select m.season_id, count(*) as cnt
    from public.matchdays m
    where m.season_id = any(p_season_ids)
    group by m.season_id
  ),
  tx_agg as (
    select
      t.player_id,
      t.season_id,
      sum(case when t.typ = 'gewinn_gesamt' then t.betrag else 0 end)
        - sum(case when t.typ = 'einsatz_gesamt' then t.betrag else 0 end)
        + sum(case when t.typ = 'korrektur' and t.matchday_id is null then t.betrag else 0 end) as gesamtsieg_saldo,
      sum(case when t.typ = 'gewinn_spieltag' then t.betrag else 0 end)
        + sum(case when t.typ = 'korrektur' and t.matchday_id is not null then t.betrag else 0 end) as spieltag_gewinn_korrektur
    from public.transactions t
    where t.season_id = any(p_season_ids)
    group by t.player_id, t.season_id
  ),
  participant_agg as (
    select
      sp.player_id,
      sp.season_id,
      sp.spieltags_einsatz_betrag * coalesce(mc.cnt, 0) as spieltag_einsatz
    from public.season_participants sp
    left join matchday_counts mc on mc.season_id = sp.season_id
    where sp.season_id = any(p_season_ids)
  ),
  zahlungen_agg as (
    select
      z.player_id,
      z.season_id,
      sum(case when z.typ = 'einzahlung' then z.betrag else -z.betrag end) as zahlungen_saldo
    from public.zahlungen z
    where z.season_id = any(p_season_ids)
    group by z.player_id, z.season_id
  ),
  all_players as (
    select tx.player_id, tx.season_id from tx_agg tx
    union
    select pa.player_id, pa.season_id from participant_agg pa
    union
    select za.player_id, za.season_id from zahlungen_agg za
  )
  select
    ap.player_id,
    ap.season_id,
    coalesce(tx.gesamtsieg_saldo, 0)
      + coalesce(tx.spieltag_gewinn_korrektur, 0) - coalesce(pa.spieltag_einsatz, 0)
      + coalesce(za.zahlungen_saldo, 0) as gesamt_saldo
  from all_players ap
  left join tx_agg tx on tx.player_id = ap.player_id and tx.season_id = ap.season_id
  left join participant_agg pa on pa.player_id = ap.player_id and pa.season_id = ap.season_id
  left join zahlungen_agg za on za.player_id = ap.player_id and za.season_id = ap.season_id;
end;
$$;

grant execute on function public.get_player_season_balances(uuid[]) to authenticated;

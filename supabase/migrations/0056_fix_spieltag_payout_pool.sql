-- Behebt eine Regression aus 0045_season_lock_and_pool_fix.sql: dort wurde
-- get_payout_pool() für typ='spieltag' auf
-- "spieltags_einsatz_betrag * Anzahl Spieltage der Saison" umgestellt, mit
-- der Begründung, diese Formel werde "überall sonst in der App" so
-- verwendet (siehe accountBalance.ts). Das stimmt für die dortige
-- Verwendung (Gesamt-Einsatzpflicht eines Spielers über die ganze Saison),
-- ist hier aber falsch: der "Spieltag"-Gewinntopf in der
-- Gewinnverteilungs-Anzeige (PayoutRulesEditor.tsx, "Gesamtgewinn") soll den
-- Topf für EINEN einzelnen Spieltag zeigen (Summe der Spieltags-Einsätze
-- aller Teilnehmer für diesen einen Spieltag), nicht die Summe über alle
-- Spieltage der Saison hinweg – exakt der ursprüngliche, korrekte Stand aus
-- 0021_payout_pool.sql, nur mit der in 0047 hinzugekommenen
-- has_payouts-Spalte beibehalten.
--
-- Die tatsächliche Gewinnberechnung pro Spieltag (calculate_matchday_payout)
-- war von diesem Bug nicht betroffen – nur die Vorschau-Anzeige des Topfes
-- in der Gewinnverteilungs-Konfiguration zeigte den falschen (zu hohen)
-- Betrag.

create or replace function public.get_payout_pool(p_season_id uuid, p_typ public.payout_typ)
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
        case when p_typ = 'gesamtsieg' then gesamtsieg_einsatz_betrag else spieltags_einsatz_betrag end
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

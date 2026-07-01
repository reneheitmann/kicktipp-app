-- Bug: Wird die Platzierung eines einzelnen Spielers entfernt (Leeren des
-- Platz-Felds in RankingsSection -> removeMatchdayRanking/removeSeasonRanking),
-- wurde bisher nur die Ranking-Zeile gelöscht. Eine zuvor per "Gewinne
-- berechnen" bereits verbuchte gewinn_spieltag/gewinn_gesamt-Transaktion für
-- genau diesen Spieler blieb als Karteileiche stehen und wurde weiterhin in
-- jeder Gewinn-Anzeige (Konten, Spieler-Detail, Spieltag-/Gesamtwertung-
-- Liste, Saisonvergleich, E-Mail-Versand-Vorschau) mitgezählt, obwohl keine
-- Platzierung mehr dafür existiert. Transactions haben keinen FK auf
-- matchday_rankings/season_rankings (nur source_season_participant_id/
-- source_matchday_entry_id für Beitrags-Buchungen), daher greift hier kein
-- ON DELETE CASCADE – die Bereinigung muss explizit erfolgen.
--
-- Ersetzt die bisherigen rohen DELETE-Aufrufe (removeMatchdayRanking/
-- removeSeasonRanking in den *RankingsApi.ts) durch RPCs, die Ranking und die
-- zugehörige Gewinn-Buchung dieses einen Spielers atomar zusammen entfernen.
-- Andere Spieler bleiben unangetastet – Ränge werden nicht automatisch
-- verschoben (siehe Hinweistext in RankingsSection.tsx zu Gleichständen),
-- daher bleiben deren bereits berechnete Gewinne weiterhin gültig.
create or replace function public.remove_matchday_ranking(p_ranking_id uuid)
returns void
language plpgsql
as $$
declare
  v_matchday_id uuid;
  v_player_id uuid;
begin
  select matchday_id, player_id into v_matchday_id, v_player_id
  from public.matchday_rankings
  where id = p_ranking_id;

  delete from public.matchday_rankings where id = p_ranking_id;

  if v_matchday_id is not null then
    delete from public.transactions
    where matchday_id = v_matchday_id and player_id = v_player_id and typ = 'gewinn_spieltag';
  end if;
end;
$$;

grant execute on function public.remove_matchday_ranking(uuid) to authenticated;

create or replace function public.remove_season_ranking(p_ranking_id uuid)
returns void
language plpgsql
as $$
declare
  v_season_id uuid;
  v_player_id uuid;
begin
  select season_id, player_id into v_season_id, v_player_id
  from public.season_rankings
  where id = p_ranking_id;

  delete from public.season_rankings where id = p_ranking_id;

  if v_season_id is not null then
    delete from public.transactions
    where season_id = v_season_id and player_id = v_player_id and typ = 'gewinn_gesamt' and matchday_id is null;
  end if;
end;
$$;

grant execute on function public.remove_season_ranking(uuid) to authenticated;

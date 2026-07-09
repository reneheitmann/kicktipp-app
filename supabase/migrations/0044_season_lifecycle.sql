-- Saison-Lebenszyklus: zwei neue Status "entwurf" und "archiviert" neben den
-- bestehenden "aktiv"/"abgeschlossen". Erlaubt Admin/Spielleiter, eine Saison
-- vollständig vorzubereiten (Teilnehmer, Tipper-Import, Gewinnverteilung),
-- bevor normale User sie sehen, sowie alte Saisons zu archivieren – beides
-- soll für normale User unsichtbar sein.
--
-- Neue Saisons starten künftig als "entwurf" statt direkt "aktiv" (bewusster
-- Publish-Schritt).
alter table public.seasons alter column status set default 'entwurf';

alter table public.seasons drop constraint seasons_status_check;
alter table public.seasons add constraint seasons_status_check
  check (status in ('entwurf', 'aktiv', 'abgeschlossen', 'archiviert'));

-- Kernmechanismus: is_season_participant() wird bereits von
-- seasons_select/matchdays_select/season_rankings_select/
-- matchday_rankings_select genutzt (siehe 0028_season_participant_visibility.sql,
-- zuletzt auf player_profile_links umgestellt in 0041_player_profile_links.sql).
-- Admin/Spielleiter mit seasons.manage umgehen diese Funktion ohnehin über
-- eine eigene Klausel in jeder dieser Policies – die zusätzliche
-- Status-Prüfung hier greift daher automatisch überall, ohne dass eine
-- einzige Policy angefasst werden muss. Rest unverändert aus 0041 übernommen
-- (player_profile_links-Join für die Mehrfach-Verknüpfung Spieler<->Login).
create or replace function public.is_season_participant(p_season_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.season_participants sp
    join public.player_profile_links ppl on ppl.player_id = sp.player_id
    join public.seasons s on s.id = sp.season_id
    where sp.season_id = p_season_id
      and ppl.profile_id = auth.uid()
      and s.status in ('aktiv', 'abgeschlossen')
  );
$$;

-- Kopieren ist ebenfalls eine Einrichtungsaktion (siehe copy_season,
-- zuletzt geändert in 0039_seasons_kicktipp_link.sql) – soll also genauso
-- verdeckt starten statt sofort sichtbar zu sein. Rest der Funktion
-- unverändert aus 0039 übernommen (inkl. kicktipp_link-Übernahme).
create or replace function public.copy_season(
  p_source_season_id uuid,
  p_new_name text,
  p_new_start_date date,
  p_new_end_date date,
  p_copy_payout_rules boolean default true,
  p_copy_players boolean default true,
  p_copy_matchdays boolean default true
) returns uuid
language plpgsql
as $$
declare
  v_new_season uuid;
  v_source_start_date date;
  v_source_kicktipp_link text;
  v_date_offset_days integer;
begin
  select start_date, kicktipp_link into v_source_start_date, v_source_kicktipp_link
  from public.seasons where id = p_source_season_id;
  if v_source_start_date is null then
    raise exception 'Quellsaison % nicht gefunden.', p_source_season_id;
  end if;
  v_date_offset_days := p_new_start_date - v_source_start_date;

  insert into public.seasons (name, start_date, end_date, status, kicktipp_link)
  values (p_new_name, p_new_start_date, p_new_end_date, 'entwurf', v_source_kicktipp_link)
  returning id into v_new_season;

  if p_copy_payout_rules then
    insert into public.payout_rules (season_id, typ, rang, prozent_anteil)
    select v_new_season, typ, rang, prozent_anteil
    from public.payout_rules
    where season_id = p_source_season_id;
  end if;

  if p_copy_players then
    insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag)
    select v_new_season, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag
    from public.season_participants
    where season_id = p_source_season_id;
  end if;

  if p_copy_matchdays then
    insert into public.matchdays (season_id, nummer, datum)
    select v_new_season, nummer, case when datum is not null then datum + v_date_offset_days else null end
    from public.matchdays
    where season_id = p_source_season_id
    order by nummer;
  end if;

  return v_new_season;
end;
$$;

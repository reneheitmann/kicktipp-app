-- Link zur zugehörigen Kicktipp.de-Spielrunde, ab jetzt bei jeder neuen
-- Saison im Formular (SeasonForm.tsx) verpflichtend abgefragt und auf der
-- Saison-Detailseite als Link angezeigt. Nullable in der DB (bestehende
-- Saisons haben noch keinen Wert), die Pflicht gilt nur clientseitig für
-- neu angelegte/bearbeitete Saisons.

alter table public.seasons add column kicktipp_link text;

-- copy_season() muss den Link der Quellsaison übernehmen – ohne diese
-- Anpassung würde eine kopierte Saison trotz Formular-Pflichtfeld mit
-- kicktipp_link = null starten, da die Kopie nicht über SeasonForm läuft.
-- In der Praxis ist es ohnehin fast immer derselbe Link (eine Kicktipp-
-- Spielrunde läuft über mehrere Saisons hinweg unter derselben URL), daher
-- unconditional statt hinter einer eigenen "Mitkopieren"-Checkbox.
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
  values (p_new_name, p_new_start_date, p_new_end_date, 'aktiv', v_source_kicktipp_link)
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

grant execute on function public.copy_season(uuid, text, date, date, boolean, boolean, boolean) to authenticated;

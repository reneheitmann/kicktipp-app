-- Saisonweiter Standard-Einsatz (Gesamtwertung/Spieltag), getrennt vom
-- bestehenden pro-Teilnehmer-"Standard" (spieltags_einsatz_betrag auf
-- season_participants, siehe 0009_einzahlungen_und_standardeinsatz.sql,
-- der automatisch in neue Spieltage übernommen wird - unverändert). Dient
-- nur als Vorgabewert fürs Anlegen neuer Teilnehmer sowie als Referenz,
-- um Abweichungen einzelner Teilnehmer sichtbar zu machen - kein
-- Backfill/Erzwingen bestehender Teilnehmer-Einsätze.
alter table public.seasons
  add column default_gesamtsieg_einsatz_betrag numeric(10,2) not null default 0
    check (default_gesamtsieg_einsatz_betrag >= 0),
  add column default_spieltags_einsatz_betrag numeric(10,2) not null default 0
    check (default_spieltags_einsatz_betrag >= 0);

-- copy_season() (zuletzt in 0044_season_lifecycle.sql) muss die neuen
-- Spalten mitkopieren, sonst geht der Standard beim Saison-Kopieren
-- stillschweigend verloren. Rest unverändert aus 0044 übernommen.
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
  v_source_default_gesamtsieg numeric(10,2);
  v_source_default_spieltag numeric(10,2);
  v_date_offset_days integer;
begin
  select start_date, kicktipp_link, default_gesamtsieg_einsatz_betrag, default_spieltags_einsatz_betrag
    into v_source_start_date, v_source_kicktipp_link, v_source_default_gesamtsieg, v_source_default_spieltag
  from public.seasons where id = p_source_season_id;
  if v_source_start_date is null then
    raise exception 'Quellsaison % nicht gefunden.', p_source_season_id;
  end if;
  v_date_offset_days := p_new_start_date - v_source_start_date;

  insert into public.seasons (
    name, start_date, end_date, status, kicktipp_link,
    default_gesamtsieg_einsatz_betrag, default_spieltags_einsatz_betrag
  )
  values (
    p_new_name, p_new_start_date, p_new_end_date, 'entwurf', v_source_kicktipp_link,
    v_source_default_gesamtsieg, v_source_default_spieltag
  )
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

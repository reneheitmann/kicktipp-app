-- Behebt einen Fehler in copy_season (0013): `date - date` liefert in
-- Postgres eine Ganzzahl (Anzahl Tage), keine `interval`. Die Zuweisung
-- dieser Zahl an eine `interval`-Variable wurde von Postgres als Sekunden
-- statt Tage interpretiert (z. B. 365 -> "365 Sekunden" statt "365 Tage"),
-- wodurch beim Verschieben der Spieltags-Daten praktisch keine sichtbare
-- Änderung ankam (Rundung auf den reinen Datums-Anteil schluckte die paar
-- Sekunden). `date + integer` addiert dagegen korrekt Tage, daher hier ohne
-- interval-Variable.
create or replace function public.copy_season(
  p_source_season_id uuid,
  p_new_name text,
  p_new_start_date date,
  p_new_end_date date
) returns uuid
language plpgsql
as $$
declare
  v_new_season uuid;
  v_source_start_date date;
  v_date_offset_days integer;
begin
  select start_date into v_source_start_date from public.seasons where id = p_source_season_id;
  if v_source_start_date is null then
    raise exception 'Quellsaison % nicht gefunden.', p_source_season_id;
  end if;
  v_date_offset_days := p_new_start_date - v_source_start_date;

  insert into public.seasons (name, start_date, end_date, status)
  values (p_new_name, p_new_start_date, p_new_end_date, 'aktiv')
  returning id into v_new_season;

  insert into public.payout_rules (season_id, typ, rang, prozent_anteil)
  select v_new_season, typ, rang, prozent_anteil
  from public.payout_rules
  where season_id = p_source_season_id;

  insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag)
  select v_new_season, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag
  from public.season_participants
  where season_id = p_source_season_id;

  insert into public.matchdays (season_id, nummer, datum)
  select v_new_season, nummer, case when datum is not null then datum + v_date_offset_days else null end
  from public.matchdays
  where season_id = p_source_season_id
  order by nummer;

  return v_new_season;
end;
$$;

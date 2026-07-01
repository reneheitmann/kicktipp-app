-- Erweitert copy_season um unabhängig wählbare Kategorien: Gewinnverteilung,
-- Spieler (inkl. Einsätze) und Spieltage können einzeln an-/abgewählt werden,
-- bis hin zu "nur die Saison" (alle drei deaktiviert). Da sich der
-- Parametersatz ändert (Postgres identifiziert Funktionen über Name +
-- Parametertypen), muss die alte 4-Parameter-Signatur zunächst entfernt
-- werden, sonst entstünde eine zweite, überladene Funktion statt eines
-- Ersatzes.
drop function if exists public.copy_season(uuid, text, date, date);

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

  if p_copy_payout_rules then
    insert into public.payout_rules (season_id, typ, rang, prozent_anteil)
    select v_new_season, typ, rang, prozent_anteil
    from public.payout_rules
    where season_id = p_source_season_id;
  end if;

  -- Teilnehmer müssen vor den Spieltagen kopiert werden, damit der
  -- bestehende Trigger 'matchdays_auto_create_entries' beim Anlegen jedes
  -- Spieltags automatisch passende matchday_entries erzeugt. Werden
  -- Spieltage ohne Spieler kopiert, entstehen bewusst keine Einsatz-Einträge
  -- (lassen sich später über "fehlende Teilnehmer nachtragen" ergänzen).
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

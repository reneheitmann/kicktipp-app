-- Liefert nur die Summe der Einsätze (den "Topf") für einen Verteilungstyp,
-- ohne die einzelnen season_participants-Zeilen offenzulegen. Nötig, weil
-- season_participants per RLS für normale User bewusst auf die eigene Zeile
-- beschränkt ist (Einsatz bleibt privat) – die Gesamtsumme des Topfes soll
-- aber (wie Platzierung & Gewinn) für alle sichtbar sein, damit die
-- Gewinnverteilungs-Vorschau (% -> €) für jeden nachvollziehbar ist.
create or replace function public.get_payout_pool(p_season_id uuid, p_typ public.payout_typ)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.current_user_active() then
    raise exception 'Nicht berechtigt.';
  end if;

  return coalesce((
    select sum(case when p_typ = 'gesamtsieg' then gesamtsieg_einsatz_betrag else spieltags_einsatz_betrag end)
    from public.season_participants
    where season_id = p_season_id
  ), 0);
end;
$$;

grant execute on function public.get_payout_pool(uuid, public.payout_typ) to authenticated;

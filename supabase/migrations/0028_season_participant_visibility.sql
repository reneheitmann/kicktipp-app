-- Sichtbarkeits-Einschränkung: eine normale User-Rolle soll nur noch Saisons
-- (und darauf aufbauend Spieltage, Platzierungen, Gewinn-Buchungen) sehen, an
-- denen sie selbst als Spieler teilnimmt – bisher waren seasons/matchdays für
-- jeden aktiven User pauschal lesbar (public.current_user_active()), und die
-- mit 0018_public_rankings.sql bewusst öffentlich gemachten Ranglisten/
-- Gewinn-Buchungen waren ebenfalls für jeden aktiven User sichtbar, unabhängig
-- von der eigenen Teilnahme. Wer eine Saison verwalten darf (seasons.manage/
-- matchdays.manage) sieht weiterhin alle Saisons – sonst könnten Admin/
-- Spielleiter keine neuen Saisons anlegen oder fremde Saisons pflegen, an
-- denen sie selbst nicht teilnehmen.

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
    join public.players p on p.id = sp.player_id
    where sp.season_id = p_season_id and p.profile_id = auth.uid()
  );
$$;

drop policy seasons_select on public.seasons;

create policy seasons_select on public.seasons
  for select
  using (
    (public.current_user_has_permission('seasons.manage') and public.current_user_active())
    or (public.is_season_participant(id) and public.current_user_active())
  );

drop policy matchdays_select on public.matchdays;

create policy matchdays_select on public.matchdays
  for select
  using (
    (public.current_user_has_permission('matchdays.manage') and public.current_user_active())
    or (public.is_season_participant(season_id) and public.current_user_active())
  );

-- Ranglisten/Gewinn-Buchungen: bisher (0018) pauschal für jeden aktiven User
-- lesbar ("öffentliche Kicktipp-Rangliste"), jetzt nur noch innerhalb von
-- Saisons, an denen der User selbst teilnimmt – admin/spielleiter behalten
-- den vollen Überblick wie zuvor.

drop policy season_rankings_select on public.season_rankings;

create policy season_rankings_select on public.season_rankings
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_season_participant(season_id) and public.current_user_active())
  );

drop policy matchday_rankings_select on public.matchday_rankings;

create policy matchday_rankings_select on public.matchday_rankings
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (
      public.current_user_active()
      and exists (
        select 1 from public.matchdays m
        where m.id = matchday_rankings.matchday_id
        and public.is_season_participant(m.season_id)
      )
    )
  );

drop policy transactions_select on public.transactions;

create policy transactions_select on public.transactions
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
    or (
      typ in ('gewinn_gesamt', 'gewinn_spieltag')
      and public.is_season_participant(season_id)
      and public.current_user_active()
    )
  );

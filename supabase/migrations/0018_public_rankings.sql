-- Sichtbarkeits-Anpassung für die Rolle "user": Teilnahme & Einsatz (wer zahlt
-- wie viel ein) bleiben privat (unverändert – season_participants/
-- matchday_entries erlauben schon länger nur die eigene Zeile), aber
-- Platzierungen samt Gewinn sollen für alle sichtbar sein, analog zu einer
-- öffentlichen Kicktipp-Rangliste. Dafür müssen Spielernamen (players),
-- Platzierungen (matchday_rankings/season_rankings) und Gewinn-Beträge
-- (transactions mit typ gewinn_gesamt/gewinn_spieltag) für alle aktiven User
-- lesbar werden, nicht nur für die eigene Spieler-Zeile.

drop policy players_select on public.players;

create policy players_select on public.players
  for select
  using (public.current_user_active());

drop policy matchday_rankings_select on public.matchday_rankings;

create policy matchday_rankings_select on public.matchday_rankings
  for select
  using (public.current_user_active());

drop policy season_rankings_select on public.season_rankings;

create policy season_rankings_select on public.season_rankings
  for select
  using (public.current_user_active());

-- transactions bleibt für einsatz_*/korrektur weiterhin auf admin/spielleiter
-- bzw. die eigene Spieler-Zeile beschränkt (das sind die privaten Finanzdaten);
-- nur gewinn_gesamt/gewinn_spieltag werden zusätzlich für alle aktiven User
-- freigegeben, da genau diese Beträge in den Platzierungs-Listen angezeigt
-- werden sollen.
drop policy transactions_select on public.transactions;

create policy transactions_select on public.transactions
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
    or (typ in ('gewinn_gesamt', 'gewinn_spieltag') and public.current_user_active())
  );

-- Speichert eine optionale Zusatzauswahl weiterer Saison-Teilnehmer für den
-- "Platzierungsverlauf"-Chart (PlacementHistorySection.tsx) am eigenen
-- Profil - analog zu favorite_comparison_player_ids
-- (0075_favorite_comparison_players.sql): eine flache Liste von Spieler-IDs,
-- die pro Saison mit den tatsächlichen Teilnehmern geschnitten wird (siehe
-- PlacementHistorySection.tsx), statt einer Zuordnung pro Saison.
--
-- Keine neue RLS-Policy nötig: matchday_rankings_select/season_rankings_select
-- (0028_season_participant_visibility.sql) erlauben bereits jedem
-- Saison-Teilnehmer (is_season_participant()) den Blick auf ALLE
-- Platzierungen dieser Saison, nicht nur die eigenen. Die bisherige
-- Beschränkung des Charts auf die eigenen Spieler war rein UI-seitig, kein
-- Datenzugriffs-Schutz - diese Spalte macht die Auswahl nur konfigurierbar
-- und persistent, ändert aber keinen Datenzugriff.
-- Jeder aktive User darf sein eigenes Profil bereits selbst bearbeiten
-- (profiles_update_own-Policy, 0010_self_profile_update.sql).

alter table public.profiles
  add column favorite_placement_player_ids uuid[] not null default '{}';

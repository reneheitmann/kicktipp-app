-- Speichert die "Als Standard speichern"-Auswahl auf der Vergleich-Seite
-- (SeasonComparisonPage.tsx) künftig am eigenen Profil statt in
-- localStorage - localStorage übersteht keine Browser-/App-Storage-
-- Bereinigung (Safari-Inaktivität, mobile App-Neuinstallation/Update),
-- wodurch die Voreinstellung für Betroffene wiederholt verloren ging.
-- Jeder aktive User darf sein eigenes Profil bereits selbst bearbeiten
-- (profiles_update_own-Policy, 0010_self_profile_update.sql) - keine neue
-- RLS-Policy nötig, nur eine neue Spalte.

alter table public.profiles
  add column favorite_comparison_player_ids uuid[] not null default '{}';

-- Spieler deaktivieren, um ausgeschiedene Mitspieler aus Listen/Auswertungen
-- auszublenden (Dashboard, Vergleich, Massenmail-Empfänger, ...), ohne ihre
-- historischen Daten (Transaktionen, Platzierungen) zu verlieren.
--
-- Keine RLS-Änderung: players_select ist aktuell nur current_user_active()
-- (jeder aktive Nutzer sieht ohnehin alle Spieler-Zeilen) - Ausblenden ist
-- hier reine Anwendungslogik (siehe playersApi.ts), keine Sicherheitsgrenze
-- wie bei season_participant_visibility.

alter table public.players add column is_active boolean not null default true;

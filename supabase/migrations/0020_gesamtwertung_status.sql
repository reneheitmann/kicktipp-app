-- Die Gesamtwertung (Saison-Platzierungen) soll sich genau wie ein einzelner
-- Spieltag "abschließen" lassen, unabhängig vom übergeordneten Saison-Status
-- (aktiv/abgeschlossen). Gleiches offen/abgerechnet-Vokabular wie
-- matchdays.status, bewusst als eigene Spalte statt eines Enum-Typs (die
-- bestehende matchdays.status-Spalte nutzt ebenfalls nur eine CHECK-
-- Constraint, kein Enum).
alter table public.seasons
  add column gesamtwertung_status text not null default 'offen'
    check (gesamtwertung_status in ('offen', 'abgerechnet'));

-- Bestehende RLS-Policy seasons_update deckt beliebige Spalten ab (admin/
-- spielleiter, aktiv) – keine weitere Policy nötig.

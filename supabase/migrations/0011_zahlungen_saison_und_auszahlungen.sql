-- Erweitert "einzahlungen" zu "zahlungen": Einzahlungen UND Guthaben-
-- Auszahlungen, jeweils einer Saison zugeordnet (statt saisonunabhängig).
-- ALTER TABLE ... RENAME ändert nur den Namen, nicht die OID, daher bleiben
-- RLS-Policies, Indizes und Trigger der bisherigen Tabelle automatisch
-- erhalten und müssen nicht neu angelegt werden.

alter table public.einzahlungen rename to zahlungen;

create type public.zahlung_typ as enum ('einzahlung', 'auszahlung');

alter table public.zahlungen
  add column typ public.zahlung_typ not null default 'einzahlung';

alter table public.zahlungen
  add column season_id uuid references public.seasons (id) on delete cascade;

-- Bestehende (saisonunabhängige) Zahlungen rückwirkend der ältesten Saison
-- zuordnen, damit die folgende NOT-NULL-Pflicht nicht an Altdaten scheitert.
-- Zum Zeitpunkt dieser Migration existiert genau eine Saison, daher ist diese
-- Zuordnung eindeutig; bei mehreren Saisons müsste sie sonst manuell durch
-- den Administrator korrigiert werden.
update public.zahlungen
set season_id = (select id from public.seasons order by start_date limit 1)
where season_id is null;

alter table public.zahlungen alter column season_id set not null;

alter table public.zahlungen rename constraint einzahlungen_pkey to zahlungen_pkey;
alter index einzahlungen_player_id_idx rename to zahlungen_player_id_idx;
create index zahlungen_season_id_idx on public.zahlungen (season_id);

alter table public.zahlungen rename constraint einzahlungen_player_id_fkey to zahlungen_player_id_fkey;
alter table public.zahlungen rename constraint einzahlungen_created_by_fkey to zahlungen_created_by_fkey;
alter table public.zahlungen rename constraint einzahlungen_betrag_check to zahlungen_betrag_check;

alter policy einzahlungen_select on public.zahlungen rename to zahlungen_select;
alter policy einzahlungen_insert on public.zahlungen rename to zahlungen_insert;
alter policy einzahlungen_update on public.zahlungen rename to zahlungen_update;
alter policy einzahlungen_delete on public.zahlungen rename to zahlungen_delete;

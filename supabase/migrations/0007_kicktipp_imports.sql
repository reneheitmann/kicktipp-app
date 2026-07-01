-- Kicktipp-Datenimport: speichert jeden Upload nachvollziehbar (Rohdaten als
-- JSONB) und hält fest, ob er nur geprüft oder bereits in matchday_rankings /
-- season_rankings übernommen wurde. Die eigentliche Spieler-Zuordnung läuft
-- bewusst über das bereits vorhandene players.kicktipp_name-Feld (einmalige
-- Zuordnung pro Spieler, die sich die App dadurch "merkt") statt über eine
-- eigene Mapping-Tabelle.

create type public.kicktipp_import_status as enum ('geprueft', 'uebernommen');

create table public.kicktipp_imports (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  matchday_id uuid references public.matchdays (id) on delete cascade,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles (id) on delete set null,
  rohdaten jsonb not null,
  status public.kicktipp_import_status not null default 'geprueft',
  created_at timestamptz not null default now()
);

alter table public.kicktipp_imports enable row level security;

-- Reiner Spielleiter-/Administrator-Bereich, normale Spieler haben keinen Zugriff.
create policy kicktipp_imports_select on public.kicktipp_imports
  for select
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy kicktipp_imports_insert on public.kicktipp_imports
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy kicktipp_imports_update on public.kicktipp_imports
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy kicktipp_imports_delete on public.kicktipp_imports
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create index kicktipp_imports_season_id_idx on public.kicktipp_imports (season_id);

-- Saisons + Spieltage
-- Lesen ist allen aktiven, angemeldeten Usern erlaubt (Spieler sollen Saison-/
-- Spieltagsdaten einsehen können); Schreiben ist Admin/Spielleiter vorbehalten.

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null default 'aktiv' check (status in ('aktiv', 'abgeschlossen')),
  created_at timestamptz not null default now(),
  constraint seasons_dates_valid check (end_date >= start_date)
);

alter table public.seasons enable row level security;

create policy seasons_select on public.seasons
  for select
  using (public.current_user_active());

create policy seasons_insert on public.seasons
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy seasons_update on public.seasons
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy seasons_delete on public.seasons
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create table public.matchdays (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  nummer integer not null check (nummer > 0),
  datum date,
  status text not null default 'offen' check (status in ('offen', 'abgerechnet')),
  created_at timestamptz not null default now(),
  unique (season_id, nummer)
);

alter table public.matchdays enable row level security;

create policy matchdays_select on public.matchdays
  for select
  using (public.current_user_active());

create policy matchdays_insert on public.matchdays
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy matchdays_update on public.matchdays
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy matchdays_delete on public.matchdays
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create index matchdays_season_id_idx on public.matchdays (season_id);

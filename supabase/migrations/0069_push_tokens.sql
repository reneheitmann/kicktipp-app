-- Push-Token-Verwaltung für die mobile App (siehe mobile/, docs/mobile-app.md,
-- Phase 5/6). Ein Nutzer kann mehrere Tokens haben (mehrere Geräte, oder ein
-- Gerät mit mehreren verknüpften Instanzen – jede Instanz hat ihr eigenes
-- Supabase-Projekt und damit ihre eigene push_tokens-Zeile).

create type public.push_platform as enum ('ios', 'android');

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform public.push_platform not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_profile_id_idx on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;

-- Nur eigene Zeilen (profile_id = auth.uid()) einfügen/lesen/löschen - kein
-- Update-Recht nötig, ein erneuertes Token wird als Delete+Insert behandelt
-- (siehe Client-Anbindung, Phase 6). Gleiches "eigene Daten"-Muster wie
-- player_profile_links_select in 0041_player_profile_links.sql. Lesen ist
-- hier zusätzlich nötig (nicht nur schreiben), damit der Client vor einem
-- erneuten Insert prüfen kann, ob das aktuelle Device-Token schon
-- registriert ist.
create policy push_tokens_select on public.push_tokens
  for select
  using (profile_id = auth.uid() and public.current_user_active());

create policy push_tokens_insert on public.push_tokens
  for insert
  with check (profile_id = auth.uid() and public.current_user_active());

create policy push_tokens_delete on public.push_tokens
  for delete
  using (profile_id = auth.uid() and public.current_user_active());

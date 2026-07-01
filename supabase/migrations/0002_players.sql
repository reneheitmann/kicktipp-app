-- Spielerverwaltung
-- players ist bewusst von profiles entkoppelt (profile_id nullable): ein Spieler
-- kann erfasst werden, bevor (oder ohne dass) für ihn ein eigener Login existiert.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  kicktipp_name text,
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy players_select on public.players
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (profile_id = auth.uid() and public.current_user_active())
  );

create policy players_insert on public.players
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy players_update on public.players
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy players_delete on public.players
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create index players_profile_id_idx on public.players (profile_id);

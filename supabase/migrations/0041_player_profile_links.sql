-- Bisher konnte ein Spieler mit höchstens einem Login verknüpft werden
-- (players.profile_id, einzelne nullable FK). Neuer Bedarf: mehrere Logins
-- pro Spieler (z. B. Vater verwaltet Guthaben/Einzahlungen, Kind bekommt
-- einen eigenen Login, um sich selbst zu sehen – beide sehen denselben
-- Spieler). Der umgekehrte Fall (ein Login, mehrere Spieler) ist bereits
-- unterstützt. Eine echte Many-to-many-Verknüpfungstabelle deckt beide
-- Richtungen einheitlich ab.
create table public.player_profile_links (
  player_id uuid not null references public.players (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, profile_id)
);

create index player_profile_links_profile_id_idx on public.player_profile_links (profile_id);

alter table public.player_profile_links enable row level security;

-- Verknüpfen ist wie bisher (PlayerForm: "canLinkLogin = profile?.role ===
-- 'admin'") hart Admin-only verdrahtet, kein granulares Permission-System –
-- Selbstschutz-Prinzip dieses Projekts (analog email_settings/profiles/
-- role_permissions). Ein normaler User darf seine eigenen Links lesen
-- (profile_id = auth.uid()), das genügt für Dashboard/Saison-Detailseite/
-- Saisons-Liste, um "meine verknüpften Spieler" zu bestimmen.
create policy player_profile_links_select on public.player_profile_links
  for select
  using (
    (public.current_user_role() = 'admin' and public.current_user_active())
    or (profile_id = auth.uid() and public.current_user_active())
  );

create policy player_profile_links_insert on public.player_profile_links
  for insert
  with check (public.current_user_role() = 'admin' and public.current_user_active());

create policy player_profile_links_delete on public.player_profile_links
  for delete
  using (public.current_user_role() = 'admin' and public.current_user_active());

-- Backfill aus der bisherigen Spalte, dann Spalte + Index entfernen (kein
-- zweiter, potenziell veraltender Wahrheitsort).
insert into public.player_profile_links (player_id, profile_id)
select id, profile_id from public.players where profile_id is not null;

alter table public.players drop column profile_id;

-- is_own_player/is_season_participant bleiben signaturgleich (security
-- definer), daher greifen alle davon abhängigen RLS-Policies unverändert
-- weiter (season_participants/matchday_entries/transactions/einzahlungen/
-- zahlungen/seasons/matchdays/season_rankings/matchday_rankings).
create or replace function public.is_own_player(p_player_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.player_profile_links
    where player_id = p_player_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_season_participant(p_season_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.season_participants sp
    join public.player_profile_links ppl on ppl.player_id = sp.player_id
    where sp.season_id = p_season_id and ppl.profile_id = auth.uid()
  );
$$;

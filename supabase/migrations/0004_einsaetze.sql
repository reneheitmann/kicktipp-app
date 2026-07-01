-- Einsatzarten: Gesamtsieg-Einsatz (pro Saison, einmalig) und Spieltags-Einsatz
-- (pro Spieltag), jeweils getrennt erfasst. Jede Erfassung erzeugt automatisch
-- einen Eintrag im Transaktionsledger (transactions) – das Ledger ist für diese
-- beiden Typen bewusst trigger-verwaltet (kein direkter Insert/Update/Delete durch
-- Clients), damit Einsatz-Betrag und Buchung nie auseinanderlaufen können.
-- Gewinn_Gesamt/Gewinn_Spieltag/Korrektur-Buchungen kommen erst mit der
-- Gewinnverteilung hinzu und werden dort ergänzt.

create type public.transaction_typ as enum (
  'einsatz_gesamt',
  'einsatz_spieltag',
  'gewinn_gesamt',
  'gewinn_spieltag',
  'korrektur'
);

create or replace function public.is_own_player(p_player_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.players where id = p_player_id and profile_id = auth.uid()
  );
$$;

-- Gesamtsieg-Einsatz: ein Eintrag pro Spieler und Saison.
create table public.season_participants (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  gesamtsieg_einsatz_betrag numeric(10, 2) not null check (gesamtsieg_einsatz_betrag >= 0),
  created_at timestamptz not null default now(),
  unique (season_id, player_id)
);

alter table public.season_participants enable row level security;

create policy season_participants_select on public.season_participants
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

create policy season_participants_insert on public.season_participants
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy season_participants_update on public.season_participants
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy season_participants_delete on public.season_participants
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

-- Spieltags-Einsatz: ein Eintrag pro Spieler und Spieltag.
create table public.matchday_entries (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  spieltags_einsatz_betrag numeric(10, 2) not null check (spieltags_einsatz_betrag >= 0),
  created_at timestamptz not null default now(),
  unique (matchday_id, player_id)
);

alter table public.matchday_entries enable row level security;

create policy matchday_entries_select on public.matchday_entries
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

create policy matchday_entries_insert on public.matchday_entries
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy matchday_entries_update on public.matchday_entries
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy matchday_entries_delete on public.matchday_entries
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

-- Transaktionsledger (Einsätze + später Gewinne/Korrekturen).
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  matchday_id uuid references public.matchdays (id) on delete cascade,
  typ public.transaction_typ not null,
  betrag numeric(10, 2) not null,
  datum date not null default current_date,
  notiz text,
  source_season_participant_id uuid references public.season_participants (id) on delete cascade,
  source_matchday_entry_id uuid references public.matchday_entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_season_participant_id),
  unique (source_matchday_entry_id),
  constraint transactions_einsatz_source_check check (
    (typ = 'einsatz_gesamt' and source_season_participant_id is not null and source_matchday_entry_id is null and matchday_id is null)
    or (typ = 'einsatz_spieltag' and source_matchday_entry_id is not null and source_season_participant_id is null and matchday_id is not null)
    or (typ in ('gewinn_gesamt', 'gewinn_spieltag', 'korrektur'))
  )
);

alter table public.transactions enable row level security;

create policy transactions_select on public.transactions
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

-- Bewusst keine Insert/Update/Delete-Policy für einsatz_*: Diese Zeilen entstehen
-- ausschließlich über die unten stehenden SECURITY DEFINER-Trigger, niemals direkt
-- durch Clients (auch nicht durch Admins via REST/Studio).

create index transactions_player_id_idx on public.transactions (player_id);
create index transactions_season_id_idx on public.transactions (season_id);

create or replace function public.sync_einsatz_gesamt_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.transactions (player_id, season_id, typ, betrag, source_season_participant_id)
    values (new.player_id, new.season_id, 'einsatz_gesamt', new.gesamtsieg_einsatz_betrag, new.id);
  elsif tg_op = 'UPDATE' then
    update public.transactions
    set betrag = new.gesamtsieg_einsatz_betrag
    where source_season_participant_id = new.id;
  end if;
  return new;
end;
$$;

create trigger season_participants_sync_transaction
  after insert or update of gesamtsieg_einsatz_betrag on public.season_participants
  for each row execute function public.sync_einsatz_gesamt_transaction();

create or replace function public.sync_einsatz_spieltag_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_id uuid;
begin
  select season_id into v_season_id from public.matchdays where id = new.matchday_id;

  if tg_op = 'INSERT' then
    insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, source_matchday_entry_id)
    values (new.player_id, v_season_id, new.matchday_id, 'einsatz_spieltag', new.spieltags_einsatz_betrag, new.id);
  elsif tg_op = 'UPDATE' then
    update public.transactions
    set betrag = new.spieltags_einsatz_betrag
    where source_matchday_entry_id = new.id;
  end if;
  return new;
end;
$$;

create trigger matchday_entries_sync_transaction
  after insert or update of spieltags_einsatz_betrag on public.matchday_entries
  for each row execute function public.sync_einsatz_spieltag_transaction();

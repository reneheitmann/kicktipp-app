-- Ersetzt den Bezahlt-Haken pro Beitrag (0008) durch eine echte, vom
-- Spieler-Konto unabhängig von einzelner Saison/Spieltag geführte
-- Einzahlungs-Historie. Außerdem: ein fester Standard-Spieltagseinsatz pro
-- Saison-Teilnehmer, der automatisch in jeden neu angelegten Spieltag
-- übernommen wird, statt ihn jedes Mal manuell zu erfassen.

alter table public.season_participants drop column bezahlt;
alter table public.season_participants drop column bezahlt_am;
alter table public.matchday_entries drop column bezahlt;
alter table public.matchday_entries drop column bezahlt_am;

alter table public.season_participants
  add column spieltags_einsatz_betrag numeric(10, 2) not null default 0 check (spieltags_einsatz_betrag >= 0);

-- Bei jedem neuen Spieltag automatisch matchday_entries für alle aktuellen
-- Saison-Teilnehmer mit ihrem Standard-Spieltagseinsatz anlegen. Teilnehmer mit
-- Betrag 0 (z. B. reine Gesamtsieg-Teilnehmer) werden bewusst übersprungen.
-- Läuft als normale (nicht SECURITY DEFINER) Funktion, da die übliche
-- matchday_entries_insert-Policy (Admin/Spielleiter) für den Aufrufer, der
-- gerade erst den Spieltag anlegen durfte, ohnehin bereits greift.
create or replace function public.auto_create_matchday_entries()
returns trigger
language plpgsql
as $$
begin
  insert into public.matchday_entries (matchday_id, player_id, spieltags_einsatz_betrag)
  select new.id, sp.player_id, sp.spieltags_einsatz_betrag
  from public.season_participants sp
  where sp.season_id = new.season_id and sp.spieltags_einsatz_betrag > 0;
  return new;
end;
$$;

create trigger matchdays_auto_create_entries
  after insert on public.matchdays
  for each row execute function public.auto_create_matchday_entries();

-- Einzahlungen: tatsächlich eingegangene Zahlungen je Spieler, bewusst nicht an
-- eine einzelne Saison gebunden (z. B. Vorauszahlungen). Getrennt vom
-- Buchungs-Ledger (transactions), das weiterhin nur abbildet, was geschuldet
-- bzw. gewonnen wird.
create table public.einzahlungen (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  betrag numeric(10, 2) not null check (betrag > 0),
  datum date not null default current_date,
  notiz text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.einzahlungen enable row level security;

create policy einzahlungen_select on public.einzahlungen
  for select
  using (
    (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
    or (public.is_own_player(player_id) and public.current_user_active())
  );

create policy einzahlungen_insert on public.einzahlungen
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy einzahlungen_update on public.einzahlungen
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy einzahlungen_delete on public.einzahlungen
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create index einzahlungen_player_id_idx on public.einzahlungen (player_id);

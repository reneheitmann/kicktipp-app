-- Gewinnverteilungs-Konfiguration (getrennt für Spieltag/Gesamtsieg).
--
-- Harte 100%-Validierung: Eine einzelne Zeile (ein Rang) kann naturgemäß nie für
-- sich allein 100% ergeben – die Summe ergibt sich erst über alle Ränge einer
-- Saison+Typ-Kombination. Eine normale (nicht-deferred) Row-Level-Prüfung würde
-- daher jeden Einzel-Insert ablehnen. Stattdessen: ein DEFERRABLE CONSTRAINT
-- TRIGGER, der erst am Transaktionsende (COMMIT) prüft, ob die jeweils
-- betroffene Gruppe in Summe exakt 100% ergibt. Das funktioniert für die App
-- (über die RPC set_payout_rules, die Löschen+Neuanlage in einer Transaktion
-- kapselt) genauso wie für direkte DB-Zugriffe außerhalb der App, solange diese
-- eine vollständige Zeilenmenge in einer Transaktion committen – ein einzelner
-- autocommitteter Insert/Update, der die Gruppe in einen ungültigen Zwischen-
-- zustand bringt, wird beim (impliziten) Commit dieser einzelnen Anweisung
-- zurückgewiesen.

create type public.payout_typ as enum ('spieltag', 'gesamtsieg');

create table public.payout_rules (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  typ public.payout_typ not null,
  rang integer not null check (rang > 0),
  prozent_anteil numeric(5, 2) not null check (prozent_anteil > 0 and prozent_anteil <= 100),
  created_at timestamptz not null default now(),
  unique (season_id, typ, rang)
);

alter table public.payout_rules enable row level security;

-- Lesen ist allen aktiven Usern erlaubt (read-only Einsicht für normale Spieler).
create policy payout_rules_select on public.payout_rules
  for select
  using (public.current_user_active());

create policy payout_rules_insert on public.payout_rules
  for insert
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy payout_rules_update on public.payout_rules
  for update
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active())
  with check (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create policy payout_rules_delete on public.payout_rules
  for delete
  using (public.current_user_role() in ('admin', 'spielleiter') and public.current_user_active());

create or replace function public.check_payout_rules_complete()
returns trigger
language plpgsql
as $$
declare
  v_season_id uuid;
  v_typ public.payout_typ;
  v_count integer;
  v_sum numeric;
  v_max_rang integer;
begin
  if tg_op = 'DELETE' then
    v_season_id := old.season_id;
    v_typ := old.typ;
  else
    v_season_id := new.season_id;
    v_typ := new.typ;
  end if;

  select count(*), coalesce(sum(prozent_anteil), 0), coalesce(max(rang), 0)
    into v_count, v_sum, v_max_rang
    from public.payout_rules
    where season_id = v_season_id and typ = v_typ;

  -- Keine Regeln für diese Saison/Typ-Kombination (mehr) -> erlaubt (noch nicht
  -- konfiguriert bzw. bewusst geleert).
  if v_count = 0 then
    return null;
  end if;

  -- Ränge sind durch den unique-Constraint bereits eindeutig und durch den
  -- check-Constraint positiv; max(rang) = count(*) ist daher gleichbedeutend mit
  -- "lückenlos 1..N durchnummeriert".
  if v_max_rang <> v_count then
    raise exception 'Gewinnverteilung (Saison %, Typ %) muss lückenlos von Platz 1 bis Platz % durchnummeriert sein.',
      v_season_id, v_typ, v_count
      using errcode = '23514';
  end if;

  if v_sum <> 100 then
    raise exception 'Gewinnverteilung (Saison %, Typ %) muss in Summe 100 Prozent ergeben, aktuell % Prozent.',
      v_season_id, v_typ, v_sum
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger payout_rules_complete_check
  after insert or update or delete on public.payout_rules
  deferrable initially deferred
  for each row execute function public.check_payout_rules_complete();

-- RPC, über die die App eine komplette Verteilung (alle Ränge eines Typs) atomar
-- ersetzt: Löschen + Neuanlage laufen in einer Transaktion, sodass der oben
-- stehende deferred Trigger erst gegen den fertigen Endzustand prüft.
-- SECURITY INVOKER (Standard): unterliegt weiterhin den RLS-Policies oben, ein
-- Aufruf durch einen normalen User schlägt also schon am DELETE/INSERT fehl.
create or replace function public.set_payout_rules(p_season_id uuid, p_typ public.payout_typ, p_rules jsonb)
returns setof public.payout_rules
language plpgsql
as $$
begin
  delete from public.payout_rules where season_id = p_season_id and typ = p_typ;

  return query
  insert into public.payout_rules (season_id, typ, rang, prozent_anteil)
  select p_season_id, p_typ, (rule ->> 'rang')::integer, (rule ->> 'prozent_anteil')::numeric
  from jsonb_array_elements(p_rules) as rule
  returning *;
end;
$$;

grant execute on function public.set_payout_rules(uuid, public.payout_typ, jsonb) to authenticated;

create index payout_rules_season_id_idx on public.payout_rules (season_id);

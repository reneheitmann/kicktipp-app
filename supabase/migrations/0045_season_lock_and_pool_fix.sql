-- 1) Bugfix: get_payout_pool() multipliziert den Spieltags-Einsatz bislang
-- nicht mit der Spieltag-Anzahl, obwohl diese Formel (spieltags_einsatz_betrag
-- x Anzahl Spieltage) überall sonst in der App verwendet wird (siehe
-- src/features/players/accountBalance.ts). Der "Gesamtwertung"-Fall
-- (typ='gesamtsieg') war bereits korrekt und bleibt unverändert.
create or replace function public.get_payout_pool(p_season_id uuid, p_typ public.payout_typ)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.current_user_active() then
    raise exception 'Nicht berechtigt.';
  end if;

  return coalesce((
    select sum(
      case
        when p_typ = 'gesamtsieg' then gesamtsieg_einsatz_betrag
        else spieltags_einsatz_betrag * (select count(*) from public.matchdays where season_id = p_season_id)
      end
    )
    from public.season_participants
    where season_id = p_season_id
  ), 0);
end;
$$;

-- 2) Schreibsperre für abgeschlossene/archivierte Saisons und abgerechnete
-- Spieltage. Trigger statt RLS-Policy-Änderungen, damit nicht jede der ~15
-- bestehenden Policies (season_participants, payout_rules, matchdays,
-- matchday_entries, matchday_rankings, season_rankings) einzeln angefasst
-- werden muss – ein Trigger pro Tabelle gilt unabhängig davon, ob der
-- Schreibzugriff über einen direkten Client-Call oder eine RPC
-- (set_payout_rules, calculate_matchday_payout etc.) erfolgt.
--
-- Eskalationsausnahme: der Saison-Status selbst (seasons.status) wird von
-- keinem dieser Trigger berührt, bleibt also immer änderbar – das ist die
-- einzige Möglichkeit, eine gesperrte Saison wieder zu öffnen.
create or replace function public.check_season_editable(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.seasons where id = p_season_id;
  if v_status in ('abgeschlossen', 'archiviert') then
    raise exception 'Diese Saison ist % und kann nicht mehr bearbeitet werden.', v_status;
  end if;
end;
$$;

create or replace function public.trg_check_season_editable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_season_editable(coalesce(new.season_id, old.season_id));
  return coalesce(new, old);
end;
$$;

create trigger season_participants_lock
  before insert or update or delete on public.season_participants
  for each row execute function public.trg_check_season_editable();

create trigger payout_rules_lock
  before insert or update or delete on public.payout_rules
  for each row execute function public.trg_check_season_editable();

create trigger season_rankings_lock
  before insert or update or delete on public.season_rankings
  for each row execute function public.trg_check_season_editable();

-- matchdays: Season-Sperre gilt für jede Änderung inkl. des eigenen
-- Status-Felds (ein Spieltag hat keine eigene Ausnahme von der Saison-
-- Sperre) – nur ein bereits abgerechneter Spieltag hat zusätzlich seine
-- eigene Sperre, von der wiederum der eigene Status-Umschalter ausgenommen
-- ist (sonst gäbe es keine Möglichkeit, ihn wieder zu öffnen).
create or replace function public.trg_check_matchday_editable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.check_season_editable(old.season_id);
    if old.status = 'abgerechnet' then
      raise exception 'Dieser Spieltag ist abgerechnet und kann nicht gelöscht werden.';
    end if;
    return old;
  end if;

  perform public.check_season_editable(new.season_id);

  if TG_OP = 'UPDATE' and old.status = 'abgerechnet' and new.status = old.status then
    raise exception 'Dieser Spieltag ist abgerechnet und kann nicht mehr bearbeitet werden.';
  end if;

  return new;
end;
$$;

create trigger matchdays_editable
  before insert or update or delete on public.matchdays
  for each row execute function public.trg_check_matchday_editable();

-- matchday_entries/matchday_rankings haben keine eigene season_id-Spalte
-- (nur matchday_id) und keinen eigenen Status-Umschalter – daher hier ohne
-- Sonderfall Season-Sperre + Spieltag-eigene Sperre kombiniert.
create or replace function public.trg_check_matchday_entries_editable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matchday_id uuid := coalesce(new.matchday_id, old.matchday_id);
  v_season_id uuid;
  v_matchday_status text;
begin
  select season_id, status into v_season_id, v_matchday_status
  from public.matchdays where id = v_matchday_id;

  perform public.check_season_editable(v_season_id);

  if v_matchday_status = 'abgerechnet' then
    raise exception 'Dieser Spieltag ist abgerechnet und kann nicht mehr bearbeitet werden.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger matchday_entries_lock
  before insert or update or delete on public.matchday_entries
  for each row execute function public.trg_check_matchday_entries_editable();

create trigger matchday_rankings_lock
  before insert or update or delete on public.matchday_rankings
  for each row execute function public.trg_check_matchday_entries_editable();

-- seasons.gesamtwertung_status ist der Gesamtwertungs-Pendant zum
-- Spieltag-Status-Umschalter, aber NICHT Teil der bestätigten Ausnahme
-- (das ist ausschließlich seasons.status selbst) – daher eigener,
-- spaltenspezifischer Trigger, der nur beim Ändern von
-- gesamtwertung_status greift und seasons.status unangetastet lässt.
create or replace function public.trg_check_gesamtwertung_editable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('abgeschlossen', 'archiviert') then
    raise exception 'Diese Saison ist % und kann nicht mehr bearbeitet werden.', old.status;
  end if;
  return new;
end;
$$;

create trigger seasons_gesamtwertung_lock
  before update of gesamtwertung_status on public.seasons
  for each row execute function public.trg_check_gesamtwertung_editable();

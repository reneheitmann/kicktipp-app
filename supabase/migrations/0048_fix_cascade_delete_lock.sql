-- Bugfix: die Sperr-Trigger aus 0045 (abgeschlossene Saisons/abgerechnete
-- Spieltage vor Bearbeitung schützen) blockieren fälschlich auch das Löschen
-- der Saison/des Spielers selbst. Löscht man z. B. eine Saison mit einem
-- bereits abgerechneten Spieltag, kaskadiert der ON DELETE CASCADE auf
-- matchdays – dessen eigener Sperr-Trigger feuert dabei genauso wie bei
-- einer direkten Bearbeitung und bricht die ganze Löschung ab
-- ("Dieser Spieltag ist abgerechnet und kann nicht gelöscht werden."),
-- obwohl der komplette Datensatzbaum ohnehin entfernt wird. Analog beim
-- Löschen eines Spielers, der an einer abgeschlossenen Saison teilgenommen
-- hat (kaskadiert über season_participants/matchday_entries).
--
-- pg_trigger_depth() unterscheidet zuverlässig zwischen einem direkten
-- DELETE auf der jeweiligen Tabelle (Tiefe 1 – der Trigger selbst ist die
-- äußerste Ebene) und einem durch ON DELETE CASCADE ausgelösten,
-- verschachtelten DELETE (Tiefe > 1 – Postgres implementiert Cascade-FKs
-- selbst über interne Trigger, sodass der eigentliche Kind-Trigger dann
-- innerhalb dieser Cascade-Ebene feuert). Nur bei DELETE übersprungen, INSERT/
-- UPDATE bleiben unverändert streng gesperrt.
create or replace function public.trg_check_season_editable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  perform public.check_season_editable(coalesce(new.season_id, old.season_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_check_matchday_editable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    if pg_trigger_depth() > 1 then
      return old;
    end if;
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
  if TG_OP = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  select season_id, status into v_season_id, v_matchday_status
  from public.matchdays where id = v_matchday_id;

  perform public.check_season_editable(v_season_id);

  if v_matchday_status = 'abgerechnet' then
    raise exception 'Dieser Spieltag ist abgerechnet und kann nicht mehr bearbeitet werden.';
  end if;
  return coalesce(new, old);
end;
$$;

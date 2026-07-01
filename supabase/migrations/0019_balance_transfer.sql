-- Überträgt den offenen Saldo (Guthaben oder Restschuld) eines Spielers von
-- einer Saison in eine andere: Guthaben/offene Zahlungen gelten immer nur für
-- eine Saison, ein Übertrag muss daher explizit erfolgen.
--
-- Nutzt den bisher ungenutzten transaction_typ 'korrektur' (matchday_id = null,
-- also auf Gesamtsieg-Ebene) statt eines neuen Enum-Werts – vermeidet eine
-- ALTER TYPE-Migration und passt inhaltlich: eine manuelle Korrektur des
-- Kontostands außerhalb der normalen Einsatz-/Gewinn-Buchungen.
--
-- p_betrag folgt der "offen"-Vorzeichenkonvention aus computeAccountBalance
-- (positiv = Spieler schuldet, negativ = Guthaben): in der Quell-Saison wird
-- +p_betrag gebucht (gleicht den bisherigen "offen"-Wert exakt auf 0 aus), in
-- der Ziel-Saison -p_betrag (baut denselben Betrag als Startsaldo neu auf).
create or replace function public.transfer_balance_to_season(
  p_player_id uuid,
  p_from_season_id uuid,
  p_to_season_id uuid,
  p_betrag numeric,
  p_notiz text default null
)
returns void
language plpgsql
as $$
declare
  v_from_name text;
  v_to_name text;
  v_notiz_suffix text;
begin
  if p_from_season_id = p_to_season_id then
    raise exception 'Quell- und Zielsaison müssen unterschiedlich sein.';
  end if;
  if p_betrag = 0 then
    raise exception 'Der zu übertragende Betrag darf nicht 0 sein.';
  end if;

  select name into v_from_name from public.seasons where id = p_from_season_id;
  select name into v_to_name from public.seasons where id = p_to_season_id;
  if v_from_name is null or v_to_name is null then
    raise exception 'Quell- oder Zielsaison nicht gefunden.';
  end if;

  v_notiz_suffix := case when p_notiz is not null and length(trim(p_notiz)) > 0 then ' (' || trim(p_notiz) || ')' else '' end;

  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  values (
    p_player_id, p_from_season_id, null, 'korrektur', round(p_betrag, 2),
    'Übertrag nach Saison "' || v_to_name || '"' || v_notiz_suffix
  );

  insert into public.transactions (player_id, season_id, matchday_id, typ, betrag, notiz)
  values (
    p_player_id, p_to_season_id, null, 'korrektur', round(-p_betrag, 2),
    'Übertrag aus Saison "' || v_from_name || '"' || v_notiz_suffix
  );
end;
$$;

-- SECURITY INVOKER (Standard): unterliegt der bestehenden RLS-Policy
-- transactions_insert_gewinn_korrektur (admin/spielleiter, aktiv) – ein Aufruf
-- durch einen normalen User schlägt schon am ersten Insert fehl.
grant execute on function public.transfer_balance_to_season(uuid, uuid, uuid, numeric, text) to authenticated;

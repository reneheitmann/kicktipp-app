-- Zahlungsstatus für beide Einsatzarten: "bezahlt" trennt den gebuchten
-- Beitrag (season_participants/matchday_entries, weiterhin sofort per Trigger
-- als einsatz_*-Transaktion verbucht) von der tatsächlich physisch
-- eingegangenen Zahlung. Das Ledger (transactions) bildet weiterhin ab, was
-- geschuldet wird, unabhängig vom Zahlungsstatus – payout-Berechnungen bleiben
-- dadurch unverändert korrekt, auch wenn noch nicht alle eingezahlt haben.

alter table public.season_participants
  add column bezahlt boolean not null default false,
  add column bezahlt_am date;

alter table public.matchday_entries
  add column bezahlt boolean not null default false,
  add column bezahlt_am date;

-- Setzt die Gesamtwertung-Gewinnverteilung einer Saison komplett zurück:
-- löscht sowohl die konfigurierte Prozent-Verteilung (payout_rules) als auch
-- bereits verbuchte Gewinne (gewinn_gesamt-Transaktionen) in einem Schritt,
-- damit eine Saison bei Bedarf von vorn konfiguriert werden kann.
--
-- SECURITY INVOKER (Standard): unterliegt weiterhin den bestehenden
-- RLS-Policies beider Tabellen (payout_rules_delete -> payouts.manage,
-- transactions_delete_gewinn -> rankings.manage). Ein Aufrufer ohne beide
-- Rechte scheitert an der jeweiligen Policy, die gesamte Transaktion wird
-- dann zurückgerollt (kein Teil-Löschen).
create or replace function public.delete_season_payout_distribution(p_season_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.payout_rules where season_id = p_season_id and typ = 'gesamtsieg';
  delete from public.transactions where season_id = p_season_id and typ = 'gewinn_gesamt';
end;
$$;

grant execute on function public.delete_season_payout_distribution(uuid) to authenticated;

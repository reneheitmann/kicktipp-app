-- delete_season_payout_distribution (0023) verband zwei unabhängige Vorgänge
-- in einer Aktion: die konfigurierte Prozent-Verteilung (payout_rules) UND
-- die aus Platzierungen berechneten Gewinne (gewinn_gesamt-Transaktionen)
-- wurden gemeinsam gelöscht. In der Praxis will man aber meist nur die
-- Platzierungen (season_rankings) samt daraus verbuchter Gewinne
-- zurücksetzen, um sie neu einzutragen und neu zu berechnen – die einmal
-- konfigurierte Gewinnverteilung soll dabei unangetastet bleiben (sie lässt
-- sich bei Bedarf ohnehin jederzeit über den Gewinnverteilungs-Editor
-- überschreiben, set_payout_rules ersetzt dort die komplette Regelmenge).
--
-- Umbenennung statt neuer Funktion, damit der Grant erhalten bleibt.
alter function public.delete_season_payout_distribution(uuid) rename to reset_season_rankings;

create or replace function public.reset_season_rankings(p_season_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.season_rankings where season_id = p_season_id;
  delete from public.transactions where season_id = p_season_id and typ = 'gewinn_gesamt';
end;
$$;

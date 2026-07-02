-- Bug (gefunden per Audit): matchdays.status/seasons.gesamtwertung_status
-- steuert nur, ob "Spieltage"/"Saisons"-Liste (DashboardPage, SeasonsPage,
-- SeasonDetailPage) einen bereits berechneten Gewinn mitzählt – die
-- zugehörigen gewinn_spieltag/gewinn_gesamt-Transaktionen selbst bleiben
-- beim Zurücksetzen auf "offen" unangetastet stehen. Konten-Übersicht,
-- Spieler-Detail und "Mein Konto" (accountBalance.ts) zählen Gewinne dagegen
-- ungefiltert nach Status – zeigen also weiterhin den alten Betrag, obwohl
-- die "abgerechnet"-Anzeigen ihn nicht mehr ausweisen. Zwei unterschiedliche
-- Zahlen für denselben Sachverhalt, bis jemand die Gewinnberechnung erneut
-- anstößt.
--
-- Fix: Wird ein Spieltag/die Gesamtwertung von "abgerechnet" zurück auf
-- "offen" gesetzt, werden die zugehörigen Gewinn-Transaktionen automatisch
-- entfernt (nicht die Platzierungen selbst – die bleiben erhalten, damit sie
-- sich korrigieren und anschließend neu berechnen lassen). Damit zeigen
-- beide Ansichten wieder denselben (dann: keinen) Gewinn, bis "Gewinne
-- berechnen" erneut ausgeführt wird.
create or replace function public.clear_matchday_gewinn_on_reset()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'offen' and old.status = 'abgerechnet' then
    delete from public.transactions
    where matchday_id = new.id and typ = 'gewinn_spieltag';
  end if;
  return new;
end;
$$;

create trigger matchdays_clear_gewinn_on_reset
  after update of status on public.matchdays
  for each row execute function public.clear_matchday_gewinn_on_reset();

create or replace function public.clear_season_gewinn_on_reset()
returns trigger
language plpgsql
as $$
begin
  if new.gesamtwertung_status = 'offen' and old.gesamtwertung_status = 'abgerechnet' then
    delete from public.transactions
    where season_id = new.id and typ = 'gewinn_gesamt' and matchday_id is null;
  end if;
  return new;
end;
$$;

create trigger seasons_clear_gewinn_on_reset
  after update of gesamtwertung_status on public.seasons
  for each row execute function public.clear_season_gewinn_on_reset();

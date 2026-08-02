-- pgTAP-Tests für calculate_matchday_payout() (siehe
-- supabase/migrations/0012_tie_aware_payout_calculation.sql). Struktur
-- spiegelt calculate_season_payout.test.sql, mit einer Besonderheit: das
-- Anlegen eines matchdays löst den Trigger auto_create_matchday_entries
-- aus (supabase/migrations/0009_einzahlungen_und_standardeinsatz.sql), der
-- NUR für Teilnehmer mit eigenem spieltags_einsatz_betrag > 0 automatisch
-- eine matchday_entries-Zeile anlegt - jeder gerankte Spieler braucht also
-- selbst einen positiven Einsatz (nicht wie bei season_participants ein
-- separater "Topf-Spender" mit 0 bei den übrigen), sonst schlägt die
-- zusammengesetzte FK von matchday_rankings auf matchday_entries fehl. Die
-- genaue Aufteilung der Einsätze auf die Spieler ist für den Payout
-- irrelevant (der ist rein rang-/prozentbasiert) - nur die Summe (= Topf)
-- zählt, daher hier bewusst "krumme" Einzelbeträge, die sich zu runden
-- Töpfen summieren.
begin;
select plan(23);

insert into public.players (id, name) values
  ('c0000000-0000-0000-0000-000000000002', 'pgtap-md-player-a'),
  ('c0000000-0000-0000-0000-000000000003', 'pgtap-md-player-b'),
  ('c0000000-0000-0000-0000-000000000004', 'pgtap-md-player-c'),
  ('c0000000-0000-0000-0000-000000000005', 'pgtap-md-player-d');

-- ============================================================
-- Szenario 1: kein Gleichstand, eindeutige Ränge. Topf 1000,00 (500+300+200).
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('d0000000-0000-0000-0000-000000000001', 'pgtap-md-season-notie', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 0, 500.00),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 0, 300.00),
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 0, 200.00);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('d0000000-0000-0000-0000-000000000001', 'spieltag', 1, 50),
  ('d0000000-0000-0000-0000-000000000001', 'spieltag', 2, 30),
  ('d0000000-0000-0000-0000-000000000001', 'spieltag', 3, 20);

-- Löst auto_create_matchday_entries aus (Topf = Summe der obigen Einsätze).
insert into public.matchdays (id, season_id, nummer) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1);

insert into public.matchday_rankings (matchday_id, player_id, rang) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 1),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 2),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 3);

select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000001');

select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000001' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000002'),
  500.00::numeric, 'Szenario 1: Rang 1 (50%) bekommt 500,00 von 1000,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000001' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000003'),
  300.00::numeric, 'Szenario 1: Rang 2 (30%) bekommt 300,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000001' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000004'),
  200.00::numeric, 'Szenario 1: Rang 3 (20%) bekommt 200,00'
);
select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000001' and typ = 'gewinn_spieltag'),
  3::bigint, 'Szenario 1: genau 3 Auszahlungszeilen'
);

-- ============================================================
-- Szenario 2: Gleichstand exakt wie im Migrations-Kommentar (0012).
-- Topf 300,00 (150+50+50+50), damit 35%/3 glatt aufgeht.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('d0000000-0000-0000-0000-000000000002', 'pgtap-md-season-tie', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag) values
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 0, 150.00),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 0, 50.00),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 0, 50.00),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 0, 50.00);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('d0000000-0000-0000-0000-000000000002', 'spieltag', 1, 65),
  ('d0000000-0000-0000-0000-000000000002', 'spieltag', 2, 20),
  ('d0000000-0000-0000-0000-000000000002', 'spieltag', 3, 10),
  ('d0000000-0000-0000-0000-000000000002', 'spieltag', 4, 5);

insert into public.matchdays (id, season_id, nummer) values
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 1);

insert into public.matchday_rankings (matchday_id, player_id, rang) values
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 1),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 2),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 2),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 2);

select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000002');

select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000002' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000002'),
  195.00::numeric, 'Szenario 2: Rang 1 allein (65%) bekommt 195,00 von 300,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000002' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000003'),
  35.00::numeric, 'Szenario 2: erster Gleichstand-Spieler bekommt (20+10+5)/3 = 35,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000002' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000004'),
  35.00::numeric, 'Szenario 2: zweiter Gleichstand-Spieler bekommt ebenfalls 35,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000002' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000005'),
  35.00::numeric, 'Szenario 2: dritter Gleichstand-Spieler bekommt ebenfalls 35,00'
);
select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000002' and typ = 'gewinn_spieltag'),
  4::bigint, 'Szenario 2: genau 4 Auszahlungszeilen (1 + 3 Gleichstand)'
);

-- ============================================================
-- Szenario 3: Topf = 0 - kein Teilnehmer hat spieltags_einsatz_betrag > 0,
-- der Trigger legt daher gar keine matchday_entries an und es kann folglich
-- auch kein Ranking existieren -> keine Auszahlungen, keine Exception.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('d0000000-0000-0000-0000-000000000003', 'pgtap-md-season-emptypot', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag) values
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 0, 0),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 0, 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('d0000000-0000-0000-0000-000000000003', 'spieltag', 1, 100);

insert into public.matchdays (id, season_id, nummer) values
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 1);

select is(
  (select count(*) from public.matchday_entries where matchday_id = 'e0000000-0000-0000-0000-000000000003'),
  0::bigint, 'Szenario 3: Trigger legt bei Einsatz 0 keine matchday_entries an'
);
select lives_ok(
  $$select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000003')$$,
  'Szenario 3: Aufruf mit Topf = 0 wirft keine Exception'
);
select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000003' and typ = 'gewinn_spieltag'),
  0::bigint, 'Szenario 3: keine Auszahlungszeilen bei Topf = 0'
);

-- ============================================================
-- Szenario 4: Rang ohne payout_rules-Abdeckung -> betrag = 0, keine Zeile.
-- Topf 1000,00 (690+300+10), Rang 3 (Spieler mit 10,00 Einsatz) bleibt ohne
-- Regel-Abdeckung.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('d0000000-0000-0000-0000-000000000004', 'pgtap-md-season-uncovered-rank', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag) values
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 0, 690.00),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 0, 300.00),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 0, 10.00);

-- Nur Rang 1+2 konfiguriert (gapless, summiert 100%) - Rang 3 bleibt
-- absichtlich ungedeckt.
insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('d0000000-0000-0000-0000-000000000004', 'spieltag', 1, 70),
  ('d0000000-0000-0000-0000-000000000004', 'spieltag', 2, 30);

insert into public.matchdays (id, season_id, nummer) values
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 1);

insert into public.matchday_rankings (matchday_id, player_id, rang) values
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 1),
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 2),
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 3);

select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000004');

select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000004' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000002'),
  700.00::numeric, 'Szenario 4: Rang 1 (70%) bekommt 700,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000004' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000003'),
  300.00::numeric, 'Szenario 4: Rang 2 (30%) bekommt 300,00'
);
select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000004' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000004'),
  0::bigint, 'Szenario 4: Rang 3 ohne Regel-Abdeckung bekommt KEINE Zeile'
);
select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000004' and typ = 'gewinn_spieltag'),
  2::bigint, 'Szenario 4: insgesamt nur 2 Auszahlungszeilen (nicht 3)'
);

-- ============================================================
-- Szenario 5: Idempotenz - zweiter Aufruf mit vertauschtem Ranking ersetzt
-- die alten gewinn_spieltag-Zeilen, statt sie zu duplizieren. Topf 100,00
-- (60+40).
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('d0000000-0000-0000-0000-000000000005', 'pgtap-md-season-idempotent', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag) values
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 0, 60.00),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 0, 40.00);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('d0000000-0000-0000-0000-000000000005', 'spieltag', 1, 60),
  ('d0000000-0000-0000-0000-000000000005', 'spieltag', 2, 40);

insert into public.matchdays (id, season_id, nummer) values
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 1);

insert into public.matchday_rankings (matchday_id, player_id, rang) values
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 1),
  ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 2);

select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000005');

select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000005' and typ = 'gewinn_spieltag'),
  2::bigint, 'Szenario 5 (Lauf 1): genau 2 Auszahlungszeilen'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000005' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000002'),
  60.00::numeric, 'Szenario 5 (Lauf 1): Spieler B (Rang 1) bekommt 60,00'
);

-- Ranking vertauschen (B <-> C) und Funktion erneut aufrufen.
update public.matchday_rankings set rang = 2 where matchday_id = 'e0000000-0000-0000-0000-000000000005' and player_id = 'c0000000-0000-0000-0000-000000000002';
update public.matchday_rankings set rang = 1 where matchday_id = 'e0000000-0000-0000-0000-000000000005' and player_id = 'c0000000-0000-0000-0000-000000000003';

select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000005');

select is(
  (select count(*) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000005' and typ = 'gewinn_spieltag'),
  2::bigint, 'Szenario 5 (Lauf 2): weiterhin genau 2 Zeilen, nicht 4 (alte ersetzt statt dupliziert)'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000005' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000002'),
  40.00::numeric, 'Szenario 5 (Lauf 2): Spieler B ist jetzt Rang 2 und bekommt 40,00'
);
select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000005' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000003'),
  60.00::numeric, 'Szenario 5 (Lauf 2): Spieler C ist jetzt Rang 1 und bekommt 60,00'
);

-- ============================================================
-- Szenario 6 (Aufgabe 2): dieselbe Rundungs-Inkonsistenz wie im
-- Saison-Test, hier für die Spieltags-Variante. Topf 100,00 (34+33+33),
-- ein Rang (100%), 3-Wege-Gleichstand -> jeder bekommt
-- round(100 * 1/3, 2) = 33,33, Summe 99,99 statt 100,00.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('d0000000-0000-0000-0000-000000000006', 'pgtap-md-season-rounding-drift', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag, spieltags_einsatz_betrag) values
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 0, 34.00),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 0, 33.00),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 0, 33.00);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('d0000000-0000-0000-0000-000000000006', 'spieltag', 1, 100);

insert into public.matchdays (id, season_id, nummer) values
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 1);

insert into public.matchday_rankings (matchday_id, player_id, rang) values
  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 1),
  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 1),
  ('e0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 1);

select public.calculate_matchday_payout('e0000000-0000-0000-0000-000000000006');

select is(
  (select betrag from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000006' and typ = 'gewinn_spieltag' and player_id = 'c0000000-0000-0000-0000-000000000002'),
  33.33::numeric, 'Szenario 6: jeder der 3 Gleichstand-Spieler bekommt unabhängig gerundet 33,33'
);
select is(
  (select sum(betrag) from public.transactions where matchday_id = 'e0000000-0000-0000-0000-000000000006' and typ = 'gewinn_spieltag'),
  99.99::numeric, 'Szenario 6 (Befund): Summe der Auszahlungen (99,99) weicht um 1 Cent vom Topf (100,00) ab - kein Test-Artefakt, siehe Migrations-Kommentar zur Rundung'
);

select * from finish();
rollback;

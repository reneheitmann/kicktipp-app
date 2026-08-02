-- pgTAP-Tests für calculate_season_payout() (siehe
-- supabase/migrations/0012_tie_aware_payout_calculation.sql). Jedes
-- Szenario nutzt eine eigene, per fester UUID identifizierte Saison, damit
-- sich die Szenarien nicht gegenseitig beeinflussen. Ein "Topf-Spender"
-- (Teilnehmer mit dem vollen gesamtsieg_einsatz_betrag) trägt jeweils den
-- gesamten Topf bei, alle gerankten Teilnehmer selbst tragen 0 bei – das
-- hält die erwarteten Beträge unabhängig von der Anzahl der Teilnehmer
-- leicht nachrechenbar.
begin;
select plan(26);

-- Gemeinsame Test-Spieler (über alle Szenarien wiederverwendet, players
-- selbst sind saisonunabhängig).
insert into public.players (id, name) values
  ('b0000000-0000-0000-0000-000000000001', 'pgtap-funder'),
  ('b0000000-0000-0000-0000-000000000002', 'pgtap-player-a'),
  ('b0000000-0000-0000-0000-000000000003', 'pgtap-player-b'),
  ('b0000000-0000-0000-0000-000000000004', 'pgtap-player-c'),
  ('b0000000-0000-0000-0000-000000000005', 'pgtap-player-d');

-- ============================================================
-- Szenario 1: kein Gleichstand, eindeutige Ränge
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000001', 'pgtap-season-notie', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1000.00),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 0),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000001', 'gesamtsieg', 1, 50),
  ('a0000000-0000-0000-0000-000000000001', 'gesamtsieg', 2, 30),
  ('a0000000-0000-0000-0000-000000000001', 'gesamtsieg', 3, 20);

insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 3);

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000001');

select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000001' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  500.00::numeric, 'Szenario 1: Rang 1 (50%) bekommt 500,00 von 1000,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000001' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000003'),
  300.00::numeric, 'Szenario 1: Rang 2 (30%) bekommt 300,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000001' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000004'),
  200.00::numeric, 'Szenario 1: Rang 3 (20%) bekommt 200,00'
);
select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000001' and typ = 'gewinn_gesamt'),
  3::bigint, 'Szenario 1: genau 3 Auszahlungszeilen'
);

-- ============================================================
-- Szenario 2: Gleichstand exakt wie im Migrations-Kommentar (0012) –
-- 3 Spieler teilen sich Rang 2 (belegen faktisch 2, 3, 4), Regeln
-- Rang 2=20%, Rang 3=10%, Rang 4=5% -> je (20+10+5)/3 = 11,67% des Topfs.
-- Topf bewusst 300,00, damit 35%/3 glatt aufgeht (reine Gleichstand-Logik-
-- Prüfung, Rundungs-Drift wird separat in Szenario 6 behandelt).
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000002', 'pgtap-season-tie', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 300.00),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 0),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 0),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000002', 'gesamtsieg', 1, 65),
  ('a0000000-0000-0000-0000-000000000002', 'gesamtsieg', 2, 20),
  ('a0000000-0000-0000-0000-000000000002', 'gesamtsieg', 3, 10),
  ('a0000000-0000-0000-0000-000000000002', 'gesamtsieg', 4, 5);

-- Spieler A allein auf Rang 1, B/C/D teilen sich Rang 2.
insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 2),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 2),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 2);

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000002');

select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000002' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  195.00::numeric, 'Szenario 2: Rang 1 allein (65%) bekommt 195,00 von 300,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000002' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000003'),
  35.00::numeric, 'Szenario 2: erster Gleichstand-Spieler bekommt (20+10+5)/3 = 35,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000002' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000004'),
  35.00::numeric, 'Szenario 2: zweiter Gleichstand-Spieler bekommt ebenfalls 35,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000002' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000005'),
  35.00::numeric, 'Szenario 2: dritter Gleichstand-Spieler bekommt ebenfalls 35,00'
);
select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000002' and typ = 'gewinn_gesamt'),
  4::bigint, 'Szenario 2: genau 4 Auszahlungszeilen (1 + 3 Gleichstand)'
);

-- ============================================================
-- Szenario 3: Topf = 0 (keine Einsätze) -> keine Auszahlungen, keine Exception
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000003', 'pgtap-season-emptypot', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000003', 'gesamtsieg', 1, 100);

insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 1);

select lives_ok(
  $$select public.calculate_season_payout('a0000000-0000-0000-0000-000000000003')$$,
  'Szenario 3: Aufruf mit Topf = 0 wirft keine Exception'
);
select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000003' and typ = 'gewinn_gesamt'),
  0::bigint, 'Szenario 3: keine Auszahlungszeilen bei Topf = 0'
);

-- ============================================================
-- Szenario 4: Rang ohne payout_rules-Abdeckung -> betrag = 0, keine Zeile
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000004', 'pgtap-season-uncovered-rank', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 1000.00),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 0),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 0);

-- Nur Rang 1+2 konfiguriert (gapless, summiert 100%) - Rang 3 bleibt
-- absichtlich ungedeckt.
insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000004', 'gesamtsieg', 1, 70),
  ('a0000000-0000-0000-0000-000000000004', 'gesamtsieg', 2, 30);

insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 2),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 3);

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000004');

select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000004' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  700.00::numeric, 'Szenario 4: Rang 1 (70%) bekommt 700,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000004' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000003'),
  300.00::numeric, 'Szenario 4: Rang 2 (30%) bekommt 300,00'
);
select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000004' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000004'),
  0::bigint, 'Szenario 4: Rang 3 ohne Regel-Abdeckung bekommt KEINE Zeile'
);
select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000004' and typ = 'gewinn_gesamt'),
  2::bigint, 'Szenario 4: insgesamt nur 2 Auszahlungszeilen (nicht 3)'
);

-- ============================================================
-- Szenario 5: Idempotenz - zweiter Aufruf mit vertauschtem Ranking ersetzt
-- die alten gewinn_gesamt-Zeilen, statt sie zu duplizieren.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000005', 'pgtap-season-idempotent', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 100.00),
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000005', 'gesamtsieg', 1, 60),
  ('a0000000-0000-0000-0000-000000000005', 'gesamtsieg', 2, 40);

insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 2);

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000005');

select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000005' and typ = 'gewinn_gesamt'),
  2::bigint, 'Szenario 5 (Lauf 1): genau 2 Auszahlungszeilen'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000005' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  60.00::numeric, 'Szenario 5 (Lauf 1): Spieler B (Rang 1) bekommt 60,00'
);

-- Ranking vertauschen (B <-> C) und Funktion erneut aufrufen.
update public.season_rankings set rang = 2 where season_id = 'a0000000-0000-0000-0000-000000000005' and player_id = 'b0000000-0000-0000-0000-000000000002';
update public.season_rankings set rang = 1 where season_id = 'a0000000-0000-0000-0000-000000000005' and player_id = 'b0000000-0000-0000-0000-000000000003';

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000005');

select is(
  (select count(*) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000005' and typ = 'gewinn_gesamt'),
  2::bigint, 'Szenario 5 (Lauf 2): weiterhin genau 2 Zeilen, nicht 4 (alte ersetzt statt dupliziert)'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000005' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  40.00::numeric, 'Szenario 5 (Lauf 2): Spieler B ist jetzt Rang 2 und bekommt 40,00'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000005' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000003'),
  60.00::numeric, 'Szenario 5 (Lauf 2): Spieler C ist jetzt Rang 1 und bekommt 60,00'
);

-- ============================================================
-- Szenario 6 (Aufgabe 2, Teil 1): bewusst verbleibende Grenze nach
-- 0064_fair_payout_rounding.sql. Topf 100,00, ein Rang (100%), 3-Wege-
-- Gleichstand -> 100,00 / 3 = 33,33...€ lässt sich nicht glatt auf 3
-- Spieler aufteilen. 0064 gibt der Gleichstand-Fairness bewusst Vorrang:
-- alle drei bekommen exakt denselben Betrag (33,33), auch wenn die Summe
-- dadurch (99,99) 1 Cent unter dem Topf bleibt - die einzige Alternative
-- wäre, einem der drei gleichplatzierten Spieler einen Cent mehr als den
-- anderen zu geben, was dem Zweck von 0012 (Gleichstand-Fairness)
-- widerspräche. Kein Test-Artefakt, keine Regression - siehe Kommentar in
-- 0064_fair_payout_rounding.sql.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000006', 'pgtap-season-rounding-drift', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 100.00),
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 0),
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000006', 'gesamtsieg', 1, 100);

insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 1),
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 1);

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000006');

select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000006' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  33.33::numeric, 'Szenario 6: jeder der 3 Gleichstand-Spieler bekommt unabhängig gerundet 33,33'
);
select is(
  (select sum(betrag) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000006' and typ = 'gewinn_gesamt'),
  99.99::numeric, 'Szenario 6 (bewusste Grenze): Summe der Auszahlungen (99,99) bleibt 1 Cent unter dem Topf (100,00), damit alle drei Gleichstand-Spieler exakt gleich viel bekommen'
);

-- ============================================================
-- Szenario 7 (Aufgabe 2, Teil 2): beweist die eigentliche Korrektur aus
-- 0064_fair_payout_rounding.sql an einem Fall OHNE Gleichstand, der vorher
-- (0012) gedriftet wäre. Topf 333,33, Regeln 50/30/20% (3 eindeutige
-- Ränge). Alte, unabhängige Rundung: round(333.33*0.50,2)=166.67,
-- round(333.33*0.30,2)=100.00, round(333.33*0.20,2)=66.67 -> Summe 333,34
-- (1 Cent zu viel). Largest-Remainder-Korrektur über die drei (nicht
-- gleichgestellten, also frei korrigierbaren) Gruppen liefert stattdessen
-- 166,66/100,00/66,67 - Summe exakt 333,33.
-- ============================================================
insert into public.seasons (id, name, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000007', 'pgtap-season-drift-fix', '2025-01-01', '2025-12-31');

insert into public.season_participants (season_id, player_id, gesamtsieg_einsatz_betrag) values
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 333.33),
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 0),
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 0),
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000004', 0);

insert into public.payout_rules (season_id, typ, rang, prozent_anteil) values
  ('a0000000-0000-0000-0000-000000000007', 'gesamtsieg', 1, 50),
  ('a0000000-0000-0000-0000-000000000007', 'gesamtsieg', 2, 30),
  ('a0000000-0000-0000-0000-000000000007', 'gesamtsieg', 3, 20);

insert into public.season_rankings (season_id, player_id, rang) values
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 2),
  ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000004', 3);

select public.calculate_season_payout('a0000000-0000-0000-0000-000000000007');

select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000007' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000002'),
  166.66::numeric, 'Szenario 7: Rang 1 bekommt 166,66 (1 Cent weniger als die naive Rundung 166,67)'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000007' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000003'),
  100.00::numeric, 'Szenario 7: Rang 2 bekommt 100,00 (unverändert)'
);
select is(
  (select betrag from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000007' and typ = 'gewinn_gesamt' and player_id = 'b0000000-0000-0000-0000-000000000004'),
  66.67::numeric, 'Szenario 7: Rang 3 bekommt 66,67 (unverändert)'
);
select is(
  (select sum(betrag) from public.transactions where season_id = 'a0000000-0000-0000-0000-000000000007' and typ = 'gewinn_gesamt'),
  333.33::numeric, 'Szenario 7 (Fix bestätigt): Summe entspricht jetzt exakt dem Topf'
);

select * from finish();
rollback;

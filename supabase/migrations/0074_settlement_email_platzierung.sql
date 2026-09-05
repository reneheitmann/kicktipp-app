-- Ergänzt {{Platzierung}} in den Standardtexten der beiden Abrechnungs-
-- System-Vorlagen (0072_settlement_notifications.sql). Nur per exaktem
-- Text-Match auf den ursprünglichen Seed-Text aktualisiert, damit ein
-- zwischenzeitlich vom Admin bereits angepasster Vorlagentext nicht
-- überschrieben wird - notify-matchday-settled/notify-season-settled
-- liefern die neue Variable serverseitig unabhängig davon bereits mit.

update public.email_templates set
  body_text =
    'Hallo {{Spielername}},' || E'\n\n' ||
    'Spieltag {{SpieltagNummer}} wurde abgerechnet. Deine Platzierung: {{Platzierung}}. Dein Gewinn: {{SpieltagGewinn}}.' || E'\n\n' ||
    'Viele Grüße' || E'\n' ||
    '{{AppName}}'
where system_key = 'matchday_settled'
  and body_text =
    'Hallo {{Spielername}},' || E'\n\n' ||
    'Spieltag {{SpieltagNummer}} wurde abgerechnet. Dein Gewinn: {{SpieltagGewinn}}.' || E'\n\n' ||
    'Viele Grüße' || E'\n' ||
    '{{AppName}}';

update public.email_templates set
  body_text =
    'Hallo {{Spielername}},' || E'\n\n' ||
    'die Gesamtwertung für {{SaisonName}} wurde abgerechnet. Deine Platzierung: {{Platzierung}}. Dein Gewinn: {{Gewinne}}.' || E'\n\n' ||
    'Viele Grüße' || E'\n' ||
    '{{AppName}}'
where system_key = 'season_settled'
  and body_text =
    'Hallo {{Spielername}},' || E'\n\n' ||
    'die Gesamtwertung für {{SaisonName}} wurde abgerechnet. Dein Gewinn: {{Gewinne}}.' || E'\n\n' ||
    'Viele Grüße' || E'\n' ||
    '{{AppName}}';

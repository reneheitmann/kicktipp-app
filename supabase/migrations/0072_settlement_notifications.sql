-- Automatische E-Mail an Spieler bei Abrechnung eines Spieltags bzw. der
-- Gesamtwertung (admin-konfigurierbarer Ein/Aus-Schalter + zwei neue
-- System-Vorlagen, analog zu 0061_email_system_templates.sql).

alter table public.email_settings
  add column auto_send_settlement_emails boolean not null default false;

alter table public.email_templates drop constraint email_templates_system_key_check;
alter table public.email_templates add constraint email_templates_system_key_check
  check (system_key is null or system_key in ('password_reset', 'new_user_invite', 'matchday_settled', 'season_settled'));

insert into public.email_templates (name, subject, body_text, system_key) values
(
  'Spieltag abgerechnet',
  'Spieltag {{SpieltagNummer}} abgerechnet – {{AppName}}',
  'Hallo {{Spielername}},' || E'\n\n' ||
  'Spieltag {{SpieltagNummer}} wurde abgerechnet. Dein Gewinn: {{SpieltagGewinn}}.' || E'\n\n' ||
  'Viele Grüße' || E'\n' ||
  '{{AppName}}',
  'matchday_settled'
),
(
  'Gesamtwertung abgerechnet',
  'Gesamtwertung {{SaisonName}} abgerechnet – {{AppName}}',
  'Hallo {{Spielername}},' || E'\n\n' ||
  'die Gesamtwertung für {{SaisonName}} wurde abgerechnet. Dein Gewinn: {{Gewinne}}.' || E'\n\n' ||
  'Viele Grüße' || E'\n' ||
  '{{AppName}}',
  'season_settled'
);

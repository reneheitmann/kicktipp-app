-- Brevo (Transaktions-Mail-API) als zweite wählbare Versandart neben SMTP,
-- admin-konfigurierbar auf /admin/email (siehe EmailSettingsPage.tsx). Als
-- Postgres-Enum statt Freitext, analog zum bereits bestehenden
-- smtp_encryption-Enum (0017_email_settings.sql), um nur die zwei
-- unterstützten Werte zuzulassen.
--
-- smtp_host/smtp_port werden nullable (wie die bereits nullable imap_*-
-- Spalten aus 0057_imap_sent_folder.sql), da sie bei provider = 'brevo'
-- nicht gebraucht werden – die beiden Check-Constraints stellen stattdessen
-- sicher, dass die jeweils aktive Versandart vollständig konfiguriert ist.

create type public.email_provider as enum ('smtp', 'brevo');

alter table public.email_settings
  add column provider public.email_provider not null default 'smtp',
  add column brevo_api_key text,
  alter column smtp_host drop not null,
  alter column smtp_port drop not null;

alter table public.email_settings
  add constraint email_settings_smtp_fields_required
  check (provider <> 'smtp' or (smtp_host is not null and smtp_port is not null));

alter table public.email_settings
  add constraint email_settings_brevo_key_required
  check (provider <> 'brevo' or brevo_api_key is not null);

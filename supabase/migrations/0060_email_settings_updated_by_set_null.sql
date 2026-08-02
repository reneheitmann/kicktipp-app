-- Vorbereitung für echtes Benutzer-Löschen (admin-delete-user): alle FKs auf
-- profiles.id haben bereits "on delete set null"/"cascade" - außer
-- email_settings.updated_by (0017), die aktuell keine ON-DELETE-Aktion hat
-- (Default: restrict) und damit das Löschen eines Users blockieren würde,
-- der zuletzt die E-Mail-Einstellungen geändert hat.

alter table public.email_settings drop constraint email_settings_updated_by_fkey;
alter table public.email_settings
  add constraint email_settings_updated_by_fkey foreign key (updated_by)
  references public.profiles (id) on delete set null;

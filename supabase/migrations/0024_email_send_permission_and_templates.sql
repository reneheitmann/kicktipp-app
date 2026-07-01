-- Bulk-E-Mail-Versand an Spieler (nicht zu verwechseln mit den admin-only
-- SMTP-Einstellungen aus 0017/email_settings): neues, granulares Recht
-- 'email.send' im bestehenden role_permissions-System (siehe 0022), Standard
-- admin+spielleiter=true, user=false – analog zu den übrigen 10 operativen
-- Rechten, NICHT hart auf admin verdrahtet wie Benutzerverwaltung/E-Mail-
-- Einstellungen/Rollen-Modul selbst.

alter table public.role_permissions drop constraint role_permissions_permission_key_check;

alter table public.role_permissions add constraint role_permissions_permission_key_check
  check (permission_key in (
    'seasons.manage',
    'matchdays.manage',
    'participants.manage',
    'matchday_entries.manage',
    'payouts.manage',
    'rankings.manage',
    'players.manage',
    'accounts.manage',
    'balance_transfer.manage',
    'import.use',
    'email.send'
  ));

insert into public.role_permissions (role, permission_key, granted)
values
  ('admin', 'email.send', true),
  ('spielleiter', 'email.send', true),
  ('user', 'email.send', false);

-- E-Mail-Vorlagen: wiederverwendbare Betreff/Text-Paare mit Variablen-Tokens
-- ({{Spielername}}, {{Kicktippname}}, {{EMailadresse}}, {{OffenePosten}},
-- {{Gewinne}}), die beim Versand clientseitig ersetzt werden (siehe
-- src/features/emails/templateVariables.ts). Ein einziges Recht steuert
-- Lesen+Schreiben des ganzen Moduls, analog zu players.manage/participants.manage.
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

alter table public.email_templates enable row level security;

create policy email_templates_select on public.email_templates
  for select
  using (public.current_user_has_permission('email.send') and public.current_user_active());

create policy email_templates_insert on public.email_templates
  for insert
  with check (public.current_user_has_permission('email.send') and public.current_user_active());

create policy email_templates_update on public.email_templates
  for update
  using (public.current_user_has_permission('email.send') and public.current_user_active())
  with check (public.current_user_has_permission('email.send') and public.current_user_active());

create policy email_templates_delete on public.email_templates
  for delete
  using (public.current_user_has_permission('email.send') and public.current_user_active());

-- Start-Vorlagen für die 3 im Feature genannten Anwendungsfälle, damit das
-- Modul nicht leer beginnt.
insert into public.email_templates (name, subject, body_text) values
(
  'Erinnerung offene Zahlung',
  'Erinnerung: Offener Betrag in der Kicktipp Spielrunde',
  'Hallo {{Spielername}},' || E'\n\n' ||
  'du hast aktuell noch einen offenen Betrag von {{OffenePosten}} in der Kicktipp Spielrunde.' || E'\n\n' ||
  'Bitte gleiche den Betrag zeitnah aus. Bei Fragen einfach melden.' || E'\n\n' ||
  'Viele Grüße'
),
(
  'Glückwunsch Spieltagsgewinn',
  'Glückwunsch zum Spieltagsgewinn!',
  'Hallo {{Spielername}},' || E'\n\n' ||
  'Glückwunsch! Du hast bei diesem Spieltag gewonnen und erhältst {{Gewinne}}.' || E'\n\n' ||
  'Viele Grüße'
),
(
  'Glückwunsch Gesamtsieg',
  'Glückwunsch zum Gesamtsieg!',
  'Hallo {{Spielername}},' || E'\n\n' ||
  'Glückwunsch zum Gesamtsieg in dieser Saison! Dein Gewinn beträgt {{Gewinne}}.' || E'\n\n' ||
  'Viele Grüße'
);

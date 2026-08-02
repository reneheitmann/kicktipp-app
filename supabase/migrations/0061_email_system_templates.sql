-- Passwort-Reset- und Neuanlage-Einladungsmail nutzten bisher denselben
-- hartkodierten Text in send-password-reset/index.ts, obwohl beide Anlässe
-- unterschiedliche Formulierungen verdienen ("dein Passwort vergessen" vs.
-- "willkommen, hier ist dein Zugang"). Erweitert die bestehende
-- email_templates-Tabelle (0024) um "System-Vorlagen" statt einer separaten
-- Tabelle - nutzt dieselbe Formular-/Listen-UI weiter.
--
-- system_key unterscheidet System-Vorlagen (genau eine pro Art, nur von
-- Admins bearbeitbar, weder erstell- noch löschbar über die App) von den
-- freien Massenmail-Vorlagen (system_key null, wie bisher über das
-- email.send-Recht verwaltbar). Ersetzt die 4 bestehenden Policies komplett.

alter table public.email_templates add column system_key text unique;
alter table public.email_templates add constraint email_templates_system_key_check
  check (system_key is null or system_key in ('password_reset', 'new_user_invite'));

drop policy email_templates_select on public.email_templates;
drop policy email_templates_insert on public.email_templates;
drop policy email_templates_update on public.email_templates;
drop policy email_templates_delete on public.email_templates;

create policy email_templates_select on public.email_templates
  for select
  using (
    (system_key is null and (select current_user_has_permission('email.send')) and (select current_user_active()))
    or (system_key is not null and (select current_user_role()) = 'admin' and (select current_user_active()))
  );

create policy email_templates_insert on public.email_templates
  for insert
  with check (
    system_key is null and (select current_user_has_permission('email.send')) and (select current_user_active())
  );

create policy email_templates_update on public.email_templates
  for update
  using (
    (system_key is null and (select current_user_has_permission('email.send')) and (select current_user_active()))
    or (system_key is not null and (select current_user_role()) = 'admin' and (select current_user_active()))
  )
  with check (
    (system_key is null and (select current_user_has_permission('email.send')) and (select current_user_active()))
    or (system_key is not null and (select current_user_role()) = 'admin' and (select current_user_active()))
  );

create policy email_templates_delete on public.email_templates
  for delete
  using (
    system_key is null and (select current_user_has_permission('email.send')) and (select current_user_active())
  );

-- Seed beider System-Vorlagen, damit send-password-reset ab sofort eine
-- Zeile findet (kein Verhaltens-Bruch beim Deploy) - password_reset
-- übernimmt den bisherigen hartkodierten Text 1:1, nur der rohe Link durch
-- {{Link}} ersetzt.
insert into public.email_templates (name, subject, body_text, system_key) values
(
  'Passwort zurücksetzen',
  'Passwort zurücksetzen – {{AppName}}',
  'Hallo,' || E'\n\n' ||
  'über diesen Link kannst du dein Passwort für {{AppName}} zurücksetzen:' || E'\n\n' ||
  '{{Link}}' || E'\n\n' ||
  'Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.',
  'password_reset'
),
(
  'Neuer Benutzer – Einladung',
  'Zugang für {{AppName}}',
  'Hallo {{Name}},' || E'\n\n' ||
  'für dich wurde ein Konto bei {{AppName}} angelegt. Lege über diesen Link dein Passwort fest, um dich anzumelden:' || E'\n\n' ||
  '{{Link}}' || E'\n\n' ||
  'Falls du das nicht erwartet hast, kannst du diese E-Mail ignorieren.',
  'new_user_invite'
);

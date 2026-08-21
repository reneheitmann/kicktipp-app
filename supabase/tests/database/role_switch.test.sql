-- pgTAP-Tests für den echten Rollenwechsel (switch_to_role()/
-- switch_back_to_base_role(), siehe supabase/migrations/0036_real_role_switch.sql,
-- 0037_role_switch_trigger_bypass.sql, 0046_switch_to_spielleiter_role.sql,
-- 0051_fix_role_switch_trigger_regression.sql). Prüft konkret den
-- switch_back_to_base_role()-Roundtrip, der in 0051 kaputt war: eine
-- unabhängige Migration (0050) hatte protect_profile_privileged_fields()
-- per create-or-replace neu geschrieben und dabei den in 0037 eingeführten
-- app.role_switch_in_progress-Bypass verloren – dieser Test hätte die
-- Regression beim nächsten `db push`/CI-Lauf sofort sichtbar gemacht.
--
-- Simuliert eingeloggte Nutzer wie in der offiziellen Supabase-pgTAP-Anleitung:
-- ein echtes auth.users-Insert (löst den on_auth_user_created-Trigger aus
-- 0001_roles_profiles.sql aus, der automatisch die passende profiles-Zeile
-- anlegt, inkl. Rolle aus raw_user_meta_data), danach auth.uid() für die
-- aktuelle Transaktion per request.jwt.claim.sub auf diesen Nutzer setzen
-- (genau das liest die tatsächliche auth.uid()-Definition zuerst aus).
begin;
select plan(13);

-- ============================================================
-- Szenario 1: Admin wechselt zu "user" und zurück – der Pfad, der in 0051
-- kaputt war.
-- ============================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  'f0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'pgtap-role-switch-admin@example.invalid',
  crypt('irrelevant', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('role', 'admin')
);

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);

select public.switch_to_role('user');

select is(
  (select role from public.profiles where id = 'f0000000-0000-0000-0000-000000000001'),
  'user'::public.user_role, 'Szenario 1: Admin nach switch_to_role(user) hat role=user'
);
select is(
  (select base_role from public.profiles where id = 'f0000000-0000-0000-0000-000000000001'),
  'admin'::public.user_role, 'Szenario 1: Admin nach switch_to_role(user) hat base_role=admin gemerkt'
);

select public.switch_back_to_base_role();

select is(
  (select role from public.profiles where id = 'f0000000-0000-0000-0000-000000000001'),
  'admin'::public.user_role, 'Szenario 1 (Regressionspfad 0051): nach switch_back_to_base_role() wieder role=admin'
);
select is(
  (select base_role from public.profiles where id = 'f0000000-0000-0000-0000-000000000001'),
  null::public.user_role, 'Szenario 1: nach switch_back_to_base_role() ist base_role wieder null'
);

-- ============================================================
-- Szenario 2: Spielleiter wechselt zu "user" und zurück – zweite Ausgangsrolle,
-- die switch_to_role() erlaubt (siehe Hierarchie-Prüfung in 0046).
-- ============================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  'f0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'pgtap-role-switch-spielleiter@example.invalid',
  crypt('irrelevant', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('role', 'spielleiter')
);

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', true);

select public.switch_to_role('user');

select is(
  (select role from public.profiles where id = 'f0000000-0000-0000-0000-000000000002'),
  'user'::public.user_role, 'Szenario 2: Spielleiter nach switch_to_role(user) hat role=user'
);
select is(
  (select base_role from public.profiles where id = 'f0000000-0000-0000-0000-000000000002'),
  'spielleiter'::public.user_role, 'Szenario 2: Spielleiter nach switch_to_role(user) hat base_role=spielleiter gemerkt'
);

select public.switch_back_to_base_role();

select is(
  (select role from public.profiles where id = 'f0000000-0000-0000-0000-000000000002'),
  'spielleiter'::public.user_role, 'Szenario 2: nach switch_back_to_base_role() wieder role=spielleiter'
);
select is(
  (select base_role from public.profiles where id = 'f0000000-0000-0000-0000-000000000002'),
  null::public.user_role, 'Szenario 2: nach switch_back_to_base_role() ist base_role wieder null'
);

-- ============================================================
-- Szenario 3: Spielleiter MIT granularem users.manage-Recht (aber ohne
-- admin-Rolle) wechselt zu "user" und zurück – zusätzlich zum reinen
-- Admin-Fall der Fall, den 0050/0051 abdecken sollten: protect_profile_
-- privileged_fields() hat seit 0050 einen eigenen users.manage-Zweig, der
-- unabhängig vom role_switch_in_progress-Flag existiert. Dieser Test
-- beweist, dass der Flag-Bypass (0037) weiterhin bedingungslos VOR diesem
-- Zweig greift, statt sich künftig wieder mit ihm zu verhaken.
-- ============================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  'f0000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated', 'pgtap-role-switch-spielleiter-usersmanage@example.invalid',
  crypt('irrelevant', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('role', 'spielleiter')
);

-- role_permissions ist rollenbasiert (nicht user-spezifisch, siehe 0022) –
-- Grant gilt hier bewusst nur innerhalb dieser Testtransaktion (rollback am
-- Ende hebt ihn wieder auf).
update public.role_permissions
set granted = true
where role = 'spielleiter' and permission_key = 'users.manage';

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000003', true);

select public.switch_to_role('user');

select is(
  (select role from public.profiles where id = 'f0000000-0000-0000-0000-000000000003'),
  'user'::public.user_role, 'Szenario 3: Spielleiter mit users.manage nach switch_to_role(user) hat role=user'
);
select is(
  (select base_role from public.profiles where id = 'f0000000-0000-0000-0000-000000000003'),
  'spielleiter'::public.user_role, 'Szenario 3: Spielleiter mit users.manage nach switch_to_role(user) hat base_role=spielleiter gemerkt'
);

select public.switch_back_to_base_role();

select is(
  (select role from public.profiles where id = 'f0000000-0000-0000-0000-000000000003'),
  'spielleiter'::public.user_role, 'Szenario 3: nach switch_back_to_base_role() wieder role=spielleiter (trotz users.manage)'
);
select is(
  (select base_role from public.profiles where id = 'f0000000-0000-0000-0000-000000000003'),
  null::public.user_role, 'Szenario 3: nach switch_back_to_base_role() ist base_role wieder null'
);

-- ============================================================
-- Szenario 4 (negativ): switch_back_to_base_role() ohne vorherigen
-- switch_to_role()-Aufruf muss eine Exception werfen, nicht stillschweigend
-- nichts tun.
-- ============================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  'f0000000-0000-0000-0000-000000000004',
  'authenticated', 'authenticated', 'pgtap-role-switch-noswitch@example.invalid',
  crypt('irrelevant', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('role', 'admin')
);

select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000004', true);

select throws_ok(
  $$select public.switch_back_to_base_role()$$,
  'Kein Rollenwechsel aktiv.',
  'Szenario 4: switch_back_to_base_role() ohne aktiven Wechsel wirft Exception statt stillschweigend nichts zu tun'
);

select * from finish();
rollback;

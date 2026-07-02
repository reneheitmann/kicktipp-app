-- Fehler-Log für Supportzwecke: unbehandelte Frontend-Fehler (globaler
-- Error-Handler + ErrorBoundary) und Backend-Fehler aus den Edge Functions
-- (z. B. SMTP-Fehler wie zuletzt beim Testmailversand) landen hier, damit ein
-- Admin sie im Nachhinein einsehen kann, ohne Browser-Konsole des
-- betroffenen Users oder externe Log-Tools zu brauchen.
--
-- INSERT bewusst komplett offen (auch für anon): das ist eine reine
-- Schreib-Senke ohne Leserecht für Nicht-Admins, und auch Fehler VOR dem
-- Login (z. B. eine kaputte Supabase-Konfiguration) sollen erfasst werden
-- können. SELECT/DELETE dagegen hart auf admin beschränkt (können sensible
-- Stacktraces/Request-Details enthalten) – bewusst nicht über das granulare
-- role_permissions-System, gleiches Muster wie Benutzerverwaltung/
-- E-Mail-Einstellungen (siehe 0022_role_permissions.sql).

create table public.app_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'warn', 'error')),
  source text not null,
  message text not null,
  details jsonb,
  url text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.app_logs enable row level security;

create policy app_logs_insert on public.app_logs
  for insert
  with check (true);

create policy app_logs_select on public.app_logs
  for select
  using (public.current_user_role() = 'admin' and public.current_user_active());

create policy app_logs_delete on public.app_logs
  for delete
  using (public.current_user_role() = 'admin' and public.current_user_active());

create index app_logs_created_at_idx on public.app_logs (created_at desc);

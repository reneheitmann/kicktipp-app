-- Automatische Aufräumung: app_logs-Einträge älter als 30 Tage werden entfernt,
-- damit die Tabelle nicht unbegrenzt wächst (reines Support-/Diagnose-Log,
-- keine Historie, die dauerhaft aufbewahrt werden muss).
--
-- Trigger statt pg_cron: läuft bei jedem neuen Log-Eintrag mit (AFTER INSERT,
-- FOR EACH STATEMENT – einmal pro Insert-Batch, nicht pro Zeile), braucht
-- daher keine zusätzliche Extension/Scheduler-Infrastruktur und bleibt
-- garantiert aktuell, solange überhaupt neue Fehler geloggt werden (wenn
-- keine neuen Fehler auftreten, gibt es auch nichts aufzuräumen).
create or replace function public.cleanup_old_app_logs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.app_logs where created_at < now() - interval '30 days';
  return null;
end;
$$;

create trigger app_logs_cleanup
  after insert on public.app_logs
  for each statement
  execute function public.cleanup_old_app_logs();

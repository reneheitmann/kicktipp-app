-- Härtung: app_logs.insert ist bewusst für jeden (auch anon) offen (siehe
-- 0030), damit auch Fehler vor dem Login erfasst werden. Ohne Größenlimit
-- ist das aber ein unauthentifizierter Speicher-Erschöpfungsvektor (CWE-400)
-- – jeder kann beliebig viele/beliebig große Zeilen einfügen.
--
-- message ist clientseitig bereits auf 2000 Zeichen gekappt (siehe
-- src/lib/logging.ts) – hier zusätzlich als DB-seitige Garantie, da RLS
-- INSERT auch direkt (nicht nur über logToServer()) möglich ist. details
-- (jsonb) bekommt bewusst 32 KB Spielraum: die send-bulk-email Edge Function
-- loggt dort ein failures-Array mit bis zu 200 Empfänger-Fehlern
-- (MAX_RECIPIENTS, siehe send-bulk-email/index.ts) plus ggf. lange
-- Stacktraces aus serializeError() – beides bleibt darunter, ein Angreifer
-- kann aber keine beliebig großen Payloads mehr einschleusen.
alter table public.app_logs
  add constraint app_logs_message_length check (char_length(message) <= 2000),
  add constraint app_logs_url_length check (url is null or char_length(url) <= 2000),
  add constraint app_logs_details_size check (details is null or pg_column_size(details) <= 32768);

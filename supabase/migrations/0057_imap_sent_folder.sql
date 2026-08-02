-- Optionale IMAP-Ablage im "Gesendet"-Ordner des Postfachs nach jedem
-- SMTP-Versand (send-email/send-bulk-email) – reines SMTP legt dort von sich
-- aus keine Kopie ab. Nutzt dieselben Zugangsdaten wie SMTP (smtp_username/
-- smtp_password): es ist dasselbe Postfach, keine zusätzlichen Zugangsdaten
-- nötig. Feature ist aktiv, sobald alle drei Spalten gesetzt sind; der exakte
-- Ordnername (z. B. "Sent", "INBOX.Sent", "Gesendet") variiert je nach
-- Mail-Provider und wird deshalb admin-konfiguriert statt automatisch erkannt
-- (siehe supabase/functions/_shared/imap.ts).

alter table public.email_settings
  add column imap_host text,
  add column imap_port integer check (imap_port is null or (imap_port > 0 and imap_port <= 65535)),
  add column imap_sent_folder text;

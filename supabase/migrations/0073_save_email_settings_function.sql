-- Fix: saveEmailSettings() im Client ließ smtp_password/brevo_api_key beim
-- Speichern leer, in der Annahme, PostgREST würde eine im Upsert-Payload
-- fehlende Spalte beim ON CONFLICT DO UPDATE einfach unangetastet lassen.
-- Tatsächlich sendet supabase-js dabei KEINEN "missing=default"-Prefer-Header
-- (defaultToNull ist per Default true) - PostgREST setzt fehlende Spalten
-- dadurch explizit auf NULL statt sie auszusparen. Bei provider = 'brevo'
-- schlägt das sofort hart mit email_settings_brevo_key_required fehl
-- (reproduziert: jeder Speichern-Klick ohne neu eingegebenen API-Key/
-- Passwort nullt die Spalte und verletzt den Check) - bei provider = 'smtp'
-- wäre es sogar ein stiller Datenverlust (kein Check auf smtp_password),
-- da checkt nichts.
--
-- Der Client kann das eigentliche Geheimnis nicht einfach zurücksenden, um
-- es zu "erhalten" (getEmailSettings() liefert es bewusst nie ans Frontend,
-- siehe 0017_email_settings.sql) - die "unverändert lassen, wenn leer"-Logik
-- muss daher serverseitig per COALESCE gegen die bereits gespeicherte
-- Spalte laufen, nicht über ein PostgREST-Upsert mit ausgelassenem Feld.

create or replace function public.save_email_settings(
  p_provider public.email_provider,
  p_smtp_host text,
  p_smtp_port integer,
  p_smtp_username text,
  p_smtp_password text,
  p_smtp_encryption public.smtp_encryption,
  p_brevo_api_key text,
  p_sender_email text,
  p_sender_name text,
  p_imap_host text,
  p_imap_port integer,
  p_imap_sent_folder text,
  p_auto_send_settlement_emails boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (current_user_role() = 'admin' and current_user_active()) then
    raise exception 'Keine Berechtigung.';
  end if;

  update public.email_settings set
    provider = p_provider,
    smtp_host = p_smtp_host,
    smtp_port = p_smtp_port,
    smtp_username = p_smtp_username,
    smtp_password = coalesce(p_smtp_password, smtp_password),
    smtp_encryption = p_smtp_encryption,
    brevo_api_key = coalesce(p_brevo_api_key, brevo_api_key),
    sender_email = p_sender_email,
    sender_name = p_sender_name,
    imap_host = p_imap_host,
    imap_port = p_imap_port,
    imap_sent_folder = p_imap_sent_folder,
    auto_send_settlement_emails = p_auto_send_settlement_emails,
    updated_at = now(),
    updated_by = auth.uid()
  where id = '00000000-0000-0000-0000-000000000001';

  if not found then
    insert into public.email_settings (
      id, provider, smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption,
      brevo_api_key, sender_email, sender_name, imap_host, imap_port, imap_sent_folder,
      auto_send_settlement_emails, updated_at, updated_by
    ) values (
      '00000000-0000-0000-0000-000000000001', p_provider, p_smtp_host, p_smtp_port, p_smtp_username,
      p_smtp_password, p_smtp_encryption, p_brevo_api_key, p_sender_email, p_sender_name,
      p_imap_host, p_imap_port, p_imap_sent_folder, p_auto_send_settlement_emails, now(), auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.save_email_settings(
  public.email_provider, text, integer, text, text, public.smtp_encryption, text, text, text, text,
  integer, text, boolean
) to authenticated;

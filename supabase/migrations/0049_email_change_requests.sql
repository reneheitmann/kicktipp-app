-- Speichert offene Anfragen zur eigenen E-Mail-Änderung (siehe
-- update-own-email / confirm-email-change Edge Functions): die neue Adresse
-- wird erst nach Klick auf den per Mail zugestellten Bestätigungslink
-- tatsächlich in auth.users/profiles übernommen. Nur der SHA-256-Hash des
-- Tokens wird gespeichert, nicht das Token selbst – analog password_history,
-- das ebenfalls nur Hashes hält.
--
-- Ein Profil hat höchstens eine offene Anfrage (primary key = profile_id);
-- eine neue Anfrage überschreibt eine ältere, noch unbestätigte automatisch.
--
-- Bewusst keine RLS-Policies – nur service_role (Edge Functions) darf lesen/
-- schreiben, analog password_reset_throttle/password_history.
create table public.email_change_requests (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  new_email text not null,
  token_hash text not null,
  requested_at timestamptz not null default now()
);

create unique index email_change_requests_token_hash_idx on public.email_change_requests (token_hash);

alter table public.email_change_requests enable row level security;

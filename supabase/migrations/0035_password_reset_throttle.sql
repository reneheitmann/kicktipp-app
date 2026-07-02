-- Wirft man den Passwort-Reset-Versand komplett auf eine eigene Edge Function
-- um (send-password-reset, verschickt selbst per SMTP statt über Supabase
-- Auths eingebautes Mail-System), verliert man Supabase's eingebautes
-- Rate-Limiting für resetPasswordForEmail – die Function ruft stattdessen
-- auth.admin.generateLink() auf, eine privilegierte API ohne die
-- Client-seitigen Abuse-Schranken. Diese Tabelle übernimmt diesen Schutz
-- selbst: pro E-Mail-Adresse maximal eine tatsächliche Mail alle 5 Minuten,
-- unabhängig davon, ob die Adresse überhaupt zu einem Konto gehört (auch das
-- darf nicht unterscheidbar sein, siehe Kommentar in der Function).
--
-- Bewusst keine RLS-Policies – nur service_role (Edge Function) darf lesen/
-- schreiben, für niemand sonst zugänglich.
create table public.password_reset_throttle (
  email text primary key,
  requested_at timestamptz not null default now()
);

alter table public.password_reset_throttle enable row level security;

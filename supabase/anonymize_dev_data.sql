-- Pseudonymisiert die aus Prod kopierten Daten in der Dev-Datenbank (siehe
-- .github/workflows/sync-dev-from-prod.yml, läuft dort NACH dem Einspielen
-- des Prod-Dumps). IDs/Fremdschlüssel bleiben unverändert, daher bleiben
-- alle Verknüpfungen (player_profile_links, transactions, zahlungen, ...)
-- weiterhin nachvollziehbar – nur Klarnamen und E-Mail-Adressen werden
-- ersetzt. Finanzbeträge bleiben unverändert (für sich genommen nicht auf
-- eine echte Person rückführbar, sobald Name/E-Mail ersetzt sind).
--
-- Eigenständiges Skript statt einer Inline-Zeile im Workflow, damit es auch
-- manuell gegen ein Dev-Projekt ausführbar ist (z. B. `supabase db query
-- --linked --file supabase/anonymize_dev_data.sql`) und nachvollziehbar
-- versioniert bleibt.

-- 1) auth.users: E-Mail-Adressen durch eindeutige, garantiert nie real
--    vergebene Platzhalter ersetzen (.invalid ist laut RFC 2606 für genau
--    diesen Zweck reserviert) – id bleibt Primärschlüssel, daher weiterhin
--    eindeutig. Klarnamen aus raw_user_meta_data (siehe handle_new_user() in
--    0001_roles_profiles.sql/0038_profiles_vorname_nachname.sql) ebenfalls
--    entfernen, sonst blieben sie dort trotz anonymisierter profiles-Zeile
--    im Rohformat erhalten.
update auth.users
set
  email = 'dev-user-' || id || '@example.invalid',
  raw_user_meta_data = (coalesce(raw_user_meta_data, '{}'::jsonb) - 'name' - 'vorname' - 'nachname')
    || jsonb_build_object('name', 'Dev-Test-Account');

-- 2) public.profiles: Name + strukturierte Namensfelder + E-Mail durch
--    fortlaufend nummerierte Platzhalter ersetzen, synchron zur jeweiligen
--    auth.users-Zeile (gleiche id, daher gleiche @example.invalid-Adresse).
with numbered as (
  select id, row_number() over (order by id) as n
  from public.profiles
)
update public.profiles p
set
  name = 'Testspieler ' || numbered.n,
  vorname = null,
  nachname = null,
  email = 'dev-user-' || p.id || '@example.invalid'
from numbered
where numbered.id = p.id;

-- 3) public.players: Name UND Kicktipp-Nutzername (beides personenbezogen,
--    Kicktipp-Namen sind i. d. R. real nachschlagbar) durch fortlaufend
--    nummerierte Platzhalter ersetzen.
with numbered as (
  select id, row_number() over (order by id) as n
  from public.players
)
update public.players pl
set
  name = 'Testspieler ' || numbered.n,
  kicktipp_name = 'testspieler' || numbered.n
from numbered
where numbered.id = pl.id;

-- Zeigt in der Benutzerverwaltung den letzten Login jedes Users an.
-- Supabase Auth pflegt auth.users.last_sign_in_at bereits selbst bei jeder
-- Anmeldung, aber auth.users ist über die normale PostgREST-API nicht lesbar
-- – daher ein Spiegel-Feld in profiles, analog zu name/email in
-- handle_new_user() (0001), nur für UPDATE statt INSERT.

alter table public.profiles add column last_sign_in_at timestamptz;

-- Einmaliger Abgleich für bereits bestehende Accounts, damit die Spalte
-- nicht erst ab dem nächsten Login jedes Users befüllt ist.
update public.profiles p
set last_sign_in_at = u.last_sign_in_at
from auth.users u
where u.id = p.id;

create or replace function public.sync_last_sign_in_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles set last_sign_in_at = new.last_sign_in_at where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_last_sign_in
  after update on auth.users
  for each row execute function public.sync_last_sign_in_at();

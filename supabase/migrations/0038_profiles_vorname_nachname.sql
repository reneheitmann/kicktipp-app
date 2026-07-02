-- Zusätzliche, strukturierte Namensfelder für die Benutzerverwaltung, primär
-- für die Personalisierung von Massen-E-Mails (siehe templateVariables.ts) –
-- ergänzen das bestehende, weiterhin genutzte "name"-Freitextfeld (Anzeige in
-- Sidebar/Begrüßung/Konto-Menü), ersetzen es nicht. Beide Felder bewusst
-- nullable: bestehende Profile haben sie nicht gesetzt, und die
-- Benutzerverwaltung soll sie nicht erzwingen.

alter table public.profiles add column vorname text;
alter table public.profiles add column nachname text;

-- handle_new_user() (0001) muss die beiden neuen Felder aus user_metadata
-- übernehmen, analog zu "name" – sonst blieben sie bei jeder Neuanlage über
-- admin-create-user leer, obwohl das Formular sie mitschickt.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, vorname, nachname, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'vorname',
    new.raw_user_meta_data ->> 'nachname',
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user'),
    true
  );
  return new;
end;
$$;

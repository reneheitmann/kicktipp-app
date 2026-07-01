-- Rollensystem + Profiles
-- Jeder Supabase-Auth-User bekommt automatisch eine profiles-Zeile mit Rolle.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'spielleiter', 'user');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  role public.user_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER, damit RLS-Policies die eigene Rolle abfragen können, ohne
-- in eine rekursive RLS-Auswertung auf profiles selbst zu laufen.
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false);
$$;

-- Jeder darf das eigene Profil lesen (auch wenn deaktiviert, damit das Frontend
-- den Sperr-Hinweis anzeigen kann). Admins sehen alle Profile, sofern selbst aktiv.
create policy profiles_select on public.profiles
  for select
  using (
    id = auth.uid()
    or (public.current_user_role() = 'admin' and public.current_user_active())
  );

-- Nur aktive Admins dürfen Profile bearbeiten (Rolle zuweisen, sperren/entsperren).
create policy profiles_update on public.profiles
  for update
  using (public.current_user_role() = 'admin' and public.current_user_active())
  with check (public.current_user_role() = 'admin' and public.current_user_active());

-- Insert/Delete laufen ausschließlich über den Trigger (siehe unten) bzw. die
-- Admin-Edge-Function mit service_role; bewusst keine Insert/Delete-Policy für
-- normale Clients.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user'),
    true
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

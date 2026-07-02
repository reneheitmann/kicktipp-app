-- pgcrypto (crypt/gen_salt) ist auf diesem Projekt in extensions installiert,
-- nicht in public – search_path der beiden Funktionen aus 0032 entsprechend
-- erweitert, sonst schlägt jeder Aufruf mit "function gen_salt(...) does not
-- exist" fehl.

create or replace function public.check_password_reuse(p_user_id uuid, p_candidate text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_reuse_days integer;
begin
  select reuse_days into v_reuse_days from public.password_policy limit 1;
  if v_reuse_days is null or v_reuse_days <= 0 then
    return false;
  end if;

  return exists (
    select 1 from public.password_history
    where user_id = p_user_id
      and created_at >= now() - (v_reuse_days || ' days')::interval
      and password_hash = crypt(p_candidate, password_hash)
  );
end;
$$;

create or replace function public.record_password_history(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.password_history (user_id, password_hash)
  values (p_user_id, crypt(p_password, gen_salt('bf')));
end;
$$;

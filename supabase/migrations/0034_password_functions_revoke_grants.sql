-- 0032's "revoke all ... from public" reicht nicht: Supabase vergibt EXECUTE
-- auf neue public-Funktionen per ALTER DEFAULT PRIVILEGES zusätzlich direkt
-- an anon/authenticated (unabhängig von der PUBLIC-Pseudorolle) – bestätigt
-- über information_schema.routine_privileges. Ohne diesen expliziten Revoke
-- könnte jeder eingeloggte User check_password_reuse für BELIEBIGE user_id
-- aufrufen und so erraten, ob ein Passwort zur Historie eines anderen Users
-- passt (Orakel-Angriff) – hier geschlossen.

revoke execute on function public.check_password_reuse(uuid, text) from authenticated, anon;
revoke execute on function public.record_password_history(uuid, text) from authenticated, anon;

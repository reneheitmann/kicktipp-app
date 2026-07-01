-- Einmalig auszuführen, nachdem der allererste Login über Supabase Studio
-- (Authentication > Users > Add user) angelegt wurde. Da das Anlegen von
-- Profilen sonst ausschließlich über den Trigger bzw. die Admin-Edge-Function
-- läuft, braucht es für den allerersten Administrator-Account diesen manuellen
-- Schritt im SQL-Editor (läuft dort mit Postgres-Owner-Rechten, RLS greift nicht).

update public.profiles
set role = 'admin'
where email = 'DEINE-EMAIL@example.com';

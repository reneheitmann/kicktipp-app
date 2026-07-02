-- Erweitert das granulare Rechte-Konzept (0022_role_permissions.sql) um
-- Sichtbarkeits-Schalter für ganze Seiten: bislang steuerten die
-- `*.manage`/`*.use`/`email.send`-Rechte nur einzelne Aktionen, die Seite
-- selbst blieb für Übersicht/Saisons/Vergleich für jeden aktiven User immer
-- erreichbar, für Spieler/Konten/Import/E-Mail versenden implizit über das
-- jeweilige Recht. Die neuen `page.*.view`-Schlüssel folgen exakt demselben
-- Muster (role_permissions + current_user_has_permission), gelten aber für
-- die Seite als Ganzes statt für eine einzelne Schreib-Aktion – für Seiten
-- mit bereits bestehendem Recht kommt der neue Schalter zusätzlich hinzu
-- (Frontend verknüpft beide mit UND, siehe navItems.ts/ProtectedRoute.tsx).
--
-- Bewusst NICHT in diesen Katalog aufgenommen (bleiben wie bisher hart auf
-- role = 'admin' verdrahtet): Benutzerverwaltung (/admin/users),
-- E-Mail-Einstellungen (/admin/email), Rollen & Berechtigungen selbst
-- (/admin/roles) und Erscheinungsbild (/admin/branding). Grund: das
-- zugrundeliegende Schreibrecht dieser vier Seiten ist ebenfalls hart
-- admin-only (siehe Kommentar in 0022), ein Sichtbarkeits-Schalter würde
-- also entweder nichts bewirken (Route bliebe für andere Rollen ohnehin
-- gesperrt) oder – schlimmer – bei /admin/roles zu einer dauerhaften
-- Selbst-Aussperrung führen können, gäbe es keinen Weg mehr zurück.
--
-- Seed-Werte bewusst `true` für alle 3 Rollen (statt dem admin/spielleiter-
-- true/user-false-Muster der Aktionsrechte): das bildet exakt das heutige
-- Verhalten nach (aktuell sieht jede Rolle jede dieser Seiten), diese
-- Migration ändert also zunächst nichts – erst ein bewusstes Abschalten über
-- die "Rollen & Berechtigungen"-Seite blendet künftig eine Seite aus.

alter table public.role_permissions
  drop constraint role_permissions_permission_key_check;

alter table public.role_permissions
  add constraint role_permissions_permission_key_check check (permission_key in (
    'seasons.manage',
    'matchdays.manage',
    'participants.manage',
    'matchday_entries.manage',
    'payouts.manage',
    'rankings.manage',
    'players.manage',
    'accounts.manage',
    'balance_transfer.manage',
    'import.use',
    'email.send',
    'page.dashboard.view',
    'page.seasons.view',
    'page.vergleich.view',
    'page.players.view',
    'page.accounts.view',
    'page.import.view',
    'page.email_send.view'
  ));

insert into public.role_permissions (role, permission_key, granted)
select r.role, k.permission_key, true
from (
  values ('admin'::public.user_role), ('spielleiter'::public.user_role), ('user'::public.user_role)
) as r(role)
cross join (
  values
    ('page.dashboard.view'), ('page.seasons.view'), ('page.vergleich.view'),
    ('page.players.view'), ('page.accounts.view'), ('page.import.view'), ('page.email_send.view')
) as k(permission_key);

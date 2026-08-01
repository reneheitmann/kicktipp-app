-- Ergänzt nav_settings (0054) um admin-editierbare Bezeichnungen pro
-- Menüpunkt (Anzeigename überschreiben, ohne Route/Berechtigung zu ändern).
-- Map von navItems.ts-"to"-Pfad auf den überschriebenen Anzeigetext; Einträge
-- ohne Override fehlen einfach in der Map und behalten das im Code
-- definierte Label (siehe applyCustomLabels() in navItems.ts).

alter table public.nav_settings add column item_labels jsonb not null default '{}'::jsonb;

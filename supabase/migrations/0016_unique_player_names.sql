-- Verhindert doppelt vergebene Spieler-Namen und Kicktipp-Namen, jeweils
-- ohne Berücksichtigung von Groß-/Kleinschreibung (damit "Hans" und "hans"
-- nicht als unterschiedliche Spieler durchgehen, was sonst z. B. beim
-- Kicktipp-Import zu Verwechslungen führen könnte). kicktipp_name bleibt
-- optional: mehrere Spieler ohne kicktipp_name (NULL) sind weiterhin erlaubt,
-- da ein unique index NULL-Werte nie als Duplikat zueinander wertet.
create unique index players_name_lower_idx on public.players (lower(name));
create unique index players_kicktipp_name_lower_idx on public.players (lower(kicktipp_name)) where kicktipp_name is not null;

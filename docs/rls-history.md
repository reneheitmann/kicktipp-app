# RLS-Historie

Reines Nachschlagewerk für Audits, kein Code. Zeigt pro Tabelle und Policy,
in welcher Migration sie ursprünglich angelegt und in welchen späteren
Migrationen sie per `alter policy` oder `drop policy` + `create policy`
verändert wurde. Der aktuelle RLS-Zustand ist bereits geprüft und sauber;
konsolidierte Referenz ist `0047_performance_indexes_and_rls_caching.sql`
(Performance-Rewrite: `auth.*`/Helper-Calls in `(select ...)` gewrappt,
damit Postgres sie pro Query statt pro Zeile auswertet – keine
Verhaltensänderung).

Legende: **angelegt** = `create policy`, **geändert** = `alter policy`
(gleiche Policy, neue Definition), **ersetzt** = `drop policy` +
`create policy` unter demselben oder neuem Namen.

## `transactions`

| Policy | Angelegt | Änderungen |
|---|---|---|
| `transactions_select` | `0004_einsaetze.sql` | ersetzt in `0018_public_rankings.sql` (öffentliche Rankings-Sichtbarkeit); ersetzt in `0028_season_participant_visibility.sql` (Teilnehmer-Sichtbarkeit); geändert in `0022_role_permissions.sql` (Umstellung auf Rollen-/Permission-System); geändert in `0047` (Performance) |
| `transactions_insert_gewinn_korrektur` | `0006_rankings_payout_calculation.sql` | per `drop policy` entfernt in `0022_role_permissions.sql`, ersetzt durch `transactions_insert_gewinn` + `transactions_insert_korrektur` |
| `transactions_update_gewinn_korrektur` | `0006_rankings_payout_calculation.sql` | per `drop policy` entfernt in `0022_role_permissions.sql`, ersetzt durch `transactions_update_gewinn` + `transactions_update_korrektur` |
| `transactions_delete_gewinn_korrektur` | `0006_rankings_payout_calculation.sql` | per `drop policy` entfernt in `0022_role_permissions.sql`, ersetzt durch `transactions_delete_gewinn` + `transactions_delete_korrektur` |
| `transactions_insert_gewinn` | `0022_role_permissions.sql` | geändert in `0047` (Performance) |
| `transactions_insert_korrektur` | `0022_role_permissions.sql` | geändert in `0047` (Performance) |
| `transactions_update_gewinn` | `0022_role_permissions.sql` | geändert in `0047` (Performance) |
| `transactions_update_korrektur` | `0022_role_permissions.sql` | geändert in `0047` (Performance) |
| `transactions_delete_gewinn` | `0022_role_permissions.sql` | geändert in `0047` (Performance) |
| `transactions_delete_korrektur` | `0022_role_permissions.sql` | geändert in `0047` (Performance) |

Bewusst **keine** Insert/Update/Delete-Policy für `typ in ('einsatz_gesamt',
'einsatz_spieltag')` (Kommentar in `0004_einsaetze.sql`): diese Zeilen
entstehen ausschließlich über `security definer`-Trigger, nie direkt über
Client-Requests.

## `zahlungen`

Tabelle ursprünglich unter dem Namen `einzahlungen` angelegt.

| Policy | Angelegt | Änderungen |
|---|---|---|
| `zahlungen_select` (ehem. `einzahlungen_select`) | `0009_einzahlungen_und_standardeinsatz.sql` | Tabelle + Policies umbenannt in `0011_zahlungen_saison_und_auszahlungen.sql` (`alter table ... rename to`, `alter policy ... rename to`); geändert in `0022_role_permissions.sql`; geändert in `0047` (Performance) |
| `zahlungen_insert` (ehem. `einzahlungen_insert`) | `0009_einzahlungen_und_standardeinsatz.sql` | umbenannt in `0011`; geändert in `0022`; geändert in `0047` |
| `zahlungen_update` (ehem. `einzahlungen_update`) | `0009_einzahlungen_und_standardeinsatz.sql` | umbenannt in `0011`; geändert in `0022`; geändert in `0047` |
| `zahlungen_delete` (ehem. `einzahlungen_delete`) | `0009_einzahlungen_und_standardeinsatz.sql` | umbenannt in `0011`; geändert in `0022`; geändert in `0047` |

## `season_participants`

| Policy | Angelegt | Änderungen |
|---|---|---|
| `season_participants_select` | `0004_einsaetze.sql` | geändert in `0047` (Performance) |
| `season_participants_insert` | `0004_einsaetze.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |
| `season_participants_update` | `0004_einsaetze.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |
| `season_participants_delete` | `0004_einsaetze.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |

## `matchday_rankings`

| Policy | Angelegt | Änderungen |
|---|---|---|
| `matchday_rankings_select` | `0006_rankings_payout_calculation.sql` | ersetzt in `0018_public_rankings.sql`; ersetzt in `0028_season_participant_visibility.sql`; geändert in `0047` |
| `matchday_rankings_insert` | `0006_rankings_payout_calculation.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |
| `matchday_rankings_update` | `0006_rankings_payout_calculation.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |
| `matchday_rankings_delete` | `0006_rankings_payout_calculation.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |

## `season_rankings`

| Policy | Angelegt | Änderungen |
|---|---|---|
| `season_rankings_select` | `0006_rankings_payout_calculation.sql` | ersetzt in `0018_public_rankings.sql`; ersetzt in `0028_season_participant_visibility.sql`; geändert in `0047` |
| `season_rankings_insert` | `0006_rankings_payout_calculation.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |
| `season_rankings_update` | `0006_rankings_payout_calculation.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |
| `season_rankings_delete` | `0006_rankings_payout_calculation.sql` | geändert in `0022_role_permissions.sql`; geändert in `0047` |

## `profiles`

| Policy | Angelegt | Änderungen |
|---|---|---|
| `profiles_select` | `0001_roles_profiles.sql` | geändert in `0047` (Performance); geändert in `0050_users_manage_permission.sql` (neue Permission `users_manage`) |
| `profiles_update` | `0001_roles_profiles.sql` | geändert in `0047` (Performance); geändert in `0050_users_manage_permission.sql` |
| `profiles_update_own` | `0010_self_profile_update.sql` | keine spätere Änderung gefunden |

Bewusst **keine** Insert/Delete-Policy: `profiles`-Zeilen entstehen über den
Auth-Trigger (`handle_new_user`, siehe `0001_roles_profiles.sql`), nie
direkt durch Clients.

## `push_tokens`

Push-Benachrichtigungs-Tokens der mobile App (siehe `mobile/`,
`docs/mobile-app.md`).

| Policy | Angelegt | Änderungen |
|---|---|---|
| `push_tokens_select` | `0069_push_tokens.sql` | keine spätere Änderung |
| `push_tokens_insert` | `0069_push_tokens.sql` | keine spätere Änderung |
| `push_tokens_delete` | `0069_push_tokens.sql` | keine spätere Änderung |

Bewusst **keine** Update-Policy: ein erneuertes Token wird als Delete+Insert
behandelt, kein Client darf ein bestehendes Token-Feld direkt überschreiben.

## Methodik

Ermittelt per `grep -inE '(create|alter|drop)[[:space:]]+policy'` über
`supabase/migrations/*.sql`, gefiltert auf `on public.<tabelle>`, in
aufsteigender Migrationsreihenfolge gelesen. Bei einer neuen Tabelle mit
RLS-Policies diese Datei um einen Abschnitt ergänzen, sobald die erste
`create policy` dafür committet wird.

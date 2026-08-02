-- Zwei Nachbesserungen aus dem Live-Test von 0059/0061:
--
-- 1. player_profile_links_select bekam bei 0059 keinen players.link_logins-
--    Zweig (nur insert/delete) – ein delegierter Spielleiter konnte damit
--    zwar verknüpfen/trennen, aber nur seine EIGENEN Verknüpfungen sehen
--    (profile_id = auth.uid()), nicht die anderer Nutzer. Das ließ das
--    Formular leer erscheinen und führte dazu, dass ein erneutes Speichern
--    unsichtbare Verknüpfungen löschte (setPlayerProfileLinks() ersetzt die
--    komplette Menge). Gleicher zusätzlicher Zweig wie bei insert/delete.
--
-- 2. email_templates: System-Vorlagen (system_key gesetzt) waren bewusst
--    hart admin-only – auf Nutzerwunsch jetzt stattdessen wie die freien
--    Vorlagen über email.send gesteuert (das ohnehin schon jeder braucht, um
--    /emails/vorlagen überhaupt zu erreichen, siehe App.tsx-Routing). Damit
--    entfällt die Unterscheidung nach system_key in select/update komplett.
--    insert/delete bleiben unverändert auf system_key is null beschränkt –
--    System-Zeilen sind weiterhin weder erstell- noch löschbar über die App.

alter policy player_profile_links_select on public.player_profile_links
  using (
    ((select current_user_role()) = 'admin' and (select current_user_active()))
    or (profile_id = (select auth.uid()) and (select current_user_active()))
    or ((select current_user_has_permission('players.link_logins')) and (select current_user_active()))
  );

alter policy email_templates_select on public.email_templates
  using ((select current_user_has_permission('email.send')) and (select current_user_active()));

alter policy email_templates_update on public.email_templates
  using ((select current_user_has_permission('email.send')) and (select current_user_active()))
  with check ((select current_user_has_permission('email.send')) and (select current_user_active()));

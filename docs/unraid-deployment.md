# Deployment auf Unraid

Diese Anleitung bringt das **Frontend** der Kicktipp-App auf einen eigenen
Unraid-Server. Das **Backend bleibt unverändert Supabase Cloud** (das bereits
verlinkte Projekt) – hier wird nichts an der Datenbank, Auth oder den Edge
Functions geändert. Eine spätere Migration der Datenbank auf eine
self-hosted Supabase-Instanz ist davon komplett unabhängig und kann jederzeit
separat angegangen werden.

## Funktionsweise

1. Bei jedem Push nach `main` **oder `beta`** baut **GitHub Actions**
   automatisch **ein einziges** Docker-Image, das DREI Versionen enthält:
   main (Produktion) unter `/`, beta (zum Testen) unter `/beta/`, dev unter
   `/dev/` – jeweils ein eigener, unabhängig gebauter statischer React-Build,
   gemeinsam über nginx ausgeliefert. Veröffentlicht als `:latest`
   (zusätzlich mit dem Commit-Hash als eigenem Tag) in der **GitHub
   Container Registry** (`ghcr.io`).
2. Auf Unraid läuft dafür **ein einziger** Container, `kicktipp-app`, der
   `:latest` zieht – keine zweite IP/kein zweiter Container mehr nötig.
3. **Watchtower** (ein weiterer, kleiner Container auf Unraid) prüft
   regelmäßig, ob das Image neu ist, zieht es automatisch und startet den
   Container neu – ganz ohne manuellen Schritt auf dem Server.
4. **Wer die Beta-Version sehen darf, entscheidet die App selbst**: im
   eigenen Profil gibt es einen Link "Beta-Version testen", sichtbar nur mit
   dem Recht `beta.access` (vergeben über **Rollen & Berechtigungen** im
   Admin-Bereich). Von dort zurück zur Produktivversion geht jederzeit ohne
   weitere Berechtigung. `/dev/` zeigt auf ein komplett eigenständiges
   Supabase-Projekt ("Kicktipp Dev", eigene Anmeldung, eigene Daten) – braucht
   deshalb keine In-App-Freischaltung und ist nur über die direkte URL
   erreichbar, kein Navigationseintrag dorthin.
5. **Ausnahme:** Besteht ein Push nur aus einem `[skip ci]`-Commit (der
   automatische Versions-Bump auf `main`, oder ein Fast-Forward-Merge von
   `main` nach `beta`, der zufällig genau auf so einem Commit landet – z. B.
   um `beta` wieder auf den Stand von `main` zu bringen), löst GitHub das
   absichtlich NICHT aus (verhindert eine Bump-→-Build-→-Bump-Endlosschleife
   auf `main`, siehe Kommentar in `docker-publish.yml`). In dem Fall zeigt
   das deployte Image weiterhin den alten Stand, bis der Build manuell
   nachgetriggert wird: `gh workflow run docker-publish.yml --ref beta`
   (bzw. `--ref main`), oder über den **Actions**-Tab im Repo.

```
Code-Änderung (lokal) → git push nach beta → GitHub Actions baut EIN Image
                                     (main + beta + dev zusammen) → ghcr.io
                                                                             │
                                                    Watchtower aktualisiert kicktipp-app
                                                                             │
                                        (unter .../beta/ im eigenen Profil testen,
                                         sichtbar nur mit beta.access-Recht;
                                         .../dev/ zeigt auf das separate Dev-Backend)
                                                                             │
                                          "auf Prod übernehmen" → beta wird nach main gemerged
                                                                             │
                                              GitHub Actions baut das Image erneut → ghcr.io
                                                                             │
                                                    Watchtower aktualisiert kicktipp-app
                                                          (Prod unter / jetzt aktuell)
```

## Teil 1 – Einmalige Einrichtung in GitHub

### 1.1 Secrets hinterlegen

Die App braucht beim Bauen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`
(dieselben Werte wie in der lokalen `.env`, siehe `.env.example`). Diese
werden als **GitHub Actions Secrets** hinterlegt, damit sie nicht im Repo
sichtbar sind, aber beim automatischen Build zur Verfügung stehen:

```bash
gh secret set VITE_SUPABASE_URL --repo reneheitmann/kicktipp-app
gh secret set VITE_SUPABASE_ANON_KEY --repo reneheitmann/kicktipp-app
```

(Jeweils nach Eingabe des Befehls den Wert einfügen, wenn danach gefragt
wird. Alternativ über GitHub-Weboberfläche: Repo → Settings → Secrets and
variables → Actions → New repository secret.)

### 1.2 Deployment-Dateien pushen

Die folgenden Dateien wurden bereits im Projekt angelegt:

- `Dockerfile` – Multi-Stage-Build (Node baut, nginx liefert aus)
- `nginx.conf` – SPA-Fallback, damit React-Router-Seiten beim Direktaufruf/
  Reload funktionieren
- `.dockerignore`
- `.github/workflows/docker-publish.yml` – der Auto-Build-Workflow

Diese müssen einmalig committet und gepusht werden, damit der Workflow
aktiv wird (danach läuft alles automatisch bei jedem weiteren Push).

### 1.3 GHCR-Paket öffentlich sichtbar machen

Nach dem ersten erfolgreichen Workflow-Lauf (Tab **Actions** im Repo, dort
den Lauf abwarten) erscheint ein neues Package unter
`github.com/reneheitmann?tab=packages`. Standardmäßig ist es **privat** –
damit Watchtower es ohne zusätzliche Zugangsdaten von Unraid aus ziehen
kann, einmalig auf öffentlich stellen:

1. Auf das Package `kicktipp-app` klicken → **Package settings**
2. Ganz unten: **Change visibility** → **Public**

Das ist unbedenklich: Im Image steckt nur der öffentliche Anon-Key (der
ohnehin im Browser sichtbar ist, sobald jemand die Seite lädt) sowie
öffentlicher Frontend-Code. Alle eigentlichen Berechtigungen laufen über
Supabase Row Level Security, nicht über Geheimhaltung des Frontends.

*Alternative, falls das Paket lieber privat bleiben soll:* dann muss sich
Unraid am Registry anmelden (`docker login ghcr.io` mit einem GitHub
Personal Access Token, Scope `read:packages`, einmalig über die Unraid-
Konsole). Für den Einstieg wird die öffentliche Variante empfohlen.

## Teil 2 – Container auf Unraid einrichten

Zwei gleichwertige Wege, die denselben laufenden Container erzeugen:

- **Über die Unraid-WebUI** (empfohlen): Unraid legt dabei automatisch ein
  **Template** an, sodass der Container danach jederzeit über den Docker-Tab
  mit **„Edit“** bequem über Eingabefelder angepasst werden kann (IP, Name,
  Neustart-Richtlinie, …) – inklusive eigenem Icon/Direktlink im Dashboard.
- **Über die Unraid-Konsole/SSH** (`docker run`): schneller zum Abtippen,
  aber ohne Template – der Container läuft identisch, lässt sich im
  Docker-Tab starten/stoppen/Logs ansehen, aber nicht komfortabel über eine
  Formular-Maske bearbeiten.

Watchtower (Abschnitt 2.2) funktioniert in beiden Fällen identisch, da es
direkt mit dem Docker-Daemon spricht, unabhängig davon, wie der Container
ursprünglich angelegt wurde.

### 2.1 App-Container starten (Netzwerk: br0, eigene IP statt Port-Mapping)

Der Container läuft im custom `br0`-Netzwerk (Macvlan) und bekommt dadurch
eine **eigene IP-Adresse im LAN** – wie ein separates physisches Gerät,
statt über einen Port am Unraid-Host erreichbar zu sein. nginx im Container
hört auf dem Port aus der Umgebungsvariable **`LISTEN_PORT`** (Default
`8080`) unter dieser eigenen IP – kein Docker-Port-Mapping nötig/möglich bei
Macvlan, dafür aber **über die Unraid-GUI individuell anpassbar** (siehe
Schritt 6 unten), ganz ohne neuen Build.

Zuerst eine **freie IP-Adresse** im eigenen LAN-Subnetz wählen (außerhalb
des DHCP-Bereichs des Routers, damit sie nicht später doppelt vergeben
wird) – z. B. `192.168.1.50`, je nach eigenem Subnetz anpassen. Das Subnetz
selbst steht in Unraid unter **Settings → Network Settings** (Feld
„IPv4 address“/„Subnet mask“ von `eth0`).

**Voraussetzung:** `br0` muss in Unraid als Netzwerk existieren – Standard,
sobald unter **Settings → Docker → „Host access to custom networks“**
aktiviert ist. Ist das nicht der Fall, dort einmalig aktivieren (Docker-
Dienst wird kurz neu gestartet).

#### Variante A: über die WebGUI (empfohlen, später über „Edit“ änderbar)

1. **Docker**-Tab → unten **Add Container**
2. **Name**: `kicktipp-app`
3. **Repository**: `ghcr.io/reneheitmann/kicktipp-app:latest`
4. **Network Type**: `Custom: br0` auswählen
5. Dadurch erscheint ein Feld **Fixed IP address**: die gewählte freie IP
   eintragen (z. B. `192.168.1.50`)
6. Über **„Add another Path, Port, Variable, Label or Device“** →
   **Variable** eine neue Umgebungsvariable hinzufügen:
   **Key**: `LISTEN_PORT`, **Value**: gewünschter Port (z. B. `8080`,
   frei wählbar – auch später jederzeit über **Edit** änderbar, ohne
   neuen Build)
   Das Image bringt außerdem **`TZ=Europe/Berlin`** bereits als Default mit
   (Container-interne Zeitstempel wie nginx-Logs/`docker logs` – hat keinen
   Einfluss auf Datums-/Zeitangaben in der App selbst, die nutzt die
   Zeitzone des jeweiligen Browsers). Nur nötig, eine eigene `TZ`-Variable
   zu setzen, falls eine andere Zone gewünscht ist.
7. **Icon URL**-Feld:
   `https://raw.githubusercontent.com/reneheitmann/kicktipp-app/main/public/icon.png`
   (**wichtig: PNG, kein SVG** – Unraid rendert SVG/WEBP für dieses Feld
   nicht zuverlässig, sondern zeigt weiterhin das Fragezeichen)
8. **WebUI**-Feld (optional, für den Direktlink im Unraid-Dashboard):
   `http://[IP]:8080/` (den Port an den in Schritt 6 gewählten Wert
   anpassen)
9. **Restart Policy**: `Unless stopped`/`Always` (Feld meist unter „Show
   more settings…“ bzw. „Extra Parameters“, je nach Unraid-Version)
10. **Apply**

Der Container erscheint danach im Docker-Tab und lässt sich jederzeit über
sein Icon → **Edit** mit genau diesen Feldern erneut anpassen.

**Icon/WebUI automatisch aus dem Image übernehmen:** Das Docker-Image
enthält bereits die Labels `net.unraid.docker.icon` und
`net.unraid.docker.webui` (siehe `Dockerfile`) – Unraid kann Icon und
WebUI-Link daraus automatisch übernehmen, sodass Feld 6/7 oben theoretisch
entfallen könnten. Das greift zuverlässig bei Containern, die – wie hier
beschrieben – über **Add Container** (also template-basiert) erstellt
wurden; bei reinen `docker run`-Containern (Variante B) wird das Icon-Label
laut Unraid-Community teils nicht ausgewertet. Um auf Nummer sicher zu
gehen, die Felder trotzdem wie oben manuell setzen.

**Bereits laufenden Container korrigieren:** Container → **Edit** → Feld
**Icon URL** auf die PNG-Adresse oben ändern → **Apply**. Ein vorheriges
`/favicon.svg` als Icon-URL funktioniert nicht (siehe Hinweis oben).

**Bestehender Container (vor Einführung von `LISTEN_PORT`):** Nach dem
Update auf ein neues Image ändert sich nichts von selbst – das Image bringt
`LISTEN_PORT=8080` bereits als Default mit, die App bleibt also unter Port
8080 erreichbar. Um den Port künftig **über die GUI** ändern zu können,
einmalig Container → **Edit** → wie in Schritt 6 oben eine Variable
`LISTEN_PORT` hinzufügen → **Apply**. Danach lässt sich der Port jederzeit
über genau dieses Feld anpassen (Container wird beim Speichern automatisch
neu gestartet). Bei einer Änderung zusätzlich das **WebUI**-Feld auf den
neuen Port anpassen (wird nicht automatisch aktualisiert).

#### Variante B: über die Konsole/SSH

```bash
docker run -d \
  --name kicktipp-app \
  --restart unless-stopped \
  --network br0 \
  --ip 192.168.1.50 \
  -e LISTEN_PORT=8080 \
  ghcr.io/reneheitmann/kicktipp-app:latest
```

`192.168.1.50` durch die gewählte freie IP ersetzen, `LISTEN_PORT` nach
Bedarf anpassen (weglassen = Default `8080`).

In beiden Fällen ist die App danach unter `http://192.168.1.50:8080`
erreichbar (bzw. dem in `LISTEN_PORT` gewählten Port).

**Bekannte Einschränkung von Macvlan (`br0`):** der Unraid-Host selbst kann
den Container über diese IP in der Regel *nicht* erreichen (nur andere
Geräte im Netzwerk können). Für den Zugriff per Browser von einem PC/Handy
im selben WLAN/LAN ist das unerheblich – nur ein `curl` direkt vom
Unraid-Server aus auf die Container-IP würde nicht funktionieren.

### 2.2 Watchtower für automatische Updates installieren

```bash
docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 300 \
  --cleanup \
  kicktipp-app
```

- `--interval 300` prüft alle 5 Minuten auf ein neues Image (nach Bedarf
  anpassen, z. B. `3600` für stündlich).
- `--cleanup` löscht alte, nicht mehr genutzte Images automatisch, damit
  der Unraid-Speicher nicht vollläuft.
- Der Container-Name `kicktipp-app` am Ende sorgt dafür, dass Watchtower
  **ausschließlich** diesen Container überwacht – andere, unabhängig auf
  Unraid laufende Container bleiben unangetastet.
- Watchtower selbst bleibt bewusst im normalen Docker-Netzwerk (kein
  `--network br0`) – er braucht nur Zugriff auf den Docker-Socket, um
  Images zu ziehen und Container neu zu starten, keine eigene Erreichbarkeit
  im LAN.

*Alternative:* Watchtower gibt es auch als fertiges Template in den
**Community Applications** (Apps-Tab in Unraid, dort nach „Watchtower“
suchen) – dort lassen sich dieselben Optionen über Eingabefelder statt der
Kommandozeile setzen.

**Bisher zwei Container betrieben (`kicktipp-app` + `kicktipp-app-beta`)?**
Beide lieferten dasselbe Supabase-Backend aus, ein einzelnes Image enthält
jetzt beide Versionen (Prod unter `/`, Beta unter `/beta/`, siehe
„Funktionsweise“ oben) – `kicktipp-app-beta` kann gestoppt und gelöscht
werden (Docker-Tab → Container anklicken → **Stop**, dann **Remove**), das
Watchtower-Kommando oben überwacht nur noch `kicktipp-app`. Wer testen
möchte, ruft künftig `http://<Prod-IP>:8080/beta/` auf bzw. nutzt den Link
im eigenen Profil (siehe „Funktionsweise“).

### 2.3 Testen

1. Im Browser `http://192.168.1.50:8080` öffnen (eigene gewählte IP) – die
   Login-Seite der App sollte erscheinen.
2. Mit einem bestehenden Account einloggen und prüfen, dass Daten aus
   Supabase geladen werden (z. B. Saisons-Übersicht).
3. Eine Unterseite direkt per URL aufrufen und neu laden (z. B.
   `http://192.168.1.50:8080/seasons`) – muss funktionieren, nicht mit 404
   fehlschlagen (Test für die nginx-SPA-Konfiguration).
4. Dasselbe für den Beta-Pfad: `http://192.168.1.50:8080/beta/seasons`
   direkt aufrufen und neu laden – auch hier kein 404 (eigener
   `try_files`-Block in `nginx.conf.template`). Ohne `beta.access`-Recht
   für den eingeloggten Account leitet die App von dort automatisch zurück
   auf `/`.

## Teil 3 – Ein Update auslösen (zum Ausprobieren)

1. Eine kleine Änderung im Code machen, committen, `git push` **nach `beta`**.
2. Im GitHub-Repo unter **Actions** den Workflow-Lauf beobachten (dauert
   etwas länger als früher, da main UND beta in einem Lauf gebaut werden) –
   baut das eine, gemeinsame Image neu.
3. Nach Abschluss: bis zu `--interval`-Sekunden warten (siehe 2.2), dann
   `docker logs watchtower` auf Unraid prüfen – dort erscheint ein Eintrag,
   sobald das neue Image gezogen und `kicktipp-app` neu gestartet wurde.
4. Die Änderung sollte danach unter `http://192.168.1.50:8080/beta/`
   sichtbar sein (mit einem Account, der das `beta.access`-Recht hat, bzw.
   über den Link im eigenen Profil).
5. Passt alles: `beta` nach `main` mergen und pushen (z. B.
   `git checkout main && git merge beta && git push origin main`) – das
   baut das Image erneut, Watchtower aktualisiert danach `kicktipp-app`
   erneut, Prod unter `http://192.168.1.50:8080/` ist danach aktuell.

## Teil 4 – Datenbank-Backup vor Migrationen

`main` und `beta` teilen sich ein Supabase-Projekt (keine getrennten
Datenbanken, siehe Projekt-Notizen) – vor jeder Migration
(`supabase db push --linked`) sollte daher ein Backup gezogen werden. Das
läuft über einen manuell auslösbaren GitHub-Actions-Workflow
(`.github/workflows/db-backup.yml`), nicht lokal, da `supabase db dump`
Docker braucht (auf GitHub-Runnern vorinstalliert).

**Einmalige Einrichtung** (zwei Repo-Secrets, jeweils selbst im eigenen
Terminal setzen, nicht über eine KI-Sitzung – beides sind Zugangsdaten):

1. Personal Access Token unter
   https://supabase.com/dashboard/account/tokens erstellen, dann:
   `gh secret set SUPABASE_ACCESS_TOKEN --repo reneheitmann/kicktipp-app`
2. Ein starkes, zufälliges Passwort erzeugen (z. B. `openssl rand -base64 32`)
   und sicher aufbewahren (Passwortmanager – wird auch zum Entschlüsseln
   gebraucht), dann:
   `gh secret set BACKUP_ENCRYPTION_PASSPHRASE --repo reneheitmann/kicktipp-app`

Migrationen sollten außerdem zuerst gegen das separate "Kicktipp Dev"-Projekt
laufen (`supabase link --project-ref <dev-ref>` davor), um sie vor main/beta
zu testen – Dev ist ein eigenständiges Projekt, ein Fehler dort betrifft
nicht die produktiven Daten.

**Vor einer Migration:**

1. `gh workflow run db-backup.yml --repo reneheitmann/kicktipp-app` (oder im
   GitHub-Repo unter **Actions → Datenbank-Backup → Run workflow**).
2. Lauf abwarten, dann im Actions-Tab des Laufs das Artifact
   `db-backup-<run-id>` herunterladen (verschlüsselte Datei
   `backup.tar.gz.gpg` – das Repo ist öffentlich, daher unverschlüsselt
   *nicht* direkt als Artifact ablegbar).
3. Erst danach `supabase db push --linked` ausführen.

**Im Ernstfall entschlüsseln:**

```bash
gpg --batch --yes --passphrase "<BACKUP_ENCRYPTION_PASSPHRASE>" \
  --decrypt -o backup.tar.gz backup.tar.gz.gpg
tar -xzf backup.tar.gz   # ergibt schema.sql und data.sql
```

**Zurückspielen (Restore):**

⚠️ **Erst gegen das separate "Kicktipp Dev"-Projekt testen, niemals zuerst
gegen Prod/beta** – Dev ist eigenständig, ein Fehler beim Testlauf betrifft
dort keine echten Daten. Erst wenn der Ablauf gegen Dev nachweislich
funktioniert, dieselben Schritte gegen das main/beta-Projekt wiederholen.

1. Gegen das Ziel-Projekt verlinken (Dev-Ref zum Testen, main/beta-Ref nur
   im echten Ernstfall):
   ```bash
   supabase link --project-ref <dev-ref-oder-prod-ref>
   ```
2. Schema zurücksetzen. `db reset --linked` spielt dabei **nicht**
   `schema.sql` ein, sondern spielt alle lokalen Migrationen
   (`supabase/migrations/`) von Grund auf neu ab – `schema.sql` aus dem
   Backup wird für den Restore-Ablauf gar nicht gebraucht (bleibt nur als
   Referenz-Dump im Archiv):
   ```bash
   supabase db reset --linked
   ```
   Schlägt das mit `duplicate key value violates unique constraint
   "buckets_pkey"` fehl: Eine Migration legt den Storage-Bucket
   `app-assets` an, `db reset` leert aber nur die App-Schemas
   (`public` etc.), nicht das von Supabase verwaltete `storage`-Schema –
   ein bereits vorhandener Bucket blockiert dann die Migration. Direktes
   `DELETE FROM storage.buckets` ist per Trigger gesperrt; stattdessen über
   die Storage-API leeren (Service-Role-Key über
   `supabase projects api-keys --project-ref <ref>` holen) und `db reset
   --linked` erneut ausführen:
   ```bash
   curl -X DELETE "https://<projekt-ref>.supabase.co/storage/v1/bucket/app-assets" \
     -H "Authorization: Bearer <service_role-key>" -H "apikey: <service_role-key>"
   ```
3. Migrationen seeden diverse Standardwerte (u. a. `app_settings`,
   `role_permissions`, `password_policy`, `session_policy`,
   `nav_settings`, `legal_settings`, `email_templates`) – diese Zeilen
   kollidieren mit denselben Zeilen aus `data.sql`. Vor dem Datenimport
   daher alle App-Tabellen leeren (Liste per `select string_agg(tablename,
   ', ') from pg_tables where schemaname='public';` ermitteln):
   ```bash
   supabase db query --linked "truncate table profiles, players, seasons, \
     matchdays, matchday_entries, transactions, season_participants, \
     payout_rules, matchday_rankings, season_rankings, kicktipp_imports, \
     zahlungen, app_settings, password_policy, app_logs, email_settings, \
     password_history, password_reset_throttle, player_profile_links, \
     session_policy, user_sessions, email_change_requests, nav_settings, \
     role_permissions, email_templates, legal_settings cascade;"
   ```
4. `data.sql` einspielen:
   ```bash
   supabase db query --linked --file data.sql
   ```
   `data.sql` ist ein Dump der **gesamten** Datenbank, nicht nur von
   `public` – enthält daher auch die Storage-Bucket-Zeile. Bricht dieser
   Schritt erneut mit `buckets_pkey`/`app-assets` ab (weil Schritt 2 den
   Bucket per Migration bereits neu angelegt hat), den Bucket per
   Storage-API (siehe Schritt 2) noch einmal leeren und den kompletten
   Import erneut starten – der Import läuft in einer Transaktion, ein
   Abbruch macht also auch die bis dahin erfolgreichen `insert`s wieder
   rückgängig, ein erneuter voller Lauf ist nach dem Beheben der Ursache
   nötig, kein Fortsetzen ab der Fehlerstelle.
5. Danach kurz stichprobenartig prüfen (z. B. `supabase db query --linked
   "select count(*) from public.profiles;"`), ob die erwartete Datenmenge
   wieder da ist, bevor die App wieder auf dieses Projekt zeigt.

Verifiziert per echtem Restore-Drill (Prod-Backup → Dev, 2026-08-22):
Schritte 1–5 laufen in dieser Reihenfolge fehlerfrei durch.

### 4.1 Secret-Rotation

**Rotationsfrequenz: jährlich, zusätzlich sofort bei Verdacht auf
Kompromittierung** (z. B. versehentlich geloggter Wert, Verdacht auf
kompromittiertes Entwickler-Gerät). Betrifft drei Secrets, jeweils an
unterschiedlicher Stelle rotierbar:

| Secret | Wo | Wie |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (Edge-Function-Secret, siehe `supabase/functions/_shared/cors.ts`) | Im Dashboard neu generieren, danach `gh secret set`/`supabase secrets set` mit dem neuen Wert aktualisieren. |
| SMTP-Zugangsdaten | In-App unter `/admin/email` (Tabelle `email_settings`, siehe `0017_email_settings.sql`) | Neue Zugangsdaten beim E-Mail-Provider erzeugen, dort eintragen. |
| `BACKUP_ENCRYPTION_PASSPHRASE` | GitHub-Repo-Secret (siehe oben, Teil 4) | `openssl rand -base64 32`, dann `gh secret set BACKUP_ENCRYPTION_PASSPHRASE`, **sofort in einem Passwortmanager sichern** – alte, damit verschlüsselte Backups werden mit der neuen Passphrase unlesbar, ggf. vorher ein letztes Backup mit der alten Passphrase entschlüsseln/archivieren. |

## Teil 5 – Monitoring

Ein externer Uptime-Check lässt sich nicht aus dem Code heraus einrichten
(das ist reine Konfiguration bei einem Drittanbieter) – die App liefert
dafür aber unter `http://<IP>:<PORT>/health.txt` (bzw.
`http://<IP>:<PORT>/beta/health.txt`) eine statische Datei mit Inhalt `ok`
aus, die sich ohne Login und ohne Datenbankzugriff abfragen lässt.

**Einrichtung bei einem kostenlosen externen Anbieter** (z. B.
[UptimeRobot](https://uptimerobot.com) oder
[healthchecks.io](https://healthchecks.io), kein Vendor-Lock-in nötig, kein
Reverse Proxy erforderlich – sofern der Uptime-Monitor die interne
Heimnetz-IP erreichen kann, sonst siehe "Zugriff von außerhalb des
Heimnetzes" im Ausblick unten):

1. Neuen Monitor vom Typ "HTTP(s)" anlegen.
2. URL: `http://<IP>:<PORT>/health.txt` (z. B.
   `http://192.168.1.50:8080/health.txt`).
3. Erwarteten Inhalt/Status auf HTTP 200 prüfen lassen (die meisten
   Anbieter bieten optional auch eine Freitext-Prüfung auf `ok` im Body an).
4. Prüfintervall nach Bedarf (z. B. alle 5 Minuten) – der Endpunkt ist eine
   statische Datei, verursacht also keine nennenswerte zusätzliche Last.

## Teil 6 – Zugriff von außerhalb des Heimnetzes (Reverse Proxy + TLS)

Bis hierher ist die App nur im Heimnetz erreichbar (direkte IP:Port-
Verbindung, unverschlüsseltes HTTP). Für Zugriff von unterwegs braucht es
zusätzlich: einen Reverse Proxy (nimmt TLS entgegen, leitet intern an
`kicktipp-app` weiter), eine eigene Domain und ein TLS-Zertifikat.

### 6.1 Reverse Proxy wählen und einrichten

Zwei gleichwertige, beide über Unraids **Community Applications**
installierbare Optionen:

- **[Nginx Proxy Manager](https://nginxproxymanager.com)** (Empfehlung für
  den Einstieg) – einfache WebUI, Let's-Encrypt-Zertifikate werden direkt
  darüber beantragt/erneuert, kein Config-Datei-Editieren nötig.
- **[SWAG](https://docs.linuxserver.io/general/swag)** (linuxserver.io) –
  bringt die automatische Let's-Encrypt-Erneuerung ebenfalls mit, ist aber
  Config-Datei-basiert (mehr Kontrolle, etwas mehr Einarbeitung).

Nach der Installation über Community Applications: einen neuen Proxy-Host
(NPM) bzw. eine neue Subdomain-Config (SWAG) für die Kicktipp-Domain
anlegen, der/die auf die bestehende `kicktipp-app`-IP zeigt:

- **Ziel-IP**: die `br0`-IP von `kicktipp-app` (siehe Teil 2.1, z. B.
  `192.168.1.50`).
- **Ziel-Port**: der Wert aus `LISTEN_PORT` (Default `8080`, siehe
  Dockerfile/Unraid-Container-Konfiguration).
- **Scheme**: `http` (der Reverse Proxy spricht intern weiterhin
  unverschlüsseltes HTTP mit `kicktipp-app` – TLS wird ausschließlich am
  Reverse Proxy selbst terminiert, nicht am App-Container).

### 6.2 Domain und DNS

1. Eigene Domain besorgen (falls noch keine vorhanden) – ein beliebiger
   Registrar, keine Kicktipp-spezifische Anforderung.
2. Beim DNS-Anbieter der Domain einen **A-Record** anlegen, der auf die
   öffentliche IP des Heimnetz-Anschlusses zeigt (bei wechselnder
   öffentlicher IP stattdessen DynDNS nutzen, z. B. über den Router oder
   einen DynDNS-Anbieter).
3. Am Router: **Port-Forwarding 443** (HTTPS) auf die interne IP des
   Reverse-Proxy-Containers einrichten (bei SWAG zusätzlich Port 80 für die
   Let's-Encrypt-HTTP-Challenge, falls nicht DNS-Challenge verwendet wird).

### 6.3 TLS-Zertifikat beziehen

Sowohl NPM als auch SWAG beziehen das Zertifikat direkt von **Let's
Encrypt** über die jeweilige WebUI/Config – kein manueller `certbot`-Aufruf
nötig. Bei NPM: beim Anlegen des Proxy-Hosts den Reiter "SSL" öffnen, "Request
a new SSL Certificate" wählen, Let's-Encrypt-AGB akzeptieren. Erneuerung
läuft danach automatisch im Hintergrund.

### 6.4 Nach dem Umstieg prüfen

1. `https://<domain>/health.txt` im Browser aufrufen – muss `ok` liefern
   (derselbe Endpunkt wie in Teil 5, nur jetzt über HTTPS statt der
   internen IP:Port-Adresse erreichbar).
2. Den in Teil 5 eingerichteten UptimeRobot-/healthchecks.io-Monitor von
   der internen `http://<IP>:<PORT>/health.txt`-URL auf
   `https://<domain>/health.txt` umstellen.
3. `Strict-Transport-Security` prüfen (z. B. über die Browser-DevTools,
   Reiter "Network" → Response-Header der Startseite) – sollte jetzt aktiv
   greifen, da nginx.conf.template den Header bereits vorbereitet (siehe
   dortiger Kommentar).

### 6.5 Wichtig: Supabase Auth auf die neue Domain umstellen

Ohne diesen Schritt schlagen Login-Weiterleitungen, Passwort-Reset- und
Einladungslinks nach dem Domain-Wechsel fehl (sie verweisen dann weiterhin
auf die alte/interne Adresse):

1. **Supabase Dashboard → Authentication → URL Configuration**: die neue
   Domain (`https://<domain>` und `https://<domain>/beta`) zu den
   erlaubten Redirect-URLs hinzufügen.
2. **`ALLOWED_ORIGINS`-Secret der Edge Functions** (siehe
   `supabase/functions/_shared/cors.ts`) um die neue Domain ergänzen:
   ```bash
   supabase secrets set ALLOWED_ORIGINS="https://<bisherige-origins>,https://<domain>" --project-ref <project-ref>
   ```
   (bestehende Origins aus der kommagetrennten Liste mit übernehmen, nicht
   überschreiben – Supabase-Secrets sind write-only, der aktuelle Wert
   lässt sich nicht auslesen, daher vorher den bisherigen Wert notieren
   oder aus der eigenen Dokumentation/dem letzten Setup-Schritt
   nachschlagen).

## Ausblick (nicht Teil dieser Anleitung)

- **Supabase self-hosted auf Unraid**: eigener, deutlich umfangreicherer
  Docker-Compose-Stack (Postgres, Auth, PostgREST, Realtime, Storage, Kong)
  plus Migration der bestehenden Cloud-Daten. Separates Projekt, das sich
  jederzeit später angehen lässt, ohne dass sich am Frontend-Setup hier
  etwas ändert.

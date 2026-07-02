# Deployment auf Unraid

Diese Anleitung bringt das **Frontend** der Kicktipp-App auf einen eigenen
Unraid-Server. Das **Backend bleibt unverändert Supabase Cloud** (das bereits
verlinkte Projekt) – hier wird nichts an der Datenbank, Auth oder den Edge
Functions geändert. Eine spätere Migration der Datenbank auf eine
self-hosted Supabase-Instanz ist davon komplett unabhängig und kann jederzeit
separat angegangen werden.

## Funktionsweise

1. Bei jedem Push nach `main` baut **GitHub Actions** automatisch ein
   Docker-Image (statischer React-Build, ausgeliefert über nginx) und lädt es
   in die **GitHub Container Registry** (`ghcr.io`) hoch.
2. Auf Unraid läuft der Container einmalig eingerichtet dauerhaft.
3. **Watchtower** (ein weiterer, kleiner Container auf Unraid) prüft
   regelmäßig, ob ein neues Image verfügbar ist, zieht es automatisch und
   startet den App-Container neu – ganz ohne manuellen Schritt auf dem
   Server.

```
Code-Änderung → git push → GitHub Actions baut Image → ghcr.io
                                                            │
                                                    Watchtower zieht neues Image
                                                            │
                                                    Unraid-Container neu gestartet
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
hört direkt auf Port 80 unter dieser eigenen IP.

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
6. **Icon URL**-Feld:
   `https://raw.githubusercontent.com/reneheitmann/kicktipp-app/main/public/icon.png`
   (**wichtig: PNG, kein SVG** – Unraid rendert SVG/WEBP für dieses Feld
   nicht zuverlässig, sondern zeigt weiterhin das Fragezeichen)
7. **WebUI**-Feld (optional, für den Direktlink im Unraid-Dashboard):
   `http://[IP]/`
8. **Restart Policy**: `Unless stopped`/`Always` (Feld meist unter „Show
   more settings…“ bzw. „Extra Parameters“, je nach Unraid-Version)
9. **Apply**

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

#### Variante B: über die Konsole/SSH

```bash
docker run -d \
  --name kicktipp-app \
  --restart unless-stopped \
  --network br0 \
  --ip 192.168.1.50 \
  ghcr.io/reneheitmann/kicktipp-app:latest
```

`192.168.1.50` durch die gewählte freie IP ersetzen.

In beiden Fällen ist die App danach unter `http://192.168.1.50` erreichbar
(Port 80, daher ohne `:Portnummer` in der URL).

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

### 2.3 Testen

1. Im Browser `http://192.168.1.50` öffnen (eigene gewählte IP) – die
   Login-Seite der App sollte erscheinen.
2. Mit einem bestehenden Account einloggen und prüfen, dass Daten aus
   Supabase geladen werden (z. B. Saisons-Übersicht).
3. Eine Unterseite direkt per URL aufrufen und neu laden (z. B.
   `http://192.168.1.50/seasons`) – muss funktionieren, nicht mit 404
   fehlschlagen (Test für die nginx-SPA-Konfiguration).

## Teil 3 – Ein Update auslösen (zum Ausprobieren)

1. Eine kleine Änderung im Code machen, committen, `git push`.
2. Im GitHub-Repo unter **Actions** den Workflow-Lauf beobachten (dauert je
   nach Build ca. 1–3 Minuten).
3. Nach Abschluss: bis zu `--interval`-Sekunden warten (siehe 2.2), dann
   `docker logs watchtower` auf Unraid prüfen – dort erscheint ein Eintrag,
   sobald das neue Image gezogen und der Container neu gestartet wurde.
4. Die Änderung sollte danach unter `http://192.168.1.50` sichtbar sein.

## Ausblick (nicht Teil dieser Anleitung)

- **Zugriff von außerhalb des Heimnetzes**: dafür wäre ein Reverse Proxy
  (z. B. Nginx Proxy Manager oder SWAG, beide über Community Applications
  installierbar) plus eigene Domain und TLS-Zertifikat nötig.
- **Supabase self-hosted auf Unraid**: eigener, deutlich umfangreicherer
  Docker-Compose-Stack (Postgres, Auth, PostgREST, Realtime, Storage, Kong)
  plus Migration der bestehenden Cloud-Daten. Separates Projekt, das sich
  jederzeit später angehen lässt, ohne dass sich am Frontend-Setup hier
  etwas ändert.

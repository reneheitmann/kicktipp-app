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

Am einfachsten über die Unraid-Konsole (Unraid-WebUI → oben rechts das
Terminal-Symbol) oder per SSH. Alternativ lassen sich dieselben Angaben auch
über **Docker → Add Container** in der Unraid-WebUI eintragen (Repository =
Image-Name, Port-Zuordnung wie unten) – die Befehle hier sind aber
1:1 übertragbar und am robustesten unabhängig von der Unraid-Version.

### 2.1 App-Container starten

```bash
docker run -d \
  --name kicktipp-app \
  --restart unless-stopped \
  -p 8091:80 \
  ghcr.io/reneheitmann/kicktipp-app:latest
```

`8091` ist der Port, über den die App im lokalen Netzwerk erreichbar ist
(`http://<unraid-ip>:8091`) – bei Bedarf einen anderen freien Port wählen,
falls 8091 bereits belegt ist.

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

*Alternative:* Watchtower gibt es auch als fertiges Template in den
**Community Applications** (Apps-Tab in Unraid, dort nach „Watchtower“
suchen) – dort lassen sich dieselben Optionen über Eingabefelder statt der
Kommandozeile setzen.

### 2.3 Testen

1. Im Browser `http://<unraid-ip>:8091` öffnen – die Login-Seite der App
   sollte erscheinen.
2. Mit einem bestehenden Account einloggen und prüfen, dass Daten aus
   Supabase geladen werden (z. B. Saisons-Übersicht).
3. Eine Unterseite direkt per URL aufrufen und neu laden (z. B.
   `http://<unraid-ip>:8091/seasons`) – muss funktionieren, nicht mit 404
   fehlschlagen (Test für die nginx-SPA-Konfiguration).

## Teil 3 – Ein Update auslösen (zum Ausprobieren)

1. Eine kleine Änderung im Code machen, committen, `git push`.
2. Im GitHub-Repo unter **Actions** den Workflow-Lauf beobachten (dauert je
   nach Build ca. 1–3 Minuten).
3. Nach Abschluss: bis zu `--interval`-Sekunden warten (siehe 2.2), dann
   `docker logs watchtower` auf Unraid prüfen – dort erscheint ein Eintrag,
   sobald das neue Image gezogen und der Container neu gestartet wurde.
4. Die Änderung sollte danach unter `http://<unraid-ip>:8091` sichtbar sein.

## Ausblick (nicht Teil dieser Anleitung)

- **Zugriff von außerhalb des Heimnetzes**: dafür wäre ein Reverse Proxy
  (z. B. Nginx Proxy Manager oder SWAG, beide über Community Applications
  installierbar) plus eigene Domain und TLS-Zertifikat nötig.
- **Supabase self-hosted auf Unraid**: eigener, deutlich umfangreicherer
  Docker-Compose-Stack (Postgres, Auth, PostgREST, Realtime, Storage, Kong)
  plus Migration der bestehenden Cloud-Daten. Separates Projekt, das sich
  jederzeit später angehen lässt, ohne dass sich am Frontend-Setup hier
  etwas ändert.

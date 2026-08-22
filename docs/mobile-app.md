# Mobile App (iOS/Android)

Native iOS-/Android-App auf Basis desselben React/Vite-Codes wie die
Web-Version (`main`/`beta`, siehe README "Branches & Deployment"), zusätzlich
fähig, mehrere unabhängige Instanzen dieser App zu verwalten – jede Instanz
= eine eigene Domain + ein eigenes Supabase-Projekt (z. B.
`gewinnauswertung.magicprus.de` heute schon). Prinzip wie bei Nextcloud-,
Mastodon- oder Matrix-Apps: Instanz-URL eintragen, anmelden, jederzeit zu
einer anderen gespeicherten Instanz wechseln.

## Architektur

### Warum Capacitor statt React Native/Flutter

Der bestehende React/Vite-Code (`src/`) wird 1:1 wiederverwendet statt einer
Zweit-Codebasis in einem anderen Framework. Capacitor packt den vorhandenen
Web-Build in eine native Shell (WebView + Bridge zu nativen APIs), statt die
UI in einer anderen Sprache/einem anderen Rendering-Modell neu zu bauen –
für eine bereits bestehende, ausgereifte Web-App der kleinere, risikoärmere
Schritt als ein Parallel-Rewrite in React Native oder Flutter.

### Kein Remote-Origin-Loading in der WebView

**Sicherheitskritischste Einzelentscheidung im gesamten Vorhaben:** Die
native Shell lädt ausschließlich das lokal gebündelte App-Bundle (wie jede
normale Capacitor-App). Eine gewählte Instanz wird **nicht** per
WebView-Navigation zu ihrer Domain angesteuert – die App spricht Instanzen
ausschließlich über echte HTTP-Requests/den Supabase-Client an, genau wie
die Web-Version heute schon mit ihrem fest einkompilierten Supabase-Projekt
spricht, nur zur Laufzeit instanzabhängig statt build-zeit-fest.

Grund: Capacitors Native-Bridge (Kamera, Secure Storage, Push-Tokens, ...)
ist ausschließlich dem lokalen Bundle-Origin zugänglich. Lädt man
stattdessen die Domain einer fremden oder kompromittierten Instanz direkt
in die WebView, hätte deren Code im schlimmsten Fall Zugriff auf dieselbe
Bridge wie das eigene Bundle. Diese Trennung ist die gesamte Grundlage
dafür, dass ein Instanz-Wechsler mit beliebigen, vom Nutzer selbst
hinzugefügten Domains überhaupt sicher möglich ist.

### `instance-info.json`

Damit die App eine eingegebene Domain zu Verbindungsdaten auflösen kann,
*bevor* überhaupt eine Anmeldung stattfindet, liefert jede main/beta-Instanz
unter `https://<domain>/instance-info.json` (bzw. `/beta/instance-info.json`)
ein minimales JSON:

```json
{
  "supabase_url": "https://xxxxx.supabase.co",
  "supabase_anon_key": "sb_publishable_...",
  "default_name": "Kicktipp Spielrunde"
}
```

Erzeugt von `scripts/generate-instance-info.mjs` aus genau den
Env-Variablen, die `docker-publish.yml` beim Web-Build ohnehin schon setzt
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) – kein neues Secret nötig,
der Anon-Key ist ohnehin bereits öffentlich im Web-Bundle enthalten. Läuft
als zusätzlicher Schritt nach `npm run build` in `docker-publish.yml`, für
main und beta unabhängig voneinander.

`default_name` ist bewusst ein statischer Platzhalter (identisch zum
`DEFAULT_APP_NAME` in `AppSettingsPage.tsx`), kein Laufzeit-Branding – Name/
Farbe/Icon, admin-editierbar über `AppSettingsPage.tsx`, lädt die App wie
bisher erst nach dem eigentlichen Verbindungsaufbau aus der DB.
`instance-info.json` liefert nur das nötige Minimum, um diesen
Verbindungsaufbau technisch zu ermöglichen.

### Build-Kanäle

| Kanal | `VITE_APP_CHANNEL` | Supabase-Client | Wo |
|---|---|---|---|
| Produktion | `production` | build-zeit-fest aus `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` | `main` unter `/` |
| Beta | `beta` | build-zeit-fest, eigene Werte | `beta` unter `/beta/` |
| Mobile | `mobile` | **laufzeit-dynamisch** anhand der aktiven Instanz (siehe `src/lib/supabaseClient.ts`, `instanceStore.ts`) | `mobile/`, native Shell |

`npm run build:mobile` baut den Web-Teil für den mobile-Kanal nach
`dist-mobile/` (Capacitor `webDir`, siehe `mobile/capacitor.config.ts`).
Web-Builds (main/beta) sind davon unberührt – dort ändert sich nichts an
Verhalten oder Performance, der Supabase-Client wird exakt wie zuvor
build-zeit-initialisiert.

### Verzeichnisstruktur

```
mobile/
  capacitor.config.ts   – appId, appName, webDir (zeigt auf ../dist-mobile)
  package.json          – eigenständige Versionierung, siehe unten
  ios/                   – natives Xcode-Projekt (von `cap add ios`)
  android/               – natives Android-Studio/Gradle-Projekt (von `cap add android`)
```

Kein separates Repo – `mobile/` teilt sich `src/`, Typen und den API-Layer
mit der Web-Version im Repo-Root.

## Weitere offene Auslöser (Push, nicht in Phase 5 umgesetzt)

Nur als Idee notiert, bewusst nicht in diesem Schritt angebunden:
Massenmail-Versand, Passwort-Reset-Anfrage, neue Saison angelegt,
Spieltag-Erinnerung vor Tippschluss.

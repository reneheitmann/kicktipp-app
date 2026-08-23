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
| Mobile | `mobile` | **laufzeit-dynamisch** anhand der aktiven Instanz (siehe `src/lib/supabaseClient.ts`, `src/lib/secureStorage.ts`) | `mobile/`, native Shell |

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

## Sicherheitsarchitektur

### Secure Storage statt `@capacitor/preferences`

`@capacitor/preferences` ist nur einfaches UserDefaults (iOS) /
SharedPreferences (Android) – unverschlüsselt, nicht Keychain-/
Keystore-abgesichert. Für Supabase-Refresh-Tokens mehrerer gleichzeitig
gespeicherter Instanzen ungeeignet. Stattdessen
[`@aparajita/capacitor-secure-storage`](https://github.com/aparajita/capacitor-secure-storage)
(iOS Keychain / Android Keystore-verschlüsselte Ablage), siehe
`src/lib/secureStorage.ts`. Der Supabase-Client jeder Instanz bekommt darüber
ein eigenes `storage`-Adapter-Objekt (offiziell von supabase-js über die
`storage`-Option beim Client-Erzeugen unterstützt) mit explizit gesetztem
`storageKey` (nicht supabase-js' automatische Ableitung aus der Projekt-URL)
– so kann beim Entfernen einer Instanz gezielt genau deren gespeicherte
Zugangsdaten gelöscht werden, ohne die interne Schlüssel-Ableitung
nachzubauen.

### Nur `https://`, keine lokalen/privaten Adressen

Zwei Stellen, an denen die App selbst eine vom Nutzer bzw. von einer
Instanz-Antwort stammende URL abruft – dieselbe Prüfung
(`isValidInstanceUrl()` in `src/lib/instanceUrl.ts`) für beide:

- die vom Nutzer eingegebene Instanz-Domain (Instanz-Wähler, Phase 3),
- `supabase_url` aus einer `instance-info.json`-Antwort (siehe unten).

Nur `https://` – `http://` wäre eine unverschlüsselte Verbindung, über die
Zugangsdaten im Klartext liefen. Zusätzlich abgelehnt: eingebettetes
Userinfo (`user:pass@…`, klassisches Verwirrungsmuster) sowie
localhost/Loopback/private/link-local-Adressen (auch in hex-/oktal-
kodierter Form, z. B. `https://0x7f.0.0.1` – `new URL()` normalisiert das
automatisch auf `127.0.0.1`) – ohne diese Sperre könnte eine präparierte
Eingabe die App dazu bringen, gegen das eigene Gerät oder das lokale Netz
zu requesten (SSRF-artiges Muster). Keine legitime Instanz braucht eine
private/lokale Adresse, ein echtes Self-Hosting muss ohnehin öffentlich
erreichbar sein.

### `instance-info.json`-Validierung

Die Antwort einer neu hinzugefügten Instanz wird vor Übernahme gegen ein
festes Schema geprüft (`src/lib/instanceInfoSchema.ts`): Pflichtfelder
vorhanden, `supabase_url` selbst ebenfalls über `isValidInstanceUrl()`
geprüft (siehe oben). Bei Abweichung wird die Instanz nicht gespeichert,
sondern eine verständliche Fehlermeldung gezeigt – statt mit kaputten
Werten einen Supabase-Client zu initialisieren.

**Bewusste Grenze dieser Prüfung:** `supabase_url` wird NICHT gegen die
Instanz-Domain selbst abgeglichen (z. B. "muss dieselbe Domain/denselben
Origin haben") – das würde jede echte Instanz ablehnen, da ein
Supabase-Projekt praktisch immer auf einer anderen Domain liegt
(`*.supabase.co` oder eine eigene self-hosted Supabase-Adresse). Eine
kompromittierte oder falsch konfigurierte Instanz könnte daher grundsätzlich
eine `supabase_url` liefern, die auf ein völlig anderes, von ihr selbst
kontrolliertes Backend zeigt, statt das TLS-Vertrauen der Instanz-Domain an
ihr eigenes Supabase-Projekt weiterzugeben. Das ist keine Lücke, die sich
rein über Eingabevalidierung schließen lässt (siehe Vertrauensmodell unten)
– als Gegenmaßnahme zeigt der Instanz-Wähler (Phase 3) die aufgelöste
`supabase_url` **sichtbar vor dem Login** an, statt sie kommentarlos zu
übernehmen, damit dieser Schritt keine stille Entscheidung ist.

### Vertrauensmodell

Dasselbe wie bei jeder Multi-Server-App (Nextcloud, Mastodon, Matrix): wer
eine Instanz-Domain hinzufügt, vertraut deren Betreiber grundsätzlich – das
ist kein neues Risiko gegenüber der heutigen Web-Nutzung derselben Instanz,
nur jetzt für beliebige Instanzen statt nur der eigenen. Was diese
Vertrauensgrenze eng hält, ist die Entscheidung aus dem Architektur-
Abschnitt oben (kein Remote-Origin-Loading in der WebView) – eine
hinzugefügte Instanz bekommt dadurch ausschließlich Zugriff auf ihre
eigenen Daten über den Supabase-Client, nie auf die native Bridge oder auf
in der App gespeicherte Daten anderer Instanzen.

## Push-Benachrichtigungen (Backend)

Ein Absender für beide Plattformen: Firebase Cloud Messaging (HTTP-v1-API,
`supabase/functions/_shared/fcm.ts`) – iOS-APNs-Tokens lassen sich darüber
mit zustellen, sobald Firebase auf beiden Plattformen als Absender
eingerichtet ist (siehe Store-Checkliste unten). Braucht das neue
Function-Secret `FCM_SERVICE_ACCOUNT_JSON` (Inhalt der Firebase-Service-
Account-JSON-Datei), sonst nichts Neues – die DB-Anbindung läuft über die
Standard-Edge-Function-Umgebung (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`)
wie bei den bestehenden Mail-Functions.

Zwei Auslöser als Machbarkeitsnachweis, bewusst nicht mehr (siehe unten für
weitere Ideen):

1. **Neue Kontaktnachricht** – `send-contact-message` verschickt nach der
   E-Mail zusätzlich eine Push an alle aktiven Admins/Spielleiter mit
   registriertem Token.
2. **Abgeschlossene Spieltags-Gewinnberechnung** – `calculateMatchdayPayout()`
   (Client) ruft nach einem erfolgreichen `calculate_matchday_payout()`-Aufruf
   die neue Function `send-push-notification` auf.

`send-push-notification` nimmt bewusst **nur eine `matchday_id`** entgegen,
keinen freien Titel/Text/Empfängerkreis – ein authentifizierter Client
könnte damit sonst beliebigen Nutzern Push-Spam/Phishing-Inhalte schicken.
Empfänger und Nachrichtentext ermittelt die Function komplett selbst aus
der DB, nachdem sie serverseitig geprüft hat, dass für diesen Spieltag
tatsächlich `status = 'abgerechnet'` gilt (Beleg, dass die Berechnung
wirklich stattgefunden hat).

**Betriebs-Voraussetzung für die mobile App:** `ALLOWED_ORIGINS`
(Edge-Function-Secret, siehe `supabase/functions/_shared/cors.ts`) muss um
die Origin der nativen WebView ergänzt werden (Capacitor-Default:
`https://localhost`), sonst blockt die bestehende CORS-Prüfung jeden
Edge-Function-Aufruf aus der mobile App – betrifft nicht nur Push, sondern
alle Functions, die die mobile App aufruft.

## Weitere offene Auslöser (Push, nicht in Phase 5 umgesetzt)

Nur als Idee notiert, bewusst nicht in diesem Schritt angebunden:
Massenmail-Versand, Passwort-Reset-Anfrage, neue Saison angelegt,
Spieltag-Erinnerung vor Tippschluss.

## Tests

**Automatisiert:** Vitest-Unit-Tests für die neue Instanz-Config-Validierung
(`src/lib/instanceUrl.test.ts`, `src/lib/instanceInfoSchema.test.ts`) und den
Secure-Storage-Adapter (`src/lib/secureStorage.test.ts`, Plugin gemockt –
kein echtes Gerät nötig).

**Bewusste Lücke:** Die bestehende Playwright-E2E-Suite (`e2e/`) bleibt
**web-only**. Capacitors native WebView lässt sich damit nicht sinnvoll
testen (kein normaler Browser-Prozess, den Playwright ansteuern kann) –
keine neue Test-Infrastruktur dafür in diesem Schritt aufgebaut. Ein
späterer Ausbaupfad wäre Appium oder XCUITest/Espresso direkt, falls native
E2E-Abdeckung nötig wird.

**Manuelle Testmatrix** (mindestens einmal komplett durchzuspielen, bevor
eine Version in TestFlight/Play Internal Testing geht):

| Schritt | iOS (physisches Gerät) | Android (Gerät/Emulator) |
|---|---|---|
| App-Start, Instanz-Wähler erscheint | [ ] | [ ] |
| Instanz hinzufügen: `gewinnauswertung.magicprus.de` | [ ] | [ ] |
| Aufgelöste `supabase_url` wird vor dem Login angezeigt | [ ] | [ ] |
| Login gegen diese Instanz | [ ] | [ ] |
| Zweite, andere Instanz hinzufügen: "Kicktipp Dev"-Projekt | [ ] | [ ] |
| Instanz wechseln (Profil → "Instanz wechseln") | [ ] | [ ] |
| Login gegen die zweite Instanz | [ ] | [ ] |
| App-Neustart: zuletzt aktive Instanz bleibt aktiv (kein erneuter Login nötig) | [ ] | [ ] |
| Instanz entfernen (inkl. Zugangsdaten-Löschung, siehe Sicherheitsarchitektur) | [ ] | [ ] |
| Safe-Area (Notch/Home-Indicator bzw. Gestennavigation) sieht korrekt aus | [ ] | [ ] |
| Zurück-Taste/-Geste navigiert statt die App zu schließen | [ ] | [ ] |
| VoiceOver/TalkBack: Instanz-Wähler + Hinzufügen-Dialog bedienbar (Phase 8) | [ ] | [ ] |
| Push-Erklärung erscheint vor dem System-Dialog, nicht danach | [ ] | [ ] |
| Push bei neuer Kontaktnachricht kommt an, Tap navigiert zu `/kontakt` | [ ] | [ ] |
| Push bei abgeschlossener Gewinnberechnung kommt an, Tap navigiert zur Saison | [ ] | [ ] |

Wichtig: gegen **zwei echte, unterschiedliche Instanzen** durchspielen (nicht
nur theoretisch gegen eine einzige) – erst das prüft wirklich, dass Instanzen
sich nicht gegenseitig beeinflussen (Secure-Storage-Trennung, Instanz-Wechsel,
push_tokens pro Instanz).

## Versionierung

Native Store-Versionsnummern (Build-Nummer muss bei Apple/Google strikt
steigend sein) laufen **unabhängig** von der automatischen
`package.json`-Versions-Bump-Logik in `docker-publish.yml` – dort **nicht**
mit eingehängt. `mobile/package.json` wird eigenständig gepflegt, da
Store-Releases deutlich seltener als Web-Deploys sind (Review-Wartezeit bei
Apple/Google). Beim Anheben der Version zusätzlich in Xcode (`App` Target →
General → Version/Build) bzw. `mobile/android/app/build.gradle`
(`versionName`/`versionCode`) nachziehen – Capacitor generiert diese Werte
nicht automatisch aus `package.json`.

## Go-Live-Checkliste (Store-Vorbereitung)

Bewusst manuelle Schritte, analog zu `docs/go-live-checklist.md`. Für die
Punkte 2–8 siehe die ausführliche Schritt-für-Schritt-Anleitung in
`docs/mobile-store-setup.md` (konkrete Klickpfade in App Store Connect,
Play Console, Firebase Console, Supabase).

- [x] Apple-Developer-Account + Google-Play-Developer-Account anlegen (beide kostenpflichtig)
- [x] App-Icon/Splash-Screen-Assets erstellen (ein festes Set für die gesamte App, siehe Phase 3)
- [x] Apple "App Privacy"-Angaben und Google Play "Data Safety"-Formular ausfüllen (Push-Tokens, lokale Zugangsdaten-Speicherung als Datentypen angeben)
- [ ] Erste Version manuell über Xcode Organizer / Android Studio hochladen (Fastlane-Automatisierung erst als späterer Schritt, für den ersten Release nicht nötig)
- [ ] TestFlight- bzw. Play-Internal-Testing-Track mit dir selbst als erstem Tester einrichten, bevor ein öffentliches Review beantragt wird
- [ ] Firebase-Projekt für FCM anlegen, Server-Key als neues Supabase-Secret für `send-push-notification` hinterlegen
- [ ] `ALLOWED_ORIGINS` (Supabase Edge-Function-Secret) um die Capacitor-WebView-Origin (`https://localhost`) ergänzen, siehe Abschnitt "Push-Benachrichtigungen (Backend)" oben – sonst blockt CORS jeden Edge-Function-Aufruf aus der mobile App
- [ ] Echten Restore-/Manuell-Test gemäß der Testmatrix oben auf mindestens einem physischen iOS-Gerät und einem Android-Gerät/Emulator durchspielen, inkl. VoiceOver/TalkBack-Spotcheck (Phase 8 – in dieser Umgebung ohne physisches Gerät nicht möglich gewesen)

# Mobile App: Store-Vorbereitung – Schritt für Schritt

Ausführliche Anleitung zu den offenen Punkten aus `docs/mobile-app.md`,
Abschnitt "Go-Live-Checkliste (Store-Vorbereitung)" (Punkt 1,
Apple-/Google-Play-Developer-Accounts, ist bereits erledigt). Bewusst
manuelle Schritte, kein Code – wird nicht automatisch ausgeführt.

Referenzwerte aus der Implementierung: `appId` `de.magicprus.kicktipp`,
`appName` "Kicktipp Auswertung" (`mobile/capacitor.config.ts`), Prod/Beta-
Projekt-Ref `rmfvzbmxcwccnezqqnen`.

## 2. App-Icon/Splash-Screen-Assets

Ein festes Asset-Set für die gesamte App (nicht pro Instanz austauschbar,
siehe `docs/mobile-app.md` Phase 3).

1. Quellbilder erstellen: `icon.png` (1024×1024 px, PNG, **ohne**
   Transparenz/Alpha-Kanal – Apple lehnt Icons mit Alpha-Kanal ab) und
   `splash.png` (2732×2732 px, zentriertes Motiv, da auf verschiedenen
   Geräten unterschiedlich beschnitten wird).
2. Beide Dateien nach `mobile/assets/icon.png` und `mobile/assets/splash.png`
   legen.
3. Offizielles Capacitor-Tool installieren (Repo-Root):
   ```bash
   npm install --save-dev @capacitor/assets
   ```
4. Alle benötigten Größen für beide Plattformen generieren (aus `mobile/`):
   ```bash
   cd mobile && npx capacitor-assets generate
   ```
5. Danach synchronisieren: `npm run cap -- sync` (Repo-Root).

## 3. Apple "App Privacy" / Google Play "Data Safety"

✅ Erledigt (2026-08). Ablauf und tatsächlich gestellte Fragen dokumentiert,
inkl. der Abweichungen von der ursprünglichen Planung.

### Voraussetzungen

**Apple:** Bundle-ID `de.magicprus.kicktipp` zuerst im Apple Developer
Portal registrieren (Certificates, Identifiers & Profiles → Identifiers →
"+" → App IDs → App, Capability "Push Notifications" anhaken), danach in
App Store Connect (Meine Apps → "+" → Neue App) den App-Eintrag anlegen.

**Google Play:** App in der Play Console anlegen (Alle Apps → "App
erstellen"). **Anders als ursprünglich angenommen** ist der Paketname
mittlerweile **Pflichtfeld direkt beim Anlegen**, nicht erst beim ersten
AAB-Upload gebunden – dort ebenfalls exakt `de.magicprus.kicktipp`
eintragen. Der Paketname ist danach **permanent**, vor dem Speichern
genau prüfen.

### Formular-Fundort

App Store Connect → App → Reiter **"App-Datenschutz"**. Play Console → App
→ **"App-Inhalte"** → **"Datensicherheit"** (Navigation wechselt öfter –
am zuverlässigsten über die Dashboard-Aufgabenliste der App oder die
Suchfunktion oben in der Play Console finden).

### Datentypen (beide Formulare)

| Datentyp | Zweck | An Nutzerkonto gebunden | Tracking/Werbung |
|---|---|---|---|
| Kontaktdaten (Name, E-Mail) | App-Funktion (Anmeldung, Zuordnung) | Ja | Nein |
| Finanzdaten (Einsätze, Gewinne, Kontostände) | App-Funktion (Abrechnung der Spielrunde) | Ja | Nein |
| Kennungen (Push-Device-Token, bei Google zusätzlich Nutzer-IDs) | App-Funktion (Benachrichtigungen) | Ja | Nein |
| Diagnosedaten (Fehlerprotokolle) | App-Funktion (Fehleranalyse) | Ja | Nein |

Bei beiden Formularen: **kein** Tracking, **keine** Weitergabe an
Werbenetzwerke, **keine** Nutzung zu Analysezwecken über die App-Funktion
hinaus ankreuzen. Übertragung erfolgt verschlüsselt (HTTPS/TLS zu
Supabase). Datenlöschung ist über eine Kontolöschung durch die Spielleitung
möglich – bei Google Play als Lösch-Link die eigene `/datenschutz`-Seite
angeben (Löschungsweg steht dort bereits beschrieben). "Sitzungsspezifisch
verarbeitet" bzw. "ephemeral" bei jedem Datentyp mit **Nein** beantworten
(alles wird dauerhaft in der DB gespeichert). Kontoerstellung: **"Nutzername
und Passwort"** (E-Mail-Login, kein OAuth/SSO).

### Zusätzliche Google-Play-Schritte, die nicht in der ursprünglichen Planung standen

- **Zielgruppe und Inhalte** (App-Inhalte → separater Abschnitt, Google
  verlangt das vor dem Absenden der Datensicherheit): Zielgruppe nur
  **"18 und älter"**, "Richtet sich die App auch an Kinder?" → Nein, keine
  Werbung, kein Familienprogramm.
- **Altersfreigaben (IARC-Fragebogen):** Kategorie **"Alle anderen
  App-Typen"** (Hilfsprogramm/Tool, kein Spiel, keine Social-App). Fragen zu
  Standort-Teilen/digitalen Käufen/Geldauszahlungs-Integration/Browser/
  News&Bildung jeweils **Nein** – bei der Geldauszahlungs-Frage bewusste
  Abgrenzung: die App *verbucht* Auszahlungen, *führt* aber keine Zahlung
  selbst aus (kein Zahlungsdienstleister integriert), daher Nein statt Ja.
  Werbe-ID-Nutzung: Nein.
- **Anmeldedaten / App-Zugriff** (früher "App access"): **Ja**, App ist
  komplett hinter Login. Google braucht funktionierende Test-Zugangsdaten
  zur Überprüfung – dafür **kein** eigenes Admin-Konto herausgeben. Stattdessen
  einen dedizierten Test-Nutzer mit Rolle "Spieler" (nicht Spielleiter/Admin)
  über Admin → Nutzerverwaltung anlegen, ohne echte Finanzdaten, und dessen
  E-Mail/Passwort eintragen.
- **Online-Inhalte:** Ja – die App bindet auf der "Kicktipp"-Seite ein
  Live-Widget von kicktipp.de ein (dynamisch nachgeladener Drittanbieter-
  Inhalt, nicht Teil des ursprünglichen Downloads).

## 4. Erste Version manuell hochladen

**iOS (Xcode):**
1. `mobile/ios/App/App.xcodeproj` öffnen. Capacitor 8 nutzt standardmäßig
   **Swift Package Manager** statt CocoaPods – es gibt kein `Podfile` und
   kein `.xcworkspace` in diesem Projekt (anders als bei älteren
   Capacitor-Versionen/vielen älteren Anleitungen im Netz). Beim ersten
   Öffnen löst Xcode automatisch die Paket-Abhängigkeit
   `capacitor-swift-pm` auf ("Resolving Package Graph", braucht
   Internetverbindung, dauert beim ersten Mal etwas).
2. Projekt → Target "App" → Reiter "Signing & Capabilities" → eigenes
   Apple-Developer-Team auswählen.
3. Menü **Product → Archive**.
4. Im sich öffnenden **Organizer**: Archiv auswählen → **Distribute App**
   → **App Store Connect** → Upload.

**Android (Android Studio):**
1. `mobile/android` als Projekt öffnen.
2. Signing-Key erzeugen (einmalig): **Build → Generate Signed Bundle /
   APK** → **Android App Bundle** → **Create new...** → Keystore-Datei,
   Passwort und Alias festlegen, **sicher aufbewahren** (ohne diesen
   Schlüssel sind spätere Updates derselben App nicht mehr möglich).
3. Signiertes `.aab` erzeugen (Release-Build-Variante).
4. In der Play Console: App auswählen → **Produktion** (oder zunächst
   **Interner Test**, siehe Punkt 5) → **Neue Version erstellen** → `.aab`
   hochladen.

## 5. TestFlight / Play Internal Testing

**iOS:** App Store Connect → App → Reiter **TestFlight** → interne Tester
hinzufügen (deine eigene Apple-ID genügt) → nach dem Build-Processing
(einige Minuten) Einladung in der TestFlight-App auf dem Gerät annehmen.

**Android:** Play Console → App → **Testen → Interner Test** → Version aus
Punkt 4 zuordnen → unter "Tester" deine eigene E-Mail-Adresse eintragen →
den generierten Opt-in-Link öffnen und die App darüber installieren.

## 6. Firebase-Projekt für FCM

1. Neues Projekt in der [Firebase Console](https://console.firebase.google.com)
   anlegen.
2. **iOS-App hinzufügen**, Bundle-ID exakt `de.magicprus.kicktipp`.
   `GoogleService-Info.plist` herunterladen, in Xcode per Rechtsklick auf
   den Ordner `App` → "Add Files to App..." nach
   `mobile/ios/App/App/GoogleService-Info.plist` hinzufügen (Haken bei
   "Copy items if needed" setzen).
3. **Android-App hinzufügen**, derselbe Package-Name
   `de.magicprus.kicktipp`. `google-services.json` nach
   `mobile/android/app/google-services.json` legen.
4. **Wichtig, oft übersehen:** Android braucht zusätzlich das
   Google-Services-Gradle-Plugin, sonst wird `google-services.json`
   ignoriert:
   - `mobile/android/build.gradle`: im `buildscript`-Block
     `classpath 'com.google.gms:google-services:4.4.2'` (oder aktuelle
     Version) ergänzen.
   - `mobile/android/app/build.gradle`: ganz unten
     `apply plugin: 'com.google.gms.google-services'` ergänzen.
5. **iOS-Zustellung freischalten:** im Apple Developer Portal unter
   **Certificates, Identifiers & Profiles → Keys** einen neuen APNs-Auth-Key
   erzeugen (falls noch keiner existiert) und herunterladen. In der
   Firebase Console: **Projekteinstellungen → Cloud Messaging → Apple-App-
   Konfiguration** → diesen Schlüssel hochladen. Ohne diesen Schritt kann
   FCM keine Push-Nachrichten an iOS-Geräte zustellen, selbst wenn der
   Service-Account (Schritt 6) korrekt konfiguriert ist.
6. Dienstkonto-Schlüssel für das Backend erzeugen:
   **Projekteinstellungen → Dienstkonten → Neuen privaten Schlüssel
   generieren** (lädt eine JSON-Datei herunter).
7. Als Supabase-Secret setzen:
   ```bash
   supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat pfad/zur/datei.json)" --project-ref rmfvzbmxcwccnezqqnen
   ```
8. `npm run cap -- sync` ausführen, damit die neuen nativen Dateien in
   beide Plattform-Projekte übernommen werden.

## 7. `ALLOWED_ORIGINS` um die Capacitor-WebView-Origin ergänzen

⚠️ **`ALLOWED_ORIGINS` ist ein write-only Secret** (siehe
`supabase/functions/_shared/cors.ts`) – weder du noch diese Session können
den aktuell gesetzten Wert auslesen. Der Befehl unten **überschreibt** den
kompletten Wert, statt etwas anzuhängen. Die bereits bestehende(n)
Web-Origin(s) müssen daher im selben Befehl mit angegeben werden, sonst
bricht der Web-Zugriff (main/beta) sofort.

```bash
supabase secrets set ALLOWED_ORIGINS="https://gewinnauswertung.magicprus.de,https://localhost" --project-ref rmfvzbmxcwccnezqqnen
```

(`https://gewinnauswertung.magicprus.de` durch die tatsächliche
Produktions-Domain ersetzen, falls abweichend; `https://localhost` ist
Capacitors Standard-Origin für die native WebView auf beiden Plattformen.)

## 8. Echter Geräte-Test

Siehe die vollständige Testmatrix in `docs/mobile-app.md`, Abschnitt
"Tests" – mindestens ein physisches iOS-Gerät und ein Android-Gerät/
Emulator, gegen **zwei echte, unterschiedliche Instanzen**.

**iOS:** Gerät per USB anschließen, in Xcode oben als Build-Ziel auswählen,
▶ (Run). Bei der ersten Installation auf dem Gerät unter Einstellungen →
Allgemein → VPN & Geräteverwaltung dem Entwicklerprofil vertrauen.

**Android:** In den Geräte-Einstellungen "USB-Debugging" aktivieren
(Entwickleroptionen), Gerät per USB verbinden, in Android Studio als Ziel
auswählen, ▶ (Run).

Danach die Testmatrix-Zeilen aus `docs/mobile-app.md` der Reihe nach
durchspielen und abhaken.

## 9. Store-Texte, Store-Assets und App Review einreichen

**Store-Texte** (Name, Untertitel, Beschreibung, Keywords, Support-URL):
liegen mit exakten Zeichen-Limits pro Feld nicht im Repo, sondern in einem
Claude-Artefakt (bei Bedarf neu erzeugen lassen). Support-URL **muss** eine
echte, ohne Login erreichbare `https://`-Seite sein (Apple lehnt `mailto:`
ab) – verwendet wird `https://<domain>/impressum`, die dort bereits die
Kontakt-E-Mail zeigt.

**Store-Assets** (Screenshots, Play-Feature-Grafik, Play-Icon) liegen unter
`mobile/store-assets/` im Repo (`ios/screenshots/`, `ios/screenshots-ipad/`,
`play/screenshots/`, `play/feature-graphic.png`, `play/icon-512.png`) –
erzeugt per Playwright-Screenshot-Skript gegen die App im Dev-Kanal, mit
temporär auf den echten Produktionsnamen umbenanntem `app_settings.app_name`
(sofort danach zurückgesetzt) statt mit sichtbarem "DEV"-Branding. Exakte
Pflicht-Abmessungen laut Apples/Googles eigenen Fehlermeldungen (nicht
geraten – ein erster Versuch mit falscher iPhone-Größe wurde von Apple
zurückgewiesen): iPhone-Screenshots `1284×2778px`, iPad-Screenshots
`2048×2732px`, Play-Feature-Grafik `1024×500px`, Play-Screenshots
`1080×1920px`, Play-/App-Icon `512×512px`.

**App Review Information / Notes-Feld** (App Store Connect): Apple verlangt
dort App-Funktion/Zielgruppe, getestete Geräte, ein funktionierendes
Demo-Konto, genutzte externe Dienste, regionale Unterschiede und eine
Aussage zu regulierten Branchen/Drittmaterial. Wichtig, damit dieser Punkt
nicht erneut zu einer Ablehnung führt:

- Demo-Konto **nicht** gegen die geteilte Prod/Beta-Instanz, sondern gegen
  eine eigenständige, öffentlich erreichbare Instanz mit eigenem
  Supabase-Projekt (siehe `docs/unraid-deployment.md` Teil 7,
  Dev-Container) – vermeidet, echte Nutzerdaten für den Review offenzulegen.
- Die im Notes-Feld genannte Adresse **muss das vollständige Schema
  enthalten** (`https://<domain>`, nicht nur `<domain>`) – eine bloße
  Domain-Angabe hat real zu einer zweiten Ablehnung geführt ("We were
  unable to sign in", Guideline 2.1), siehe die Schema-Auto-Ergänzung in
  `docs/mobile-app.md` Abschnitt "Nur `https://`..." für die Code-seitige
  Gegenmaßnahme.
- Export-Compliance-Frage: Die App braucht **keine** Ausnahmegenehmigung –
  sie nutzt ausschließlich Standard-HTTPS-Transportverschlüsselung und die
  OS-Keychain/den OS-Keystore (siehe Sicherheitsarchitektur oben), fällt
  damit unter die übliche Exemption. `ITSAppUsesNonExemptEncryption=false`
  in `Info.plist` ist möglich, um die Rückfrage bei jedem Build zu
  überspringen, wurde bisher aber nicht ergänzt.

**Falls App Store Connect Metadaten-Felder (Beschreibung, Keywords,
Support-URL, Untertitel) gesperrt zeigt:** normal, sobald eine Version
"Bereit für Verkauf" ist – nur der Werbetext bleibt live editierbar. Über
**"+ Version oder Plattform"** eine neue Version anlegen (Metadaten-only
möglich, ohne neuen Build inhaltlich nötig – braucht aber trotzdem einen
neuen, noch nicht verwendeten Build zum Anhängen, siehe die
Marketing-Version-Regel in `docs/mobile-app.md` "Versionierung"), darin
sind die Felder wieder editierbar.

## 10. Android: Von geschlossenem Test zur Produktion

Google verlangt für **neue Personal-Developer-Accounts** vor jedem ersten
Produktions-Rollout: mindestens **12 Tester**, durchgehend **14 Tage** im
geschlossenen Test opted-in (Play Console → Dashboard bzw. **Produktion →
Zugriff auf die Produktion beantragen** zeigt den Fortschritt als
Checkliste).

1. Play Console → **Testing → Geschlossener Test** → Track anlegen (falls
   noch nicht vorhanden), `.aab` hochladen (siehe Punkt 4 oben).
2. Im Track → Tab **Tester** → Tester-Liste anlegen. Der **Opt-in-Link**
   folgt dem festen Muster `https://play.google.com/apps/testing/<appId>`
   (hier: `https://play.google.com/apps/testing/de.magicprus.kicktipp`) –
   **nicht** die normale Store-Seite (`.../store/apps/details?id=...`)
   verwenden, die zeigt Nicht-Testern während der geschlossenen Testphase
   nichts an.
3. Link an mind. 12 echte Personen schicken (z. B. die eigene
   Kicktipp-Runde), die müssen über den Link opt-in **und** die App über
   den Play-Store-Link installieren (kein APK-Sideload).
4. Nach 14 Tagen mit stabil mind. 12 opted-in Testern schaltet Google
   "Zugriff auf Produktion beantragen" frei.
5. Play Console → **Produktion** → **Neue Version erstellen** → bestehende
   Version aus dem geschlossenen Test übernehmen (oder neue `.aab`
   hochladen) → Rollout-Prozentsatz wählen → **Rollout starten**.

Der iOS-Install-Button (App-Store-Badge) sowie der Android-Opt-in-Link sind
auch in der App selbst hinterlegt: Hilfe-Seite (`src/pages/HelpPage.tsx`)
und Login-Seite (`src/features/auth/LoginPage.tsx`), Badge-Komponente unter
`src/components/ui/AppStoreBadge.tsx` – beide nur für Web-Besucher sichtbar
(`useMobileInstance()`-Gating), da innerhalb der bereits installierten
nativen App nicht relevant.

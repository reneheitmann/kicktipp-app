# Mobile App: Store-Vorbereitung – Schritt für Schritt

Ausführliche Anleitung zu den 7 offenen Punkten aus `docs/mobile-app.md`,
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

Formular-Fundort: App Store Connect → App auswählen → Reiter **"App-
Datenschutz"** ("App Privacy"). Play Console → App auswählen → **"App-
Inhalte"** → **"Datensicherheit"**.

Datentypen, die diese App tatsächlich erhebt (siehe `docs/mobile-app.md`
Abschnitt 13 und `supabase/migrations/`):

| Datentyp | Zweck | An Nutzerkonto gebunden | Tracking/Werbung |
|---|---|---|---|
| Kontaktdaten (Name, E-Mail) | App-Funktion (Anmeldung, Zuordnung) | Ja | Nein |
| Finanzdaten (Einsätze, Gewinne, Kontostände) | App-Funktion (Abrechnung der Spielrunde) | Ja | Nein |
| Kennungen (Push-Device-Token) | App-Funktion (Benachrichtigungen) | Ja | Nein |

Bei beiden Formularen: **kein** Tracking, **keine** Weitergabe an
Werbenetzwerke, **keine** Nutzung zu Analysezwecken über die App-Funktion
hinaus ankreuzen. Übertragung erfolgt verschlüsselt (HTTPS/TLS zu
Supabase). Datenlöschung ist über eine Kontolöschung durch die Spielleitung
möglich (bei Google Play ggf. zusätzlich einen Lösch-Kontaktweg angeben,
z. B. die E-Mail aus `/admin/legal`).

## 4. Erste Version manuell hochladen

**iOS (Xcode):**
1. `mobile/ios/App/App.xcworkspace` öffnen – **nicht** die `.xcodeproj`
   direkt (CocoaPods-Abhängigkeiten fehlen sonst).
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

---
name: Kicktipp Auswertung
description: Ruhiges Verwaltungstool für eine private Kicktipp-Tipprunde — Einsätze, Gewinne, Konten
colors:
  primary: "#b51a00"
  primary-hover: "#9f1700"
  ink: "#0f172a"
  ink-muted: "#64748b"
  border: "#e2e8f0"
  surface: "#ffffff"
  surface-subtle: "#f8fafc"
  surface-subtle-2: "#f1f5f9"
  positive: "#059669"
  positive-small: "#047857"
  positive-bg: "#ecfdf5"
  warning: "#b45309"
  warning-bg: "#fffbeb"
  negative: "#b91c1c"
  negative-bg: "#fef2f2"
typography:
  title:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  bodySmall:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-subtle-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.negative-bg}"
    textColor: "{colors.negative}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  badge:
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Kicktipp Auswertung

## 1. Overview

**Creative North Star: "Der Ruhige Kontoauszug"**

Dieses System ist bewusst so gestaltet, wie ein gut gemachter Kontoauszug
wirkt: nichts lenkt von den Zahlen ab, jede Fläche hat einen klaren Zweck,
und die einzige Farbe, die sich Aufmerksamkeit nimmt, ist die Primärfarbe —
sparsam auf Buttons und aktive Navigation begrenzt. Es gibt keine Hero-
Bereiche, keine Marketing-Sprache, keine Dekoration, die nicht auch eine
Funktion trägt. Für eine private Tippgemeinschaft mit gemischt
technikaffinen Nutzern (auch Eltern, auch am Handy) muss die Oberfläche auf
den ersten Blick verständlich sein, nicht beeindruckend.

Das System lehnt explizit ab, was PRODUCT.md als Anti-Referenz nennt:
typisches SaaS-Marketing-Design (Gradient-Hero, große Claims, Feature-
Grids) und einen verspielten Consumer-App-Look. Es bleibt näher an
Banking-/Buchhaltungs-Software als an einer Landingpage.

**Key Characteristics:**
- Eine einzige Akzentfarbe, sparsam eingesetzt (Buttons, aktive Navigation)
- Flächen über Rand + Weißraum definiert, nicht über Schatten
- Ein einziger Schriftschnitt (system-ui-Stack), Hierarchie über Größe/Gewicht statt Font-Wechsel
- Karten als wiederkehrendes, immer gleiches Grundmuster
- Semantische Statusfarben (Grün/Amber/Rot) ausschließlich für Geld-Zustände, nie dekorativ

## 2. Colors

Eine zurückhaltende Neutralpalette (Slate) trägt fast die gesamte
Oberfläche; Farbe wird nur dort eingesetzt, wo sie eine Bedeutung trägt
(Aktion, Status, Marke).

### Primary
- **Gedecktes Ziegelrot** (`#b51a00`): Primär-Buttons, aktive Navigation
  (Sidebar/Mobile-Menü). Zur Laufzeit unter Admin → Erscheinungsbild
  konfigurierbar (`--color-primary` / `--color-primary-hover` CSS-Variablen,
  siehe `src/index.css` und `AppBrandingProvider`); der hier dokumentierte
  Wert ist der aktuell eingestellte, nicht zwingend der Code-Default
  (`#0f172a`, identisch mit der Ink-Farbe, greift nur bis ein Admin etwas
  anderes wählt).
- **Gedecktes Ziegelrot, dunkel** (`#9f1700`): Hover-Zustand von
  Primär-Elementen.

### Neutral
- **Tinte** (`#0f172a`, Tailwind `slate-900`): Haupttext, Überschriften,
  Eingabefeld-Fokusrand (bewusst unabhängig von der Primärfarbe, siehe
  Named Rule unten).
- **Tinte, gedämpft** (`#64748b`, `slate-500`): jeder gedämpfte Text
  (Sekundärtext, Beschreibungen, Zeitstempel, Platzhalter, Hilfstexte,
  "Keine Treffer"-Meldungen) — die einzige gedämpfte Textstufe im System.
  `slate-400` wird für Text nicht mehr verwendet: es unterschreitet mit
  2,56:1 sogar die 3:1-Schwelle für große Texte (Audit-Fund, behoben).
- **Rand** (`#e2e8f0`, `slate-200`): Kartenrahmen, Listentrenner.
- **Fläche** (`#ffffff`): Kartenhintergrund, Modal-Hintergrund.
- **Fläche, gedämpft** (`#f8fafc` / `#f1f5f9`, `slate-50`/`slate-100`):
  Hover-Zustand auf Listenzeilen und sekundären Buttons.

### Status (nur für Geld-/Zustandsanzeigen)
- **Guthaben-Grün** (`#059669`, `emerald-600`): ausschließlich für große,
  fette Headline-Beträge (`text-lg`/`text-xl` + `font-semibold`, z. B. "Mein
  Konto"-Salden) — dort reicht die 3:1-Schwelle für große Texte.
- **Guthaben-Grün, klein** (`#047857`, `emerald-700`): dieselbe Bedeutung bei
  normaler Textgröße (Tabellenzellen, `text-sm`-Badges, Listenzeilen) —
  `emerald-600` unterschreitet dort mit 3,77:1 die 4,5:1-Schwelle für
  normalen Text (Audit-Fund, behoben). Faustregel: groß+fett → `emerald-600`,
  alles andere → `emerald-700`.
- **Offen-Amber** (`#b45309` Text / `#fffbeb` Fläche, `amber-700/50`):
  offene Beträge, Warnungen — bereits bei jeder Textgröße AA-konform (5,02:1).
- **Fehler-Rot** (`#b91c1c` Text / `#fef2f2` Fläche, `red-700/50`):
  Löschen-Aktionen, Fehlermeldungen — ebenfalls bei jeder Textgröße
  AA-konform (6,47:1).

### Named Rules
**The One Accent Rule.** Die Primärfarbe erscheint ausschließlich auf
Primär-Buttons und der aktiven Navigation. Nirgendwo sonst — keine farbigen
Icons, keine farbigen Überschriften, keine farbigen Ränder als Deko.

**The Focus-Stays-Neutral Rule.** Eingabefelder fokussieren immer mit
`slate-900`-Rand (`focus:border-slate-900`, 84 Vorkommen im Code), nicht mit
der konfigurierbaren Primärfarbe. Das hält Formulare lesbar, egal welche
Primärfarbe ein Admin wählt (manche Primärfarben wären als Fokusring zu
grell oder zu kontrastarm).

**The 4.5:1 Rule.** Jede Textfarbe muss gegen ihren Hintergrund WCAG AA
erreichen: 4,5:1 bei normaler Textgröße, 3:1 erst ab `text-lg`/`18px` +
`font-semibold` oder größer. Vor dem Einsatz einer neuen Textfarbe den
Kontrast rechnen, nicht schätzen — `slate-400` als Textfarbe und
`emerald-600` bei kleiner Schrift waren beide ein Fehlschluss aus "sieht auf
den ersten Blick lesbar aus".

## 3. Typography

**Body/Display Font:** `system-ui, 'Segoe UI', Roboto, sans-serif` (ein
einziger Schriftschnitt für die gesamte App, kein zweiter für Überschriften).

**Character:** Neutral, plattformnativ, unauffällig — die Schrift soll auf
jedem Gerät sofort vertraut wirken, nicht "gestaltet". Hierarchie entsteht
über Größe und Gewicht, nicht über Font-Wechsel.

### Hierarchy
- **Title** (600, 1.25rem/20px, 1.4): Seitenüberschriften (`h1`), z. B.
  "Willkommen, {Name}", "Spieler", "Saison".
- **Body** (400, 1rem/16px, 1.5): Formulareingaben, primärer Fließtext,
  Button-Beschriftungen bei größeren Buttons.
- **Body Small** (400, 0.875rem/14px, 1.5): Sekundärtext, Tabellenzellen,
  Kartenbeschreibungen — der mit Abstand am häufigsten verwendete Textstil.
- **Label** (500, 0.75rem/12px, 1.4): Badges, Formular-Labels, Captions,
  Hilfstexte unter Eingabefeldern.

### Named Rules
**The No-Display-Font Rule.** Es gibt keine "Hero"-Typografie. Auch die
größte Überschrift (`text-xl`, 20px) bleibt klein gegenüber typischen
Marketing-Displaygrößen — konsequent, weil das System kein Aufmerksamkeit
heischendes Brand-Erlebnis sein soll, sondern ein Arbeitswerkzeug.

## 4. Elevation

Das System ist heute bewusst flach: Karten und Listen grenzen sich über
`border` + `bg-white` gegen den `slate-50`-Seitenhintergrund ab, nicht über
Schatten. Die einzige Ausnahme ist das Modal (`shadow-xl`), weil es
tatsächlich über anderem Inhalt schwebt. Zwei Erweiterungen sind als
nächste Schritte vorgesehen (siehe Do's unten): ein leichter Hover-Schatten
auf Karten war eine Option, stattdessen priorisiert das Team eine stärkere
Schatten-Hierarchie für zentrale Elemente (z. B. Salden-Karten), um sie
gegenüber Nebeninhalten abzuheben.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
  Tailwind `shadow-xl`): einzig für das Modal, das tatsächlich über anderem
  Inhalt liegt.
- **Betont** (geplant, noch nicht implementiert): ein sichtbar stärkerer
  Schatten für Elemente mit hoher Priorität (z. B. die "Mein Konto"-Karte
  auf dem Dashboard), um sie klar von gleich aussehenden Nebenkarten
  abzuheben, ohne die grundsätzliche Flachheit des restlichen Systems
  aufzugeben.

### Named Rules
**The Flat-By-Default Rule.** Flächen sind im Ruhezustand schattenlos.
Schatten sind die Ausnahme für Elemente, die entweder wirklich schweben
(Modal) oder bewusst gegenüber Nebeninhalt hervorgehoben werden sollen
(geplante "Betont"-Stufe), nicht die Standard-Behandlung jeder Karte.

## 5. Components

Zurückhaltend und präzise: klare Kästen, dezente Radien, keine Verspieltheit.

### Buttons
- **Shape:** `rounded-lg` (8px).
- **Primary:** `bg-[var(--color-primary)]` / Text Weiß, `px-4 py-2.5`,
  `text-sm font-medium`.
- **Secondary:** `bg-slate-100` / Text `slate-900`, gleiche Maße.
- **Danger:** `bg-red-50` / Text `red-700`, gleiche Maße.
- **Hover / Focus:** Primary → `hover:bg-[var(--color-primary-hover)]`;
  Secondary → `hover:bg-slate-200`; Danger → `hover:bg-red-100`. Alle
  Varianten: `active:scale-[0.99]` als taktiles Klick-Feedback,
  `disabled:opacity-50`.

### Badges
- **Style:** `rounded-full`, `px-2.5 py-1`, `text-xs font-medium`.
- **State/Tone:** `neutral` (slate), `positive` (emerald), `warning`
  (amber), `negative` (red) — ausschließlich für Status (Saison-/Spieltag-
  Status, Rollen), nie dekorativ.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px).
- **Background:** `bg-white` gegen den `slate-50`-Seitenhintergrund.
- **Shadow Strategy:** keiner im Ruhezustand (siehe Elevation).
- **Border:** `border border-slate-200`.
- **Internal Padding:** `p-4` (16px) — mit Abstand häufigstes Muster (38
  Vorkommen), Standard für jede Karte in der App.

### Inputs / Fields
- **Style:** `rounded-lg border border-slate-300`, `px-3 py-2`,
  `text-base`.
- **Focus:** `focus:border-slate-900 focus:outline-none` (siehe Named Rule
  "The Focus-Stays-Neutral Rule" in Abschnitt 2) — bewusst nicht die
  konfigurierbare Primärfarbe.
- **Touch-Targets:** alle interaktiven Elemente (`button`, `a`, `input`,
  `select`, `textarea`) mindestens 44px hoch (`min-height: 44px` global in
  `src/index.css`), passend zur gemischten, auch mobilen Nutzerbasis.

### Navigation
- **Desktop:** feste Sidebar links, aktiver Eintrag mit
  `bg-[var(--color-primary)] text-white`, inaktive Einträge
  `text-slate-700 hover:bg-slate-100`.
- **Mobile:** Hamburger-Menü als verankertes Dropdown direkt unter dem
  Header (kein Bottom-Sheet), gleiche Aktiv-/Hover-Farblogik wie Desktop.

## 6. Do's and Don'ts

### Do:
- **Do** die Primärfarbe ausschließlich auf Primär-Buttons und aktiver
  Navigation verwenden (The One Accent Rule).
- **Do** jede Karte mit `rounded-xl border border-slate-200 bg-white p-4`
  aufbauen, statt pro Seite ein neues Kartenmuster zu erfinden.
- **Do** Status ausschließlich über die drei semantischen Farben
  (Grün/Amber/Rot) transportieren, nie über zusätzliche Deko-Farben.
- **Do** Eingabefelder mit `focus:border-slate-900` fokussieren, unabhängig
  von der eingestellten Primärfarbe.
- **Do** alle interaktiven Elemente mindestens 44px hoch **und breit** halten
  (Touch-Target) — auch reine Icon-/Glyph-Buttons wie Favoriten-Sterne.
- **Do** vor jeder neuen Textfarbe den Kontrast gegen ihren Hintergrund
  nachrechnen (The 4.5:1 Rule), statt es nach Augenmaß zu entscheiden.

### Don't:
- **Don't** Gradient-Hero-Bereiche, große Marketing-Claims oder
  Feature-Grids einbauen — kein SaaS-Marketing-Design (PRODUCT.md
  Anti-Referenz).
- **Don't** einen verspielten Consumer-App-Look anstreben — das System
  bleibt näher an Banking-/Buchhaltungssoftware.
- **Don't** `border-left`/`border-right` größer als 1px als farbigen Akzent
  auf Karten oder Listenzeilen verwenden.
- **Don't** Schatten als Standard-Zustand jeder Karte einsetzen — Schatten
  bleiben die Ausnahme (Modal, künftig: bewusst hervorgehobene Elemente).
- **Don't** eine zweite Schriftart für Überschriften einführen — Hierarchie
  entsteht über Größe/Gewicht, nicht über Font-Wechsel.
- **Don't** `text-slate-400` für Text verwenden (2,56:1, verfehlt WCAG AA).
- **Don't** `text-emerald-600` bei normaler Textgröße verwenden (3,77:1,
  verfehlt 4,5:1) — nur ab `text-lg font-semibold` oder größer zulässig.

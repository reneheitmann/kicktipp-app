---
target: AppSettingsPage (src/features/app-settings/AppSettingsPage.tsx)
total_score: 25
p0_count: 1
p1_count: 2
timestamp: 2026-07-03T10-45-34Z
slug: src-features-app-settings-appsettingspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | No live preview of pending color/name change anywhere outside the form (verified: Speichern button stayed old color after typing a new hex) |
| 2 | Match System / Real World | 3/4 | — |
| 3 | User Control and Freedom | 2/4 | "Zurücksetzen auf Standard" resets to hardcoded factory default, not to "last saved" |
| 4 | Consistency and Standards | 3/4 | Native "Choose File" text breaks the single-system look |
| 5 | Error Prevention | 0/4 | Selecting an icon file is destructive and irreversible **before** Speichern is ever clicked |
| 6 | Recognition Rather Than Recall | 4/4 | Current name/icon/color all pre-filled and shown |
| 7 | Flexibility and Efficiency | 3/4 | — |
| 8 | Aesthetic and Minimalist Design | 4/4 | — |
| 9 | Error Recovery | 1/4 | Generic banner only; the icon overwrite has no recovery path at all |
| 10 | Help and Documentation | 3/4 | Docker-icon caveat caption is genuinely helpful |
| **Total** | | **25/40** | **Acceptable — dragged down by a genuine data-loss bug** |

## Anti-Patterns Verdict
**LLM: PASS.** The Docker/Unraid-icon-is-separate caption is precise, domain-aware copy, not template filler. The icon-upload issue below reads as an oversight in an otherwise deliberate implementation. **Detector**: CLI clean (0).

## Overall Impression
This page has the single most serious finding across the entire session: choosing a new icon file **permanently overwrites the live app icon in shared storage the instant it's selected** — before Speichern is clicked, before the admin has seen a preview, with zero confirmation and no recovery path.

## What's Working
- Caption clarifying the Docker/Unraid container icon is a separate, code-deployed asset unaffected by this upload — heads off a predictable support question.
- "Zurücksetzen auf Standard" as a concept (quick path to a known-good state) is the right instinct for a rarely-touched page.
- Clean single-form layout keeps three different control types (text, file, color) visually coherent.

## Priority Issues

**[P0] Icon upload destructively overwrites the live icon file the instant a file is chosen, before Save.** `uploadAppIcon` uploads to a fixed storage path (`icon.<ext>`) with `{ upsert: true }` — the previous icon is permanently gone the moment the file input fires, not when Speichern is clicked. The Save/Cancel mental model the rest of the form implies is silently false for this one control, with zero confirmation and no way to recover the old icon short of a manual re-upload. **Fix**: upload to a temp path and only promote it to the live path inside `saveAppSettings`, alongside name/color. → `/impeccable harden`

**[P1] No live preview of pending color/name change anywhere outside the form** (sidebar nav, primary buttons) — since this color is used app-wide, admins are forced to save-and-look, possibly save-again-to-fix. → `/impeccable clarify`

**[P1] "Zurücksetzen auf Standard" resets to factory defaults, not last-saved values** — confirmed live: clicking it changed the app-name field to "Kicktipp Spielrunde" even though the actually-saved name is "Kicktipp Auswertung." The label easily reads as "undo my changes" when it means "erase to factory state," sitting next to a Speichern button styled identically to every other page's safe Speichern. → `/impeccable clarify`

**[P3] Native unstyled "Choose File / No file chosen" text breaks the single-visual-system rule.** → `/impeccable adapt`

## Persona Red Flags
- **Alex (power-admin)**: wants to try a new brand color and see it before committing for the whole family group — today requires saving blind and fixing after the fact if it looks wrong live.
- **Jordan (first-timer)**: the icon-upload trap is exactly a first-timer's failure mode — clicking "Choose File" just to see what happens already destroys the old icon before any intent to change it was formed.

## Minor Observations
- The hex `<input>` has no `id`/`<label>` of its own — only contextually associated with "Primärfarbe" via proximity.
- No aria-live on success/error banners here either, consistent with EmailSettingsPage.
- The reset-defaults hex (#0f172a) is identical to DESIGN.md's `ink` text color — "Standard" undersells how drastic that look-change actually is.

## Questions to Consider
- If Speichern exists so admins can review before committing, why does the icon field get to skip that model entirely and act as its own silent, instant save?

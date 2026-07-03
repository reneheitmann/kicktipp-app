---
target: TipperImportPage (src/features/kicktipp-import/TipperImportPage.tsx)
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-22-42Z
slug: src-features-kicktipp-import-tipperimportpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Running/done text with progress counter present |
| 2 | Match System / Real World | 4/4 | Matches Kicktipp's own "Tipperliste" export terminology |
| 3 | User Control and Freedom | 3/4 | Per-row inclusion fully overridable before commit |
| 4 | Consistency and Standards | 4/4 | Cards/buttons/badges match the system |
| 5 | Error Prevention | 2/4 | The single most consequential toggle (bulk real emails) styled identically to an ordinary setting, no warning color |
| 6 | Recognition Rather Than Recall | 3/4 | Row list clearly labels Neuer Spieler / existiert bereits / +Login |
| 7 | Flexibility and Efficiency | 3/4 | — |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean |
| 9 | Error Recovery | 3/4 | Per-row error messages structurally sound (not tested under failure) |
| 10 | Help and Documentation | 3/4 | Invite-email explanation is unusually good UX writing for a warning |
| **Total** | | **32/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Classification logic handles real edge cases (existing player/login, email present/absent) with copy that explains consequences specifically, not generically. **Detector**: CLI clean (0).

## Overall Impression
The highest-stakes page tested this batch (can create real accounts and send real emails) mostly earns trust through careful copy — but the one irreversible, bulk, external-facing action gets no elevated visual treatment or confirmation step matching its actual risk.

## What's Working
- Invite-email warning copy is the best UX writing found across the batch — specific about consequences, offers a safe alternative ("Passwort-Reset später").
- Auto-detected "already exists, will be skipped" classification prevents accidental duplicates without manual checking.
- "Send invite emails" toggle only appears once "create logins" is enabled — correct progressive disclosure.

## Priority Issues

**[P1] Row checkboxes: same unlabeled 20×20px hit-target issue as ImportPage** — inconsistent with this same page's own two settings toggles just above, which correctly `<label>`-wrap for a full click target. → `/impeccable harden`

**[P2] The most consequential toggle uses no warning-color treatment** — DESIGN.md explicitly reserves amber for exactly this purpose, but "sende Passwort-Einrichtungs-E-Mail" (real, bulk, unrecoverable emails) sits in a plain white card, identical styling to the low-stakes "create logins" toggle above it. → `/impeccable clarify`

**[P3] No confirmation step before an irreversible, bulk, external-facing action** — static read of `handleImport` confirms one click with both toggles on immediately creates accounts and sends emails, no "this will email N people" checkpoint. → `/impeccable harden`

## Persona Red Flags
- **Alex (power-admin)**: exactly the user who'll batch-process a big tipper list quickly; lack of confirm/warning-color on the email toggle is how a routine bulk operation becomes an accidental mass-email incident.
- **Sam (screen reader/keyboard)**: same unlabeled-checkbox issue as ImportPage, worse here since the consequence of misjudging a row is "this person gets a real account/email."

## Minor Observations
- Row checkbox size (20×20) traces to a global `min-height: 0` exemption for all checkboxes/radios in `src/index.css` — a deliberate, app-wide decision, not a one-off oversight (see cross-page note on ImportPage's critique).
- "0 übersprungen (bereits vorhanden)" phrasing is clear, better than ImportPage's equivalent summary line.
- `text-blue-700` reappears here too — same undocumented-color note as ImportPage.

## Questions to Consider
- Should "Import übernehmen" require a typed count confirmation ("Ja, N E-Mails senden") given it can send real emails?
- Is the blanket checkbox touch-target exemption intentional forever, or should list-row checkboxes specifically get a wrapped, larger tap target?

---
target: SeasonRankingPage (src/features/seasons/SeasonRankingPage.tsx)
total_score: 30
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-11-07Z
slug: src-features-seasons-seasonrankingpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | abgerechnet/pending Badge and busy-state labels communicate state well |
| 2 | Match System / Real World | 4/4 | "Platz", "Gesamtwertung", "Gewinnberechnung" match domain exactly |
| 3 | User Control and Freedom | 2/4 | Rank-clear is a silent async call with no undo; destructive reset uses native confirm() |
| 4 | Consistency and Standards | 4/4 | Reuses identical card/list/badge system as other pages |
| 5 | Error Prevention | 3/4 | Rank input validates positive integers with inline error |
| 6 | Recognition Rather Than Recall | 3/4 | Payouts appear inline next to each name once calculated |
| 7 | Flexibility and Efficiency | 2/4 | No bulk-entry path for ~84 participants; one blur-triggered call per row |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean, restrained |
| 9 | Error Recovery | 2/4 | Single shared error line, no per-row targeting across 84 rows |
| 10 | Help and Documentation | 3/4 | Tie-handling instructional copy is genuinely useful domain guidance |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Thin, honest wrapper around a shared RankingsSection — no reinvented pattern. The Gleichstand (tie) instructional copy is real domain thinking, not filler. **Detector**: CLI clean (0).

## Overall Impression
Confident and calm for an admin working through 84 rows — rank-entry-triggers-resort gives satisfying correct feedback. The one real risk is the destructive reset button sitting too close to a harmless import link, guarded only by a native browser dialog.

## What's Working
- Tie-handling copy ("zwei Spieler auf Platz 1, danach weiter mit Platz 3...") prevents real support requests — worth protecting in any redesign.
- List rows hold full player names and consistent height on both desktop and mobile — no truncation problem here.
- Full keyboard tab order verified live from skip link through sidebar with visible focus rings throughout.

## Priority Issues

**[P1] Destructive reset sits directly beside a harmless navigation link** with minimal separation ("Platzierungen importieren →" and "Platzierungen & Gewinne zurücksetzen" share one flex row) — the native confirm() dialog is the only guard between a mistap and zeroing a season's payouts. Fix: more visual distance, or route through the app's own ConfirmDialog for consistency and a clearer stop. → `/impeccable layout`

**[P2] Rank validation errors have no per-row association** — with 84 rows, a validation failure renders once above the whole list with no visual flag on the offending row. → `/impeccable clarify`

**[P3] No bulk-entry path for large rosters on this page itself** — 84 blur-triggered network calls for a full manual entry (separate Kicktipp import presumably covers the common case). → `/impeccable optimize`

## Persona Red Flags
- **Alex (power-admin)**: managing a real 20-30-person season-end payout, the reset-button proximity plus native confirm() is exactly the setup for a "did I just wipe the season?" moment during late-night entry.
- **Riley (stress-tester)**: rapid blur-tabbing through rank inputs risks unintentionally triggering "empty → remove ranking" on skipped fields.

## Minor Observations
- Badge tone for gesamtwertung_status only distinguishes "abgerechnet" from everything else as amber — worth confirming that's the full intended status set.
- Focus style on rank input correctly follows "The Focus-Stays-Neutral Rule" (slate-900 border, not the configurable primary color).
- Lower ranks with no payout show blank space rather than an explicit "–" or "0,00 €" — reads as slightly unfinished.

## Questions to Consider
- Is manual entry on this page actually a supported workflow at 84 rows, or purely a fallback for the Kicktipp import — should the page say so explicitly?

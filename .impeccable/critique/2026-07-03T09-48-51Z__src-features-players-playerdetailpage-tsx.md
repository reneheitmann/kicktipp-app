---
target: PlayerDetailPage (src/features/players/PlayerDetailPage.tsx)
total_score: 22
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T09-48-51Z
slug: src-features-players-playerdetailpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Same plain-text loading as SeasonsPage; filter changes update instantly and correctly (confirmed live) |
| 2 | Match System / Real World | 4/4 | Visible arithmetic breakdown under the Guthaben card pre-answers "how was this calculated" |
| 3 | User Control and Freedom | 1/4 | "← Alle Spieler" link only renders for players.manage — a regular participant arriving via Dashboard/Mein-Profil has zero in-page way back |
| 4 | Consistency and Standards | 2/4 | Visual pattern consistent, but Zahlung deletion uses native `confirm()` despite the app's own ConfirmDialog existing specifically to replace that |
| 5 | Error Prevention | 2/4 | Confirm-before-delete works, just via the jarring native dialog |
| 6 | Recognition Rather Than Recall | 4/4 | Balance breakdown, filter, and Zahlungen list all directly visible |
| 7 | Flexibility and Efficiency | 1/4 | "Saldo übertragen" only appears once filtered to a specific season with nonzero balance — no hint that filtering unlocks it |
| 8 | Aesthetic and Minimalist Design | 3/4 | Good density, no clutter |
| 9 | Error Recovery | 1/4 | Generic red text, no retry |
| 10 | Help and Documentation | 2/4 | The inline breakdown formula is informal contextual help; no explanation of "Korrektur/Übertrag" |
| **Total** | | **22/40** | **Acceptable** |

## Anti-Patterns Verdict
**LLM: PASS.** The visible arithmetic breakdown is the strongest anti-slop signal across all pages tested so far — it shows its work instead of just asserting a total. **Detector**: CLI clean (0). Live browser evidence unavailable for this specific page this round (permission-layer blocked a retry after a player-ID-discovery bug cost the first session; CLI scan alone confirms no static anti-patterns).

## Overall Impression
The highest-stakes page tested in this batch (literally "how much money do I have/owe"), and it does the best emotional work of the three via the transparent formula. But it has the session's most serious heuristic-3 violation: a regular participant can land here with zero way back.

## What's Working
- The visible arithmetic breakdown line operationalizes the "ruhiger Kontoauszug" north star rather than just imitating it visually.
- Correct, rule-following status-color usage (emerald-600 only at ≥text-lg font-semibold, emerald-700 otherwise) — precisely follows DESIGN.md's documented contrast rule.
- Season filter is a plain native `<select>`, fully keyboard/screen-reader operable for free.

## Priority Issues

**[P1] No return path for non-admin users** — anyone arriving via Dashboard's balance card or "Meine Spieler" hits a dead end except the browser back button. Directly contradicts Nielsen heuristic 3, hits exactly the "low-tech parent" persona PRODUCT.md names. Fix: render a back link for all users, not gated behind players.manage. → `/impeccable clarify`

**[P2] "Saldo übertragen" is an undiscoverable hidden feature** — only appears after filtering to a specific season with nonzero balance, no affordance signaling the precondition. → `/impeccable clarify`

**[P2] Zahlung deletion uses native `window.confirm()`** instead of the app's own ConfirmDialog, which exists specifically to replace this pattern (already applied to SeasonDetailPage/SeasonParticipantsSection this session). → `/impeccable audit` then apply ConfirmDialog

**[P3] No actionable guidance when balance is "Noch offen"** — states the fact, no next step. → `/impeccable clarify`

## Persona Red Flags
- **Low-tech parent**: clicks their name from Dashboard, sees balance clearly, but has no page-level cue for "where am I / how do I leave" if they arrived without admin rights.
- **Sam (screen reader/keyboard)**: native confirm() for Zahlung deletion is a jarring context switch away from the app's own accessible Modal pattern used elsewhere.

## Minor Observations
- Mobile: Zahlungen note text truncates with no way to see the full note.
- `Kicktipp: {player.kicktipp_name || '—'}` ties the app back to players' actual Kicktipp identity — good touch.

## Questions to Consider
- If "Saldo übertragen" only makes sense with a season selected, should the page pre-select the most recent season instead of "Alle Saisons"?

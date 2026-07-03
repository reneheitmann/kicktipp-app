---
target: AccountsOverviewPage (src/features/players/AccountsOverviewPage.tsx)
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-10-29Z
slug: src-features-players-accountsoverviewpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | "Lade..." bare text loading, no skeleton; sort arrows clear |
| 2 | Match System / Real World | 4/4 | Exactly the vocabulary a German Tippgemeinschaft uses |
| 3 | User Control and Freedom | 1/4 | Zahlung modal cannot be closed via Escape or backdrop click (verified live) |
| 4 | Consistency and Standards | 4/4 | Table/badge/card patterns match DESIGN.md exactly |
| 5 | Error Prevention | 3/4 | No destructive actions on this page itself |
| 6 | Recognition Rather Than Recall | 2/4 | Mobile: Status column (the page's whole purpose) is scrolled off-screen by default |
| 7 | Flexibility and Efficiency | 3/4 | Sort/search work well, instant |
| 8 | Aesthetic and Minimalist Design | 4/4 | Genuinely minimal, "ruhiger Kontoauszug" achieved |
| 9 | Error Recovery | 2/4 | Plain red text, no retry affordance |
| 10 | Help and Documentation | 3/4 | Correctly omitted for this register |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Restrained, functional table, no decorative cruft. One mild tell: the "swipe left" hint patches over a layout problem rather than fixing it. **Detector**: CLI clean (0).

## Overall Impression
Calm and legible on desktop, a real bank-statement feel. On mobile, the page withholds the one answer a low-tech parent opens it for (do I owe money?) behind an undiscovered horizontal swipe.

## What's Working
- 44px touch-target rule is actually honored here (measured 69-85px rows, 44px buttons) — the systemic checkbox-row issue found elsewhere does not recur.
- Status color logic is textbook-correct per DESIGN.md (amber/emerald-700/slate).
- Zahlung modal opens pre-scoped to the clicked player and active season filter.

## Priority Issues

**[P1] Mobile hides the page's core content** — only Spieler/Beiträge/Eingezahlt visible on 390px; Gewinne, Status (the entire reason this page exists per PRODUCT.md), and "+ Zahlung" are off-screen behind an undiscovered horizontal scroll. Directly contradicts "Mobile gleichwertig." Fix: reorder Status to column 2, or collapse secondary columns into an expandable row on narrow viewports. → `/impeccable adapt`

**[P2] Modal cannot be dismissed by Escape or backdrop click** — verified live, reproduces on the shared `Modal.tsx` component (also found on MatchdayDetailPage — one fix repairs every modal in the app). → `/impeccable harden`

**[P3] Loading state is a single gray text line**, reads as a possible freeze on slow mobile connections. → `/impeccable harden`

**[P3] Zero-state search message doesn't echo the active search term.** → `/impeccable clarify`

## Persona Red Flags
- **Casey (mobile)**: opens the page specifically to check status on the go, and it's the one thing not visible without a swipe most users won't intuit.
- **Low-tech parent**: same root problem — likely to conclude "the app isn't showing my balance" rather than discover the swipe hint.

## Minor Observations
- Sort-arrow column reserves width even when empty — no header jitter on sort change.
- Global 44px button rule inflates the table header row to 68.5px — harmless but worth knowing it reshapes every table header in the app.

## Questions to Consider
- If "Zahlen zuerst" is the north star, should Status simply move to column 2 instead of column 6?

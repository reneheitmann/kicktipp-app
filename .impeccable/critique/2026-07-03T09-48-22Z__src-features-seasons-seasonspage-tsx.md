---
target: SeasonsPage (src/features/seasons/SeasonsPage.tsx)
total_score: 27
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T09-48-22Z
slug: src-features-seasons-seasonspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Plain "Lade..." text, no aria-live, unlike Dashboard's skeleton |
| 2 | Match System / Real World | 4/4 | Season name/date/own winnings/status in exactly the order a participant asks for |
| 3 | User Control and Freedom | 3/4 | Season-create modal closes cleanly on Escape (source-verified) |
| 4 | Consistency and Standards | 4/4 | Identical card/list pattern to Dashboard and PlayerDetailPage |
| 5 | Error Prevention | 3/4 | Not directly testable, inferred consistent |
| 6 | Recognition Rather Than Recall | 4/4 | Everything visible in the row |
| 7 | Flexibility and Efficiency | 2/4 | No sort/search, will matter once more than one season exists |
| 8 | Aesthetic and Minimalist Design | 3/4 | Large empty area below single season reads as unfinished, not calm |
| 9 | Error Recovery | 1/4 | Plain red text, no retry guidance (Dashboard says "Bitte Seite neu laden", this doesn't) |
| 10 | Help and Documentation | 1/4 | No contextual help |
| **Total** | | **27/40** | **Acceptable** |

## Anti-Patterns Verdict
**LLM: PASS.** No slop; if anything under-designed (huge empty space with 1 season). **Detector**: CLI clean (0). Live-injected: `flat-type-hierarchy` only — confirmed false positive (DESIGN.md's No-Display-Font Rule), matches prior rounds.

## Overall Impression
Solid, calm list page that correctly shows the participant's own winnings inline without a click. Weakest points are the loading/error states, which are noticeably worse than Dashboard's equivalent despite showing the same kind of data.

## What's Working
- Own winnings shown inline in the list, not behind a click.
- `myGesamtgewinnForSeason` correctly distinguishes "not a participant" (hidden) from "€0,00 won" — a real data-integrity decision.
- Fully consistent card/list styling with the rest of the app.

## Priority Issues

**[P2] Loading/error states weaker than Dashboard's equivalent** — plain text, no aria-live, no retry guidance in the error message. Fix: reuse Dashboard's skeleton + aria-live pattern, add "Bitte Seite neu laden." → `/impeccable harden`

**[P3] No contextual help; sparse single-season view can read as broken** → `/impeccable clarify`

**[P3] Season row's accessible name is an unlabeled run-on** (name+date+amount+status), unlike Dashboard's equivalent link which has an explicit aria-label → `/impeccable harden`

**[P3] Date range shown as raw ISO strings, not German-localized format**, inconsistent with the rest of the app's currency/number localization → `/impeccable clarify`

## Persona Red Flags
- **Jordan (first-timer)**: sees one row then a wall of white with no cue whether that's normal or broken.
- **Low-tech parent**: slow connection shows unannounced "Lade..." with no next step if it errors.

## Minor Observations
- Detector and manual review agree the page is structurally clean; issues are all in loading/error/a11y polish, not layout or color.

## Questions to Consider
- Once this app has more than a handful of seasons, does this page need an archived/active split or search?

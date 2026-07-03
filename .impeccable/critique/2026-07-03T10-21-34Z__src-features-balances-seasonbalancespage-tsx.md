---
target: SeasonBalancesPage (src/features/balances/SeasonBalancesPage.tsx)
total_score: 30
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-21-34Z
slug: src-features-balances-seasonbalancespage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Loading state and export "Export..." label both work |
| 2 | Match System / Real World | 4/4 | German labels, straightforward "Guthabenübersicht" framing |
| 3 | User Control and Freedom | 3/4 | Sort/search easily reversible, read-only page |
| 4 | Consistency and Standards | 4/4 | Cards, table, sort headers match the documented system exactly |
| 5 | Error Prevention | 3/4 | Nothing destructive, low risk |
| 6 | Recognition Rather Than Recall | 2/4 | Mobile: scrolling the table loses the player-name column entirely |
| 7 | Flexibility and Efficiency | 3/4 | Sortable columns, search-by-name |
| 8 | Aesthetic and Minimalist Design | 2/4 | Bar chart with 85 unlabeled bars is noise, not signal, at real scale |
| 9 | Error Recovery | 3/4 | Export failure sets visible red error text |
| 10 | Help and Documentation | 3/4 | Correctly omitted for this register |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Small, purpose-built page reusing Button/SearchInput/SortableTh. The one generic-feeling piece is the bar chart, added without considering seasons with more than ~15 players. **Detector**: CLI clean (0).

## Overall Impression
Calm and legible with real data, matches the "ruhiger Kontoauszug" north star — until mobile scroll strips away the "who," or the chart is asked to represent 85 people at once.

## What's Working
- Correct, restrained color use — chart bars in ink/slate-gray, not decorative palette.
- Search + sort genuinely useful for a season with dozens of participants, both instant.
- Excel export unobtrusive and works end-to-end without errors.

## Priority Issues

**[P1] Mobile: player identity lost on horizontal scroll** — no sticky name column, no scroll affordance. Confirmed via DOM measurement (scrolling 500px moves "Spieler" header to x: -475). For a page whose whole purpose is "who has how much money," losing the "who" is a real functional failure. → `/impeccable adapt`

**[P2] Chart illegible past ~15-20 players** — with 85 players, x-axis labels auto-skip, bars are unlabeled, Gesamtwertung vs. Spieltag is a subtle gray-on-gray distinction across ~170 thin bars. Fails DESIGN.md's "sofort lesbar" principle at realistic scale. → `/impeccable layout`

**[P2] Search doesn't filter the chart** — a name search with zero table matches still shows the full 85-bar chart above "Keine Treffer für die Suche," reading as contradictory. → `/impeccable clarify`

**[P3] Dead keyboard focus stop on the chart** — recharts SVG has `tabindex="0"` in the tab sequence with no keyboard interaction, a dead stop in an otherwise clean tab order. → `/impeccable harden`

## Persona Red Flags
- **Casey (mobile)**: told the app is "mobile gleichwertig," but the core money table breaks that promise past the first two columns.
- **Sam (screen reader/keyboard)**: chart conveys real information (biggest single-day swing) with zero text alternative.

## Minor Observations
- `min-w-[640px]` inside overflow-auto means even a wide phone/small tablet still needs to scroll — evaluate the sticky-column fix at tablet widths too.

## Questions to Consider
- At what player count does this chart stop being a design decision and start being a bug — should it switch to "top N ± search-filtered" past a threshold?
- Is a raw bar chart the right visualization for "balance per person," or would a sortable delta column make it redundant?

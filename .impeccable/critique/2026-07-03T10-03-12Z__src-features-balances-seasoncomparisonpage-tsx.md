---
target: SeasonComparisonPage (src/features/balances/SeasonComparisonPage.tsx)
total_score: 21
p0_count: 1
p1_count: 1
timestamp: 2026-07-03T10-03-12Z
slug: src-features-balances-seasoncomparisonpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1/4 | Desktop fine (3/4); on mobile none of the chart/selection state is visible at all |
| 2 | Match System / Real World | 3/4 | Gesamt/season columns read like a statement |
| 3 | User Control and Freedom | 1/4 | Search/sort/toggle all work on desktop; none of it exists on mobile |
| 4 | Consistency and Standards | 2/4 | Line-color reassignment and 32px touch targets both break the app's own stated rules |
| 5 | Error Prevention | 3/4 | No destructive actions here |
| 6 | Recognition Rather Than Recall | 3/4 | Picker shows each player's live total next to their checkbox |
| 7 | Flexibility and Efficiency | 1/4 | Desktop fine (3/4); zero on mobile |
| 8 | Aesthetic and Minimalist Design | 3/4 | Calm and on-brand when it renders at all |
| 9 | Error Recovery | 3/4 | Calm, on-brand guard messages ("Bitte mindestens einen Spieler…") |
| 10 | Help and Documentation | 1/4 | Explanatory paragraph is useful on desktop, entirely hidden on mobile |
| **Total** | | **21/40** | **Acceptable — dragged down hard by a P0** |

## Anti-Patterns Verdict
**LLM: PASS** on slop, but shows a real "works on the demo, breaks at the edges" signature: the whole chart+picker block is `hidden ... sm:flex/sm:block`, and line colors are assigned by selection-order index rather than player identity, so a chart meant to build a stable mental map reshuffles on every toggle. **Detector**: CLI clean (0). Live-injected detector not obtained this round (credential-handling blocker, see session notes) — findings below are code-read + live-interaction verified by Assessment A directly, not detector-derived.

## Overall Impression
This is the app's most data-visualization-heavy page, and it's also the clearest violation of a named design principle found across the whole session: PRODUCT.md/DESIGN.md explicitly state "Mobile gleichwertig … keine Funktion darf am Handy schlechter bedienbar sein," and this page hides its entire chart and player-picker on mobile, leaving only the raw table.

## What's Working
- Smart default selection (top/bottom performers auto-checked) — the chart is never empty by default.
- Picker list surfaces each player's live total inline with their checkbox.
- Calm, on-brand empty/guard states that don't break tone.

## Priority Issues

**[P0] Chart + player-picker + both explanatory paragraphs are entirely hidden on mobile** (`hidden ... sm:flex` / `sm:block`) — on the app's most data-viz-heavy page, mobile users get zero chart and zero player selection, only the raw table. Directly contradicts the app's own explicit mobile-parity principle. → `/impeccable adapt`

**[P1] Picker checkbox rows measure 32px tall** (verified via DOM boundingBox), below the app's own documented 44px touch-target minimum. → `/impeccable adapt`

**[P2] Line color reassigned by selection-order index, not player identity** — verified live: unchecking one player changes another player's line color in the same session. Undermines the "watch this line over time" value proposition. → `/impeccable layout`

**[P3] Two search inputs share the identical placeholder "Spieler suchen…"** with no label distinguishing "filters the chart picker" from "filters the table." → `/impeccable clarify`

**[P3] Single-season data renders as unconnected dots with no "not enough data yet" messaging.** → `/impeccable clarify`

## Persona Red Flags
- **Casey (mobile)**: loses the entire reason to visit this page — no chart, no picker, just a table with no framing.
- **Alex (power-admin)**: reshuffling line colors actively fight the mental shortcuts a frequent user builds ("red is always my rival").

## Minor Observations
- Small-text positive/negative values correctly use emerald-700/amber-700 (not the failing emerald-600) — verifiable design-system compliance, worth noting positively.
- Picker panel keeps a fixed height regardless of filtered result count, leaving dead space under short lists.

## Questions to Consider
- Should mobile get a different chart pattern (e.g. swipeable per-season view) instead of no chart at all?
- Should line color come from a stable player→color hash instead of selection-order index?

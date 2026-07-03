---
target: ImportPage (src/features/kicktipp-import/ImportPage.tsx)
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-22-05Z
slug: src-features-kicktipp-import-importpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Row counts and inline status ("+ wird zugewiesen") informative; disabled-button reason is not |
| 2 | Match System / Real World | 4/4 | Mirrors Kicktipp's own export terminology directly |
| 3 | User Control and Freedom | 3/4 | Every row individually toggleable/reassignable before commit |
| 4 | Consistency and Standards | 3/4 | Mostly matches the system, except an undocumented blue accent |
| 5 | Error Prevention | 3/4 | Non-participants pre-unchecked by design (explicitly intentional) |
| 6 | Recognition Rather Than Recall | 2/4 | Total-row-mismatch case isn't surfaced in the summary line |
| 7 | Flexibility and Efficiency | 3/4 | Column remapping and per-row reassignment |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean, no clutter |
| 9 | Error Recovery | 2/4 | Disabled submit gives no reason across 4 independent unmet conditions |
| 10 | Help and Documentation | 3/4 | Inline "Spieltagsplatzierung vs. Rang" warning is genuinely good |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Genuinely well-thought-out mapping/preview flow with real domain logic (auto-assign detection, kicktipp-name backfill), not a generic CRUD-import template. **Detector**: CLI clean (0).

## Overall Impression
Real, protective import logic that mostly earns trust — until every row fails to match, at which point the page stays silent about it rather than warning the user nothing will import.

## What's Working
- Auto-assignment logic (`needsAutoAssign`) is a real quality-of-life feature, clearly labeled before commit.
- Defaulting non-eligible rows to unchecked is a smart, documented-as-intentional safety net.
- Kicktipp-specific domain help text prevents a genuinely easy data error.

## Priority Issues

**[P1] Row checkboxes have no accessible name and a 20×20px hit target with no click-through label** — bare `<input type="checkbox">`, not label-wrapped, unlike the tipper-import page's own settings toggles. A screen reader announces only "checkbox, not checked" with no row context. Part of a systemic pattern — see cross-page note. → `/impeccable harden`

**[P2] Disabled "Import übernehmen" gives no reason** — depends on 4 independent conditions (season, matchday, unresolved rows, permission) with no title/tooltip/inline explanation. → `/impeccable clarify`

**[P2] Total-mismatch isn't surfaced** — when every uploaded row fails to match, `unresolvedCount` stays 0 (unmatched rows default to unchecked), so the summary line gives no hint that nothing will import. → `/impeccable clarify`

**[P3] Undocumented blue accent** — `text-blue-700` appears for informational badges on this page and TipperImportPage, a fifth color outside DESIGN.md's documented palette (primary/positive/warning/negative/neutral). → `/impeccable colorize`

## Persona Red Flags
- **Sam (screen reader/keyboard)**: unlabeled row checkboxes are a genuine accessible-name failure.
- **Riley (stress-tester)**: "everything failed to match but the UI stays quiet" invites confused repeat attempts after pasting a slightly-wrong export.

## Minor Observations
- Inline row error uses red-600 while the page banner uses red-700 — same meaning, two shades.
- "Stattdessen Tipperliste importieren →" competes visually with the h1 on mobile, wraps to two lines right next to the title.

## Cross-page note
The 20px/32px unlabeled-checkbox pattern found here, on TipperImportPage, SeasonComparisonPage, and PlayersPage traces to one root cause: `input[type=checkbox]/[type=radio] { min-height: 0 }` in `src/index.css` deliberately exempts all checkboxes/radios from the app's global 44px touch-target rule. One shared fix (wrap rows in `<label>`, reconsider the exemption for list-row checkboxes specifically) would resolve it everywhere at once.

## Questions to Consider
- Should "0 rows will import" be an explicit visible state rather than something inferred from row-by-row inspection?

---
target: Dashboard/Übersicht (src/pages/DashboardPage.tsx)
total_score: 31
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T08-09-24Z
slug: src-pages-dashboardpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 2/4 | — | "Lade..." gives no reassurance during multi-second wait for multi-player accounts; no skeleton, no `aria-live` |
| 2 | Match System / Real World | 4/4 | +1 | German financial vocabulary, EUR formatting match audience exactly |
| 3 | User Control and Freedom | 3/4 | +1 | Read-only, no traps; nothing to undo but nothing needed |
| 4 | Consistency and Standards | 4/4 | — | Card/badge/contrast rules match DESIGN.md almost to the letter |
| 5 | Error Prevention | 3/4 | — | Fetch failures now caught, not left to crash |
| 6 | Recognition Rather Than Recall | 4/4 | +1 | Breakdown always visible, aria-labels spell out full context |
| 7 | Flexibility and Efficiency | 3/4 | +1 | Compact list for multi-player accounts is a real accelerator |
| 8 | Aesthetic and Minimalist Design | 4/4 | +1 | Genuinely restrained; compact list removed the card-wall problem |
| 9 | Error Recovery | 2/4 | +1 | Error banner now exists, but leaks the raw `err.message` to end users |
| 10 | Help and Documentation | 2/4 | — | Still no inline explanation of "offen"/"Guthaben"/breakdown terms |
| **Total** | | **31/40** | **+6** | **Good — solid foundation, address weak areas** |

## Anti-Patterns Verdict

**LLM assessment: PASS**, unchanged and stronger — the reviewer specifically called out the new compact multi-player list as "the opposite of the generic identical-card-grid AI-slop tell."

**Deterministic scan**: CLI scan on source: 0 findings. Live-injected detector: same single grouped finding as the first run (`overused-font`/`single-font`/`flat-type-hierarchy`), confirmed again as a **false positive relative to this project** — it matches DESIGN.md's documented "No-Display-Font Rule" and type scale exactly (12/14/16/18/20px, 1.7:1). No new anti-patterns surfaced. Both assessments agree the codebase itself is clean.

## Overall Impression

Real, measurable improvement: **25 → 31/40**. Both fixes that were explicitly re-tested worked exactly as intended — the skip link was confirmed live (first Tab stop, Enter moves focus to `#main-content`), and the multi-player compact list was confirmed to render as a clean one-line-per-player list rather than a card wall for the same 5-player test account. With the loudest problems fixed, the critique surfaced a second, subtler layer: the loading state gives no reassurance during the wait it was always going to have, the new error banner can leak a raw technical string, and the balance card isn't marked up as a heading — meaning a screen-reader user skimming by heading now skips right past the page's single most important content.

## What's Working

1. **The multi-player compact list is a genuine, deliberate fix, not a token gesture** — code comment documents the reasoning, and live testing confirms it collapses 5 stacked cards into a scannable one-line list exactly as designed.
2. **Accessible names on every interactive row** (`aria-label` spelling out name + balance) — above-average craft, confirmed working live.
3. **Design-system fidelity held under a second review** — emerald-600-vs-700 by size, amber/slate status colors, single accent — nothing drifted between the two critique passes.

## Priority Issues

**[P1] Loading state gives no reassurance during a multi-second wait**
- **Why it matters**: For the realistic multi-player case, "Lade..." sits alone on screen for several seconds with no skeleton, no `aria-live`, no context — the worst possible moment for a worried user checking whether they owe money to see a near-blank screen.
- **Fix**: render a skeleton shaped like the balance card, add `aria-live="polite"`.
- **Suggested command**: `/impeccable harden`

**[P2] Error banner can leak a raw technical string to non-technical users**
- **Why it matters**: `err.message` (a raw Supabase/network string) is interpolated directly into the user-facing banner. A parent user with no technical background could see a meaningless or alarming technical error on a money page.
- **Fix**: show a generic message to all users; log the real message to console only.
- **Suggested command**: `/impeccable clarify`

**[P2] Personal balance card has no heading-level markup**
- **Why it matters**: The title is a `<p>`, not an `<h2>`/`<h3>`, even though it's the single most important content on the page. A screen-reader user navigating by heading skips straight past "Mein Konto" to "Statistik."
- **Fix**: change the title element to a heading tag, visually unchanged.
- **Suggested command**: `/impeccable harden`

**[P3] Admin-wide "Offene Beträge" sits too close, visually, to the personal balance**
- **Why it matters**: Same amber/emerald color language for a pool-wide aggregate and a personal balance, stacked directly on top of each other — confirmed live with real numbers on screen simultaneously (747,61€ personal vs. 1.231,12€ org-wide), a real risk of a hurried admin misattributing the number.
- **Fix**: distinct visual treatment (e.g. a small "Alle Spieler" chip) or more visual separation.
- **Suggested command**: `/impeccable layout`

## Persona Red Flags

**Parent persona (low-tech, checking if they owe money)**: Several seconds of "Lade..." with nothing else on screen could read as broken. "Guthaben" vs. "offen" still isn't explained anywhere on the page.

**Sam (Accessibility-Dependent User)**: Skip link works correctly (verified live). But heading-based navigation — the primary way screen-reader users skim a page — now skips the balance card entirely since it isn't a heading. No `aria-live` on the loading state.

**Admin/Riley (stress tester)**: Confirmed live that the personal and org-wide amber/green numbers can sit on screen simultaneously in visually similar styling.

## Minor Observations

- `StatCard` uses no border (`bg-white` inside a `bg-slate-50` wrapper) — a deliberate but undocumented deviation from the blanket card rule; not a bug.
- Season badge renders the raw lowercase DB enum ("aktiv") rather than a localized label — minor polish gap.
- Touch targets measured live: 356×48px rows, ~173×58px tiles — comfortably clear 44px.

## Questions to Consider

1. What if the loading state showed the "Mein Konto" card's skeleton immediately, same size/position, instead of plain text?
2. What if the personal-balance zone had a subtle background tint distinguishing it from the admin-stats zone below?
3. What if a one-line tooltip on "Ausgeglichen"/balance figures appeared for first-time visitors only, closing the terminology gap without adding permanent decoration?

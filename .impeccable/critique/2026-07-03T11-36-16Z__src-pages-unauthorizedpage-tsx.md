---
target: UnauthorizedPage (src/pages/UnauthorizedPage.tsx)
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T11-36-16Z
slug: src-pages-unauthorizedpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | "Wechsele zurück..." shown; the async result is silently dropped |
| 2 | Match System / Real World | 4/4 | Plain German, calm, non-blaming copy |
| 3 | User Control and Freedom | 4/4 | Three escape routes (switch role, profile, sign out) |
| 4 | Consistency and Standards | 4/4 | Matches NotFoundPage's centered-message pattern |
| 5 | Error Prevention | 3/4 | No confirmation needed for these actions, appropriate |
| 6 | Recognition Rather Than Recall | 4/4 | Self-explanatory |
| 7 | Flexibility and Efficiency | 3/4 | n/a, single-purpose page |
| 8 | Aesthetic and Minimalist Design | 4/4 | Nothing extraneous |
| 9 | Error Recovery | 2/4 | switchBackToBaseRole()'s returned error is discarded — silent failure |
| 10 | Help and Documentation | 3/4 | n/a for this register |
| **Total** | | **34/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Deliberately minimal escape-hatch page with a code comment explaining its own reason for existing (references a real prior dead-end bug). **Detector**: CLI clean (0).

## Overall Impression
A small page that does its one job well — three genuine escape routes, calm de-escalating copy. The one gap is a silent-failure edge case that would undercut the page's own explicit "never a dead end" design intent.

## What's Working
- Self-documenting comment records *why* this page must never dead-end, protecting future edits from reintroducing a real prior bug.
- Conditional rendering of "switch back" only when base_role exists — verified live, correctly absent for accounts without one.

## Priority Issues

**[P2] Silent failure on switch-back** — the returned `{ error }` from `switchBackToBaseRole()` is discarded. If the RPC fails, the user is left exactly where they started with zero feedback — the one way this page could still become the dead-end its own comment says it must never be. → `/impeccable harden`

**[P3] No aria-live scaffolding for a future error message** — moot today, relevant the moment P2 is fixed. → `/impeccable harden`

## Persona Red Flags
- **Low-tech parent**: a silent switch-back failure has no vocabulary for "try again" — likely to just hit "Abmelden" out of frustration, papering over a real bug.

## Minor Observations
- Amber styling on the switch-back button is the only non-primary/non-neutral color choice on this page — plausibly deliberate "requires attention" signaling, worth a sentence of intent if not.

## Questions to Consider
- Has `switchBackToBaseRole()` ever actually failed in production, or is the discarded error a hypothetical risk?

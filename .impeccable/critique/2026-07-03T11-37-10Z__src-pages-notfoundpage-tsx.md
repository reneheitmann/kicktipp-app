---
target: NotFoundPage (src/pages/NotFoundPage.tsx)
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T11-37-10Z
slug: src-pages-notfoundpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Clearly communicates "page not found" |
| 2 | Match System / Real World | 4/4 | Plain German, no HTTP-error jargon like "404" |
| 3 | User Control and Freedom | 4/4 | A single, clear way back |
| 4 | Consistency and Standards | 4/4 | Identical layout pattern to UnauthorizedPage — good internal consistency |
| 5 | Error Prevention | 3/4 | n/a |
| 6 | Recognition Rather Than Recall | 4/4 | No ambiguity |
| 7 | Flexibility and Efficiency | 3/4 | n/a |
| 8 | Aesthetic and Minimalist Design | 4/4 | Appropriately tiny for its purpose |
| 9 | Error Recovery | 4/4 | The one link IS the recovery |
| 10 | Help and Documentation | 3/4 | n/a |
| **Total** | | **36/40** | **Excellent** |

## Anti-Patterns Verdict
**LLM: PASS.** As minimal as a 404 page can be while still being helpful — no filler, no wasted words. **Detector**: CLI clean (0).

## Overall Impression
The lowest-stakes page in the whole app, handled exactly right: a calm one-line message with an immediate way back, no apology theater, no gimmicks. Appropriately sized (12 lines) to the problem it solves.

## What's Working
- Correctly scoped to its actual job — no temptation to over-build (search box, suggested links, illustration) that this app's small, closed user base doesn't need.

## Priority Issues
None found. Correctly scoped, no gaps at this size.

## Persona Red Flags
None specific — simple enough to create no friction for any persona.

## Minor Observations
- Component has no auth dependency, so behavior should be identical logged-in or logged-out (only the logged-in case was directly tested).

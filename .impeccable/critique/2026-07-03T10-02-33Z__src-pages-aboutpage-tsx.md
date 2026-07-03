---
target: AboutPage (src/pages/AboutPage.tsx)
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T10-02-33Z
slug: src-pages-aboutpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Version/build/channel all plainly visible; degraded by silent copy-failure |
| 2 | Match System / Real World | 4/4 | Plain German, no unexplained jargon |
| 3 | User Control and Freedom | 3/4 | Changelog toggle works cleanly both directions |
| 4 | Consistency and Standards | 4/4 | Matches DESIGN.md exactly |
| 5 | Error Prevention | 2/4 | No feedback path if clipboard write fails |
| 6 | Recognition Rather Than Recall | 4/4 | Everything relevant laid out |
| 7 | Flexibility and Efficiency | 3/4 | One-click "for support" copy is a nice shortcut |
| 8 | Aesthetic and Minimalist Design | 4/4 | Textbook "ruhiger Kontoauszug" |
| 9 | Error Recovery | 1/4 | Verified live: failed clipboard copy gives zero indication anything went wrong |
| 10 | Help and Documentation | 3/4 | This page effectively is the diagnostic/help surface |
| **Total** | | **31/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Purpose-built self-diagnostic tool, not filler. **Detector**: CLI clean (0 findings).

## Overall Impression
Best-scoring utility page tested so far — a real, scoped feature (device/browser self-diagnostic export for a self-hosted app without crash reporting) executed cleanly. The one real gap is exactly where it matters most: silent failure on the one button meant to help a stuck user.

## What's Working
- Genuinely useful, scoped self-diagnostic export, not a stub.
- Exemplary design-system adherence — a good reference page for "on-brand."
- Collapsible changelog defaults sensibly without over-remembering state.

## Priority Issues

**[P2] Clipboard copy fails silently** — `catch {}` swallows failures; verified live (without `clipboard-write` permission, button is a no-op with no visible change). On the page meant to help a stuck user, "did that work?" has no answer. → `/impeccable harden`

**[P3] Device info captured once on mount, never recomputed** — resizing/rotating after load leaves "Fenstergröße"/"Bildschirmauflösung" stale, undermining the point of an accurate support snapshot. → `/impeccable harden`

**[P3] "Fenstergröße" vs. "Bildschirmauflösung" shown with no distinguishing copy** — reads as duplicate info to PRODUCT.md's stated non-technical audience. → `/impeccable clarify`

## Persona Red Flags
- **Low-tech parent**: directed to "copy your info and send it," a silent clipboard failure leaves them stuck with no next step.
- **Sam (screen reader)**: "Kopiert!" state is a plain text swap with no aria-live region.

## Minor Observations
- Build/commit correctly shows "lokal" in dev — expected.

## Questions to Consider
- Is broadcasting full device/browser info to every visitor proportionate, or should it only render once a "report a problem" flow starts?
- Would a pre-filled mailto: link remove a manual step for the least technical users?

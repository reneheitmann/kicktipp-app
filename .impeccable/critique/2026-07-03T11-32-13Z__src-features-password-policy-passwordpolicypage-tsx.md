---
target: PasswordPolicyPage (src/features/password-policy/PasswordPolicyPage.tsx)
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T11-32-13Z
slug: src-features-password-policy-passwordpolicypage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | "Speichern..." state shown; no indication before clicking that a save is high-impact |
| 2 | Match System / Real World | 4/4 | Precise disclaimer about invite-flow placeholder passwords — real domain awareness |
| 3 | User Control and Freedom | 1/4 | No confirmation before an app-wide, immediately-effective policy change |
| 4 | Consistency and Standards | 4/4 | Form matches card/input/button system exactly |
| 5 | Error Prevention | 1/4 | HTML min/max exist but produce no visible warning when violated; live preview renders invalid values as if valid |
| 6 | Recognition Rather Than Recall | 4/4 | Live "Vorschau" sentence is exactly this heuristic done right |
| 7 | Flexibility and Efficiency | 3/4 | Reasonable for a rarely-touched settings form |
| 8 | Aesthetic and Minimalist Design | 4/4 | Single card, no clutter |
| 9 | Error Recovery | 2/4 | Generic error text only, no per-field indication |
| 10 | Help and Documentation | 3/4 | Reuse-days hint and character-class hint are good micro-documentation |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** The invited-user placeholder-password caveat and live preview sentence are non-generic, product-aware features. **Detector**: CLI clean (0).

## Overall Impression
A genuinely well-explained settings page (the live preview sentence is a highlight) undercut by the same systemic gap found on other admin pages: an app-wide, immediately-effective change with zero confirmation and no diff/summary of what's changing.

## What's Working
- Live "Vorschau" sentence translates three raw numbers into one readable policy description — real "Zahlen zuerst" execution.
- Invited-user placeholder-password caveat shows real domain awareness, preventing a plausible support confusion.
- Focus-ring correctly follows the Focus-Stays-Neutral Rule (slate-900, not the configurable primary red) — verified via computed style.

## Priority Issues

**[P1] Zero confirmation before an app-wide, live security-policy change** — `handleSubmit` saves directly with no "are you sure," no diff of what's changing, no undo. Same systemic gap found on AdminUsersPage/RolesPermissionsPage this session, here on arguably the highest-blast-radius form of the three pages in this batch. → `/impeccable harden`

**[P2] Silent acceptance of out-of-range values** — typing 2 into Mindestlänge (HTML min=6) or -5 into Wiederverwendungssperre (HTML min=0) produces no visible error; the live preview renders the invalid value as if valid, only `checkValidity()` (invisible to the user) flags it. → `/impeccable harden`

**[P3] No unsaved-changes indicator** — once typing starts, no cue (asterisk, highlight) distinguishes live values from locally-edited-but-unsaved ones. → `/impeccable clarify`

## Persona Red Flags
- **Alex (power-admin)**: precisely the user most likely to make a fast, confident edit-and-submit — a typo of "9000" gets the same instant, unconfirmed, app-wide effect as a deliberate "90."
- **Riley (stress-tester)**: out-of-range boundary values sail through with a plausible-looking live preview and no error styling.

## Minor Observations
- `reuse_days` max of 3650 (10 years) is a reasonable ceiling.
- No aria-live/role="alert" on the error/success paragraphs — consistent gap with LogsPage and LoginPage.

## Questions to Consider
- Given consequential admin actions have repeatedly shipped without confirmation this session, is it time for a shared `ConfirmButton`/"type to confirm" primitive rather than patching page by page?

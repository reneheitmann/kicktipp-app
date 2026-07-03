---
target: ResetPasswordPage (src/features/auth/ResetPasswordPage.tsx)
total_score: 32
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T11-36-45Z
slug: src-features-auth-resetpasswordpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | "Speichern..." pending state; no policy-load indicator (fast, low-stakes) |
| 2 | Match System / Real World | 4/4 | Clear German copy, plain-language policy description |
| 3 | User Control and Freedom | 2/4 | No visible way to cancel/leave this screen — takes over the whole app on a recovery event |
| 4 | Consistency and Standards | 4/4 | Card/input/button styling matches the design system precisely |
| 5 | Error Prevention | 4/4 | Client-side policy validation + confirm-mismatch check before any network call |
| 6 | Recognition Rather Than Recall | 3/4 | Policy requirements shown as helper text under the field |
| 7 | Flexibility and Efficiency | 3/4 | n/a, single-purpose form |
| 8 | Aesthetic and Minimalist Design | 4/4 | Standard auth-card layout, no clutter |
| 9 | Error Recovery | 2/4 | Error text has no aria-live/role=alert, no aria-invalid/aria-describedby |
| 10 | Help and Documentation | 3/4 | Password policy description doubles as inline help |
| **Total** | | **32/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Reuses existing password-policy infrastructure rather than reinventing validation. **Detector**: CLI clean (0). Note: this page is not reachable without a real Supabase recovery-email token; reviewed source-only, live interaction not performed (per explicit constraint to avoid touching the real admin account's password).

## Overall Impression
A correctly-layered, policy-aware reset form let down by the one thing UnauthorizedPage's own code comment explicitly warns against: a screen with no way out except closing the tab.

## What's Working
- Validates against the actual server-configured password policy (fetched live), gracefully no-ops if that fetch fails since the server still enforces its own default — correctly-layered client/server split.
- Reuses `describePasswordPolicy`/`validatePasswordAgainstPolicy` shared with the rest of the auth system instead of duplicating rules.

## Priority Issues

**[P2] No exit/cancel path** — this screen takes over the whole app whenever `passwordRecovery` is true, independent of route, with no way to back out except abandoning the tab. Even a small "Zurück zum Login" link (mirroring UnauthorizedPage's own "never a dead end" philosophy) would close this gap. → `/impeccable clarify`

**[P3] Error message lacks aria-live/role="alert" and field-level aria-invalid/aria-describedby** — consistent with the cross-page gap found throughout this audit. → `/impeccable harden`

## Persona Red Flags
- **Low-tech parent**: clicking an old/reused reset email with no intent to change their password right now, finding no cancel button, may panic-type a random password just to get past the screen — creating an unwanted credential change.

## Minor Observations
- Password mismatch only checked at submit, not on-blur — acceptable for a two-field form.
- Card uses `rounded-2xl shadow-sm ring-1` rather than DESIGN.md's documented flat card recipe — appears to be a consistent, pre-existing exception for auth screens generally, not a one-off deviation introduced here.

## Questions to Consider
- If a `PASSWORD_RECOVERY` event fires mid-session while a user is editing an unrelated form, is that work silently lost?

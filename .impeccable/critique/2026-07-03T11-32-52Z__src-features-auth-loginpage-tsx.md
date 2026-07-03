---
target: LoginPage (src/features/auth/LoginPage.tsx)
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T11-32-52Z
slug: src-features-auth-loginpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | "Anmelden..." pending state; wrong-password error is clear |
| 2 | Match System / Real World | 4/4 | Plain German, no jargon |
| 3 | User Control and Freedom | 3/4 | Easy to switch between login/forgot-password modes and back |
| 4 | Consistency and Standards | 4/4 | Correct use of primary color/button styling, standard focus pattern |
| 5 | Error Prevention | 3/4 | Required fields, type="email", appropriately minimal for pre-auth |
| 6 | Recognition Rather Than Recall | 4/4 | Nothing to remember across this single-screen flow |
| 7 | Flexibility and Efficiency | 3/4 | No "remember me"/SSO — appropriately minimal for a private pool app |
| 8 | Aesthetic and Minimalist Design | 4/4 | Exactly the "ruhiger Kontoauszug" register |
| 9 | Error Recovery | 3/4 | Clear, actionable error text; not announced to assistive tech |
| 10 | Help and Documentation | 3/4 | "Wende dich an deinen Spielleiter" correctly routes support for a closed app |
| **Total** | | **34/40** | **Good — no P0/P1, the cleanest page audited this session** |

## Anti-Patterns Verdict
**LLM: PASS.** Plain white card on slate-50, exactly matching DESIGN.md's anti-SaaS-marketing stance. The anti-enumeration reset-confirmation copy is a deliberate security-aware choice, not boilerplate. **Detector**: CLI clean (0).

## Overall Impression
The app's front door is in good shape — 0 of 8 cognitive-load checklist failures, no P0/P1 findings. The two real gaps are both accessibility-specific and small in scope.

## What's Working
- Deliberate anti-enumeration copy on the forgot-password confirmation ("Falls zu {email} ein Konto existiert...") — real security hygiene, not a generic implementation would think to include.
- Text-label show/hide toggle ("Anzeigen"/"Verbergen") instead of an icon-only eye glyph — directly serves PRODUCT.md's mixed-tech-affinity audience.
- Post-login redirect intelligently routes to the first nav item visible for the user's role, avoiding an immediate `/unauthorized` bounce — verified in source, thoughtful edge-case handling.

## Priority Issues

**[P2] Tab order visits "Passwort vergessen?" before the password field** — confirmed live: Tab from email lands on the forgot-password link, then the password input. A keyboard-only or low-vision user hits an unexpected detour between the two credential fields. → `/impeccable harden`

**[P2] No aria-live/role="alert" on the login error message** — a screen-reader user submitting wrong credentials gets no automatic announcement. Same gap as LogsPage and PasswordPolicyPage. → `/impeccable harden`

**[P3] Generous empty vertical space on mobile** — card vertically centered with large margins on 390×844; not wrong, but worth a look given PRODUCT.md's "Mobile gleichwertig" bar. → `/impeccable adapt`

## Persona Red Flags
- **Sam (screen reader/keyboard)**: both P2s land squarely here — the out-of-order tab stop and the silent error state.
- **Jordan (first-timer)**: low risk — the single-purpose page with a clear "Noch kein Zugang?" fallback is exactly right for someone arriving without credentials.

## Minor Observations
- Branding correctly reflects the live custom primary color and app name pre-login — no flash of default/wrong branding.
- Password toggle and forgot-password link both measured at 44px — compliant.
- HTML5 native validation fires in English despite German UI — browser/OS locale artifact, not app-controlled, very low priority.

## Questions to Consider
- Is "Passwort vergessen?" ahead of the password field in tab order intentional, or a flex-layout artifact worth reordering?

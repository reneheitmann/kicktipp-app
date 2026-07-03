---
target: MyAccountPage (src/features/auth/MyAccountPage.tsx)
total_score: 30
p0_count: 0
p1_count: 0
timestamp: 2026-07-03T09-49-31Z
slug: src-features-auth-myaccountpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Tested live: empty-name and mismatched-password errors both show correctly inline; but `if (!profile) return null` gives a totally blank page during initial load |
| 2 | Match System / Real World | 3/4 | "Eigentliche Rolle" phrasing and the password-policy sentence are denser than the "Eltern"-friendly bar PRODUCT.md sets |
| 3 | User Control and Freedom | 4/4 | Role-switch copy explicitly states it's reversible and always undoable from this same page |
| 4 | Consistency and Standards | 3/4 | The amber "Du agierst als Spieler" box uses the warning color for a role/session state, technically outside CLAUDE.md's "status colors only for money states" rule — a justified exception worth reconciling in the rule text |
| 5 | Error Prevention | 2/4 | Name/password validation solid and tested; but role-switch fires immediately on one click, no confirmation despite the copy calling it consequential |
| 6 | Recognition Rather Than Recall | 4/4 | "Meine Spieler" makes an otherwise-invisible profile↔player mapping directly visible |
| 7 | Flexibility and Efficiency | 2/4 | Single-path forms, acceptable for this page's size |
| 8 | Aesthetic and Minimalist Design | 3/4 | Long vertical stack of equal-weight cards; only the amber box breaks the rhythm |
| 9 | Error Recovery | 3/4 | Tested live: precise, plain-language, field-positioned errors that don't wipe form state |
| 10 | Help and Documentation | 3/4 | Password policy shown inline and contextually — good placement, dense wording |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** The one place a generic pattern nearly appears (a warning-colored "special mode" banner) is given specific situational copy instead of generic "Warning!" text. **Detector**: CLI clean (0). Live-injected findings: `overused-font`/`single-font`/`flat-type-hierarchy` — confirmed false positives (documented design system). One genuine finding: **`nested-cards`** — the "Meine Spieler" section renders a card containing a full-width inner bordered list, a real card-in-card pattern confirmed via screenshot.

## Overall Impression
Best-scoring page of the batch. Clear reversibility messaging on a genuinely consequential feature (role switch) and solid, live-tested inline validation. The gap between the role-switch copy's stated weight ("this matters, but don't worry") and the actual one-click-no-confirmation interaction is the main friction point.

## What's Working
- "Meine Spieler" directly serves PRODUCT.md's "auf einen Blick verstehen" principle — no digging required to see linked players.
- Reversibility messaging on role-switch is unusually good for a real, consequential state change.
- Inline validation tested live twice (empty name, mismatched password) — both times correct, plain German, form state preserved.

## Priority Issues

**[P2] No confirmation before role switch** — a single misclick immediately changes the account's effective permissions, with only the reversibility itself (not a confirm step) as a safety net. Fix: wrap both switch actions in the app's own ConfirmDialog. → `/impeccable harden`

**[P2] Blank page during initial load** (`if (!profile) return null`) — no skeleton, no aria-live, unlike Dashboard's explicit loading treatment. → `/impeccable harden`

**[P2] Nested cards** — "Meine Spieler" list renders as a card inside a card (confirmed live). Fix: drop the inner border/background, let the outer CollapsibleSection-style card carry the boundary. → `/impeccable layout`

**[P3] "Eigentliche Rolle" phrasing and password-policy sentence are jargon-dense** relative to PRODUCT.md's stated less-technical audience. → `/impeccable clarify`

## Persona Red Flags
- **Alex (power-admin)**: switching roles is one click with no faster/safer toggle for someone who does it often to sanity-check the participant view.
- **Sam (screen reader/keyboard)**: blank-page loading state gives nothing to announce — silence instead of a "Profil wird geladen" cue.

## Minor Observations
- Role label mapping avoids ever showing raw enum values to the user — good consistency win.
- E-Mail/Rolle fields are styled as disabled (gray bg) rather than actual disabled inputs — visually clear, but a screen reader may not distinguish this from an editable placeholder; consider `aria-readonly`.

## Questions to Consider
- Should the role-switch section visually outrank "change password" given how consequential its own copy says it is?

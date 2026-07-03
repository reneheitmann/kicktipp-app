---
target: SendEmailPage (src/features/emails/SendEmailPage.tsx)
total_score: 33
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-27-46Z
slug: src-features-emails-sendemailpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4/4 | Live recipient count/kontaktierbar-count updates as selections change |
| 2 | Match System / Real World | 4/4 | "Spieltagsgewinner", "Gesamtgewinner", "offene Posten" are the pool's own vocabulary |
| 3 | User Control and Freedom | 3/4 | Per-recipient exclude checkbox in review table; no "clear selection" in players-search list |
| 4 | Consistency and Standards | 3/4 | Exclude-checkbox breaks the label-wrap pattern used one section above |
| 5 | Error Prevention | 3/4 | window.confirm() before send; subject/body required |
| 6 | Recognition Rather Than Recall | 4/4 | Template picker pre-fills; variable buttons show description on hover |
| 7 | Flexibility and Efficiency | 3/4 | Cursor-position variable insertion between subject/body |
| 8 | Aesthetic and Minimalist Design | 4/4 | Fully on-spec |
| 9 | Error Recovery | 3/4 | Per-recipient ✓/✗ result list after send; no retry-failed-only |
| 10 | Help and Documentation | 2/4 | No explanation of why a resolved recipient isn't "kontaktierbar" |
| **Total** | | **33/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Genuinely well-built compose tool — numbered progressive disclosure, live recipient resolution, real content preview substituting variables before sending. **Detector**: CLI clean (0).

## Overall Impression
A thoughtful bulk-email tool that catches broken template variables before they reach real inboxes. The send action itself, though, gets no more visual weight than any routine save — for something genuinely irreversible and external-facing.

## What's Working
- Two-tier recipient model (mode-resolved list + per-row exclude override) — low-friction course-correction without leaving auto-selection.
- Live template-value preview against a real recipient's real data before sending.
- Cursor-aware variable insertion into whichever field was last focused.

## Priority Issues

**[P1] Recipient-table exclude-checkbox has no accessible name, ~16×16px target** — bare `<input>` in a `<td>`, no label wrap, unlike the players-search checklist one section above which does it correctly. Combined with the app-wide checkbox touch-target exemption. → `/impeccable harden`

**[P2] Send action's visual weight doesn't match its consequence** — same primary-red button as any routine save, gated only by a native confirm(). No in-app "these N people will receive this exact text" review step. → `/impeccable clarify`

**[P3] "0 kontaktierbar" reason is opaque** — no tooltip/link explaining missing profile link / inactive / no email, forces a context switch to /admin/users to diagnose. → `/impeccable clarify`

## Persona Red Flags
- **Sam (screen reader/keyboard)**: unlabeled exclude-checkbox is a hard blocker, no accessible name.
- **Riley (stress-tester)**: a player resolving to "kann nicht kontaktiert werden" has no actionable next step; abandoning the flow to fix it loses in-progress subject/body text.

## Minor Observations
- Player-search checklist has a nested scroll region inside the page scroll — worth a manual mobile check for scroll-trap behavior.

## Questions to Consider
- Should a bulk email be one confirm() dialog away from firing, with no per-recipient final-content review?

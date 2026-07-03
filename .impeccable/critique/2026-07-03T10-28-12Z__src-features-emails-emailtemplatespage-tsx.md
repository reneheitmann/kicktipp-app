---
target: EmailTemplatesPage (src/features/emails/EmailTemplatesPage.tsx)
total_score: 32
p0_count: 1
p1_count: 0
timestamp: 2026-07-03T10-28-12Z
slug: src-features-emails-emailtemplatespage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Loading/empty states present |
| 2 | Match System / Real World | 4/4 | Same variable vocabulary as SendEmailPage — consistent mental model |
| 3 | User Control and Freedom | 1/4 | Modal cannot be dismissed via Escape or backdrop click (verified live) |
| 4 | Consistency and Standards | 4/4 | Identical form pattern to SendEmailPage's content section, reused not reinvented |
| 5 | Error Prevention | 3/4 | Delete confirm interpolates the actual template name |
| 6 | Recognition Rather Than Recall | 4/4 | Row shows name + subject preview |
| 7 | Flexibility and Efficiency | 3/4 | Same cursor-aware variable insertion as SendEmailPage |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean list, no clutter |
| 9 | Error Recovery | 3/4 | Inline error text, no forced reload |
| 10 | Help and Documentation | 3/4 | Variable buttons carry title tooltips |
| **Total** | | **32/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Textbook CRUD list, nothing decorative or invented for the sake of looking busy. **Detector**: CLI clean (0).

## Overall Impression
The most frictionless of the batch's three pages — until you try to close the modal the way the rest of the web works. Confirms a real, shared component defect.

## What's Working
- Named-confirmation delete copy interpolates the actual template name.
- List row's secondary text is the real subject line, not a generic description.
- Full reuse of EmailTemplateForm between create and edit — no duplicated form logic.

## Priority Issues

**[P0] Modal cannot be dismissed via Escape or backdrop click** — live-verified: Escape and backdrop click both left the modal open. Confirmed in source: `Modal.tsx` has no keydown listener and the backdrop div has no onClick. This is the shared component — every modal in the app inherits the same gap. Now confirmed on 3 pages this session (AccountsOverviewPage, MatchdayDetailPage, this one). → `/impeccable harden`

**[P3] Template name/subject truncate aggressively on mobile** — at 390px, several similarly-named templates could become hard to tell apart without opening each one. → `/impeccable adapt`

## Persona Red Flags
- **Jordan (first-timer)**: reflexively hitting Escape to back out does nothing, reads as broken.
- **Casey (mobile)**: aggressive truncation reduces the list's main value (scan without opening).

## Minor Observations
- Row action buttons measured at 44px height live — touch-target rule respected here.

## Questions to Consider
- Given the Modal defect is shared, is it worth fixing once in Modal.tsx rather than flagging it per-page?

---
target: RolesPermissionsPage (src/features/permissions/RolesPermissionsPage.tsx)
total_score: 27
p0_count: 1
p1_count: 1
timestamp: 2026-07-03T10-45-03Z
slug: src-features-permissions-rolespermissionspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Checkbox disables briefly while saving; no toast confirming what changed |
| 2 | Match System / Real World | 4/4 | Plain-language description under every permission — excellent |
| 3 | User Control and Freedom | 1/4 | Every toggle is instant and live, no batch-review/confirm/undo at all |
| 4 | Consistency and Standards | 3/4 | Card/table pattern matches; checkboxes render in raw browser blue, not design tokens |
| 5 | Error Prevention | 0/4 | Admin column's own checkboxes are fully interactive and unprotected — self-lockout with no safety net |
| 6 | Recognition Rather Than Recall | 4/4 | Matrix directly shows current grant state |
| 7 | Flexibility and Efficiency | 3/4 | — |
| 8 | Aesthetic and Minimalist Design | 4/4 | — |
| 9 | Error Recovery | 2/4 | On failure, a full silent reload() wipes all unsaved optimistic state |
| 10 | Help and Documentation | 3/4 | Strong intro copy — explicitly says other pages are hard-locked for safety, but doesn't apply the same guard here |
| **Total** | | **27/40** | **Acceptable — dragged down by a genuine P0** |

## Anti-Patterns Verdict
**LLM: PASS.** Genuinely well-written product copy explaining "Seite sichtbar" vs. per-action rights — thought through for both technical and confused-Spielleiter personas. **Detector**: CLI clean (0).

## Overall Impression
A reassuring, well-explained permission matrix undercut by the one thing its own copy warns against: the Admin column is just as editable as the other two, live, instant, unconfirmed — on the exact page whose intro text explains that other admin pages are hard-locked specifically to prevent this class of problem.

## What's Working
- Permission `description` field turns a cryptic checkbox grid into something a non-technical Spielleiter could actually parse.
- Grouping by page (not role, not a flat list) keeps each card's cognitive scope small (2-5 rows) despite 54 total checkboxes.
- Mobile scroll hint ("→ Tabelle nach links wischen für weitere Rollen") confirmed present and correct.

## Priority Issues

**[P0] Admin column's own checkboxes are fully interactive and unprotected** — confirmed live: not disabled, not read-only. An admin can revoke their own "Seite sichtbar" or "Konten & Zahlungen" right in one misclick, instant unconfirmed API call, no safety net — on the page whose own copy says other pages are hard-locked to Admin specifically to prevent this. → `/impeccable harden`

**[P1] Every checkbox commits immediately and permanently for a live role** (i.e. every current and future user with that role) with no confirmation, batch-review, or undo. → `/impeccable harden`

**[P2] Checkboxes measure 20×20px** (confirmed via getBoundingClientRect), well under the app's own 44px minimum, with no click handler on the surrounding cell — real problem on a 54-checkbox matrix for the "auch Eltern, auch am Handy" persona. → `/impeccable adapt`

**[P2] Checkboxes render with native browser styling** (default Chromium blue), the only place in the audited pages where an interactive control ignores the design system's color rules entirely. → `/impeccable colorize`

**[P3] Silent full reload() on save failure discards all unsaved optimistic state** — with several quick toggles, no way to tell which one failed. → `/impeccable harden`

## Persona Red Flags
- **Alex (power-admin)**: exactly the type who'd rapid-fire several toggles while cleaning up permissions and not notice they just pulled their own page-visibility right until the page disappears from their own sidebar.
- **Casey (mobile)**: 20px checkboxes against a documented 44px rule, on a page meant to be usable by a mixed-technical-literacy family group.

## Minor Observations
- Table headers have no `scope="col"` — screen readers navigating cell-by-cell may not reliably announce which role a checkbox belongs to.
- Checkbox focus ring is the browser default, not matching the rest of the app's focus treatment.

## Questions to Consider
- The page's own intro text says other admin modules are hard-locked "to prevent exactly this class of problem" — wouldn't disabling (or requiring confirmation for) the Admin column be a five-line fix that closes the biggest hole on this page?

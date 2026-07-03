---
target: AdminUsersPage (src/features/admin-users/AdminUsersPage.tsx)
total_score: 25
p0_count: 2
p1_count: 0
timestamp: 2026-07-03T10-29-04Z
slug: src-features-admin-users-adminuserspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | "(gesperrt)" and "(agiert aktuell als Spieler...)" inline are genuinely transparent |
| 2 | Match System / Real World | 4/4 | Spieler/Spielleiter/Administrator mirror the pool's actual roles |
| 3 | User Control and Freedom | 1/4 | Same Modal Escape/backdrop-dismiss defect, verified live here too |
| 4 | Consistency and Standards | 3/4 | Sperren styling is always-red regardless of actual severity of the specific action |
| 5 | Error Prevention | 1/4 | Role-change select and Sperren/Entsperren fire immediately on interaction with zero confirmation — the one clear regression relative to this page's own siblings (template delete, email send both use confirm()) |
| 6 | Recognition Rather Than Recall | 3/4 | Role shown directly in the row's select |
| 7 | Flexibility and Efficiency | 3/4 | Search-by-name/email filter present and responsive |
| 8 | Aesthetic and Minimalist Design | 4/4 | On-brand |
| 9 | Error Recovery | 1/4 | No undo path if the role select or Sperren button is fat-fingered |
| 10 | Help and Documentation | 2/4 | No explanation of what "gesperrt" actually restricts |
| **Total** | | **25/40** | **Acceptable — dragged down by two genuine P0s** |

## Anti-Patterns Verdict
**LLM: PASS** on slop, but this is the riskiest page of the whole session functionally — "fast/clean CRUD" collides with "should probably make you think twice." **Detector**: CLI clean (0).

## Overall Impression
Calm scanning of the list gives way to real risk at the role select and Sperren button: both commit to the database instantly, with no confirmation, no undo, and — critically — no guard against the acting admin targeting their own row. Unlike this page's siblings (template delete, bulk email send), which both correctly gate their consequential action behind a confirm(), this page's two highest-blast-radius actions have none at all.

## What's Working
- "(agiert aktuell als Spieler, eigentlich {base_role})" inline note surfaces the real-role/acting-role split directly in context.
- Named-target password-reset confirmation gives specific, checkable feedback.
- Create-user form's self-set-vs-email-invite password mode, with policy-aware validation, is a well-thought-out two-path flow.

## Priority Issues

**[P0] Role change and account lock/unlock fire instantly with zero confirmation, including on the acting admin's own row.** Source-verified: `updateProfileRole`/`setProfileActive` are called directly from the select's `onChange`/button's `onClick`, no confirm(), no undo. Live-verified: the logged-in admin's own row shows an active, clickable Sperren button and editable role select with no self-targeting guard. No "last admin" protection visible in `profilesApi.ts` either — nothing stops demoting or locking the only remaining administrator, which would strand the pool's entire admin function. **This is the most severe finding of the session** — unlike bulk-email or template-delete, its blast radius includes locking yourself out of the admin tool entirely. → `/impeccable harden`

**[P0] Modal cannot be dismissed via Escape or backdrop click** — same shared Modal.tsx defect, live-verified here too (now confirmed on 4 pages this session). → `/impeccable harden`

**[P2] Editing another user's email silently changes their login credential** — a helper line exists ("Ändert auch die Login-Adresse..."), but the Speichern button carries the same weight as any routine save for a field that can lock a real person out if mistyped. → `/impeccable clarify`

**[P3] "gesperrt" has no explanation of scope** — unclear to a less-technical admin whether it blocks login only, or also email eligibility (which is in fact coupled via SendEmailPage's `is_active` check). → `/impeccable clarify`

## Persona Red Flags
- **Alex (power-admin)**: the user most likely to move fast through this list is the one most exposed — a quick cleanup session is one misclick from a real incident (self-lockout or accidental admin grant) with no recovery step surfaced.
- **Riley (stress-tester)**: rapidly toggling Sperren/Entsperren or the role select commits every intermediate state live with no batching/undo.

## Minor Observations
- Role select and Sperren button both measured at 44px height live — touch targets are fine, it's purely the missing confirmation that's the problem.
- Password field in Create is intentionally `type="text"` (admin setting someone else's initial password) — reasonable, not a bug.

## Questions to Consider
- Löschen (templates) and Senden (bulk email) both got a confirm() gate — was skipping it here on role-change/lock a deliberate scope decision, or did this page ship before that pattern was applied consistently? The team clearly knows the pattern; it's just missing on the two highest-blast-radius actions in the entire app.
- Should the acting admin's own row even expose Sperren/role controls, or should self-targeting be disabled?

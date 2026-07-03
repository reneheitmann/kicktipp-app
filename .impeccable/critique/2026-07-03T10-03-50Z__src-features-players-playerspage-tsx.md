---
target: PlayersPage (src/features/players/PlayersPage.tsx)
total_score: 34
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-03-50Z
slug: src-features-players-playerspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Live "(N ausgewählt)" counter on the login-link section is a nice touch |
| 2 | Match System / Real World | 4/4 | "z. B. wenn Eltern und Kind sich einen Spieler teilen" — exactly the family-audience language PRODUCT.md calls for |
| 3 | User Control and Freedom | 3/4 | Cancel always available; delete uses native confirm() instead of the app's own Modal |
| 4 | Consistency and Standards | 3/4 | Matches tokens well, shares the 32px checkbox-row shortfall with SeasonComparisonPage |
| 5 | Error Prevention | 4/4 | Duplicate name / Kicktipp-name checked client-side with specific error copy |
| 6 | Recognition Rather Than Recall | 4/4 | Every row shows name + Kicktipp name inline |
| 7 | Flexibility and Efficiency | 3/4 | Combined search efficient; nested scroll regions work against it on touch |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean modal, no clutter |
| 9 | Error Recovery | 3/4 | describePlayerSaveError surfaces inline, specific red text |
| 10 | Help and Documentation | 3/4 | Helper text under Kicktipp-name and login-link fields is genuinely clarifying |
| **Total** | | **34/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Plain, sensible admin CRUD screen — reuses the real list pattern, login-linking UI correctly admin-gated rather than shown-but-disabled to everyone. **Detector**: CLI clean (0).

## Overall Impression
Second-best score of the session so far. Solid roster-management screen with genuinely useful client-side validation and admin-appropriate copy. The recurring 32px-checkbox-row issue (also found on SeasonComparisonPage) and the native-confirm-on-delete are the main blemishes.

## What's Working
- Login-linking checkbox list is correctly admin-gated with no extra chrome.
- Combined name+Kicktipp-name search matches the real mental model in one field.
- Client-side duplicate-name/duplicate-Kicktipp-name validation with specific error text, before any request fires.

## Priority Issues

**[P1] Login-link checkbox rows measure 32px tall** (verified via DOM boundingBox) — the same underlying pattern (h-4 w-4 checkbox in a py-1.5 label) as SeasonComparisonPage's picker, and the same 44px-rule violation. Worth a single shared component fix since it's duplicated across at least two pages. → `/impeccable adapt`

**[P2] `{p.name} ({p.email})` truncates as one unit** — on narrow viewports the disambiguating email is the first thing cut off, exactly when two same-named profiles would need it most. → `/impeccable clarify`

**[P2] Nested scrollable regions** — login list's own overflow-y-auto sits inside the modal's own overflow-y-auto, a known scroll-trap pattern on touch once the profile list grows. → `/impeccable adapt`

**[P3] Delete confirmation uses native `confirm()`** instead of the app's own danger-styled ConfirmDialog (already applied elsewhere this session). → `/impeccable harden`

## Persona Red Flags
- **Alex (power-admin)**: today's small test dataset hides both the truncation and checkbox issues; both compound as the (explicitly growing) login-linking feature scales.
- **Sam (screen reader/keyboard)**: checkboxes correctly use `<label>` for implicit association, but the 32px row height falls short of the same generous-hit-area guidance that benefits keyboard/switch-device users too.

## Minor Observations
- Action buttons wrap cleanly on mobile via flex-wrap, no overflow.
- Modal title correctly swaps between "Spieler anlegen"/"Spieler bearbeiten."

## Questions to Consider
- Since the same undersized checkbox-row pattern appears on two pages, should there be one shared CheckboxListRow component enforcing 44px everywhere at once?

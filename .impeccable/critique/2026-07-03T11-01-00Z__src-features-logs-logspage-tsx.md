---
target: LogsPage (src/features/logs/LogsPage.tsx)
total_score: 27
p0_count: 1
p1_count: 1
timestamp: 2026-07-03T11-01-00Z
slug: src-features-logs-logspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Loading text present, but the P0 layout break undermines system status readability |
| 2 | Match System / Real World | 4/4 | Precise, non-generic disclaimer about scope/retention (300 entries, 30 days) |
| 3 | User Control and Freedom | 3/4 | Search/filter easily cleared; no export before clearing logs |
| 4 | Consistency and Standards | 3/4 | Destructive action uses native confirm() instead of app dialog patterns (functionally more accessible, but visually inconsistent) |
| 5 | Error Prevention | 2/4 | Clear-logs confirm is generic, no row count/date range context |
| 6 | Recognition Rather Than Recall | 4/4 | Level badges, source, timestamp all visible |
| 7 | Flexibility and Efficiency | 2/4 | No copy/export for JSON details, no pagination beyond fixed 300 |
| 8 | Aesthetic and Minimalist Design | 2/4 | Directly punctured by the P0 layout blowout |
| 9 | Error Recovery | 2/4 | Load failure shows static red text, no retry, only full reload works |
| 10 | Help and Documentation | 3/4 | Correctly scoped for this register |
| **Total** | | **27/40** | **Acceptable — dragged down by a genuine P0** |

## Anti-Patterns Verdict
**LLM: PASS.** Precise, useful copy that tells an admin exactly what the log view is/isn't — no filler, no fake stats. **Detector**: CLI clean (0).

## Overall Impression
A calm, well-scoped diagnostics tool with one serious, structural flaw: expanding a log entry with a long unbroken string (e.g. a stack trace) breaks the entire app's layout, not just this page.

## What's Working
- Destructive "Logs leeren" uses native `window.confirm()` — ironically more keyboard-robust (Escape-to-cancel) than pages using the app's own Modal component.
- Description copy is precise about scope/limits (not a full audit trail, 30-day retention, 300-entry cap) — sets correct expectations.
- Accordion-style row expansion keeps the list scannable.

## Priority Issues

**[P0] Layout-breaking horizontal overflow on row expand.** Expanding a log entry whose `details` contains a long unbroken string (e.g. `componentStack`) blows the page out to ~9,992px wide (verified via `scrollWidth`), because `<main>` in `AppShell.tsx` is `flex-1 overflow-y-auto` **without `min-w-0`** — a flex item without that property refuses to shrink below its content's natural width. **This is a shared layout bug, not LogsPage-specific** — any page rendering an unbreakable long string inside a scrollable child will trigger it. Fix: add `min-w-0` to `<main>` in `AppShell.tsx` — a one-line, root-cause fix covering every page, not just this one. → `/impeccable harden`

**[P1] No retry on log-load failure** — static red sentence, only a full reload recovers. On a diagnostics page whose whole purpose is investigating failures, this is a rough edge. → `/impeccable harden`

**[P2] Delete confirmation lacks context** — `confirm('Alle Logs unwiderruflich löschen?')` doesn't state entry count or date range for an irreversible action. → `/impeccable clarify`

**[P3] No export/copy affordance** — for a "Für Supportzwecke gedacht" tool, no way to copy a log entry's JSON or export the filtered list. → `/impeccable optimize`

## Persona Red Flags
- **Riley (stress-tester)**: any pathological string (nested stack trace, long URL, base64 blob) reproduces the P0 blowout — exactly the content this viewer exists to show.
- **Sam (screen reader/keyboard)**: the confirm() dialog is accessible, but the load-error message has no aria-live — a failed reload isn't announced.

## Minor Observations
- Search/select/button touch targets all measured exactly 44px — compliant.
- No visual cue that the 300-entry cap may be truncating older entries, beyond the static intro text.

## Cross-page note
No `aria-live`/`role="alert"` on error messages is now confirmed on this page, PasswordPolicyPage, and LoginPage — a genuinely widespread gap across the session, worth a single sweep rather than page-by-page fixes.

## Questions to Consider
- Is `AppShell`'s missing `min-w-0` worth a proactive audit of every page rendering variable-length/user-controlled strings, since this bug is structural, not local to Logs?

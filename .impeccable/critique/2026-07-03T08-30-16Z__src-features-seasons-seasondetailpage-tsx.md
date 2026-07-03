---
target: Saison-Detailseite (src/features/seasons/SeasonDetailPage.tsx)
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-07-03T08-30-16Z
slug: src-features-seasons-seasondetailpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Every mutation unmounts the entire page to "Lade...", losing scroll position |
| 2 | Match System / Real World | 3/4 | Domain vocabulary matches the group's own Kicktipp terms |
| 3 | User Control and Freedom | 2/4 | Season delete is well-protected; matchday delete/participant removal/status toggles are not |
| 4 | Consistency and Standards | 2/4 | Destructive actions split between the app's own Modal and bare `window.confirm()` |
| 5 | Error Prevention | 2/4 | Reopening a matchday warns about lost Gewinn; season Abschließen/Reaktivieren warns about nothing |
| 6 | Recognition Rather Than Recall | 3/4 | Selected player's Platz/Gewinn repeats on every matchday row |
| 7 | Flexibility and Efficiency | 2/4 | No bulk actions for 84 participants — one modal at a time |
| 8 | Aesthetic and Minimalist Design | 3/4 | Faithful to DESIGN.md; loses a point to 5 co-equal header buttons and dense per-row clusters |
| 9 | Error Recovery | 2/4 | Errors are generic red text with no cause or recovery guidance |
| 10 | Help and Documentation | 1/4 | The favorite-star's cross-section effect exists only in a code comment |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment: PASS.** No gradients, no glassmorphism, no hero-metric cards, no decorative eyebrows. If anything the page errs toward *too* undifferentiated rather than decorated — consistent with (and a byproduct of) the deliberately restrained design system.

**Deterministic scan:** CLI scan on all five source files: 0 findings. Live-injected detector on the fully-expanded page (84 participants + 34 matchdays visible): one grouped finding (`overused-font`/`single-font`/`flat-type-hierarchy`) — the same pattern already confirmed as a **false positive** in three prior Dashboard critique rounds, matching DESIGN.md's documented "No-Display-Font Rule" exactly. No new anti-patterns surfaced despite testing the densest, most complex page in the app.

## Overall Impression

This is the app's most complex page, and it shows in a specific way: not in decoration or slop, but in **inconsistent friction calibration**. The season-delete flow is genuinely excellent — typed-name confirmation, itemized warning, real trust-building design. But sitting right next to it in the same header row, the Abschließen/Reaktivieren toggle has zero confirmation in either direction, and elsewhere on the page, matchday deletion and participant removal fall back to unstyled native `confirm()` dialogs instead of the app's own Modal. The biggest single fix, though, is structural: every edit on a page built around managing 84 rows blanks the entire page and loses scroll position, which actively punishes the one persona (the Spielleiter) this page exists to serve.

## What's Working

1. **`DeleteSeasonDialog`'s typed-name confirmation** — proportionate friction for the one truly catastrophic action here (cascading delete of all matchdays/participants/transactions), with plain-language enumeration of what's destroyed.
2. **Per-row selected-player readout** on the matchday list — a participant checking their own results never has to hold anything in working memory while scrolling 34 rows.
3. **`CollapsibleSection` with persisted open-state and visible counts** — a legitimate progressive-disclosure mechanism; a returning admin's layout preference is respected, and `(84)`/`(34)` stay visible even collapsed.

## Priority Issues

**[P1] Full-page teardown on every mutation**
- **Why it matters**: `reload()` fires after every add/update/remove/status-toggle, unmounting the whole tree to a bare "Lade..." and resetting scroll to top. For an admin managing 84 rows, every single edit means losing your place.
- **Fix**: scope loading to the affected row/section (button spinner or optimistic local update) instead of tearing down the page.
- **Suggested command**: `/impeccable optimize`

**[P1] Inconsistent destructive-action pattern**
- **Why it matters**: Season delete uses the app's own trustworthy `Modal` with typed confirmation; matchday delete, participant removal, and status reopens fall back to unstyled `window.confirm()` (confirmed live) — a real-money action getting a browser-chrome experience instead of the app's own.
- **Fix**: route all deletions/reopens through the existing `Modal` component; reserve typed-name confirmation for season-level delete only.
- **Suggested command**: `/impeccable harden`

**[P1] Favorite star fails non-text contrast and hides a load-bearing control**
- **Why it matters**: Unselected state is `text-slate-300` on white (~1.5:1) — below the 3:1 non-text WCAG threshold, and lighter than `slate-400`, which DESIGN.md already rejected at 2.56:1 for the same reason. This isn't decorative: it silently sets the default player shown in "Spieltage."
- **Fix**: use ≥`slate-400` or an outline treatment for the unselected state.
- **Suggested command**: `/impeccable adapt`

**[P2] Ungrouped header actions; season status toggle has zero confirmation**
- **Why it matters**: 5 equal-weight buttons in one row with no grouping; unlike its sibling `handleToggleGesamtwertungStatus` (which warns on reopen), `handleToggleSeasonStatus` never confirms in either direction.
- **Fix**: split into a primary group and a status-change group; add the same confirm pattern already used elsewhere in this file.
- **Suggested command**: `/impeccable layout`

**[P2] No bulk actions for 84 participants**
- **Why it matters**: Add/edit/remove is strictly one modal at a time despite `CopySeasonDialog` already proving the codebase models "N players at once" for cross-season copy — real day-to-day friction setting up a season each year.
- **Suggested command**: `/impeccable optimize`

## Persona Red Flags

**Alex (Spielleiter, 84 participants)**: Editing participant #60 scrolls back to top on every save (P1). No bulk add/remove/import. Could misclick "Abschließen" among 5 same-weight buttons with no confirmation and no success toast.

**Jordan (regular participant, first time)**: "Teilnehmer & Einsätze" is collapsed by default behind a bare unlabeled ▶ — nothing signals "what did I even bet" lives there. The near-invisible favorite star also silently drives the default player shown elsewhere, a connection Jordan has no way to discover.

**Sam (screen reader/keyboard-only)**: Unselected star at ~1.5:1 contrast is effectively invisible. Deletions alternate between the accessible Modal and native `confirm()` — inconsistent focus-management across the highest-stakes interactions on the page.

## Minor Observations

- Season "aktiv" and matchday "abgerechnet" badges both use the same green `positive` tone for two unrelated semantic dimensions — easy to conflate at a glance.
- Matchday search matches both number and date without indicating which field matched.
- "Aus dem Internet importieren" could read "Von Kicktipp importieren" for consistency with the rest of the page's explicit naming.
- Both source-only and live-injected detector scans came back clean on real content (84 rows expanded) — the only live finding was the confirmed font/hierarchy false positive.

## Questions to Consider

1. What if "Teilnehmer & Einsätze" — the section a non-technical parent most needs — weren't collapsed by default, given "Spieltage" already is open?
2. What if the favorite-star mechanic were replaced with an explicit "Das bin ich" self-identification step at first login, rather than a low-contrast star that also covertly drives a different section's default?
3. What if every mutating action used the same optimistic-update-plus-toast pattern instead of the full-page teardown, given the persona this page is built for is the one most punished by it?

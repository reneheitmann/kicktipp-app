---
target: MatchdayDetailPage (src/features/seasons/MatchdayDetailPage.tsx)
total_score: 27
p0_count: 1
p1_count: 1
timestamp: 2026-07-03T10-11-51Z
slug: src-features-seasons-matchdaydetailpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Desktop fine; mobile readability issue undermines status confidence |
| 2 | Match System / Real World | 4/4 | "Spieltags-Einsatz", "Teilnehmer nachtragen" are precise domain terms |
| 3 | User Control and Freedom | 1/4 | Same shared-Modal Escape/backdrop-dismiss bug, reproduced live on the Stake-Entry edit modal |
| 4 | Consistency and Standards | 4/4 | Identical card/badge/button vocabulary as other pages |
| 5 | Error Prevention | 3/4 | "Entfernen" is gated by a native confirm() naming the specific player |
| 6 | Recognition Rather Than Recall | 1/4 | Mobile: player names truncate to identical "Tests..." strings across most rows |
| 7 | Flexibility and Efficiency | 3/4 | Bulk "N fehlende Teilnehmer nachtragen" is a genuinely efficient shortcut |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean, restrained |
| 9 | Error Recovery | 2/4 | Generic single-line red error text, no per-row targeting |
| 10 | Help and Documentation | 3/4 | Correctly omitted for this register |
| **Total** | | **27/40** | **Acceptable — dragged down by a genuine P0** |

## Anti-Patterns Verdict
**LLM: PASS.** Thin composition of two shared, well-factored components (StakeEntriesSection, RankingsSection) — genuine reuse discipline. **Detector**: CLI clean (0).

## Overall Impression
Desktop is calm and workable, on par with the other admin pages. Mobile is where trust breaks: the player-name column shrinks to 54px against a 105-166px text need, and since this real season's roster is dominated by "Testspieler NN" names, most rows render as the visually identical "Tests...". An admin correcting one player's stake on their phone cannot reliably tell rows apart — a real "did I just edit the wrong person's money" risk, not a cosmetic one.

## What's Working
- Bulk "fehlende Teilnehmer nachtragen" button is well-scoped (only shows when there are missing participants) and uses each participant's own configured default stake.
- Remove actions name the specific player in the confirm dialog — better than a generic "Are you sure?"
- Row heights hold at 69px consistently across ~172 measured rows on both desktop and mobile — the systemic 32px-checkbox-row issue found elsewhere does not recur here.

## Priority Issues

**[P0] Player names are unreadable on mobile in the Stake-Entries list** — verified via DOM measurement: name `<p>` clientWidth 54px vs. scrollWidth 105-166px needed. Full-size fixed-width Bearbeiten/Entfernen buttons squeeze the one column that identifies the row, and because most real players share a "Testspieler NN" prefix, the truncated text is often literally identical across rows. This is P0 rather than P1 because it risks *actively editing/deleting the wrong record*, not just passively missing information. Fix: stack name above amount/buttons on narrow viewports, or shrink buttons to icon-only with adequate touch target. → `/impeccable adapt`

**[P1] Same Modal Escape/backdrop-dismiss bug as AccountsOverviewPage** — one shared-component fix resolves it everywhere. → `/impeccable harden`

**[P2] No per-row error targeting**, same shared-component pattern issue as SeasonRankingPage. → `/impeccable clarify`

**[P3] Bulk-nachtragen and import link create three stacked toolbars before content** — slightly busier than the other two admin pages. → `/impeccable layout`

## Persona Red Flags
- **Casey (mobile)**: on-the-go stake correction right before a matchday deadline becomes a guessing game between identically-truncated "Tests..." rows.
- **Sam (screen reader/low-vision keyboard)**: no `title` attribute or accessible full-name fallback on the truncated name; a low-vision sighted keyboard user hits the same distinguishability problem as Casey.

## Minor Observations
- Edit-mode player name shown in a disabled-looking gray box rather than a true disabled input — accessible and readable, reasonable pattern.
- "+ Spieler" only appears when players remain to add — correctly hides a dead-end action once roster is full.
- Numeric Spieltags-Einsatz inputs use `type="text" inputMode="decimal"` rather than native number — deliberate choice avoiding locale-decimal spinner weirdness, not an oversight.

## Questions to Consider
- Was the mobile Stake-Entries row layout ever reviewed against real data, or only against short, distinct test names where the truncation wouldn't show up?

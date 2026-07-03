---
target: Dashboard/Übersicht (src/pages/DashboardPage.tsx)
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-07-03T07-52-13Z
slug: src-pages-dashboardpage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Single opaque "Lade..." gates the entire page (2.5–5s+ for a multi-player account), no skeleton, no progressive reveal |
| 2 | Match System / Real World | 3/4 | "Guthaben"/"offen"/"Ausgeglichen" is plain; the breakdown line is denser jargon |
| 3 | User Control and Freedom | 2/4 | No way to collapse per-player breakdown cards or see "just the total" on multi-linked accounts |
| 4 | Consistency and Standards | 4/4 | Cards, badges, currency formatting, and the emerald-600/700 contrast rule applied uniformly |
| 5 | Error Prevention | 3/4 | Read-only page, little to error on |
| 6 | Recognition Rather Than Recall | 3/4 | Season rows good; quick-access tiles are text-only, no icon/subtitle |
| 7 | Flexibility and Efficiency | 2/4 | No shortcuts, no way to suppress admin-stats block or jump to "my balance only" |
| 8 | Aesthetic and Minimalist Design | 3/4 | Strong per-card, but a wall of near-identical cards on multi-linked accounts |
| 9 | Error Recovery | 1/4 | No error UI anywhere; a failed API call silently yields a partial page on a money screen |
| 10 | Help and Documentation | 2/4 | No inline help for "Beiträge" vs "Eingezahlt" vs "Gewinne" |
| **Total** | | **25/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment (Assessment A): PASS.** No gradient text, no glassmorphism, no side-stripe borders, no eyebrow labels. The 4-tile stat-card row is structurally the generic "AI dashboard" template but executed with real restraint (no icons, no trend arrows, no colored borders) — reads as a banking statement, not SaaS boilerplate. The single-accent-color discipline (brand red appears nowhere on this page except the inherited sidebar) is the strongest evidence against AI-slop authorship.

**Deterministic scan (Assessment B):** `detect.mjs` on the source files alone found zero hits. The **live-injected** browser detector found 3 distinct rule names on desktop (`line-length`, `overused-font`/`single-font`, `flat-type-hierarchy`), 2 on mobile (line-length didn't fire — same text wraps shorter on a narrow viewport).

**Where they disagree — and why B's findings are mostly false positives for this project specifically:**
- `overused-font`/`single-font` ("only roboto used") and `flat-type-hierarchy` (12–20px, 1.7:1 ratio) are **exactly** what `DESIGN.md`'s own **"No-Display-Font Rule"** and general restraint philosophy prescribe: one system-font stack, hierarchy via size/weight only, no second typeface. A generic detector correctly flags "one font, flat scale" as an AI-slop pattern in general — but here it's a *documented, deliberate* choice, not an oversight. False positive relative to this project's actual design system.
- `line-length` (~160 chars, desktop only) is genuine and **independently corroborates** Assessment A's P2 finding below: the `BalanceBreakdown` line (`Beiträge: X · Eingezahlt: Y · Ausgezahlt: Z · Gewinne: W`) is long, dense, and unlabeled. Two independent methods — a raw text-measure heuristic and cognitive-load/persona reasoning — converged on the same element from different angles. That's the strongest single signal in this whole critique.

## Overall Impression

The Dashboard's best moment is also its whole thesis: "Willkommen, {Name}" immediately followed by a clear, correctly-colored balance headline answers the product's stated success metric in the first two lines, with zero mental math required. That's design-from-principles done right. But the page has no error state on a screen whose entire job is telling someone how much money they owe, no keyboard bypass for the persistent 17-item sidebar, and its one deliberately-reused pattern (the balance card) doesn't degrade gracefully once an account is linked to more than 2-3 players — which is exactly the account shape this session's newest feature (multi-player links) was built to support. The biggest opportunity: make the multi-player case as calm as the single-player case already is.

## What's Working

1. **The balance headline is the actual UI, not decoration around it.** "747,61 € Guthaben" in emerald, first thing on screen, no math required — directly executes PRODUCT.md's stated success criterion.
2. **Disciplined color restraint holds even on the highest-stakes page.** Nothing here uses the brand accent to mean "money" or "status" — status is carried entirely by the semantic emerald/amber tokens, so brand and financial meaning never collide.
3. **"Offen" is amber, not red.** A small, deliberate choice (verified in DESIGN.md and consistent here) that keeps a friendly-stakes betting pool from feeling punitive when someone owes money.

## Priority Issues

**[P1] No error state on a money page**
- **Why it matters**: `DashboardPage.tsx`'s ~8 parallel/chained API calls have no `.catch()`. If any fails, `loading` still flips to `false` via `.finally()` and the user sees whatever partial data resolved — silently — on the one screen whose entire purpose is telling them how much money they owe or are owed. A wrong number shown with confidence is worse than an explicit error.
- **Fix**: wrap the load chain in try/catch; render a warning-toned banner ("Daten konnten nicht vollständig geladen werden") instead of presenting partial state as complete.
- **Suggested command**: `/impeccable harden`

**[P1] 17 keyboard tab-stops before reaching any page content**
- **Why it matters**: Confirmed via automated tab trace — a keyboard user tabs through all 13 sidebar items + footer links before reaching the first Dashboard card, on *every* page, not just this one. Textbook WCAG 2.4.1 (Bypass Blocks) failure.
- **Fix**: add a visually-hidden "Zum Inhalt springen" skip link as the first focusable element in `AppShell`, targeting `<main>`.
- **Suggested command**: `/impeccable harden`

**[P2] Dense, unlabeled breakdown line — confirmed by both assessments independently**
- **Why it matters**: `Beiträge: X · Eingezahlt: Y · Ausgezahlt: Z · Gewinne: W` packs four similar-sounding financial terms into one 12px line with no separation or tooltips, repeated once per card (up to 6× on a multi-linked account). Flagged by the live detector as excessive line-length, and independently by persona-walkthrough as the hardest-to-parse element for a less tech-savvy parent — the app's own named target user.
- **Fix**: restructure as a 2×2 label/value mini-grid, or add a one-line help affordance on first use.
- **Suggested command**: `/impeccable clarify`

**[P2] Zero-linked-player accounts get no explanation**
- **Why it matters**: When `linkedPlayers.length === 0`, the "Mein Konto" section is silently omitted — a newly-invited user sees "Willkommen" and then nothing telling them why there's no balance, directly undercutting PRODUCT.md's stated success criterion.
- **Fix**: render a neutral card: "Dein Login ist noch nicht mit einem Spieler verknüpft. Wende dich an deinen Spielleiter."
- **Suggested command**: `/impeccable onboard`

**[P2] Multi-linked-player accounts don't degrade gracefully**
- **Why it matters**: The live test account (6 linked players) rendered six full-detail breakdown cards stacked with no cap — the "ruhiger Kontoauszug" calm the single-player case achieves collapses into a long scroll of near-identical cards for exactly the accounts the multi-player-link feature was built to serve. Also: the admin-only aggregate "Statistik" block (pool-wide numbers, e.g. "Offene Beträge: 1.231,12 €" across all players) sits directly below the user's own balance in visually identical card styling — real risk of misreading someone else's/the pool's total as your own.
- **Fix**: for >2-3 linked players, consider a compact table instead of repeated full cards; visually distinguish the admin-stats block (e.g. muted background) from personal balance cards.
- **Suggested command**: `/impeccable layout`

**[P3] Accessible names run words together**
- **Why it matters**: Tab-trace showed accessible text like `25/26546,00 €aktiv` and `Bernd Sroka549,37 € Gutha…` — text nodes concatenate with no separator, so a screen reader announces name/amount/status as one unbroken string.
- **Fix**: add explicit `aria-label`s that separate the parts, e.g. `aria-label="Saison 25/26, Gewinn 546,00 €, Status aktiv"`.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Jordan (Confused First-Timer)**: If not yet linked to a player, sees "Willkommen" and then nothing explaining their financial status — the one thing this page exists to do is silently absent. The breakdown line's four jargon terms have no glossary or tooltip anywhere on the page.

**Sam (Accessibility-Dependent User)**: Must tab past 17 nav/footer links before reaching any Dashboard content, on every page load, with no skip link. Season-row and player-card accessible names concatenate without word separation, making the announced string ambiguous to a screen reader.

**Parent linked to multiple players (project-specific persona, from PRODUCT.md's named "weniger technikaffine Nutzer wie Eltern")**: Sees the pool-wide admin "Offene Beträge" total directly beneath their own personal balance in nearly identical styling — real risk of confusing the group's total with their own. If linked to several family members' players, sees six stacked full-detail cards with no indication which is "theirs."

## Minor Observations

- Hover states (`hover:bg-slate-50`) on rows/tiles are very subtle in screenshots — borderline-imperceptible, though not a hard failure since the card+padding convention already signals interactivity.
- Keyboard focus ring on sidebar links is the visible browser default — good, nothing overridden it away.
- `PlayerBalanceSummary` (the "alle Spieler" aggregate) is correctly a non-link `<div>`, not a misleading click target — good instinct already in the code.
- Both detector runs (source-only and live-injected) agree the codebase itself is clean; all live-injected findings trace back to genuinely rendered content, not phantom issues.

## Questions to Consider

1. What if the admin-only "Statistik" block used a visually distinct (muted) background so a Spielleiter's own money and the pool's back-office numbers can never be confused at a glance?
2. What if a login with zero linked players got an explicit, friendly empty state instead of a missing section?
3. What if accounts linked to more than 2-3 players got a compact table instead of full repeated cards — so the calm the single-player case already has doesn't collapse exactly for the accounts the newest feature was built to serve?

---
target: EmailSettingsPage (src/features/email-settings/EmailSettingsPage.tsx)
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T10-40-33Z
slug: src-features-email-settings-emailsettingspage-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Speichert.../Sendet... states exist; no aria-live on result text |
| 2 | Match System / Real World | 3/4 | Accurate SMTP jargon, appropriate for an admin-only page |
| 3 | User Control and Freedom | 2/4 | No explicit "discard edits" affordance besides navigating away |
| 4 | Consistency and Standards | 4/4 | Fully matches DESIGN.md card/input/button spec |
| 5 | Error Prevention | 2/4 | Speichern instantly overwrites the live, real SMTP config with zero confirmation |
| 6 | Recognition Rather Than Recall | 3/4 | Fields pre-filled; password presence only via placeholder text |
| 7 | Flexibility and Efficiency | 3/4 | Single straightforward flow, appropriate for an infrequent task |
| 8 | Aesthetic and Minimalist Design | 4/4 | — |
| 9 | Error Recovery | 2/4 | Generic fallback error strings, silent for screen-reader users |
| 10 | Help and Documentation | 2/4 | No inline help for encryption mode choice |
| **Total** | | **28/40** | **Good** |

## Anti-Patterns Verdict
**LLM: PASS.** Terse, on-brand, precise SMTP terminology rather than translated boilerplate — reads as hand-written, not template output. **Detector**: CLI clean (0).

## Overall Impression
A well-thought-out password-handling pattern (empty field = unchanged, never round-trips a stored secret) undercut by an instant, unconfirmed save of a live, shared, outbound-mail-critical config.

## What's Working
- Password field's "leave empty = unchanged" pattern avoids ever sending a stored secret back to the client while still signaling one is set.
- `saveEmailSettings` deliberately omits the password key from the payload when empty, so upsert never nulls a previously-stored password — a real, non-obvious correctness detail done right.
- Test-send is cleanly separated from the save form, avoiding "verify" vs. "commit" conflation.

## Priority Issues

**[P1] Speichern instantly persists real, shared SMTP config app-wide with zero confirmation** — a bad host/port silently breaks all outbound mail (password resets, notifications) until someone notices. → `/impeccable harden`

**[P2] No aria-live/role="status" on success/error messages** — screen-reader users get no feedback after Speichern or Senden. → `/impeccable harden`

**[P2] No show/hide toggle on the password field** — no way to confirm what was actually typed before submitting an otherwise-invisible credential. → `/impeccable harden`

**[P3] No inline help for Verschlüsselung options.** → `/impeccable clarify`

## Persona Red Flags
- **Alex (power-admin)**: wants "test before you commit"; today Senden validates only what's already saved, not what's on-screen — real friction when actively debugging.
- **Sam (screen reader/keyboard)**: outcome of Speichern is silent unless focus happens to land on the message.

## Minor Observations
- Focus ring correctly uses slate-900 per the Focus-Stays-Neutral rule.
- All measured inputs/buttons/selects are 44px — touch-target rule respected here.

## Questions to Consider
- If this form irreversibly changes how every notification email gets sent, why does the purely-informational test-send button get equal weight to the actually consequential Speichern?

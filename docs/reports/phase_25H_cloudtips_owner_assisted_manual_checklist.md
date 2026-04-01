# Phase 25H - CloudTips Owner-Assisted Manual Checklist

- Scope: owner/admin triage improvements only
- Must stay unchanged: 25F user-facing support flow

## 1) Owner queue CloudTips candidate clarity

1. Open owner console -> support claim validation queue.
2. Set status focus to `Needs review`.
3. Set rail triage focus to `CloudTips candidate`.
4. Verify:
   - only CloudTips candidate rows are shown,
   - each row shows clear rail context + continuity + proof count,
   - queue remains readable without opening every card.

## 2) Rail-aware hint usefulness

1. In mixed queue, switch between:
   - `All rails`
   - `Boosty continuity`
   - `Manual fallback`
   - `Legacy context`
2. Verify:
   - counts update correctly per focus,
   - owner triage cue text appears in summary and decision context,
   - cue helps identify what to check next.

## 3) No fake verification behavior

1. Pick at least one CloudTips candidate claim.
2. Verify:
   - no claim is auto-approved,
   - no text says provider verification is complete,
   - approve/reject still requires explicit owner action.

## 4) 25F user-facing flow unchanged

1. Open Profile support area as normal user.
2. Verify:
   - one clear main support path is still present,
   - one compact fallback path is still present,
   - no new dual-rail complexity appears in the primary user lane.

## 5) RU/EN touched strings

1. Repeat sections 1-3 in EN and RU.
2. Verify:
   - new owner queue labels and triage cues are translated,
   - meaning remains consistent across languages.

## 6) Compact pass/fail matrix

| Area | Pass/Fail | Notes |
|---|---|---|
| CloudTips candidate focus clarity |  |  |
| Rail focus filters and counts |  |  |
| Owner triage cue usefulness |  |  |
| Manual review gate preserved |  |  |
| No fake verification wording |  |  |
| 25F user flow unchanged |  |  |
| RU/EN parity for touched strings |  |  |

## 7) Notes format

Use one line per finding:
- `[Area] [Pass/Fail] [Observed behavior] [If fail: expected behavior]`

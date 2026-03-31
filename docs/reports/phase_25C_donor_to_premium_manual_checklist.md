# Phase 25C - Donor-to-Premium Manual Checklist

- Date: 2026-03-31
- Scope: donor-support continuity and owner fallback readiness verification (no fake automation)

## Quick setup

1. Test in EN and RU.
2. Use one regular user account + one owner account.
3. Ensure at least one configured support rail is available.

## Checklist

1. Support reference continuity
- [ ] Prepare support reference code.
- [ ] Open configured support rail from app.
- [ ] Return to app and verify return continuity is detected.
- [ ] Latest support reference status reflects continuity (`opened_external`/`returned`) where applicable.

2. Post-support user path clarity
- [ ] Post-support messaging is clear and calm (no hard storefront tone).
- [ ] `Continue to claim` path is obvious after return.
- [ ] Claim form remains simple and operational.
- [ ] Manual fallback remains understandable if continuity context is missing.

3. Claim fallback ease
- [ ] Claim submission still works with at least one proof field.
- [ ] Linked support reference still auto-fills proof reference context when available.
- [ ] No trap/dead-end appears in post-support flow.

4. Owner fallback efficiency
- [ ] Owner queue shows continuity hints (`Return tracked`, `External open tracked`, `Reference linked`, `Manual proof path`).
- [ ] Continuity hints help faster approve/reject context without changing safety model.
- [ ] Current-vs-legacy clarity remains readable.

5. Honesty and safety
- [ ] No fake provider verification claims appear.
- [ ] No wording promises instant/automatic Premium activation.
- [ ] Owner review remains explicit fallback truth.

6. Regression safety
- [ ] 24I-25A reminders/productivity baseline remains unchanged.
- [ ] 25B support-stack baseline (rails/claim/admin clarity) remains intact.

## Pass/fail matrix

| Area | Pass | Fail | Notes |
|---|---|---|---|
| Support reference continuity | [ ] | [ ] | |
| Post-support user path | [ ] | [ ] | |
| Claim fallback ease | [ ] | [ ] | |
| Owner fallback efficiency | [ ] | [ ] | |
| No fake automation promise | [ ] | [ ] | |
| RU/EN touched strings parity | [ ] | [ ] | |

## Notes format

`[Area] [Locale] [Viewport] [Steps] [Expected] [Actual] [Severity: low/med/high]`

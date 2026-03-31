# Phase 25B - Support Stack Manual Checklist

- Date: 2026-03-31
- Scope: live verification of support stack consolidation on top of accepted 24I-25A reminders baseline

## Quick setup

1. Verify in both EN and RU.
2. Use account with Profile access and owner account with admin queue access.
3. Test at least two rail configs:
- Boosty configured + CloudTips pending,
- Boosty configured + CloudTips configured.

## Checklist

1. Profile support clarity
- [ ] Support block is still at the end of Profile and visually secondary.
- [ ] Snapshot cards (`Rail snapshot`, `Support flow`) are readable and calm.
- [ ] Support copy remains donor-support-first (no storefront/subscription-first return).

2. Rail hierarchy and behavior
- [ ] Boosty is visually primary.
- [ ] CloudTips is visually secondary.
- [ ] Pending CloudTips is clearly non-actionable.
- [ ] Duplicate CloudTips URL state shows explicit disabled reason.
- [ ] Configured CloudTips opens as a normal external rail.

3. Support reference + claim flow
- [ ] Reference preparation is clear and optional/recommended.
- [ ] Claim form opens and keeps existing fields.
- [ ] Submit button is disabled until at least one proof field is filled.
- [ ] Claim submit path stays calm and manual-review truthful.

4. Claim status readability
- [ ] Claim status pill and lifecycle hint are clear.
- [ ] `Next step` guidance appears and matches current status.
- [ ] Refresh claim status works and remains operationally clear.

5. Owner/admin queue clarity
- [ ] Focus lane (`Needs review`, `All`, `Approved`, `Rejected`, `Closed`) works with correct counts.
- [ ] Queue sorting prioritizes reviewable claims first.
- [ ] Claim summary shows identity/rail/reference/proof completeness clearly.
- [ ] Approve/reject actions are clearly differentiated and usable.
- [ ] Legacy verification helper is collapsed by default.

6. Regression safety
- [ ] Reminders baseline (24I-25A) is unchanged in daily use.
- [ ] No false automation promise appears in support/claim/admin wording.

## Pass/fail matrix

| Area | Pass | Fail | Notes |
|---|---|---|---|
| Profile support clarity | [ ] | [ ] | |
| Rail hierarchy + pending honesty | [ ] | [ ] | |
| Reference + claim submission clarity | [ ] | [ ] | |
| Claim status readability | [ ] | [ ] | |
| Owner queue scan/action speed | [ ] | [ ] | |
| RU/EN parity on touched copy | [ ] | [ ] | |

## Notes format

`[Area] [Locale] [Viewport] [Steps] [Expected] [Actual] [Severity: low/med/high]`

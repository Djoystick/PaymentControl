# Phase 24H - Manual Closure Pack (24A-24G)

- Date: 2026-03-31
- Purpose: practical manual verification pack for already implemented package 24A-24G
- Scope: live verification readiness only (no implementation work)
- Source baseline:
  - `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
  - reports/specs 24A-24G

## 1) How to use this pack

1. Run checks in section order.
2. Mark each line `PASS`, `FAIL`, or `N/A`.
3. Record concrete evidence in notes template (Section 8).
4. If any critical item fails, stop and mark package as not closed.

Critical items are marked with `[CRITICAL]`.

## 2) Core surface checks (Home / Reminders / History / Profile)

### Home

1. `[CRITICAL]` Home loads with calm, compact structure and no storefront pressure copy.
2. Primary navigation to Reminders remains clear and working.
3. No subscription-first active messaging appears.

### Reminders

1. `[CRITICAL]` recurring list/actions remain functional.
2. Mark paid / Undo paid flows remain operational.
3. No monetization boundary changes leaked into reminders flow.

### History

1. `[CRITICAL]` recent activity history remains readable and consistent.
2. Context/disclosure behavior remains stable.
3. No premium/support contract confusion appears here.

### Profile

1. `[CRITICAL]` Profile keeps support-first, donor-perk-first runtime truth.
2. Free-core usefulness remains explicit and intact.
3. No return of subscription-first active wording.

## 3) Support rails checks (24D baseline preservation)

1. `[CRITICAL]` Boosty is clearly primary active rail.
2. CloudTips behavior:
   - configured URL -> actionable secondary rail,
   - missing/invalid/duplicate URL -> honest pending state, no broken link.
3. No dead-end CTA that looks active but fails.
4. External voluntary support framing remains clear and calm.

## 4) Support reference + support claim flow checks

1. `[CRITICAL]` user can prepare support reference code.
2. `[CRITICAL]` user can submit support claim with proof/reference.
3. Claim/readback statuses remain coherent (submitted/pending/approved/rejected).
4. No false promise of automatic premium activation.

## 5) Owner/admin review queue checks

1. `[CRITICAL]` owner queue loads support claims.
2. `[CRITICAL]` owner can approve/reject claims without boundary errors.
3. Claim context shows current vs legacy markers readably.
4. Review metadata remains readable (claim id, timestamps, notes, linkage fields).

## 6) RU/EN + interaction checks

### RU/EN parity

1. `[CRITICAL]` key support/claim/admin labels stay coherent in RU and EN.
2. No fallback wording that reintroduces subscription-first meaning.

### Interactive affordance

1. `[CRITICAL]` active controls look active before click.
2. Pending/disabled controls do not look actionable.
3. Disclosure and action-card behavior remains honest and stable.

## 7) Legacy compatibility visibility checks

1. Legacy rails/literals remain readable where historically expected.
2. `premium_purchase_*` boundaries remain compatibility-only and non-disruptive at runtime.
3. Admin legacy/current context labeling remains understandable.
4. No forced deep cleanup behavior appears.

## 8) What should NOT be re-tested in this closure pass

Skip deep re-testing of areas intentionally untouched by 24A-24G compatibility/planning package:

1. schema migration mechanics not changed in 24F-24H,
2. webhook/provider automation (not implemented),
3. deep entitlement redesign (not in scope),
4. unrelated broad UI redesign behavior outside touched surfaces.

Perform smoke confirmation only (app boots, core nav tabs present).

## 9) Compact pass/fail matrix

| Group | Priority | Result (PASS/FAIL/N/A) | Notes ref |
|---|---|---|---|
| Home/Reminders/History/Profile core truth | Critical |  |  |
| Support rails (Boosty/CloudTips) | Critical |  |  |
| Support reference + claim flow | Critical |  |  |
| Owner/admin review queue | Critical |  |  |
| RU/EN parity + interaction affordance | Critical |  |  |
| Legacy compatibility visibility/readability | High |  |  |
| Untouched areas smoke confirmation | Medium |  |  |

Closure rule:
- Package 24A-24G can be marked "manual closure ready" only if all Critical groups are PASS.

## 10) Human verifier notes format (exact template)

Use one block per check group:

```text
[Group] <group name>
Result: PASS | FAIL | N/A
Build/Env: <branch/commit/date/environment>
Evidence:
- <screen path + action>
- <observed behavior>
- <expected behavior match/mismatch>
Regression signal:
- <none OR specific issue>
Decision:
- <accept / investigate / block closure>
```

Use this incident template for failures:

```text
[FAIL-INCIDENT]
Group: <group name>
Severity: Critical | High | Medium
Repro steps:
1) ...
2) ...
3) ...
Actual: ...
Expected: ...
Boundary impacted: <rails / claim flow / admin queue / RU-EN / legacy compatibility>
Suggested next action: <fix pass or defer rationale>
```

# Payment Control - Master Anchor After Phase 27A Audit/Roadmap Reset

- Date: 2026-04-03
- Supersedes as active chat-migration anchor:
  - `docs/anchors/payment_control_master_anchor_post_premium_removal.md`
- Historical anchors (not active truth):
  - `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
  - `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

## 1) Source-of-truth priority

When documents conflict, use this order:
1. latest explicit user instruction,
2. this anchor,
3. latest reports + `docs/reports/internal_version_history.md`,
4. older anchors/reports as historical context only.

## 2) Current product truth (active)

Payment Control is fully unrestricted:
1. no Premium product model,
2. no entitlement model,
3. no claim/review path for unlocking access,
4. no donor-only access restrictions.

Support model:
1. donation-only voluntary support rails:
   - Boosty
   - CloudTips
2. donation does not unlock app functionality.

Supporter recognition:
1. supporter badge exists as cosmetic recognition only,
2. assignment remains explicit owner-managed action by numeric Telegram user id,
3. badge does not change feature access.

## 3) Completed history summary (condensed)

### 3.1 Stable utility baseline

From earlier waves (19-25 core line), app retains stable utility foundations:
1. reminders and recurring payment management,
2. history and action traceability,
3. family/workspace flows,
4. onboarding replay and first-run foundations,
5. bug-report flow.

### 3.2 Major domain shift completed

1. 26A removed Premium runtime/API/service/schema domain and reset to donation-only.
2. 26B stabilized donation-only Profile UX (calm, compact, secondary support block).
3. 26C added supporter badge foundation (recognition-only).
4. 26D improved owner-side supporter badge management convenience.

## 4) Historical/superseded branches (explicit)

Historical/superseded as active direction:
1. premium claim/admin/entitlement/gift/campaign branches,
2. donor-to-premium continuity/automation branches,
3. subscription-first monetization branches,
4. owner review as access gate.

These may exist in old reports for audit trail but are not active product roadmap.

## 5) Current stable baselines that must not be broken

Protect these baselines unless explicitly targeted:
1. unrestricted access for all users,
2. reminders/history/payment/family/workspace core flows,
3. `Mark paid` / `Undo paid` behavior,
4. onboarding replay + first-run behavior,
5. bug-report flow,
6. donation rails as plain external links,
7. supporter badge as cosmetic-only recognition.

## 6) Active roadmap after 27A (major waves)

## Wave 1 (next) - Post-26C/26D Closure and Reliability Baseline

Goals:
1. complete manual verification closure for 26C and 26D,
2. document closure status cleanly in reports/history,
3. freeze supporter-management semantics after verification.

## Wave 2 - Small Supporter Gratitude Feature (non-gating)

Goals:
1. implement one small gratitude/convenience feature,
2. keep zero access gating and zero entitlement semantics,
3. maintain calm profile hierarchy and RU/EN parity.

## Wave 3 - Donation/Support Runtime Hardening and Legacy Cleanup

Goals:
1. narrow i18n usage audit and remove unreachable premium-era strings,
2. add targeted tests around supporter owner flows and donation-support contracts,
3. improve maintainability without changing product behavior.

## Wave 4 - Operational Quality and Handoff Discipline

Goals:
1. standardize manual-check closure workflow,
2. keep anchors/history synchronized to avoid truth drift,
3. preserve practical validation routine for each pass.

## 7) Ready vs blocked

Ready now:
1. Wave 1 closure work,
2. Wave 4 process hardening work.

Blocked (sequencing/policy):
1. Wave 2 should start after Wave 1 verification closure.
2. Wave 3 i18n cleanup should start only after key-usage mapping is prepared.

## 8) Frozen branches (do not reopen)

Do not schedule these as active work:
1. Premium comeback in any form,
2. donor-to-premium automation or entitlement verification line,
3. claim/review flows for access activation,
4. CloudTips provider-verification automation for unlock decisions,
5. new monetization system waves or storefront-style expansion.

## 9) Supporter badge and gratitude feature policy

Supporter badge policy:
1. recognition-only,
2. manual owner assignment,
3. numeric Telegram user id authoritative key,
4. no access or capability unlock.

Future gratitude feature policy:
1. exactly small-scope convenience/appreciation addition,
2. no hidden paywall semantics,
3. no donor-only core-flow restrictions.

## 10) Next logical major wave after 27A

**Wave 1 - Post-26C/26D Closure and Reliability Baseline.**

Rationale:
1. closes current verification debt first,
2. strengthens migration confidence for next-chat execution,
3. prevents roadmap drift back into historical monetization branches.

## 11) Working agreement for new chats

In new chats:
1. start from this anchor,
2. keep scope narrow and practical per pass,
3. avoid implementation of frozen branches,
4. keep reports honest: what changed, what did not, what remains manual debt.

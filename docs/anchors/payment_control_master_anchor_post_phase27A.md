# Payment Control - Master Anchor (Active, Post-27H Final Release Sign-Off)

- Date: 2026-04-04
- Supersedes as active anchor:
  - `docs/anchors/payment_control_master_anchor_post_premium_removal.md`
- Historical anchors (not active truth):
  - `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
  - `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

## 1) Source-of-truth priority

When documents conflict, use this order:
1. latest explicit user instruction,
2. this anchor,
3. latest phase reports + `docs/reports/internal_version_history.md`,
4. older anchors/reports as historical context only.

## 2) Current product truth (active)

Payment Control is fully unrestricted:
1. no Premium product model,
2. no entitlement model,
3. no claim/review unlock path,
4. no donor-only access restrictions.

Support model:
1. donation-only voluntary support rails:
   - Boosty
   - CloudTips
2. donation does not unlock app functionality.

Supporter recognition:
1. supporter badge is cosmetic recognition only,
2. owner-managed manually via numeric Telegram user id,
3. badge never changes feature access.

## 3) Completed baseline summary (condensed)

Core utility baseline (stable):
1. reminders + recurring payments management,
2. history activity feed,
3. family/workspace flows,
4. onboarding replay + first-run foundation,
5. bug-report flow.

Domain reset and stabilization (completed):
1. 26A - Premium removed end-to-end (runtime/API/schema direction reset).
2. 26B - donation-only profile/support UX stabilization.
3. 26C - supporter badge foundation.
4. 26D - owner-side supporter badge management convenience.
5. 27B - unified visual/system baseline.
6. 27C - action-first cross-surface continuity.
7. 27D - guided reminders/composer simplification.
8. 27E - calm context memory + quiet help + richer bug-report runtime context.
9. 27F - reliability hardening + low-risk legacy cleanup.
10. 27G - release-candidate consolidation + final active-surface closure.
11. 27H - final release sign-off + verified closure sync.

Release-line verification state:
1. 27B-27G are accepted as verified release-line baseline.
2. Active documentation status is synchronized with that acceptance.

## 4) Historical/superseded branches (explicit)

Historical/superseded as active direction:
1. premium claim/admin/entitlement/gift/campaign branches,
2. donor-to-premium continuity/automation branches,
3. subscription-first monetization branches,
4. owner review as access gate.

These remain historical record only.

## 5) Stable invariants (must not be broken)

Protect unless explicitly targeted:
1. unrestricted access for all users,
2. reminders/history/payment/family/workspace core flows,
3. `Mark paid` / `Undo paid` behavior,
4. onboarding replay + first-run behavior,
5. bug-report flow,
6. donation rails as plain external links,
7. supporter badge as cosmetic-only recognition,
8. 27C continuity model + 27E/27F reset safety paths.

## 6) Current release baseline state (post-27H)

Current status:
1. active runtime surfaces (Home/Reminders/History/Profile) are consolidated to one donation-only product truth,
2. continuity/reset/help/bug-report context layers are hardened and synchronized,
3. user-facing premium-era residue is removed from active runtime surfaces,
4. release-line closure documentation is synchronized (history + anchor + phase reports).

What counts as 100% release baseline for this version:
1. unrestricted app utility with no access gating,
2. donation-only support rails (Boosty + CloudTips) as optional secondary surfaces,
3. supporter badge remains cosmetic-only and owner-managed,
4. core utility flows are preserved: reminders/history/family/workspace, add/edit/delete, mark paid/undo paid, onboarding replay, bug report.

## 7) Frozen branches (do not reopen)

Do not schedule as active roadmap:
1. Premium comeback in any form,
2. donor-to-premium automation or entitlement verification line,
3. claim/review flows for access activation,
4. CloudTips/provider verification as unlock decision gate,
5. storefront-style monetization expansion.

## 8) Post-release direction (outside current release closure)

**Phase 28A - Post-release monitoring + next-branch planning (non-blocking for current baseline closure).**

Scope:
1. monitor real-device/runtime stability after release decision,
2. track only critical regressions/hotfix needs,
3. evaluate next evolution branch separately from this closed release-line.

## 9) Post-release monitoring list (minimal)

1. continuity/reset behavior in real Telegram mobile webview under long sessions,
2. workspace switching continuity isolation,
3. bug-report runtime context readability/utility in production incidents,
4. owner-only supporter tooling visibility/permission correctness for non-owner accounts.

## 10) Working agreement for next chats

In new chats:
1. start from this anchor and latest report/history entries,
2. keep scope narrow and release-practical,
3. avoid frozen branches,
4. keep reports honest: what changed, what did not, what remains manual/device debt.

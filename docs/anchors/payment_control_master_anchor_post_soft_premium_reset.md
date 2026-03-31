# Payment Control — Master Anchor After Soft Premium Reset (Phase 24A)

- Date: 2026-03-31
- Supersedes as active monetization truth: `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

## 1) Project identity

Payment Control is a Telegram Mini App for recurring payment control.
Core value remains operational clarity for short daily sessions:
- calm,
- compact,
- low-friction,
- mobile-first,
- app-like (not storefront-like).

## 2) Source-of-truth priority

When documents conflict, use this order:
1. Latest explicit user instruction
2. This anchor (current truth)
3. Latest phase reports and `docs/reports/internal_version_history.md`
4. Older anchors/reports (historical)

Always mark conflicting legacy assumptions as `historical` or `superseded`.

## 3) Product truth (active)

## 3.1 Free-core rule

Free core must remain fully useful:
- recurring payments/reminders/history/family flows stay operational,
- Mark paid / Undo paid remain core,
- monetization must not block base utility.

## 3.2 Premium model (new active truth)

Premium is a soft donor perk, not a subscription-first product.

Active semantics:
- support = external donation/support action,
- claim = user submits support proof/reference,
- review = owner validates safely,
- Premium = perk granted after validated support period.

Current frozen baseline for this stage:
- support target from 100 RUB,
- target perk window: up to 30 days Premium per validated support period,
- primary rail: Boosty,
- secondary rail foundation: CloudTips.

## 3.3 Explicitly superseded truth

Superseded as active direction:
- subscription-first Premium positioning,
- old Boosty subscription flow as default Premium source,
- storefront-like buy-first UX framing.

Historical data/code may remain for compatibility but must not dominate active UX messaging.

## 4) UX operating rules (active)

Mandatory interaction and interface rules:
- very low learning barrier,
- clear purpose per tab,
- one clear primary action per high-frequency surface,
- progressive disclosure for secondary diagnostics/help,
- minimal copy in first path,
- active controls must look active before click,
- open/active state must be visually stronger than idle,
- no fake no-scroll behavior (honest viewport/scroll).

## 5) Navigation invariants

Keep and protect:
- 4-tab shell (`Home`, `Reminders`, `History`, `Profile`),
- fast access to core flows,
- onboarding replay and first-run behavior,
- workspace switching/create/join,
- bug report flow,
- help popover safety behavior.

## 6) Historical completion map (condensed)

Previously stabilized and/or verified baseline lines:
- UI system maturation: phases 19B, 19C, 20B–20H (with 20G viewport truth)
- onboarding stability and verification readiness: 21A–21B line
- premium claim/admin foundation: 22A–22F line (now partly historical by monetization truth shift)
- monetization refoundation progression: 23A–23D.1

Phase 24A now rebases active product truth from one-time purchase-led framing to donor-support-first soft Premium framing.

## 7) Technical policy for legacy monetization layers

Allowed:
- keep legacy rails/tables/types/routes if safe compatibility benefits remain,
- keep admin-side historical visibility.

Not allowed:
- exposing legacy subscription-first semantics as active user truth,
- implying automatic entitlement without real safe automation,
- routing users to legacy subscription rails as default Premium behavior.

## 8) Current implementation baseline after 24A

Confirmed runtime outcomes:
- Profile monetization area is secondary and calm,
- support rails are config-driven and multi-rail ready,
- unconfigured secondary rail is shown honestly as pending,
- support reference + claim flow is explicit and owner-review safe,
- navigation/top-level copy density reduced,
- interactive affordance consistency improved across touched surfaces.

## 9) Deferred items

Deferred intentionally (not blockers for 24A closure):
1. Full RU localization parity pass for all newly introduced copy keys.
2. Deep cleanup/renaming of legacy internal monetization terms where compatibility risk is non-trivial.
3. Any safe automation experiment must keep owner review fallback and explicit transparency.

## 10) Next logical roadmap from this anchor

1. Phase 24B: Localization and copy parity polish
- complete RU/EN parity for newly introduced donor-support terms,
- trim remaining heavy helper text in secondary surfaces.

2. Phase 24C: Support claim operational clarity
- strengthen owner review queue ergonomics for donor-support semantics,
- improve correlation/auditability messaging without adding fake automation.

3. Phase 24D: Optional rail activation hardening
- enable CloudTips rail when URL/operational policy is approved,
- verify rail-specific guidance remains concise and non-storefront.

4. Phase 24E: Legacy monetization debt minimization
- selectively demote or isolate internal legacy naming where safe,
- keep backward compatibility and historical traceability.

## 11) Working agreement for future chats

Future implementation passes should:
- start from this anchor,
- keep free-core non-negotiable,
- treat donor-support-first Premium as current truth,
- preserve calm utility-first UX,
- avoid broad unrelated refactors.

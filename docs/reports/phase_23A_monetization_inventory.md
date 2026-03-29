# Phase 23A — Monetization Inventory (Code-Oriented)

Дата: 2026-03-29
Основа: `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
Тип pass: audit/inventory (без изменения runtime-поведения)

## Легенда статуса
- `aligned` — уже соответствует one-time направлению.
- `partially aligned` — база полезна, но нужны точечные адаптации.
- `misaligned` — содержит subscription-first или другую конфликтующую семантику.

## Inventory Table

| Artifact | Type | Что сейчас делает | Alignment | Later action |
|---|---|---|---|---|
| `src/components/app/profile-scenarios-placeholder.tsx` | UI surface | Основной Profile monetization блок: Buy/Support/Claim, handoff code, claim form, lifecycle | partially aligned | adapt |
| `src/components/app/profile-scenarios-placeholder.tsx` (`Paid expansion via Boosty subscription...`) | UI copy usage | Явно пишет подписочную семантику для Buy Premium | misaligned | replace |
| `src/components/app/profile-scenarios-placeholder.tsx` (`intentRail: boosty_premium`, `expectedTier: premium_monthly`) | UI payload defaults | Отправляет подписочные дефолты в create intent/claim | misaligned | adapt |
| `src/components/app/profile-scenarios-placeholder.tsx` (`Buy/Support/Claim` separation) | UX structure | Уже разделяет 3 rails визуально и логически | aligned | keep |
| `src/components/app/premium-admin-console.tsx` | Owner UI | Очередь claim, approve/reject, owner notes, entitlement linkage | partially aligned | adapt |
| `src/components/app/premium-admin-console.tsx` (`Boosty-first purchase claims`) | Owner copy | В owner helper text зафиксирована Boosty-first формулировка | misaligned | replace |
| `src/components/app/premium-admin-console.tsx` (`Temporary purchase claim verification (22A.1)`) | Owner helper | Временный verification helper из 22A.1 все еще отображается owner-only | partially aligned | verify |
| `src/lib/i18n/localization.tsx` (monetization block keys) | Localization | Содержит много ключей для Buy/Support/Claim/intent/queue | partially aligned | adapt |
| `src/lib/i18n/localization.tsx` (`Paid expansion via Boosty subscription...`) | Localization copy | Прямое указание на подписку как текущий смысл | misaligned | replace |
| `src/lib/i18n/localization.tsx` (`Continue to Boosty`, `Step 2: Pay on Boosty`) | Localization copy | Провайдер-специфичный путь и wording | partially aligned | adapt |
| `src/lib/config/client-env.ts` (`premiumBuyUrl`) | Config | Фолбэк ведет на Boosty subscription URL | misaligned | adapt |
| `src/lib/config/client-env.ts` (`supportProjectUrl`) | Config | Отдельный support rail URL | aligned | keep |
| `src/lib/auth/types.ts` (`PremiumPurchaseClaimRail = boosty_premium`) | Shared types | Жестко фиксирует rail на subscription-era значение | misaligned | adapt |
| `src/lib/auth/types.ts` (`PremiumPurchaseIntentRail = boosty_premium`) | Shared types | То же для intent rail | misaligned | adapt |
| `src/lib/auth/types.ts` (`PremiumEntitlementSource = manual_admin | boosty | gift_campaign`) | Shared types | Источник entitlement завязан на `boosty` как исторический источник | partially aligned | adapt |
| `src/lib/auth/client.ts` (`expectedTier: premium_monthly`) | Client API helper | Дефолт tier в create intent подписочный | misaligned | adapt |
| `src/lib/auth/client.ts` (`claimRail: boosty_premium`) | Client API helper | Дефолт rail в create claim подписочный | misaligned | adapt |
| `src/lib/premium/purchase-intent-repository.ts` | Server repository | Создает/читает/резолвит intent, генерирует `PC-` код, линк к claim | partially aligned | adapt |
| `src/lib/premium/purchase-intent-repository.ts` (`intentRail !== boosty_premium`) | Validation semantics | Принимает только boosty_premium | misaligned | adapt |
| `src/lib/premium/purchase-claim-repository.ts` | Server repository | Создает claim, валидирует proof, линкует intent | partially aligned | adapt |
| `src/lib/premium/purchase-claim-repository.ts` (`claimRail !== boosty_premium`) | Validation semantics | Принимает только boosty_premium | misaligned | adapt |
| `src/lib/premium/admin-service.ts` (`ensureBoostyEntitlementForApprovedClaim`) | Owner decision backend | Approve создает/продлевает entitlement source=`boosty` по expected_tier duration | misaligned | adapt |
| `src/lib/premium/admin-service.ts` (`resolveTierDurationDays`) | Owner decision backend | Duration вычисляется из subscription-like tier labels | misaligned | adapt |
| `src/lib/premium/admin-service.ts` (review queue + reviewable statuses) | Owner operations | Очередь и approve/reject mechanics рабочие и компактные | aligned | keep |
| `src/lib/premium/repository.ts` + `src/lib/premium/service.ts` | Entitlement read model | Стабильное чтение effective premium state profile/workspace | aligned | keep |
| `src/app/api/premium/purchase-intents/route.ts` | API route | Создает intent, rail/tier валидирует, требует app context | partially aligned | adapt |
| `src/app/api/premium/purchase-intents/route.ts` (`intentRail=boosty_premium`, `expectedTier=premium_monthly`) | API defaults | Subscription-era default semantics | misaligned | adapt |
| `src/app/api/premium/purchase-intents/mine/route.ts` | API route | Чтение intent list для текущего профиля | aligned | keep |
| `src/app/api/premium/purchase-claims/route.ts` | API route | Создание claim + owner notification on submit | partially aligned | adapt |
| `src/app/api/premium/purchase-claims/route.ts` (notification text) | API notification | Честно пишет: claim submitted, payment not auto-confirmed | aligned | keep |
| `src/app/api/premium/purchase-claims/mine/route.ts` | API route | Чтение claim lifecycle для пользователя | aligned | keep |
| `src/app/api/premium/admin/route.ts` | API route | Owner-only actions: queue, review, grant/revoke, campaign ops | aligned | keep |
| `src/lib/admin/access.ts` | Security | Owner-only gate по Telegram numeric user ID | aligned | keep |
| `src/lib/config/server-env.ts` (`BUG_REPORT_TELEGRAM_CHAT_ID`) | Ops config | Один канал для bug reports и claim notifications (через reuse pattern) | partially aligned | verify |
| `src/app/api/support/bug-report/route.ts` | Notification pattern | Стабильный Telegram delivery pattern, можно переиспользовать | aligned | keep |
| `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql` | DB schema | Таблица claim + статусы + rail constraint `boosty_premium` | partially aligned | adapt |
| `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql` | DB schema | Таблица intent + code + claim linkage; defaults `boosty_premium`, `premium_monthly` | partially aligned | adapt |
| `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql` | DB schema | Entitlement source constrained to `manual_admin/boosty/gift_campaign` | partially aligned | adapt |
| `docs/reports/phase_22A_premium_purchase_claim_foundation.md` | Historical report | Фиксирует MVP claim foundation и boosty-first assumptions | historical | verify |
| `docs/reports/phase_22C_owner_claim_review_queue.md` | Historical report | Описывает owner queue и approve/reject mechanics | reusable with adaptation | keep |
| `docs/reports/phase_22D_claim_lifecycle_ux_states_and_verification_pack.md` | Historical report | Описывает lifecycle UX и separation rails | reusable with adaptation | keep |
| `docs/reports/phase_22E_purchase_correlation_code_semi_automatic_claim_activation.md` | Historical report | Correlation code layer + boosty handoff wording | reusable with adaptation | adapt |
| `docs/reports/phase_22F_premium_flow_simplification_active_state_emphasis_owner_claim_notification.md` | Historical report | Active/open emphasis + notification; часть monetization copy subscription-first | historical, partially useful | adapt |
| `docs/reports/internal_version_history.md` | Internal history | 22A–22F строки как implemented/pending manual verification | partially aligned | adapt |
| `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md` | Current anchor | Явно фиксирует one-time truth и subscription branch as superseded | aligned | keep |
| `README.md` (premium section) | Repo docs | Описывает 22A claim foundation как Boosty-first manual reconciliation | partially aligned | adapt |

## Ключевые выводы inventory

1. Технический каркас manual claim/review уже зрелый и переиспользуемый.
2. Главная зона несоответствия — semantic layer:
- rail/tier дефолты (`boosty_premium`, `premium_monthly`),
- owner approve source `boosty`,
- copy про `Boosty subscription`.
3. Разделение `Buy Premium / Support / Claim` уже есть и может быть базой для 23C.
4. Ложной auto-confirmation логики в серверном claim notification не обнаружено (это плюс).

## Targeted follow-up actions by phase

- Для 23B: адаптация types + repository validations + DB semantics вокруг one-time purchase.
- Для 23C: перепись Profile/Localization copy и handoff wording под one-time.
- Для 23D: owner queue текст/metadata parity под one-time, без перераздувания admin UI.
- Для 23E: формальный manual closure pack.

# Phase 23B — Data/Claim Adaptation for One-Time Premium

Дата: 2026-03-29  
Статус: implemented (code + migration + report)  
Главный source of truth: `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

## 1) Цель pass

Перевести активную семантику monetization data/claim-потока с subscription-first на one-time truth, без широкого UI-рефакторинга:
- Premium = one-time purchase;
- Support = отдельный донат;
- claim/review остаются ручными (owner review required);
- без ложных обещаний авто-подтверждения оплаты.

## 2) Что было inspected

Проверены активные пути:
- API:
  - `src/app/api/premium/purchase-intents/route.ts`
  - `src/app/api/premium/purchase-claims/route.ts`
  - `src/app/api/premium/admin/route.ts`
- Репозитории/сервисы:
  - `src/lib/premium/purchase-intent-repository.ts`
  - `src/lib/premium/purchase-claim-repository.ts`
  - `src/lib/premium/admin-service.ts`
- Типы/клиент:
  - `src/lib/auth/types.ts`
  - `src/lib/auth/client.ts`
- UI, напрямую зависящий от data semantics:
  - `src/components/app/profile-scenarios-placeholder.tsx`
  - `src/components/app/premium-admin-console.tsx`
- Локализация:
  - `src/lib/i18n/localization.tsx`
- Миграции:
  - `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql`
  - `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql`
  - `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql`

## 3) Что именно изменено в активной семантике

### 3.1 Новые активные дефолты (one-time)
- Введены единые константы semantics:
  - файл: `src/lib/premium/purchase-semantics.ts`
  - default rail: `one_time_premium`
  - default tier: `premium_one_time`
  - legacy rail `boosty_premium` сохранен как поддерживаемый.

### 3.2 Типы и runtime-валидации
- `src/lib/auth/types.ts`
  - `PremiumPurchaseClaimRail`: теперь `"one_time_premium" | "boosty_premium"`.
  - `PremiumPurchaseIntentRail`: теперь `"one_time_premium" | "boosty_premium"`.
  - `PremiumEntitlementSource`: добавлен `"one_time_purchase"` (legacy `"boosty"` сохранен).
- `src/lib/auth/client.ts`
  - create intent/claim теперь по умолчанию используют one-time rail/tier.
- API/repository валидации переведены с single-value `"boosty_premium"` на supported-set:
  - `src/app/api/premium/purchase-intents/route.ts`
  - `src/app/api/premium/purchase-claims/route.ts`
  - `src/lib/premium/purchase-intent-repository.ts`
  - `src/lib/premium/purchase-claim-repository.ts`

### 3.3 Owner approve/reject семантика
- `src/lib/premium/admin-service.ts`
  - approve теперь трактуется как подтверждение one-time purchase.
  - для новых/обновляемых entitlement используется source `one_time_purchase`.
  - поиск активного entitlement для продления включает legacy `boosty` + новый `one_time_purchase`.
  - error wording обновлен на provider-neutral (без boosty-as-truth).
  - duration resolver очищен от legacy subscription-ассоциаций и стабилизирован под one-time package интерпретацию.

### 3.4 Claim/intention continuity с legacy поддержкой
- `resolvePremiumPurchaseIntentForClaim` теперь делает fallback:
  - если claim идет с новым rail, но в данных есть legacy intent, он безопасно находится и может быть привязан.
- Это сохраняет работоспособность старых записей без destructive cleanup.

## 4) Legacy semantics: что осталось поддержано и как

Поддержано намеренно:
- legacy rail `boosty_premium` (claim + intent);
- legacy entitlement source `boosty`;
- существующие старые rows продолжают читаться и обрабатываться;
- owner queue не ломается на старых claim/intents.

Нормализация на будущее:
- новые create-path по умолчанию пишут one-time rail/tier;
- approve-path переводит активное entitlement-обновление в source `one_time_purchase`.

## 5) Schema/migration

Миграция добавлена:  
`supabase/migrations/20260329170000_phase23b_one_time_semantic_adaptation.sql`

Что делает:
1. `premium_purchase_claims`
   - default `claim_rail` -> `one_time_premium`
   - default `expected_tier` -> `premium_one_time`
   - rail check расширен: `('one_time_premium', 'boosty_premium')`
2. `premium_purchase_intents`
   - default `intent_rail` -> `one_time_premium`
   - default `expected_tier` -> `premium_one_time`
   - rail check расширен: `('one_time_premium', 'boosty_premium')`
3. `premium_entitlements`
   - source check расширен: добавлен `one_time_purchase`

Почему безопасно:
- изменения additive;
- legacy значения не удаляются;
- destructive rename/drop таблиц не делался;
- исторические rows сохраняются.

## 6) User/admin wording, исправленный в этом pass

Исправлены только семантически критичные формулировки:
- убраны active формулировки про `Boosty subscription` как текущую истину;
- handoff и step-label переведены на нейтральное `payment page`/`external page`;
- source label для entitlement:
  - `Premium purchase confirmation`
  - `Premium purchase confirmation (legacy)`
- owner queue helper text переведен с `Boosty-first` на provider-light формулировку.

Файл:
- `src/lib/i18n/localization.tsx`

## 7) Что намеренно НЕ менялось (оставлено на 23C/23D)

- Полный UX/copy rebase всей Profile monetization поверхности (широкий pass) — в 23C.
- Расширенная owner UX-полировка и финальная operational parity — в 23D.
- Смена/финализация внешнего payment provider URL — не делалась в 23B.
  - Текущий URL rail сохранен как есть (временный), но активная продуктовая семантика теперь one-time.

## 8) Impact check (инварианты)

Сохранено:
- owner-only boundaries;
- claim queue behavior;
- approve/reject flow;
- owner notification event на claim submit;
- gift/manual premium compatibility;
- free-core untouched.

Не затронуто:
- reminders/history/family/core payment logic;
- onboarding/help/template autosuggest/cache/shell invariants.

## 9) Validation

Выполнено:
- `npm run lint`
- `npm run build`

Оба завершились успешно.

## 10) Риски / notes

1. В репозитории еще есть historical упоминания Boosty в отчетах/истории и части неактивного текста; это ожидаемо и не считается active truth.
2. Внешний rail URL пока прежний; semantic truth уже one-time, но provider-side оффер должен быть синхронизирован продуктово в следующих этапах.
3. Требуется аккуратный 23C, чтобы довести весь user copy до полной one-time ясности без storefront-эффекта.

## 11) Рекомендуемый следующий шаг

**Phase 23C — Profile Monetization UX Rebase (One-Time)**  
Цель: закрыть UI/copy слой вокруг one-time truth полностью и спокойно, без изменения ручной owner-review модели.

## 12) Self-check against 23B acceptance criteria

- Active semantics больше не зависят от subscription-first truth: ✅
- Legacy values поддержаны безопасно (без удаления): ✅
- Claim/review/owner queue backbone сохранен: ✅
- Owner-only boundary сохранен: ✅
- Free-core не затронут: ✅
- Fake automation claims не добавлены: ✅
- Broad refactor/rewrite не делался: ✅

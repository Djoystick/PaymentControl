# Phase 23A — One-Time Monetization Refoundation Spec (Audit + Docs)

Дата: 2026-03-29  
Статус pass: completed (spec/audit/docs only, без runtime feature-изменений)  
Главный source of truth: `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

## 1) Цель pass

Сделать честную переустановку monetization-контекста после product pivot:
- Premium теперь one-time purchase (не подписка);
- Support остается отдельным донат-сценарием;
- старую subscription-first ветку не удалять из истории, а явно разметить как `historical`/`superseded`;
- подготовить практичный фундамент для следующих реализационных фаз 23B–23E.

## 2) Что было проверено (audit scope)

Проверены:
- anchor и статусные документы:
  - `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
  - `docs/reports/internal_version_history.md`
- отчеты monetization-линии:
  - `docs/reports/phase_22A_premium_purchase_claim_foundation.md`
  - `docs/reports/phase_22B_profile_premium_support_entry_separation.md`
  - `docs/reports/phase_22C_owner_claim_review_queue.md`
  - `docs/reports/phase_22D_claim_lifecycle_ux_states_and_verification_pack.md`
  - `docs/reports/phase_22E_purchase_correlation_code_semi_automatic_claim_activation.md`
  - `docs/reports/phase_22F_premium_flow_simplification_active_state_emphasis_owner_claim_notification.md`
- текущие кодовые пути monetization/admin/claim:
  - `src/components/app/profile-scenarios-placeholder.tsx`
  - `src/components/app/premium-admin-console.tsx`
  - `src/lib/i18n/localization.tsx`
  - `src/lib/config/client-env.ts`
  - `src/lib/config/server-env.ts`
  - `src/lib/auth/types.ts`
  - `src/lib/auth/client.ts`
  - `src/lib/premium/purchase-claim-repository.ts`
  - `src/lib/premium/purchase-intent-repository.ts`
  - `src/lib/premium/admin-service.ts`
  - `src/lib/premium/repository.ts`
  - `src/lib/premium/service.ts`
  - `src/lib/admin/access.ts`
  - `src/app/api/premium/purchase-intents/route.ts`
  - `src/app/api/premium/purchase-intents/mine/route.ts`
  - `src/app/api/premium/purchase-claims/route.ts`
  - `src/app/api/premium/purchase-claims/mine/route.ts`
  - `src/app/api/premium/admin/route.ts`
  - `src/app/api/support/bug-report/route.ts`
- миграции:
  - `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql`
  - `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql`
  - `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql`

## 3) Главные выводы аудита

### 3.1 Что уже полезно и можно сохранить
- Ручной claim/review контур зрелый и рабочий:
  - claim submit;
  - owner queue;
  - approve/reject;
  - user lifecycle reflection.
- Owner-only границы видимости и security-checks стабильны.
- Разделение rails в Profile (`Buy Premium` / `Support` / `Claim`) уже есть.
- Notification-паттерн на `claim submitted` честный: не обещает авто-подтверждение оплаты.

### 3.2 Что конфликтует с новой one-time истиной
- В коде и текстах сохранилась subscription-first семантика:
  - `boosty_premium` как жесткий rail;
  - `premium_monthly` как default tier;
  - `boosty` как entitlement source в approve-flow;
  - формулировки про `Boosty subscription`.
- Часть UI/локализации звучит как текущая подписочная модель, что теперь неверно.

### 3.3 Что уже хорошо совпадает с новой моделью
- Честная manual review модель.
- Разделение Premium и Support как разных сценариев.
- Отсутствие ложной auto-activation логики после claim submit.

## 4) Противоречия old branch vs current truth

Зафиксированы явные противоречия:
1. Старое: Premium как подписка через Boosty.  
   Новое: Premium как one-time purchase.
2. Старое: subscription-термины в копирайтинге и status helper text.  
   Новое: спокойные и честные one-time формулировки.
3. Старое: провайдеро-специфичные rails/tier как продуктовая норма.  
   Новое: provider не должен диктовать продуктовый смысл (может остаться rail, но не как "подписка по умолчанию").

Классификация:
- `current truth`: one-time Premium + separate donation/support.
- `historical`: ветка 22A–22F как реализованный эволюционный путь.
- `superseded`: subscription-first трактовка как активная продуктовая правда.

## 5) Что создано в этом pass

Созданы/обновлены документы:
1. `docs/specs/phase_23A_one_time_monetization_refoundation_spec.md`  
   Полный approved-spec по новой one-time модели (A–J секции).
2. `docs/reports/phase_23A_monetization_inventory.md`  
   Практический инвентарь code/doc artifacts с разметкой:
   - aligned / partially aligned / misaligned;
   - keep / adapt / replace / verify.
3. `docs/reports/phase_23A_one_time_monetization_refoundation_spec.md`  
   Этот основной pass-report.
4. `docs/reports/internal_version_history.md`  
   Добавлена короткая запись о Phase 23A как audit/spec/docs pass.

## 6) Что намеренно НЕ менялось

Намеренно не менялось:
- runtime бизнес-логика premium/claim/entitlement;
- core payment/reminders/history/family потоки;
- owner visibility/security модель;
- onboarding/4-tab shell/help popover/template autosuggest/RUB baseline;
- любые миграции и schema-изменения.

Это сделано специально, потому что 23A — подготовительный spec pass, а не реализационный refactor.

## 7) Рекомендуемый следующий шаг

Точный следующий этап: **Phase 23B — Data/Claim Adaptation for One-Time Premium**.

Коротко по цели 23B:
- убрать subscription-first семантику из типов/валидаций/дефолтов/owner-approve интерпретаций;
- сохранить текущий manual claim/review backbone;
- не ломать free-core и owner-only boundary.

## 8) Verification notes для следующего чата

- 23A не требует runtime manual testing, так как это docs-only pass.
- Перед началом 23B нужно брать за главный источник:
  - `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
  - `docs/specs/phase_23A_one_time_monetization_refoundation_spec.md`
  - `docs/reports/phase_23A_monetization_inventory.md`
- При реализации 23B обязательно маркировать старые subscription-смыслы как `historical/superseded`, а не смешивать с текущей truth-моделью.

## 9) Encoding safety check

- Новые документы сохранены в UTF-8.
- Битой кириллицы/моджибейка в созданных файлах не выявлено.

## 10) Self-check against pass goal

Pass считается успешным, потому что:
- есть grounded one-time monetization spec;
- есть code-oriented inventory с конкретными точками адаптации;
- зафиксированы противоречия и статус `historical/superseded/current truth`;
- runtime-поведение приложения не менялось преждевременно.

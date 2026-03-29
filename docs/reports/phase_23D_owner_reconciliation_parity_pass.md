# Phase 23D — Owner Reconciliation Parity Pass

Дата: 2026-03-29  
Статус: implemented (owner UI/copy parity + report), pending manual verification

## 1) Цель этапа

Привести owner-side очередь проверки заявок на Premium к той же one-time семантике, что уже есть на пользовательской стороне (23C):
- яснее читать контекст заявки;
- не путать текущий one-time путь и legacy subscription-era данные;
- сохранить ручную owner-проверку без ложных обещаний авто-подтверждения.

## 2) Source of truth

- `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
- `docs/specs/phase_23A_one_time_monetization_refoundation_spec.md`
- `docs/reports/phase_23A_one_time_monetization_refoundation_spec.md`
- `docs/reports/phase_23B_data_claim_adaptation_for_one_time_premium.md`
- `docs/reports/phase_23C_profile_monetization_ux_rebase_one_time.md`
- `docs/reports/internal_version_history.md`

## 3) Что inspected

- `src/components/app/premium-admin-console.tsx`
- `src/lib/premium/admin-service.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/lib/i18n/localization.tsx`

## 4) Найденные owner-side неоднозначности до правок

1. В очереди проверки заявок было мало структурированного контекста для решения (rail/tier/proof/review-данные шли почти одним слоем).
2. Кнопки review читались как общие `Approve/Reject claim`, без явного one-time смысла действия.
3. Legacy данные (`boosty_*`, `monthly`) не ломались, но не были явно помечены как исторический формат.
4. Текст owner-уведомления о новой заявке был менее выровнен под one-time формулировку.

## 5) Что изменено

### 5.1 Owner queue presentation parity (`premium-admin-console.tsx`)

Сделана более быстрая для owner иерархия внутри карточки заявки:
- добавлен короткий формат в summary: `One-time format` / `Legacy format`;
- добавлены секции:
  - `Decision context`
  - `Submitted proof`
  - `Review metadata`
- добавлены явные one-time/legacy метки:
  - `Current one-time claim path`
  - `Legacy claim data`
- добавлен читаемый label для rail:
  - `One-time Premium purchase rail`
  - `Legacy Premium rail (subscription-era)`
- добавлен читаемый label для expected package:
  - `One-time Premium package`
  - `Legacy monthly package code`
  - `Legacy annual package code`
  - `Custom package code`
- при этом raw значения (`claimRail`, `expectedTier`) оставлены в карточке для прозрачной диагностики.

### 5.2 Decision wording parity

В owner action copy:
- `Approve purchase confirmation`
- `Reject purchase confirmation`
- helper-текст рядом с actions:
  - approve подтверждает one-time покупку и применяет Premium;
  - reject не ломает free-core доступ.

Также обновлены success feedback messages:
- `Purchase confirmation approved: {claimId}`
- `Purchase confirmation rejected: {claimId}`

### 5.3 Owner notification wording parity (`purchase-claims/route.ts`)

Обновлен только текст уведомления (триггер не менялся):
- событие сформулировано как новая заявка пользователя после внешней оплаты;
- явно сказано, что авто-подтверждения оплаты нет и нужна ручная owner-проверка;
- в уведомление добавлен rail с пометкой `текущий one-time путь` или `legacy/исторический формат`.

Триггер события сохранен прежним:
- уведомление отправляется после успешного `claim submitted` в `POST /api/premium/purchase-claims`.

## 6) Как legacy поддержка сохранена безопасно

- Старые записи с `boosty_premium`/`monthly` не удалялись и не переписывались.
- В UI owner они теперь явно видны как legacy, но остаются полностью читаемыми и reviewable.
- Approval/rejection backend semantics не менялись; менялась только owner-side подача контекста и wording.

## 7) Что намеренно НЕ менялось

- owner-only security boundary;
- approve/reject runtime mechanics и claim lifecycle;
- premium entitlement foundation semantics из 23B;
- user-facing Profile monetization flow из 23C;
- reminder/history/family/core payment логика;
- onboarding/help/template autosuggest/cache поведение.

## 8) Validation

Выполнено:
- `npm run lint`
- `npm run build`

Оба завершились успешно.

## 9) Manual verification notes (для следующего шага)

1. Зайти owner-аккаунтом в `Profile -> Owner premium admin -> Purchase claims queue`.
2. Проверить, что у каждой заявки видны:
- формат (`One-time format`/`Legacy format`),
- `Decision context`, `Submitted proof`, `Review metadata`.
3. Проверить, что кнопки review читаются как подтверждение покупки:
- `Approve purchase confirmation`
- `Reject purchase confirmation`
4. Отправить тестовую claim-заявку и проверить owner-уведомление:
- формулировка про ручную проверку,
- отсутствие ложного auto-confirmation,
- наличие Telegram user id, rail, expected package, purchase code/proof reference.
5. Убедиться, что owner-only границы не нарушены (обычный пользователь не видит owner queue controls).

## 10) Риски / follow-up

1. Определение legacy по `expectedTier` сейчас эвристическое (по строковым паттернам). Для текущего узкого pass это достаточно, но при расширении стоит централизовать mapping в едином helper.
2. В owner-поверхности местами остаются технические англоязычные коды (`one_time_premium`, `premium_one_time`) как raw-диагностика — оставлено намеренно для операционной прозрачности.

## 11) Рекомендованный следующий этап

`Phase 23E — Formal Monetization MVP Manual Closure Pack`:
- провести финальную ручную end-to-end проверку user+owner ветки после 23C/23D,
- зафиксировать formal closure checklist без расширения scope.

## 12) Encoding safety check

- Новые/обновленные markdown и локализационные строки сохранены в UTF-8.
- Битая кириллица в правках этого этапа не обнаружена.

## 13) Pre-report self-check against scope

Проверено:
- этап остался узким (owner parity/copy/presentation);
- тяжелый admin-dashboard не строился;
- runtime review semantics и security не переписаны;
- fake automation claims не добавлены;
- one-time truth соблюдена, legacy совместимость сохранена.

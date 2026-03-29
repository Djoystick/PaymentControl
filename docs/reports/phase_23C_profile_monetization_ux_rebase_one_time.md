# Phase 23C — Profile Monetization UX Rebase (One-Time)

Дата: 2026-03-29  
Статус: implemented (UI/copy + report)  
Source of truth:
- `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
- `docs/specs/phase_23A_one_time_monetization_refoundation_spec.md`
- `docs/reports/phase_23B_data_claim_adaptation_for_one_time_premium.md`

## 1) Что было inspected

- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx` (только для semantic consistency)
- `src/lib/i18n/localization.tsx`
- `src/lib/config/client-env.ts` (Buy/Support external rails)
- текущая отрисовка claim lifecycle + purchase handoff в Profile

## 2) Что было проблемой до правок

1. Monetization-поток в Profile уже был рабочий, но местами оставался слишком “техническим”:
- лишние intent-формулировки в user-facing тексте;
- дублированные step-подсказки и локальный шум.

2. Структура была не полностью в целевом порядке 23A:
- статус и формы были перемешаны так, что “следующий шаг” читался менее линейно.

3. Нужна была более спокойная one-time подача:
- без storefront-агрессии;
- без возврата к subscription формулировкам.

## 3) Что изменено в 23C (UX/copy/hierarchy)

### 3.1 Profile monetization hierarchy

В `src/components/app/profile-scenarios-placeholder.tsx` монетизационный блок приведен к более четкому порядку:
1. Premium status
2. Buy Premium
3. Support the project
4. Claim / Confirm purchase
5. Compact claim status + next step

Ключевое:
- компактный статус claim вынесен в отдельный нижний feedback-блок;
- из формы Claim убран дублирующий refresh-control (оставлен один clear refresh в статусном блоке).

### 3.2 Clear one-time flow copy

Верхний helper-текст переведен в короткий и честный one-time формат:
- `One-time flow: Buy Premium -> external payment -> Claim Premium in app.`

Убрано визуальное дублирование “шаговых плашек”, чтобы не перегружать поверхность.

### 3.3 Buy / Support / Claim separation clarity

Сохранено и усилено:
- Buy Premium — главный monetization action (визуально сильнее).
- Support the project — заметно, но вторично.
- Claim Premium — отдельный операционный блок “я уже оплатил”.

### 3.4 “Purchase intent” wording cleanup в user-facing Profile зоне

В пользовательских текстах Profile часть technical wording адаптирована на более понятный формат:
- “purchase code” вместо перегруженного “purchase intent” там, где это user-facing.
- Примеры:
  - `No purchase code yet`
  - `Purchase code status`
  - `Refresh purchase code`
  - `Latest purchase code`

## 4) Какие старые сигналы/формулировки убраны

Из активной Profile monetization поверхности убраны/заменены:
- step-strip с лишним повтором этапов;
- часть technical intent формулировок для пользователя;
- избыточные дублирующие действия обновления статуса внутри Claim формы.

Subscription wording как current truth в Profile monetization surface не используется.

## 5) Что намеренно НЕ менялось

Намеренно не менялось в 23C:
- backend/state semantics 23B;
- API claim/purchase-intent path;
- owner review mechanics и security boundaries;
- gift/manual grant foundations;
- внешние rail URL (оставлены как текущий runtime rail, без fake-автоматизации);
- остальной Profile за пределами monetization-поверхности.

## 6) Что остается на 23D

Для 23D остается:
- owner reconciliation parity polishing (copy/labels/metadata clarity в owner queue);
- точечная owner-операционная калибровка без расширения в heavy admin dashboard.

## 7) Validation

Выполнено:
- `npm run lint`
- `npm run build`

Оба завершились успешно.

## 8) Manual verification notes (23C)

Проверить вручную:
1. В Profile блоке сразу читаются три rail:
- Buy Premium
- Support the project
- I already paid / Claim Premium
2. Buy Premium воспринимается как one-time сценарий, без подписочного смысла.
3. Support явно не обещает Premium-активацию.
4. Claim блок понятен для “уже оплатил” и не скрыт логически.
5. Нижний claim status block показывает компактный текущий статус и clear refresh.
6. Общий вид остается calm, compact, app-like (без storefront агрессии).

## 9) Рекомендуемый следующий шаг

**Phase 23D — Owner Reconciliation Parity Pass**  
Причина: user-facing one-time Profile слой стабилизирован; дальше нужно довести owner-side wording/операционную ясность до той же семантической зрелости.

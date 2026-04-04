# Phase 28A.1 - Recurring Summary Slice Restoration + Payment/Subscription Surface Unification

- Date: 2026-04-04
- Status: implemented (targeted corrective pass), pending manual verification
- Scope: узкое исправление recurring UX после ручной проверки 28A
- Product truth preserved:
  - unrestricted donation-only model
  - no Premium/entitlement/claim/unlock return
  - travel module remains separate (`Recurring` vs `Travel groups`)

## 1) Что было найдено в текущем поведении

Проверены:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/internal_version_history.md`
5. runtime-файлы:
   - `src/components/app/payments-dashboard-section.tsx`
   - `src/components/app/recurring-payments-section.tsx`
   - `src/lib/app/context-memory.ts`
   - `src/lib/support/bug-report-runtime-context.ts`

Найденные UX/product gaps:
1. Home `Payment snapshot` отправлял в Reminders, но смысл среза "полный recurring lane" читался слабо (переброс в экран без явной формулировки среза).
2. В recurring lane оставался главный осевой split `Payments / Subscriptions`.
3. Из-за split пользователь мог попадать в lane с ощущением, что это два конкурирующих сценария, хотя продуктово это один класс сущностей: регулярные траты.

## 2) Почему старое summary-поведение было неправильным

Проблема была не в самом переходе Home -> Reminders, а в его продуктовой семантике:
1. переход не всегда воспринимался как продолжение конкретного recurring-среза,
2. split `Payments / Subscriptions` искажал восприятие "общего списка регулярных трат",
3. итог: Home summary выглядел как "просто перекинуло в Reminders", а не как осмысленное продолжение сценария.

## 3) Как исправлен summary flow

Сделано:
1. Home summary переход для total-card теперь передает более точную причину:
   - `Open recurring expenses slice from Home snapshot.`
2. В `RecurringPaymentsSection` intent `reminders_all` теперь формулируется как явный recurring-срез:
   - `Opened recurring expenses slice: full list.`
3. Сохранен и уточнен reset path:
   - `Clear focus`
   - `Start clean`
4. Context-memory продолжает сохранять/восстанавливать focus-срез и entry reason, но без старых split-полей.

## 4) Как изменен recurring UX

Сделано:
1. Удален главный UI-раскол `Payments / Subscriptions` как основная surface-ось.
2. Recurring lane теперь показывает единый список активных регулярных трат.
3. Сохранились полезные focus-срезы для работы:
   - `All`
   - `Action now`
   - `Upcoming`
   - `Paid`
4. Тип `Subscription` сохранен как вторичный атрибут:
   - метка на карточке
   - поле в advanced части add/edit формы (`Mark as subscription`)
5. Удалены subscription-only lane/pause-only view как главная навигационная поверхность.

## 5) Что стало с разделением "платежи / подписки"

Итог после pass:
1. как главный UX-раскол - убрано,
2. как вторичный доменный атрибут - сохранено,
3. recurring сценарий теперь читается как единый lane регулярных трат,
4. travel сценарий остается отдельным lane и не затронут.

## 6) Что намеренно НЕ менялось

1. travel foundation 28A не менялся,
2. БД/API миграции не добавлялись,
3. reminders/history/workspace/family core business logic не пересобиралась,
4. donation-only/supporter truth не менялась,
5. anchor не обновлялся (новой product truth/roadmap truth не появилось).

## 7) Risks / regression watchlist

1. Пользователям, привыкшим к старому split, нужно проверить читаемость нового единого lane на реальных данных.
2. Контекст из старого localStorage должен мягко переживаться без ошибок (покрыто нормализацией snapshots).
3. Проверить mobile-first поведение focus-срезов при долгих сессиях и переключениях вкладок.

## 8) Validation

Выполнено:
1. `npm run lint` - pass
2. `npm run build` - pass
3. targeted tests - pass:
   - `node --test --test-isolation=none src/lib/app/context-memory.test.ts src/lib/support/bug-report-runtime-context.test.ts src/lib/travel/split.test.ts`

## 9) Self-check против acceptance criteria

1. Правильное поведение `Сводки платежей`: да (явный recurring slice + continuity reason).
2. Осмысленный recurring-срез вместо простого переброса: да.
3. Обычный recurring UX стал единым и проще: да.
4. Лишний главный раскол `платежи / подписки` устранен: да.
5. Travel сохранен как отдельный режим: да.
6. Базовый release-line baseline не сломан: да.

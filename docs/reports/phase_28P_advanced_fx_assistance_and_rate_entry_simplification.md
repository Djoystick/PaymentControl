# Phase 28P - Advanced FX Assistance + Rate Entry Simplification

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: multi-currency UX assistance wave inside Travel expense workflow (post-28O), without FX-core rewrite and without history recalculation behavior changes
- Baseline preserved:
  - unrestricted donation-only product truth
  - no Premium/entitlement/unlock return
  - no recurring/travel merge
  - travel baseline 28A-28O preserved

## 1) Что найдено в audit после 28O

Ключевые friction points текущего FX runtime:
1. Cross-currency flow по-прежнему требовал полностью ручного ввода курса без локальных подсказок.
2. Пользователю не хватало явного контекста валютной пары при вводе (`1 source = ? trip`).
3. Превью нормализованной суммы было полезным, но недостаточно объясняло формулу.
4. В edit-сценарии foreign-currency траты не хватало явного напоминания о текущем сохраненном курсе и последствиях изменения.
5. В history была информация о converted amount, но не хватало читаемой FX-формулы для быстрых сверок.

## 2) Почему FX assistance выбран следующим шагом

После 28F (fixed-rate multi-currency foundation) и 28O (mature receipt review) логичный следующий шаг:
1. уменьшить рутину ввода курса,
2. сделать FX path понятнее,
3. не ломать fixed-rate reliability,
4. сохранить settlement/closure/archive/collaboration совместимость.

## 3) Как упрощен rate entry flow

Изменения в `src/components/app/travel-group-expenses-section.tsx`:
1. Усилен cross-currency блок:
   - явная `Rate pair` строка (`1 SOURCE = ? TRIP`),
   - fixed-rate пояснение: сохраненный курс фиксируется на этой трате и не пересчитывает прошлую историю.
2. Добавлен edit-aware FX hint:
   - для редактирования foreign-currency трат показывается `Current saved rate`,
   - отдельно объясняется, что изменение курса пересчитает именно эту трату и балансы поездки.
3. Улучшен preview:
   - сохранен итог `Will be saved as`,
   - добавлен `FX breakdown` (`source amount × rate = trip amount`) для прозрачности расчета.
4. Same-currency path упрощен:
   - вместо шумного блока показан компактный `No conversion needed` state,
   - явный сигнал про fixed rate = 1.

## 4) Как реализована assistance layer

Добавлен безопасный локальный FX-assistance слой (без БД-миграций):
1. Local memory ключ: `payment_control_travel_fx_rate_memory_v28p`.
2. Сохраняется workspace-scoped память курса по валютной паре (`SOURCE->TRIP`) после успешного save/update траты.
3. В cross-currency форме показываются подсказки:
   - `Use last saved` (из локальной pair-memory),
   - `Use recent rate` (из последних трат этой пары в поездке).
4. Подсказки применяются только по явному нажатию пользователя.
5. Никакого silent overwrite: пользователь всегда видит и контролирует финальный курс в input.

## 5) Как сохранена fixed-rate truth

Инварианты preserved:
1. Доменная нормализация через `normalizeTravelExpenseAmount` не менялась.
2. Курс по-прежнему фиксируется в момент save/edit конкретной траты.
3. Исторические траты не переоцениваются задним числом.
4. Assistance добавляет только подсказки при вводе, не меняет модель хранения.

## 6) Как изменены create/edit/history/detail surfaces

Create/Edit:
1. Улучшена ясность pair/rate смысла.
2. Добавлены быстрые кнопки применения курса из памяти/последних значений.
3. Добавлена более читаемая формула сохранения в валюте поездки.

History/Detail:
1. Для cross-currency трат добавлены:
   - `Rate pair` строка,
   - `FX breakdown` строка с формулой конвертации.
2. Это облегчает проверку “почему settlement посчитан именно так”.

## 7) Что намеренно НЕ менялось

1. Не менялась схема БД и API (миграции не добавлялись).
2. Не менялся OCR-core и provider logic (28G/28H).
3. Не менялась settlement math/optimizer logic (28I).
4. Не менялись closure/archive/collaboration domain rules (28E/28K/28L/28M).
5. Не менялся shell/Recurring/Profile guides.

## 8) Risks / Regression Watchlist

1. Проверить mobile readability FX hints/buttons на узких экранах Telegram WebView.
2. Проверить, что pair-memory остается workspace-scoped и не “перетекает” между workspace.
3. Проверить UX с OCR-prefill валюты: подсказки курса должны помогать, но не путать.
4. Проверить edit flow cross-currency трат, чтобы пользователи ясно понимали последствия изменения курса.

## 9) Проверки

Выполнено:
1. `npm run lint` - pass (warnings only: existing `@next/next/no-img-element` in receipt previews)
2. `npm run build` - pass
3. targeted tests/checks:
   - `npm run lint -- src/components/app/travel-group-expenses-section.tsx src/lib/i18n/localization.tsx` - pass (same warnings only)
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts` - pass

Примечание:
1. Попытка запустить `validation.test.ts` напрямую через `node --test` дала `ERR_MODULE_NOT_FOUND` (ESM resolution для `invite-token` без расширения в этом окружении). Это не блокировало 28P, т.к. в pass не менялись `validation.ts` и server validation contracts.

## 10) Самопроверка против acceptance criteria

1. Более удобный ввод курса для мультивалютных трат - выполнено.
2. Более понятный same-currency / foreign-currency UX - выполнено.
3. Advanced FX assistance без нарушения fixed-rate truth - выполнено.
4. Лучшая читаемость source amount/rate/normalized amount - выполнено.
5. Совместимость с settlement/closure/receipt/archive/collaboration слоями сохранена - выполнено.
6. Recurring baseline и общая product truth не сломаны - выполнено по scope и проверкам.

# Phase 28A - Travel Group Expenses Foundation + Manual-First MVP

- Date: 2026-04-04
- Status: implemented (new travel branch foundation), pending manual verification
- Scope: первая реальная реализация отдельного travel/group-expenses модуля поверх закрытой release-line
- Product truth baseline preserved:
  - unrestricted donation-only model
  - no Premium/entitlement/claim/unlock/paywall
  - supporter badge remains cosmetic only

## 1) Что было проанализировано перед реализацией

Проверены текущие базовые источники:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_27A_full_project_audit.md`
4. `docs/reports/internal_version_history.md`
5. финальные отчеты 27B-27G

Проверена актуальная архитектура runtime/data:
1. `src/components/app/profile-scenarios-placeholder.tsx` (табовая сборка экранов)
2. `src/components/app/app-shell.tsx` (4-tab shell и continuity)
3. `src/components/app/recurring-payments-section.tsx` (ядро recurring flow)
4. `src/components/app/payments-activity-section.tsx` (history flow)
5. `src/lib/payments/*` + `src/app/api/payments/*` (текущий recurring domain)
6. `src/lib/app-context/service.ts` + workspace/auth context
7. миграции `supabase/migrations/*` по профилям/workspace/recurring/supporter

## 2) Почему выбран именно такой способ интеграции

Выбран путь:
1. отдельный travel domain в БД/API/runtime,
2. отдельный travel UI-режим внутри существующей вкладки Reminders,
3. без добавления 5-й root-вкладки,
4. без изменения recurring payment сущностей.

Причина:
1. минимальный риск регресса для стабильного 27-line baseline,
2. соблюдение требования product-separation (travel != recurring reminder),
3. быстрый и практичный manual-first запуск полезного сценария.

## 3) Как travel-модуль отделен от recurring/reminders ядра

Separation выполнен на всех слоях:
1. отдельная схема данных:
   - `travel_trips`
   - `travel_trip_members`
   - `travel_trip_expenses`
   - `travel_expense_splits`
2. отдельный lib-domain:
   - `src/lib/travel/types.ts`
   - `src/lib/travel/context.ts`
   - `src/lib/travel/validation.ts`
   - `src/lib/travel/split.ts`
   - `src/lib/travel/repository.ts`
   - `src/lib/travel/client.ts`
3. отдельные API routes:
   - `src/app/api/travel/trips/list/route.ts`
   - `src/app/api/travel/trips/route.ts`
   - `src/app/api/travel/trips/[tripId]/route.ts`
   - `src/app/api/travel/trips/[tripId]/expenses/route.ts`
4. отдельная пользовательская поверхность:
   - `src/components/app/travel-group-expenses-section.tsx`
   - `src/components/app/reminders-and-travel-section.tsx`

Recurring domain (`recurring_payments`, existing reminders flow) не использован как модель поездки и не модифицирован концептуально.

## 4) Какие сущности и migration/schema изменения внесены

Новая миграция:
1. `supabase/migrations/20260404120000_phase28a_travel_group_expenses_foundation.sql`

Добавлено:
1. `travel_trips`:
   - поездка, базовая валюта, описание, workspace-привязка
2. `travel_trip_members`:
   - участники поездки (display name + optional profile/telegram links)
3. `travel_trip_expenses`:
   - траты поездки, payer, категория, split mode
4. `travel_expense_splits`:
   - детальные split-строки по участникам

Безопасность/целостность:
1. FK и composite FK для trip-member consistency
2. checks для amount/currency/text/split_mode
3. индексы для trip list/detail/expense read paths
4. никаких изменений recurring таблиц

## 5) Как устроен Trip flow (MVP)

Реализовано:
1. создание поездки:
   - название
   - базовая валюта
   - optional заметка
   - стартовый список участников
2. список поездок по текущему workspace
3. экран выбранной поездки:
   - участники
   - сводка (members / expenses / total)
   - форма добавления траты
   - балансы
   - блок "кто кому должен"
   - отдельная история трат поездки

Интеграция в app:
1. Reminders теперь содержит mode switch:
   - `Recurring`
   - `Travel groups`
2. recurring flow сохранен и остается рабочим default lane

## 6) Как устроен split flow

Поддержаны обязательные режимы:
1. `equal_all` - поровну на всех участников
2. `equal_selected` - поровну на выбранных
3. `full_one` - вся сумма на одного
4. `manual_amounts` - ручное деление по суммам

Технически:
1. split-engine: `src/lib/travel/split.ts`
2. строгая валидация сумм и участников
3. для even split корректно раздается остаток по копейкам

## 7) Как считаются базовые балансы

Реализовано:
1. per member:
   - `paidAmount`
   - `owedAmount`
   - `netAmount = paid - owed`
2. summary:
   - totalSpent
   - totalExpensesCount
3. human-readable settlements:
   - базовый greedy matching debtors -> creditors
   - без сложного optimizer-overengineering

## 8) Что намеренно НЕ делалось в этом pass

Не делалось сознательно:
1. OCR и photo receipt pipeline
2. notification interception
3. мультивалютный conversion engine
4. advanced settlement optimization
5. trip closure/finalization workflow
6. travel merge в основную recurring/history сущность
7. новая root tab

## 9) Future roadmap recommendations (зафиксировано, но не реализовано)

Рекомендованные следующие этапы:
1. фото чека
2. OCR-предзаполнение полей траты
3. режим "сохранить чек сейчас, разобрать позже"
4. мультивалюта и explicit exchange context
5. trip closure / settlement finalization
6. advanced balance logic (оптимизация числа переводов)
7. archive/completion flow для поездок

## 10) Использование design reference

Использован `ui-ux-pro-max` skill как reference для:
1. mobile-first action lane
2. progressive disclosure в форме траты
3. clear state/action hierarchy
4. low-noise empty states + next action

Ограничение среды:
1. запуск python search-скрипта skill был заблокирован policy (`python.exe access denied`)
2. применен fallback через локальные data CSV skill + текущую design system 27B

## 11) Validation

Выполнено:
1. `node --test --test-isolation=none src/lib/travel/split.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass

Добавленные targeted tests:
1. `src/lib/travel/split.test.ts`
   - equal_all (rounding)
   - equal_selected
   - manual_amounts validation
   - summary + settlement output

## 12) Migration / DB sync notes

Что удалось в среде:
1. миграция добавлена и синтаксически согласована с текущей схемой
2. `supabase migration list` не выполнен из-за отсутствия `SUPABASE_ACCESS_TOKEN` в этой среде

Рекомендованный ручной sync:
1. `supabase login` (или `SUPABASE_ACCESS_TOKEN`)
2. `supabase migration list`
3. `supabase db push`
4. smoke-check API flows:
   - `/api/travel/trips/list`
   - `/api/travel/trips`
   - `/api/travel/trips/[tripId]`
   - `/api/travel/trips/[tripId]/expenses`

## 13) Risks / regression watchlist

1. Manual split UX: пользователи могут ошибаться в сумме ручного деления
2. Большие поездки: потребуются pagination/virtualization на длинной истории
3. Workspace scope: важно вручную проверить сценарии switch workspace -> travel list isolation
4. Telegram webview: отдельно проверить mobile keyboard/date input поведение

## 14) Self-check против acceptance criteria

1. Новый отдельный travel-модуль внутри Payment Control: да
2. Manual-first MVP реализован: да
3. Создание поездки и участников: да
4. Добавление travel-трат вручную: да
5. Рабочее деление трат (4 режима): да
6. Понятные текущие балансы + "кто кому должен": да
7. Отдельная travel-история внутри поездки: да
8. Интеграция без поломки recurring ядра: да
9. Donation-only truth / no premium comeback preserved: да

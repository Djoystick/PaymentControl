# Payment Control Mini App — актуальный якорь и статус проекта

Дата фиксации: 2026-03-25
Проект: Telegram Mini App для контроля регулярных платежей, подписок и домашних расходов

---

## Короткая фраза для переноса в новый чат

**Последний подтвержденный этап: Phase 5A.**  
**Последний полученный отчет Codex: Phase 6A — Reminder Preferences + Candidate Foundation. Этап реализован в коде, но ручная проверка еще не выполнена.**  
**Продолжать работу в новом чате нужно с ручной проверки Phase 6A.**

---

## 1. Актуальный якорь проекта

### Что это за продукт
Создается Telegram Mini App для простого и частого бытового использования.
Базовая идея: человек открывает Mini App в Telegram и быстро видит, что и когда нужно оплатить, что уже оплачено, что просрочено, и какие регулярные платежи/подписки требуют внимания.

### Основные сценарии продукта
При старте и в профиле должен быть выбор сценария использования:
1. **Я плачу один**
2. **Семейное использование**

Важно:
- оба сценария в будущем поддерживают premium-функции;
- сценарий можно сменить в профиле;
- сейчас продукт развивается **от массового одиночного режима**, а семейность подключается позже, на готовый фундамент.

### Текущее позиционирование
Продукт не должен ощущаться как тяжелая бухгалтерия.
Он должен ощущаться как:
- домашний центр обязательных оплат;
- контроль регулярных расходов и подписок;
- быстрый бытовой инструмент внутри Telegram.

### Техническая основа
- Frontend: **Next.js + TypeScript + Tailwind**
- Backend / DB: **Supabase**
- Telegram слой: **Telegram Mini App + Bot API**
- Деплой/фронт-платформа: **Vercel**
- GitHub пространство проекта: **Djoystick**

### Архитектурные принципы
- изменения маленькими контролируемыми pass’ами;
- не делать дальние фазы раньше времени;
- сначала фундамент и устойчивость, потом расширения;
- все новые сущности строить с учетом будущих:
  - single mode,
  - family mode,
  - premium,
  - scenario switching,
  - referral system,
  - growth layer в самом конце.

### Что обязательно учесть в будущем
1. **RU/EN localization** — отдельный будущий этап, обязательно добавить переключение русского и английского интерфейса.
2. **Referral architecture soft-ready** — сама реферальная система позже, но совместимость с ней должна учитываться в архитектуре.
3. **Продвижение без платной рекламы** — это отдельный финальный блок roadmap, только после 100% технической готовности.
4. **Дополнительные skills/extensions/MCP для Codex** — предлагать не заранее, а только когда они реально начнут экономить время.

---

## 2. Правила работы с Codex

### Основной цикл работы
1. Я даю промт для Codex.
2. Codex делает pass.
3. Codex сохраняет подробный отчет в `.md`.
4. Пользователь приносит отчет сюда.
5. Здесь проводится ручная проверка.
6. Только после ручного ОК дается следующий промт.

### Обязательные правила для будущих промтов
- Перед каждым промтом **всегда явно указывать модель**:
  - **ChatGPT 5.4**
  - **ChatGPT 5.3 Codex**
- Делать только текущую фазу, без лишнего scope creep.
- Не делать тяжелых рефакторингов без прямой необходимости.
- Не выдавать неподтвержденное за выполненное.
- Всегда сохранять **полный подробный отчет в `.md`** внутри проекта.
- В ответе Codex в чате давать **только краткий отчет**, потому что полный уже лежит в `.md`.

### Новое правило для всех следующих промтов Codex
Добавлять требование:
- **полный отчет сохранять в `docs/...md`;**
- **в чате выдавать только краткий итог**, например:
  - A. что изменено;
  - B. какие ключевые файлы созданы/изменены;
  - C. что реально подтверждено / не подтверждено;
  - D. блокеры, assumptions, manual setup.

### Что не делать
- не запускать следующий feature-pass, если текущий не прошел ручную проверку;
- не чинить хаотично несколько будущих фаз сразу;
- не включать growth/affiliate/referral как активную механику раньше времени;
- не трогать family mode раньше отдельных family-phase pass’ов.

---

## 3. Последний roadmap / status

### Уже подтверждено руками
- **Phase 0** — foundation
- **Phase 0.1** — hydration bugfix
- **Phase 1A** — auth/profile foundation
- **Phase 2A** — personal workspace foundation
- **Phase 2B** — current app context foundation
- **Phase 3A** — recurring payments CRUD foundation
- **Phase 3B** — payment cycle state foundation
- **Phase 4A** — dashboard MVP foundation
- **Phase 5A** — quick add + starter templates foundation

### Последний этап, реализованный в коде, но еще не проверенный руками
- **Phase 6A** — reminder preferences + reminder candidate foundation

### Что должно идти следующим после успешной ручной проверки Phase 6A
- **Phase 6B** — minimal reminder dispatch foundation (контролируемый trigger path + delivery-attempt logging, без полного автономного scheduler на первом шаге)

### Большие будущие блоки roadmap
Ниже — текущая логика развития проекта после уже сделанных фаз.

#### Блок A. Reminder / notification foundation
- Phase 6A — reminder preferences + candidate foundation
- Phase 6B — dispatch foundation / controlled trigger
- позже — осторожный путь к реальной Telegram delivery automation

#### Блок B. Subscriptions layer
- отдельный слой для подписок как частного случая recurring payments;
- удобный учет подписок и сумм по ним;
- не раньше, чем reminder foundation станет устойчивой.

#### Блок C. Family foundation
- family workspace foundation
- invite flow
- personal/shared payment distinction
- responsibility / who pays
- family UX

#### Блок D. Premium layer
- premium feature gates
- premium для single
- premium для family
- подготовка к платежам / монетизации

#### Блок E. Scenario switching
- корректный переход `single -> family`
- корректный переход `family -> single`
- перенос/сохранение нужных данных

#### Блок F. Localization
- обязательный будущий pass: **RU/EN переключение интерфейса**
- по возможности не в виде хаотичной точечной замены, а как отдельный контролируемый слой локализации

#### Блок G. Referral system
- архитектурная совместимость должна сохраняться заранее;
- сама реферальная система — отдельный поздний этап после основной технической части.

#### Блок H. Final promotion block
Только после полной технической готовности:
- рост через привычку / напоминания;
- семейные приглашения;
- deep links;
- Telegram-native распространение;
- контент-канал;
- сообщества;
- позже affiliate-модель.

---

## 4. Последний md-отчет Codex (встроенная копия)

Файл: `docs/phase6a_reminder_preferences_foundation_report.md`

### Название
**Phase 6A - Reminder Preferences + Candidate Foundation Report**

### Scope
Minimal reminder preferences and reminder candidate computation for personal workspace.

### What Was Implemented
- Added reminder preference fields on recurring payments:
  - `reminders_enabled`
  - `remind_days_before` (0/1/3)
  - `remind_on_due_day`
  - `remind_on_overdue`
- Extended payment create/update flow and validation to support reminder preferences.
- Added server-side reminder candidate computation using current-cycle due date + cycle paid/unpaid state.
- Added reminder candidate endpoint:
  - `POST /api/payments/reminders/candidates`
- Added minimal reminder candidates UI section:
  - summary counts by reason (`due_today`, `advance`, `overdue`)
  - candidate list
  - refresh button
- Added minimal reminder settings UI into recurring payment form:
  - reminders enabled toggle
  - remind days before selector
  - due-day reminder toggle
  - overdue reminder toggle
- Preserved existing payment CRUD, cycle-state actions, dashboard, and quick-add behavior.

### Reminder Rules Used
- Evaluation is UTC date based and intentionally simple.
- Candidate evaluation considers only:
  - active payments
  - unpaid current cycle
  - reminders enabled
- Candidate reasons:
  - `due_today`: due date is today and `remind_on_due_day = true`
  - `advance`: due date is `today + remind_days_before` and `remind_days_before > 0`
  - `overdue`: due date before today and `remind_on_overdue = true`
- Duplicate candidates for same payment+reason are deduplicated in one evaluation pass.

### What Was Intentionally NOT Implemented
- Actual Telegram reminder delivery sending.
- Background scheduler/cron/job worker.
- Queue system for retries.
- Family/shared reminder flows.
- Premium reminder tiers.
- Full notification center/history.
- Advanced reminder engine (time-of-day, multiple reminder offsets, custom rules).

### Exact Files Created/Modified
Created:
- `supabase/migrations/20260325_060000_phase6a_reminder_preferences.sql`
- `src/app/api/payments/reminders/candidates/route.ts`
- `src/components/app/reminder-candidates-section.tsx`
- `docs/phase6a_reminder_preferences_foundation_report.md`

Modified:
- `src/lib/payments/types.ts`
- `src/lib/payments/validation.ts`
- `src/lib/payments/repository.ts`
- `src/lib/payments/client.ts`
- `src/lib/payments/starter-templates.ts`
- `src/app/api/payments/recurring/route.ts`
- `src/app/api/payments/recurring/[paymentId]/route.ts`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/landing-screen.tsx`
- `README.md`

### Manual Verification Steps
1. Apply migration `20260325_060000_phase6a_reminder_preferences.sql`.
2. Start app and open in browser with dev fallback (or Telegram context).
3. In recurring payment form, set reminder preferences and create/update a payment.
4. Confirm reminder settings persist after refresh.
5. Open reminder candidates section and verify list/counts.
6. Mark payment paid and confirm it is removed from due/unpaid candidate set.
7. Mark unpaid again and confirm candidate can reappear when rules match.
8. Archive payment and confirm no reminder candidate remains for it.

### Known Limitations
- Candidate computation is on-demand (read-time), no scheduled background job.
- UTC date boundaries may differ from local timezone expectations.
- Reminder offsets are intentionally limited to `0`, `1`, `3` days.
- No delivery logs or notification history table yet.
- Personal workspace only.

### Recommended Next Phase
- **Phase 6B**: add minimal reminder dispatch foundation (manual or controlled trigger path) with delivery-attempt logging, while still avoiding a full autonomous scheduler in the first pass.

### Verification Status In This Environment
- Confirmed in this pass:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Build output includes `/api/payments/reminders/candidates`.
- Not fully confirmed in this pass:
  - Full manual runtime click-through verification was not executed by this tool run.

---

## 5. Что нужно сделать первым делом в новом чате

Работу в новом чате нужно начинать **не с нового промта**, а с **ручной проверки Phase 6A**.

### Первый шаг
Применить миграцию:
- `supabase/migrations/20260325_060000_phase6a_reminder_preferences.sql`

### Затем проверить руками
1. Открыть приложение с dev fallback.
2. В recurring payment form найти reminder settings.
3. Включить/отключить reminders на платеже.
4. Проверить `remind_days_before`.
5. Проверить `remind_on_due_day` и `remind_on_overdue`.
6. Обновить страницу и проверить, что настройки сохранились.
7. Открыть reminder candidates section.
8. Проверить counts и candidate list.
9. Нажать `Mark paid` и убедиться, что кандидат исчезает из due/unpaid.
10. Нажать `Undo paid` и проверить, что кандидат может вернуться.
11. Заархивировать платеж и проверить, что reminder candidate исчезает.
12. Проверить терминал / консоль на отсутствие новых критичных 4xx/5xx.

### Что прислать после ручной проверки
- скрин reminder settings в форме;
- скрин reminder candidates section;
- при возможности — скрин Supabase после миграции / соответствующих полей;
- скрин терминала/консоли.

После этого в новом чате нужно принять или отклонить **Phase 6A** и только потом двигаться дальше.

---

## 6. Короткий шаблон начала нового чата

Можно просто вставить в новый чат такой текст:

> Это продолжение проекта Payment Control Mini App.  
> Последний подтвержденный этап: **Phase 5A**.  
> Последний полученный отчет Codex: **Phase 6A — Reminder Preferences + Candidate Foundation** (реализован в коде, ручная проверка еще не выполнена).  
> Нужно продолжить работу **с ручной проверки Phase 6A**.  
> Ниже приложен актуальный якорь/roadmap/status и встроенная копия последнего md-отчета.


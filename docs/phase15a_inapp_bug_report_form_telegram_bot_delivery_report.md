# Phase 15A — In-app bug report form + Telegram bot delivery

Модель: ChatGPT 5 Codex  
Дата: 2026-03-28  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны релевантные отчеты:
  - `docs/phase13a_premium_entitlement_foundation_no_core_paylock_report.md`
  - `docs/phase13c_owner_only_premium_admin_console_campaign_control_report.md`
  - `docs/phase13c1_fix_manual_premium_grant_revoke_owner_admin_console_report.md`
  - `docs/phase14a_information_audit_onboarding_expansion_onetime_family_invite_flow_report.md`
  - `docs/phase14a1_reminders_scenario_clarity_compact_family_controls_profile_help_cleanup_report.md`
  - `docs/phase14a2_popover_viewport_fix_onboarding_copy_rewrite_report.md`
- Статус-override из запроса принят:
  - `11A.1`, `11B`, `11C`, `11D`, `12A.1`, `12B`, `12C`, `13A`, `13C`, `14A.2` — manual verified.
- Базовая точка для этого pass: **Phase 14A.2 manual verified**.

## Цель Phase 15A
Добавить легковесный путь поддержки:
1. В Profile — компактный entry point и форма баг-репорта.
2. Отправка — server-side.
3. Доставка — в Telegram через bot API на owner/admin destination.
4. Пользователь получает явный результат отправки (success/error).

## Exact files changed
1. `.env.example`
2. `src/lib/config/server-env.ts`
3. `src/lib/auth/types.ts`
4. `src/lib/auth/client.ts`
5. `src/app/api/support/bug-report/route.ts` (new)
6. `src/components/app/profile-scenarios-placeholder.tsx`
7. `src/lib/i18n/localization.tsx`
8. `docs/phase15a_inapp_bug_report_form_telegram_bot_delivery_report.md` (new)

## Где добавлен entry point
Статус: **Подтверждено по коду/отчету**

- Entry point добавлен в `Profile` как компактный свернутый блок:
  - заголовок: `Report a bug`
  - реализация: `src/components/app/profile-scenarios-placeholder.tsx`
- Блок не загромождает основной UI:
  - находится в `details` (collapsed по умолчанию),
  - раскрывается только по запросу.

## Как работает форма баг-репорта
Статус: **Подтверждено по коду/отчету**

UI-поля:
1. `Issue title` (обязательное, короткое).
2. `What happened?` (обязательное описание).
3. `Steps to reproduce (optional)` (необязательные детали).

Поведение:
1. Есть локальная валидация (минимальная длина title/description).
2. На submit вызывается client API:
   - `submitBugReport(...)` из `src/lib/auth/client.ts`
   - endpoint: `POST /api/support/bug-report`
3. Пользователь всегда видит явный результат:
   - success: сообщение с `reportId`
   - error: понятное сообщение (включая not configured / delivery failed)
4. Silent-failure отсутствует.

## Как устроена server-side обработка
Статус: **Подтверждено по коду/отчету**

Файл:
- `src/app/api/support/bug-report/route.ts`

Ключевые шаги:
1. Принимает payload формы (`title`, `description`, `steps`, `language`, `currentScreen`).
2. Валидирует и нормализует вход.
3. Получает подтвержденный app context через `readCurrentAppContext(initData)`:
   - профиль,
   - активное workspace,
   - auth source.
4. Формирует структурированное сообщение для Telegram.
5. Отправляет через существующий server-side delivery helper:
   - `sendTelegramMessageWithPreflight(...)`
   - без хранения/использования bot credentials на клиенте.
6. Возвращает `ok: true` с `reportId`/`sentAt` или `ok: false` с кодом ошибки.

## Что отправляется в Telegram (debug context)
Статус: **Подтверждено по коду/отчету**

Сообщение включает:
1. Project/app label (`Payment Control - Bug report`).
2. `Report ID`.
3. UTC timestamp.
4. Reporter блок:
   - Telegram user id,
   - username,
   - name.
5. App context блок:
   - auth source,
   - language,
   - screen,
   - scenario,
   - workspace title/kind/role/members/id.
6. Issue блок:
   - title,
   - description,
   - optional steps/details.

Также добавлен safe truncate до лимита Telegram-сообщения.

## Env/config requirements
Статус: **Подтверждено по коду/отчету**

Добавлены конфиги:
1. `.env.example`
   - `BUG_REPORT_TELEGRAM_CHAT_ID=`
2. `src/lib/config/server-env.ts`
   - `serverEnv.bugReportTelegramChatId`

Для корректной работы нужны:
1. `TELEGRAM_BOT_TOKEN` (уже используется проектом).
2. `BUG_REPORT_TELEGRAM_CHAT_ID` — numeric Telegram chat/user id получателя.

## Миграции / storage changes
Статус: **Миграции не требуются**

- БД/SQL миграции не добавлялись.
- Новые таблицы не требуются.

## Что намеренно НЕ реализовано
Статус: **Подтверждено по коду/отчету**

1. Полноценная тикет-система.
2. История баг-репортов для пользователя внутри приложения.
3. Админ-панель обработки баг-репортов.
4. Вложения/файлы/скриншоты.
5. Любые premium/growth/public rollout расширения.

## Risks / follow-up notes
1. Если `BUG_REPORT_TELEGRAM_CHAT_ID` не задан, submit будет возвращать controlled error.
2. Для успешной отправки в личный чат получатель должен иметь активный диалог с ботом (стандартное ограничение Telegram).
3. Нужна live-проверка в Telegram runtime на реальном окружении и реальном destination chat id.

## What still requires live manual verification
Статус: **Еще не подтверждено живой проверкой**

1. Реальная отправка баг-репорта из Profile в production Telegram Mini App.
2. Получение сообщения owner’ом в целевом Telegram chat.
3. UX-проверка success/error в боевом runtime.
4. Короткий regression smoke основных verified flows после deploy.

## Exact manual checklist
1. В `.env` задать `BUG_REPORT_TELEGRAM_CHAT_ID` (numeric id).
2. Проверить, что `TELEGRAM_BOT_TOKEN` валиден.
3. Открыть Mini App в Telegram.
4. Перейти в `Profile` -> раскрыть `Report a bug`.
5. Заполнить title + description (+ optional steps) и отправить.
6. Проверить success-сообщение в UI (с `reportId`).
7. Проверить, что owner получил сообщение от бота в Telegram.
8. Проверить, что в сообщении есть reporter/app/workspace/language/title/description/time.
9. Проверить негативный сценарий (временная ошибка доставки/неверная конфигурация) — UI должен показать явную ошибку.
10. Пройти smoke core flows:
   - tab switching,
   - RU/EN + persistence,
   - Mark paid / Undo paid,
   - family shared flow,
   - one-time invite,
   - premium status/admin console.

## Encoding safety check
Проверены все затронутые файлы с пользовательским русским текстом:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase15a_inapp_bug_report_form_telegram_bot_delivery_report.md`

Результат:
- UTF-8 сохранен.
- Битой кириллицы/mojibake в изменениях не обнаружено.
- Дополнительных encoding-правок не потребовалось.

## Pre-report self-check against prompt
1. In-app bug report entry point exists — **Да**  
   Entry point добавлен в Profile как компактный `details` блок.

2. User can submit via compact form — **Да**  
   Форма с title/description/optional steps реализована.

3. Submission is server-side — **Да**  
   Реальный `POST /api/support/bug-report` с server обработкой.

4. Owner receives Telegram bot message — **Да (по коду), live подтверждение требуется**  
   Доставка подключена к Bot API через server helper.

5. User sees clear success/failure feedback — **Да**  
   Явные статусы в UI, без silent failure.

6. Existing verified flows are preserved — **Да (по коду), live regression требуется**  
   Изменения локализованы в Profile + новый support API.

7. No unrelated scope added — **Да**  
   Полноценная support-platform/growth/premium-wave не добавлялись.

---

## Короткое объяснение (по-русски)
Добавлен компактный баг-репорт прямо в Profile. Пользователь заполняет короткую форму, отправка идет через сервер, и owner получает сообщение от Telegram-бота с полезным контекстом. В UI есть понятный результат: успешно или ошибка.

## Ручной тест-чеклист (по-русски)
1. Настроить `BUG_REPORT_TELEGRAM_CHAT_ID` и `TELEGRAM_BOT_TOKEN`.
2. Открыть `Profile` -> `Report a bug`.
3. Отправить тестовый баг-репорт.
4. Проверить success в UI и получение сообщения в Telegram.
5. Проверить, что payload содержит title/description + reporter/workspace/language/time.
6. Проверить error-сценарий (например, временно неверный destination) и убедиться, что UI показывает ошибку.

## Git Bash команды (реальный workflow)
```bash
git status
git add .env.example src/lib/config/server-env.ts src/lib/auth/types.ts src/lib/auth/client.ts src/app/api/support/bug-report/route.ts src/components/app/profile-scenarios-placeholder.tsx src/lib/i18n/localization.tsx docs/phase15a_inapp_bug_report_form_telegram_bot_delivery_report.md
git commit -m "phase15a: add in-app bug report form with server-side telegram delivery"
git push origin main
```

## Что нужно указать в env (просто)
1. `BUG_REPORT_TELEGRAM_CHAT_ID` — числовой Telegram id чата/пользователя, куда бот шлет баг-репорты.
2. `TELEGRAM_BOT_TOKEN` — токен бота.
3. Убедиться, что получатель уже открыл чат с ботом (нажал Start), иначе Telegram может отклонить отправку.

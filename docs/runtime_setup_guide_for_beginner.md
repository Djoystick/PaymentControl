# Подробная инструкция: как впервые поднять Telegram Mini App runtime (GitHub + Vercel + Supabase + Telegram)

Документ написан для сценария "делаю это впервые".  
Здесь много мелких шагов специально, чтобы не пришлось догадываться.

## Перед стартом (обязательно)
1. Подготовьте аккаунты:
- GitHub
- Vercel
- Supabase
- Telegram (аккаунт владельца бота)

2. Подготовьте проект локально:
- проект открыт в IDE;
- есть файл `.env.local` (локально);
- есть `.env.example` как шаблон.

3. Важно по безопасности:
- никогда не публикуйте `.env.local` в репозиторий;
- если ранее токены/ключи попадали в git history, сразу сделайте их rotate в Supabase/Telegram.

4. Что уже есть в проекте:
- все API route работают через `/api/...`;
- Telegram `initData` проверяется на сервере;
- есть dev fallback для локальной отладки, но в production он не должен быть основным режимом.

---

## 1) GitHub — как загрузить/обновить проект

### Вариант A (через IDE + git)
1. Откройте терминал в корне проекта.
2. Проверьте изменения:
```bash
git status
```
3. Добавьте файлы:
```bash
git add .
```
4. Сделайте commit:
```bash
git commit -m "Phase 9A runtime integration foundation"
```
5. Отправьте в GitHub:
```bash
git push origin <ваша-ветка>
```

### Вариант B (если репозиторий еще не создан)
1. Зайдите на `https://github.com`.
2. Нажмите `New repository`.
3. Укажите:
- Repository name
- Visibility (обычно Private для такого проекта)
4. Нажмите `Create repository`.
5. На странице GitHub скопируйте команды `git remote add origin ...` и `git push -u origin ...`.
6. Выполните их в терминале проекта.

### Как понять, что шаг выполнен
1. Откройте страницу репозитория на GitHub.
2. Убедитесь, что виден ваш последний commit (по времени и сообщению).
3. Откройте вкладку `Commits` и проверьте SHA последнего коммита.

Если commit не появился:
- проверьте, что push ушел в правильную ветку;
- проверьте, что в IDE открыт нужный репозиторий.

---

## 2) Vercel — как подключить GitHub и сделать deploy

1. Зайдите на `https://vercel.com`.
2. Нажмите `Add New...` -> `Project`.
3. В блоке `Import Git Repository` выберите ваш GitHub-репозиторий.
4. Нажмите `Import`.
5. На экране `Configure Project`:
- Framework обычно определяется как Next.js автоматически;
- Root Directory оставьте по умолчанию (если проект в корне репо);
- Build Command / Output Directory обычно не меняйте, если автодетект корректен.
6. До нажатия Deploy добавьте переменные окружения (см. раздел 2.1).
7. Нажмите `Deploy`.

### 2.1 Какие env добавить в Vercel (Project Settings -> Environment Variables)
Добавьте каждую переменную отдельно.  
Рекомендуется включить минимум `Production` и `Preview` для одинакового поведения.

Клиентские (`NEXT_PUBLIC_*`):
- `NEXT_PUBLIC_APP_NAME` = `Payment Control`
- `NEXT_PUBLIC_APP_STAGE` = `production`
- `NEXT_PUBLIC_API_BASE_URL` = `/api`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = `<username бота без @>`
- `NEXT_PUBLIC_SUPABASE_URL` = `<Supabase Project URL>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<Supabase anon key>`

Серверные:
- `SUPABASE_URL` = `<Supabase Project URL>`
- `SUPABASE_SERVICE_ROLE_KEY` = `<Supabase service_role key>`
- `SUPABASE_JWT_SECRET` = `<Supabase JWT secret>`
- `TELEGRAM_BOT_TOKEN` = `<token от BotFather>`
- `TELEGRAM_BOT_API_BASE_URL` = `https://api.telegram.org`
- `TELEGRAM_INIT_DATA_MAX_AGE_SEC` = `86400`
- `REMINDER_SCHEDULED_DISPATCH_SECRET` = `<длинный случайный секрет>`
- `CRON_SECRET` = `<длинный случайный секрет>`
- `ALLOW_DEV_TELEGRAM_AUTH_FALLBACK` = `false`

Локальные fallback-переменные (`DEV_TELEGRAM_*`) в production обычно не задавайте.

### Как понять, что deploy успешный
1. В Vercel откройте ваш проект -> `Deployments`.
2. У последнего деплоя должен быть статус `Ready`.
3. Нажмите на deployment URL и убедитесь, что открывается страница приложения.

Если `Build Failed`:
- откройте `View Build Logs`;
- ищите первую ошибку (не последнюю строку);
- чаще всего это missing env или ошибка в коде.

---

## 3) Supabase — где взять URL/keys, как применить миграции, как проверить таблицы

## 3.1 Где взять URL и ключи
1. Откройте `https://supabase.com`.
2. Выберите проект.
3. Слева откройте `Project Settings` -> `API`.
4. Скопируйте:
- `Project URL` -> это `SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` -> это `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` -> это `SUPABASE_SERVICE_ROLE_KEY`
- `JWT secret` -> это `SUPABASE_JWT_SECRET` (если отображается в вашем интерфейсе)

## 3.2 Как применить миграции (простой вариант через SQL Editor)
1. В Supabase откройте `SQL Editor`.
2. Нажмите `New query`.
3. В проекте откройте папку `supabase/migrations`.
4. Выполняйте файлы по порядку имени (строго сверху вниз):
- `20260325010000_phase1a_profiles.sql`
- `20260325020000_phase2a_personal_workspaces.sql`
- `20260325030000_phase3a_recurring_payments.sql`
- `20260325040000_phase3b_payment_cycle_state.sql`
- `20260325060000_phase6a_reminder_preferences.sql`
- `20260325061000_phase6b_reminder_dispatch_attempts.sql`
- `20260325062000_phase6c_reminder_attempt_reason_test_send.sql`
- `20260325063000_phase6d_telegram_recipient_bindings.sql`
- `20260325070000_phase7a_subscriptions_layer.sql`
- `20260325071000_phase7d_subscription_pause_resume.sql`
- `20260326080000_phase8b_family_invites.sql`
- `20260326081000_phase8d_family_responsibility.sql`
- `20260327090000_phase9c_family_shared_economics_foundation.sql`
5. Для каждого файла:
- скопируйте SQL;
- вставьте в SQL Editor;
- нажмите `Run`.

## 3.3 Как проверить, что таблицы появились
1. Откройте `Table Editor`.
2. Проверьте, что есть таблицы:
- `profiles`
- `workspaces`
- `workspace_members`
- `recurring_payments`
- `recurring_payment_cycles`
- `reminder_dispatch_attempts`
- `telegram_recipient_bindings`
- `family_workspace_invites`

Если таблицы не появились:
- вернитесь в `SQL Editor`;
- найдите migration, где был error;
- исправьте именно первую ошибку и повторите.

---

## 4) Telegram Bot — как создать/настроить бота через BotFather

1. Откройте Telegram.
2. Найдите `@BotFather`.
3. Нажмите `Start`.
4. Отправьте команду:
```text
/newbot
```
5. BotFather попросит:
- название бота (человеческое имя);
- username (должен заканчиваться на `bot`).
6. После создания BotFather отправит токен вида:
`123456:ABC...`
7. Скопируйте токен и сохраните:
- в локальный `.env.local` -> `TELEGRAM_BOT_TOKEN`
- в Vercel env -> `TELEGRAM_BOT_TOKEN`

Дополнительно:
1. В BotFather можно задать описание:
```text
/setdescription
```
2. Можно задать короткое описание:
```text
/setabouttext
```

Важно:
- токен дает полный доступ к боту;
- не публикуйте его в GitHub и не отправляйте в чат.

---

## 5) Telegram Mini App — как привязать URL приложения к боту

Цель: чтобы бот открывал именно ваш Vercel URL как Mini App.

1. Убедитесь, что deployment в Vercel уже `Ready`.
2. Скопируйте production URL, например:
`https://your-project.vercel.app`
3. Вернитесь в чат с `@BotFather`.
4. Настройте кнопку меню для бота:
```text
/setmenubutton
```
5. Выберите вашего бота.
6. BotFather спросит текст кнопки меню (например `Open App`).
7. BotFather спросит URL:
- вставьте ваш Vercel production URL.
8. Подтвердите сохранение.

После этого в личном чате с ботом кнопка `Menu` должна открывать ваш Mini App.

Если в вашем интерфейсе BotFather меню немного отличается:
- логика та же: нужно выставить `menu button` типа Web App с URL вашего Vercel deployment.

---

## 6) Проверка запуска в Telegram — что нажимать и что должно произойти

1. Откройте личный чат с вашим ботом.
2. Нажмите `Start` (если еще не нажимали).
3. Нажмите `Menu` -> `Open App` (или ваш текст кнопки).
4. Откроется Mini App внутри Telegram.

Что должно быть в рабочем сценарии:
1. Приложение загружается без белого экрана.
2. В Profile/Auth состоянии видно, что источник Telegram (не dev fallback).
3. После bootstrap у пользователя создаются профиль и personal workspace (если это первый вход).

Если открывается, но данные не грузятся:
- проверьте Vercel logs;
- проверьте Supabase env в Vercel;
- проверьте `TELEGRAM_BOT_TOKEN`.

---

## 7) Проверка появления пользователя в Supabase — куда зайти и что искать

1. Откройте Supabase -> `Table Editor`.
2. Откройте таблицу `profiles`.
3. Найдите новую строку с вашим `telegram_user_id`.
4. Проверьте поля:
- `first_name`, `username`
- `selected_scenario`
- `active_workspace_id`

5. Откройте таблицу `workspaces`.
6. Должен быть минимум один personal workspace для этого профиля.

7. Откройте таблицу `workspace_members`.
8. Должна быть строка, где:
- `workspace_id` = личный workspace;
- `profile_id` = ваш профиль;
- `member_role` = `owner`.

Если `profiles` пусто:
- скорее всего Telegram initData не прошла верификацию;
- проверьте, что бот токен в Vercel корректный и без лишних пробелов.

---

## 8) Проверка current app context / profile / workspace

В Mini App (внутри Telegram):
1. Перейдите в профильную секцию.
2. Проверьте:
- `Auth state` (должен быть Telegram-источник, а не fallback);
- активный workspace;
- список доступных workspaces.

3. Нажмите `Refresh context`.
4. Убедитесь, что состояние остается стабильным и не пропадает.

Что проверить дополнительно:
1. Переключение workspace (если есть family workspace).
2. Что personal context и family context корректно меняют контент.
3. Что после refresh не отваливаются текущие sections.

---

## 9) Проверка second profile / invite accept readiness

Нужны два реальных Telegram-профиля:
- Профиль A (owner family workspace);
- Профиль B (будущий participant).

### Шаги
1. Профиль A:
- открывает Mini App;
- создает family workspace (если еще нет);
- создает invite token.

2. Профиль B:
- открывает Mini App из Telegram;
- в personal context вставляет invite token;
- нажимает `Accept invite`.

3. Ожидаемый результат:
- success feedback в UI;
- family workspace появляется у профиля B в workspace switch;
- в household members больше не owner-only.

4. Проверка в Supabase:
- `workspace_members` должна получить строку с profile B в нужном family workspace;
- `family_workspace_invites` у текущего invite должен измениться статус (`accepted`) и поля accepted metadata.

Если не сработало:
- смотрите раздел "Типичные ошибки";
- фиксируйте точный текст ошибки в UI и код ошибки из ответа.

---

## 10) Типичные ошибки и как понять, на каком шаге сломалось

## 10.1 Бот не открывает Mini App
Симптом:
- кнопки меню нет, или нажатие не открывает URL.

Проверьте:
1. Вы точно сделали `/setmenubutton` для нужного бота.
2. URL в BotFather совпадает с текущим Vercel production URL.
3. Деплой в Vercel имеет статус `Ready`.

## 10.2 Mini App открывается, но пишет про missing init data
Симптом:
- ошибки уровня `TELEGRAM_INIT_DATA_MISSING`.

Проверьте:
1. Вы открыли app именно через Telegram (`Menu` в чате с ботом), а не в обычном браузере.
2. В Vercel env корректен `TELEGRAM_BOT_TOKEN`.
3. В production `ALLOW_DEV_TELEGRAM_AUTH_FALLBACK=false`.

## 10.3 Ошибка `TELEGRAM_INIT_DATA_INVALID` или `...EXPIRED`
Проверьте:
1. Бот токен в Vercel совпадает с токеном BotFather.
2. Нет лишних пробелов в env значениях.
3. `TELEGRAM_INIT_DATA_MAX_AGE_SEC` не слишком маленький (обычно `86400`).

## 10.4 Ошибка `SUPABASE_NOT_CONFIGURED`
Проверьте в Vercel env:
1. `SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `SUPABASE_JWT_SECRET`
4. После изменения env сделайте redeploy.

## 10.5 В Supabase нет таблиц/части таблиц
Проверьте:
1. Все migration SQL выполнены по порядку.
2. В SQL Editor нет упавшего скрипта "посередине".
3. Если migration упал, повторите именно его после исправления причины.

## 10.6 Invite create работает, accept не работает
Проверьте:
1. Invite token вставлен полностью.
2. Invite не expired/revoked/used.
3. Профиль B реально другой Telegram-профиль.
4. После accept нажмите `Refresh context`.
5. Проверьте `workspace_members` и `family_workspace_invites` в Supabase.

## 10.7 Vercel показывает старую версию
Проверьте:
1. commit точно запушен в нужную ветку;
2. Vercel deployment привязан к этой же ветке;
3. в Deployment видно нужный commit SHA;
4. при необходимости нажмите `Redeploy` у нужного deployment.

## 10.8 Scheduled dispatch/cron не дергается
Проверьте:
1. `vercel.json` в репозитории содержит cron path.
2. В Vercel есть `CRON_SECRET`.
3. Endpoint `/api/internal/reminders/scheduled-dispatch` авторизуется Bearer секретом.
4. В логах появляются вызовы cron.

---

## Быстрый итог по шагам (чеклист)
1. Push в GitHub.
2. Import в Vercel + добавить env.
3. Применить Supabase migrations.
4. Создать бота в BotFather, поставить menu button URL.
5. Открыть Mini App внутри Telegram.
6. Убедиться, что пользователь появился в `profiles/workspaces/workspace_members`.
7. Проверить current app context.
8. Проверить invite accept вторым реальным профилем.

Если все пункты пройдены, проект готов к честной live-проверке family invite accept без опоры на dev fallback.

# Phase 9A — Telegram Mini App deployment / runtime integration foundation

## 1. Scope
В этом pass сделан инфраструктурный foundation для живого запуска проекта в связке:
- GitHub -> Vercel;
- Vercel -> Supabase;
- Telegram Bot -> Telegram Mini App URL;
- Telegram runtime -> `initData` verification -> app context bootstrap в Supabase.

Цель: не добавлять новую бизнес-логику family/reminders/subscriptions, а подготовить понятный и безопасный путь к реальной runtime-проверке внутри Telegram.

## 2. Что проанализировано
Проверены текущие runtime assumptions в коде:

1. Telegram runtime bootstrap (client):
- `src/components/telegram/telegram-mini-app-provider.tsx`
- `src/lib/telegram/web-app.ts`
- script `https://telegram.org/js/telegram-web-app.js` подключается, `WebApp.ready()`/`expand()` вызываются.

2. Server-side identity resolution:
- `src/lib/auth/resolve-telegram-identity.ts`
- `src/lib/telegram/verify-init-data.ts`
- валидация `initData` через HMAC + `auth_date` max-age.
- dev fallback разрешен только вне production (`NODE_ENV !== "production"`), даже если env-флаг включен.

3. App context bootstrap/read:
- `src/app/api/auth/telegram/bootstrap/route.ts`
- `src/app/api/app/context/route.ts`
- `src/lib/app-context/service.ts`
- profile/workspace foundation поднимается через Telegram identity и Supabase.

4. Family invite readiness path:
- create/accept/current invite routes уже есть и связаны с активным workspace context.
- 8B accept всё ещё partially verified по живому второму профилю (вне scope логики этого pass).

5. Scheduled foundation readiness:
- `src/app/api/internal/reminders/scheduled-dispatch/route.ts`
- `vercel.json`
- есть secret-protected internal endpoint + cron path для Vercel.

6. Env/config readiness:
- `src/lib/config/server-env.ts`
- `src/lib/config/client-env.ts`
- проверены обязательные env для Telegram/Supabase/cron.

## 3. Что изменено в этом pass
Изменения сделаны узко и локально, без доменных рефакторингов.

1. Обновлен `.env.example`:
- удалены реальные значения и заменены на безопасные placeholders;
- `NEXT_PUBLIC_API_BASE_URL` приведен к безопасному default `/api` (production-friendly);
- `ALLOW_DEV_TELEGRAM_AUTH_FALLBACK` установлен в `false` по умолчанию для безопасной стартовой конфигурации;
- оставлены все ключевые переменные, необходимые для runtime-связки.

2. Обновлен `README.md`:
- добавлены ссылки на новые документы Phase 9A:
  - `docs/phase9a_runtime_integration_report.md`
  - `docs/runtime_setup_guide_for_beginner.md`

3. Добавлен большой пошаговый гайд:
- `docs/runtime_setup_guide_for_beginner.md`
- покрывает полный путь: GitHub, Vercel, Supabase, Telegram BotFather, Mini App URL, ручные проверки runtime и диагностика.

## 4. Что намеренно НЕ реализовано
Вне scope этого pass:
- новая family business logic;
- shared economics/split/debts;
- новый invite subsystem или расширение accept semantics;
- новый reminder subsystem;
- крупный UI redesign;
- premium/localization/scenario engine.

Также не делался тяжелый backend/domain refactor.

## 5. Точные файлы, которые изменены/созданы
Изменены:
- `.env.example`
- `README.md`

Созданы:
- `docs/phase9a_runtime_integration_report.md`
- `docs/runtime_setup_guide_for_beginner.md`

## 6. Runtime readiness после pass
Подготовлено:
- безопасный и понятный пример env для deployment;
- пошаговый путь запуска в Telegram Mini App runtime;
- пошаговый путь валидации profile/workspace bootstrap в Supabase;
- пошаговый путь проверки second profile invite accept readiness.

Важно:
- этот pass не симулирует живой второй Telegram-профиль в среде Codex;
- подтверждение реального live runtime (Telegram client + два профиля) остается ручным шагом по инструкции.

## 7. Ручные шаги проверки (кратко)
Полный чеклист дан в `docs/runtime_setup_guide_for_beginner.md`. Минимум:
1. Заполнить env в Vercel и локально.
2. Применить все миграции из `supabase/migrations`.
3. Задеплоить проект в Vercel и получить production URL.
4. Привязать URL к Telegram Bot Mini App/Web App.
5. Открыть Mini App из Telegram.
6. Проверить в Supabase таблицах:
- `profiles`
- `workspaces`
- `workspace_members`
7. Проверить app context внутри UI (без dev fallback).
8. Проверить invite create -> accept вторым реальным профилем.

## 8. Known limitations
- В этом pass не выполнена живая runtime-проверка вторым реальным Telegram-профилем внутри Codex.
- Phase 8B accept остается partially verified до ручной live-проверки по новому гайду.
- Состояние Vercel/Telegram/Supabase конкретного аккаунта пользователя не может быть автоматически подтверждено из sandbox.

## 9. Runtime confirmation status
Подтверждено в коде:
- runtime/env пути инициализации присутствуют;
- Telegram initData verification + app context bootstrap уже реализованы;
- deployment foundation документы и безопасный env-шаблон подготовлены.

Не подтверждено в этом pass:
- фактический live запуск в Telegram у конкретного production URL;
- фактический accept invite вторым реальным Telegram-профилем end-to-end.

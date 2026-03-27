# Phase 13A — Premium entitlement foundation (no core pay-lock)

Модель: ChatGPT 5.3 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны актуальные отчеты до Phase 12C включительно.
- Статус-override из запроса принят: **Phase 12C = manual verified** (последний подтвержденный этап до 13A).

## Цель Phase 13A
Добавить минимальный backend/product foundation для premium entitlement:
- хранение и чтение статуса premium,
- источник entitlement (manual / future boosty / future gift),
- срок действия,
- компактный read-only статус в Profile,
- без блокировки core free-функций.

## Exact files changed
1. `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql`
2. `src/lib/auth/types.ts`
3. `src/lib/premium/repository.ts`
4. `src/lib/premium/service.ts`
5. `src/app/api/premium/entitlement/route.ts`
6. `src/lib/auth/client.ts`
7. `src/hooks/use-current-app-context.ts`
8. `src/components/app/profile-scenarios-placeholder.tsx`
9. `src/lib/i18n/localization.tsx`
10. `README.md`
11. `docs/runtime_setup_guide_for_beginner.md`
12. `docs/phase13a_premium_entitlement_foundation_no_core_paylock_report.md`

## Entitlement model introduced
Статус: **Confirmed in code/report**

Добавлена миграция:
- `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql`

Таблица: `public.premium_entitlements`
- ключевые поля:
  - `scope`: `profile | workspace`
  - `profile_id` / `workspace_id` (в зависимости от scope)
  - `entitlement_source`: `manual_admin | boosty | gift_campaign`
  - `status`: `active | expired | revoked`
  - `starts_at`, `ends_at`
  - `metadata` (jsonb)
  - `created_at`, `updated_at`
- ограничения:
  - валидные значения scope/source/status
  - check на корректную привязку owner по scope
  - check на корректный time window (`ends_at > starts_at`)
- индексы:
  - для profile entitlement
  - для workspace entitlement

Это минимальная foundation-модель без запуска биллинга/платежного процесса.

## How current premium state is read
Статус: **Confirmed in code/report**

1. Server repository слой:
- `src/lib/premium/repository.ts`
- читает active entitlements по profile/workspace scope
- учитывает окно действия (`starts_at`, `ends_at`)
- выбирает наиболее релевантный активный entitlement

2. Server service слой:
- `src/lib/premium/service.ts`
- строит итоговое состояние `PremiumEntitlementStatePayload`
- приоритет effective entitlement:
  - сначала workspace entitlement,
  - затем profile entitlement
- итог: `plan = free | premium`, `isPremium`, `effectiveScope`, `effectiveSource`, `startsAt`, `endsAt`

3. API read endpoint:
- `POST /api/premium/entitlement`
- файл: `src/app/api/premium/entitlement/route.ts`
- использует текущий app context и возвращает безопасный read-only entitlement state

4. Client access:
- `src/lib/auth/client.ts` добавлен `readPremiumEntitlement(initData)`
- `src/hooks/use-current-app-context.ts` интегрирован загрузчик entitlement state

## What Profile now shows
Статус: **Confirmed in code/report**

В Profile добавлен компактный non-invasive блок `Premium status`:
- loading состояние,
- fallback, если статус временно недоступен,
- `Free plan active` или `Premium active`,
- при premium: scope/source/expiry,
- явная пометка, что core функции не блокируются в этой фазе.

Файл:
- `src/components/app/profile-scenarios-placeholder.tsx`

Локализация для новых строк добавлена в:
- `src/lib/i18n/localization.tsx`

## Documentation / ops readiness updates
Статус: **Confirmed in code/report**

1. `README.md`
- добавлен premium entitlement foundation в implemented list
- добавлен endpoint `POST /api/premium/entitlement`
- добавлена миграция 13A в migration order
- формулировка `Premium gating` уточнена до `Premium paywall activation` в intentionally-not-implemented

2. `docs/runtime_setup_guide_for_beginner.md`
- добавлена миграция `20260327110000_phase13a_premium_entitlements_foundation.sql`
- добавлена таблица `premium_entitlements` в проверочный список

## What was intentionally NOT implemented yet
Статус: **Confirmed in code/report**

Не реализовано намеренно:
- реальный Boosty payment processing
- purchase flow
- gift campaign UX
- referral logic
- paywall, блокирующий core free flow
- любые locks на текущие базовые функции (Mark paid / Undo paid / basic reminders/history/dashboard/family basics)

## How future Boosty / gift premium can attach later
Статус: **Confirmed in code/report**

Foundation уже поддерживает:
1. `entitlement_source = boosty` для будущего sync-контура.
2. `entitlement_source = gift_campaign` для будущих подарочных/кампанийных активаций.
3. `scope = profile | workspace` для гибкой модели применения entitlement.
4. `starts_at / ends_at` для временных premium-окон.
5. `metadata` для будущих campaign/issuer полей без миграции core-структуры.

## Risks / follow-up notes
1. В этой фазе нет admin-интерфейса выдачи entitlement; проверка premium active потребует SQL/manual grant в базе.
2. Сейчас Profile показывает только status-surface; feature gating для non-core premium-функций должен добавляться отдельным pass.
3. При отсутствии миграции 13A endpoint может возвращать отсутствие entitlement (free/unavailable сценарий), но core flow не блокируются.

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. Проверка Profile premium card в Telegram runtime (RU/EN + mobile layout).
2. Проверка free-сценария после деплоя: все core flow работают без блокировок.
3. Проверка premium-сценария после ручной записи entitlement в Supabase.
4. Проверка корректного отображения source/scope/expiry на реальных данных.

## Encoding safety check
Проверены touched файлы с русскоязычным/пользовательским UI-текстом и документацией:
1. `src/lib/i18n/localization.tsx`
2. `src/components/app/profile-scenarios-placeholder.tsx`
3. `docs/runtime_setup_guide_for_beginner.md`
4. `docs/phase13a_premium_entitlement_foundation_no_core_paylock_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Моджибейка/битой кириллицы в новых изменениях не обнаружено.
- Дополнительных исправлений encoding не потребовалось.

## Pre-report self-check against prompt

1. The app has a defined premium entitlement foundation — **Fully satisfied**
- Реальная DB-модель + миграция + типы + server repository/service добавлены.

2. Premium state can be read safely in current app code — **Fully satisfied**
- Добавлен endpoint `POST /api/premium/entitlement` и client/hook интеграция.

3. Profile shows a compact premium status surface — **Fully satisfied**
- В Profile добавлен компактный read-only блок без sales/paywall UX.

4. Current core flows are NOT blocked — **Fully satisfied (code-level)**
- Ни один core flow не завернут в premium-проверки.

5. No existing verified behavior is broken — **Partially satisfied**
- По коду изменены только foundation + status UI.
- Нужен обязательный live regression smoke после deploy.

6. Implementation supports future Boosty/gift integration — **Fully satisfied**
- source model и metadata/temporal foundation уже предусмотрены.

7. Implementation clearly does NOT yet activate paywall logic — **Fully satisfied**
- Нет purchase flow/locks/paywall dialog и нет блокировок core.

8. No unrelated feature scope was added — **Fully satisfied**
- Изменения ограничены entitlement foundation + compact Profile status + docs sync.

## Короткое объяснение (простыми словами)
В 13A добавлена база для Premium-статуса: таблица entitlement, API чтения и компактная карточка статуса в Profile. Core функции остались бесплатными и не блокируются. Реальных оплат/пейволла в этой фазе нет.

## Manual test checklist
1. Применить миграцию `20260327110000_phase13a_premium_entitlements_foundation.sql`.
2. Открыть Profile и проверить, что видна карточка `Premium status`.
3. Проверить free-сценарий: карточка показывает free/без блокировок.
4. Проверить, что Reminders/History/Home работают как раньше.
5. Проверить RU/EN переключение и сохранение языка.
6. Вставить вручную активный entitlement в `premium_entitlements` (profile или workspace scope).
7. Обновить приложение и проверить `Premium active`, source/scope/expiry.
8. Удалить/деактивировать entitlement и проверить возврат к free отображению.
9. Проверить, что нет paywall-блокировок на core действия (Mark paid, Undo paid, add/edit, history, dashboard, family basics).

## Git Bash commands
```bash
git status
git add supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql src/lib/auth/types.ts src/lib/premium/repository.ts src/lib/premium/service.ts src/app/api/premium/entitlement/route.ts src/lib/auth/client.ts src/hooks/use-current-app-context.ts src/components/app/profile-scenarios-placeholder.tsx src/lib/i18n/localization.tsx README.md docs/runtime_setup_guide_for_beginner.md docs/phase13a_premium_entitlement_foundation_no_core_paylock_report.md
git commit -m "phase13a: add premium entitlement foundation without core pay-lock"
git push origin main
```

# Phase 13C — Owner-only premium admin console + campaign control

Модель: ChatGPT 5.3 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны релевантные отчеты: `Phase 13A`, `Phase 13B`.
- Статус-override из запроса принят:
  - `Phase 13A` — последний полностью подтвержденный вручную этап.
  - `Phase 13B` может быть в коде/БД, но не принят как полностью live-verified baseline.

## Цель Phase 13C
Добавить owner-only internal admin tools для premium и gift campaigns, чтобы владелец управлял этим через UI без ручного SQL.

Ключевые требования этого pass:
- server-side защита admin действий;
- основной ключ идентификации — стабильный numeric Telegram user ID;
- grant/revoke premium для target аккаунта;
- create/list/deactivate gift campaigns;
- без влияния на core free флоу.

## Exact files changed (Phase 13C)
1. `.env.example`
2. `README.md`
3. `docs/runtime_setup_guide_for_beginner.md`
4. `src/lib/config/server-env.ts`
5. `src/lib/admin/access.ts`
6. `src/lib/premium/admin-service.ts`
7. `src/app/api/premium/admin/route.ts`
8. `src/lib/auth/types.ts`
9. `src/lib/auth/client.ts`
10. `src/components/app/premium-admin-console.tsx`
11. `src/components/app/profile-scenarios-placeholder.tsx`
12. `src/lib/i18n/localization.tsx`
13. `docs/phase13c_owner_only_premium_admin_console_campaign_control_report.md`

## Что изменено
Статус: **Confirmed in code/report**

### 1) Owner/admin access protection
Добавлен server-side admin gate по allowlist Telegram user ID:
- новый env: `PREMIUM_ADMIN_TELEGRAM_USER_IDS`;
- парсинг и проверка в `src/lib/admin/access.ts`;
- все admin actions в `POST /api/premium/admin` защищены проверкой `isPremiumAdminTelegramUserId(...)`.

Важно:
- non-admin может вызвать только `action = session`, чтобы получить `isAdmin: false`;
- все чувствительные действия (`grant/revoke/create/list/deactivate`) возвращают `403 PREMIUM_ADMIN_FORBIDDEN` при отсутствии прав.

### 2) Target account lookup (stable Telegram numeric ID)
Добавлен путь поиска target только по numeric Telegram user ID:
- `action = resolve_target` в `POST /api/premium/admin`;
- target резолвится через `getProfileByTelegramUserId(...)`;
- возвращается профиль + текущий premium state.

Это закрывает требование: primary identity key = стабильный numeric Telegram user ID.

### 3) Manual premium grant/revoke
Добавлены owner/admin действия:
- `action = grant_premium`:
  - вставляет `premium_entitlements` со `source = manual_admin`, `scope = profile`, optional duration;
  - в metadata пишет admin attribution.
- `action = revoke_premium`:
  - находит активные profile entitlements цели и переводит их в `revoked`;
  - пишет revoke attribution в metadata;
  - возвращает `revokedCount`.

### 4) Gift campaign create/list/deactivate
Добавлены owner/admin действия:
- `action = create_campaign`:
  - code/title/quota/premiumDurationDays/optional startsAt-endsAt;
  - в этой фазе создается как `active`.
- `action = list_campaigns`:
  - возвращает список кампаний;
  - usage агрегируется по `premium_gift_campaign_claims` (`quotaUsed`, `claimsTotal`).
- `action = deactivate_campaign`:
  - переводит кампанию в `ended`.

### 5) Owner-only admin UI surface
Добавлен компактный owner-only UI блок:
- `src/components/app/premium-admin-console.tsx`
- встроен в Profile через `src/components/app/profile-scenarios-placeholder.tsx`

Поведение:
- UI сначала запрашивает `action = session`;
- при `isAdmin = false` блок не рендерится;
- для admin доступны:
  - target lookup,
  - grant/revoke,
  - campaign create/list/deactivate.

Это internal admin console, не public promo page.

## Как quota/usage показывается
Статус: **Confirmed in code/report**
- Для каждой кампании выводится:
  - `quotaUsed` (сколько `granted` claim),
  - `totalQuota`,
  - `claimsTotal`.
- Данные считаются на сервере в `src/lib/premium/admin-service.ts` на основе:
  - `premium_gift_campaigns`
  - `premium_gift_campaign_claims`.

## Что намеренно НЕ реализовано
Статус: **Confirmed in code/report**
- публичные promo landing/deep-link UX;
- advertiser dashboard;
- referral mechanics;
- purchase/Boosty payment flow;
- paywall блокировка core free функций;
- расширенная campaign analytics/retention панель.

## Что не менялось специально
Статус: **Confirmed in code/report**
- 4-tab архитектура и навигация;
- core payment/reminder/history/family логика;
- существующие verified user flows (Mark paid/Undo paid, invite/workspace и т.д.).

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.
- В build-роутах есть новый endpoint: `POST /api/premium/admin`.

## Risks / follow-up notes
1. Если `PREMIUM_ADMIN_TELEGRAM_USER_IDS` не задан, owner-only admin операции будут недоступны (ожидаемое поведение).
2. Admin console в этой фазе опирается на foundation 13A/13B; если миграции не применены, API возвращает controlled errors о неготовности foundation.
3. Нужна live-проверка в Telegram runtime:
   - admin account видит блок,
   - non-admin не видит блок и получает 403 на операции.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. Проверка owner account в Telegram: видимость admin section + успешные admin actions.
2. Проверка non-admin account в Telegram: блок скрыт, direct API admin actions запрещены.
3. Проверка полного цикла grant -> revoke на реальном target аккаунте.
4. Проверка create -> usage -> deactivate для gift campaign в live runtime.
5. Regression smoke обычных core/user flow после deploy.

## Encoding safety check
Проверены файлы с русскоязычным содержимым, которые были затронуты в Phase 13C:
1. `src/lib/i18n/localization.tsx`
2. `docs/runtime_setup_guide_for_beginner.md`
3. `docs/phase13c_owner_only_premium_admin_console_campaign_control_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Mojibake/битой кириллицы в измененных участках не обнаружено.
- Дополнительных правок encoding не потребовалось.

## Pre-report self-check against prompt

1. There is a real owner-only admin section in the app — **Fully satisfied (code/report)**  
- Добавлен `PremiumAdminConsole`, рендер только после server-verified `session.isAdmin = true`.

2. Non-admin users cannot access admin operations — **Fully satisfied (code/report), live manual verification pending**  
- Server-side `POST /api/premium/admin` возвращает `PREMIUM_ADMIN_FORBIDDEN` для non-admin на чувствительных actions.

3. Admin can grant premium manually to a target account — **Fully satisfied (code/report)**  
- `action = grant_premium` вставляет entitlement со `source = manual_admin`.

4. Admin can revoke premium manually from a target account — **Fully satisfied (code/report)**  
- `action = revoke_premium` отзывает активные profile entitlements цели.

5. Admin can create a gift premium campaign — **Fully satisfied (code/report)**  
- `action = create_campaign` реализован.

6. Admin can inspect basic campaign quota/usage state — **Fully satisfied (code/report)**  
- `action = list_campaigns` возвращает `quotaUsed/totalQuota/claimsTotal`.

7. Admin can deactivate a campaign — **Fully satisfied (code/report)**  
- `action = deactivate_campaign` переводит кампанию в `ended`.

8. Stable Telegram numeric ID is used as primary identity key — **Fully satisfied (code/report)**  
- Target lookup и все admin действия используют numeric Telegram user ID как primary key path.

9. Current core/free flows are not blocked — **Fully satisfied (code/report), live manual regression pending**  
- Pay-lock не добавлялся, изменения изолированы в admin/premium области.

10. No unrelated feature scope was added — **Fully satisfied (code/report)**  
- Изменения ограничены owner-only admin tools + docs/env sync.

## Короткое объяснение (простыми словами)
В этой фазе добавлен закрытый owner-only admin блок для управления Premium и gift-кампаниями. Доступ защищен на сервере по allowlist числовых Telegram user ID. Базовые бесплатные функции приложения не блокируются.

## Manual test checklist
1. В env добавить `PREMIUM_ADMIN_TELEGRAM_USER_IDS` с Telegram numeric user id owner-аккаунта.
2. Убедиться, что миграции 13A и 13B применены.
3. Открыть приложение owner-аккаунтом в Telegram -> Profile:
   - admin блок виден.
4. Ввести target Telegram user id и нажать `Resolve target`:
   - профиль и текущий Premium status отображаются.
5. Выполнить `Grant premium`:
   - статус цели обновляется на Premium.
6. Выполнить `Revoke premium`:
   - статус цели возвращается в free или entitlement становится revoked.
7. Создать кампанию (code/title/quota/days) и проверить появление в списке.
8. Проверить quota/claims поля у кампании.
9. Выполнить `Deactivate campaign` и проверить статус `ended`.
10. Открыть приложение non-admin аккаунтом:
   - admin блок не показывается.
11. (Опционально) Проверить direct POST на `/api/premium/admin` для non-admin:
   - защищенные actions возвращают 403.
12. Пройти короткий regression smoke по core flow:
   - add/edit recurring,
   - Mark paid / Undo paid,
   - family invite/workspace,
   - reminders/history.

## Git Bash commands
```bash
git status
git add .env.example README.md docs/runtime_setup_guide_for_beginner.md src/lib/config/server-env.ts src/lib/admin/access.ts src/lib/premium/admin-service.ts src/app/api/premium/admin/route.ts src/lib/auth/types.ts src/lib/auth/client.ts src/components/app/premium-admin-console.tsx src/components/app/profile-scenarios-placeholder.tsx src/lib/i18n/localization.tsx docs/phase13c_owner_only_premium_admin_console_campaign_control_report.md
git commit -m "phase13c: add owner-only premium admin console and campaign control"
git push origin main
```

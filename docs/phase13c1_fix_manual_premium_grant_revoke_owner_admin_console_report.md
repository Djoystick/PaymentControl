# Phase 13C.1 — Fix manual premium grant/revoke in owner admin console

Модель: ChatGPT 5.3 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты:
  - `docs/phase13a_premium_entitlement_foundation_no_core_paylock_report.md`
  - `docs/phase13b_gift_premium_campaign_foundation_quota_claim_tracking_report.md`
  - `docs/phase13c_owner_only_premium_admin_console_campaign_control_report.md`
- Статус-override из запроса принят:
  - `Phase 13A` — manual verified (последний полностью подтвержденный этап).
  - `Phase 13C` — не принят (grant/revoke bug).

## Root cause failed manual grant/revoke path
Статус: **Confirmed in code/report**

Обнаружено два практических дефекта в server path 13C:
1. После `grant/revoke` делалась только одна мгновенная проверка состояния цели.  
   При реальном runtime это приводило к нестабильному подтверждению результата сразу после записи (в owner console можно получить состояние, не соответствующее ожидаемому действию).
2. `revoke` отзывал только profile-scope entitlements цели.  
   Если у цели был активный `workspace` entitlement (по текущему active workspace), итоговое premium-состояние могло оставаться активным.

Из-за этого owner получал ненадежное поведение `Grant premium / Revoke premium`.

## Exact files changed (Phase 13C.1)
1. `src/lib/premium/admin-service.ts`
2. `src/lib/i18n/localization.tsx`
3. `docs/phase13c1_fix_manual_premium_grant_revoke_owner_admin_console_report.md`

## Что исправлено в server logic
Статус: **Confirmed in code/report**

Файл: `src/lib/premium/admin-service.ts`

1. Добавлена надежная пост-проверка результата admin действия:
- новый helper `readTargetPayloadWithExpectation(...)`;
- до 3 повторов чтения с короткой паузой;
- явная проверка ожидаемого состояния:
  - `grant` ожидает `isPremium = true`;
  - `revoke` ожидает `isPremium = false`.

2. Усилен `revoke`:
- теперь читаются и отзываются:
  - `profile` entitlements цели,
  - `workspace` entitlements цели для ее активного workspace (если workspace id валидный UUID).
- это устраняет сценарий, когда revoke profile-scope сделан, но premium сохраняется через workspace-scope.

3. Добавлены явные server messages для диагностики:
- если состояние не подтверждено после admin action;
- если не читаются активные workspace entitlements;
- если после grant/revoke итоговое состояние не соответствует ожидаемому.

## Что исправлено в UI feedback/revalidation
Статус: **Confirmed in code/report**

Файл: `src/lib/i18n/localization.tsx`

Добавлены RU-локализации для новых server feedback сообщений из 13C.1:
- ошибки подтверждения состояния после действия,
- ошибки чтения workspace entitlements,
- отдельные сообщения для mismatch после grant/revoke.

Итог:
- owner видит понятный результат (success/error + причина),
- silent no-op в feedback не остается.

## Что намеренно НЕ изменялось
Статус: **Confirmed in code/report**
- owner-only gate и Telegram numeric ID path не менялись концептуально;
- campaign create/list/deactivate логика не расширялась;
- quota stress testing не добавлялся (по запросу отложен);
- paywall/core-flow логика не трогалась;
- 4-tab shell и доменные family/payment флоу не изменялись.

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. Owner: `Resolve target` -> `Grant premium` должен стабильно давать target `Premium active`.
2. Owner: `Revoke premium` должен стабильно возвращать target в free.
3. Проверка в target-аккаунте (отдельной сессией), что Profile premium status реально отражает grant/revoke.
4. Проверка, что owner-only protection на server все еще дает 403 для non-admin actions.
5. Проверка, что campaign actions из 13C не регресснули.

## Encoding safety check
Проверены файлы с русскоязычным содержимым, затронутые в 13C.1:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase13c1_fix_manual_premium_grant_revoke_owner_admin_console_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Mojibake/битой кириллицы не обнаружено.
- Дополнительных encoding-исправлений не потребовалось.

## Pre-report self-check against prompt

1. Owner can resolve target by Telegram numeric ID — **Fully satisfied (code/report)**  
- Путь `resolve_target` не ломался, логика сохранена.

2. `Grant premium` successfully activates premium for target — **Fully satisfied (code/report), live verification pending**  
- Добавлена надежная пост-проверка ожидаемого `isPremium = true` после grant.

3. `Revoke premium` returns target to free — **Fully satisfied (code/report), live verification pending**  
- Revoke теперь охватывает profile + active workspace entitlements цели.

4. Profile premium status reflects result after action — **Partially satisfied**  
- В owner admin console state теперь подтверждается и валидируется явно.
- Требуется live-проверка в отдельной target-сессии Telegram.

5. Admin console shows clear success/error feedback — **Fully satisfied (code/report)**  
- Добавлены явные диагностические сообщения и RU локализация.

6. Owner-only server protection still works — **Fully satisfied (code/report), live verification pending**  
- Server-side gate не ослаблялся; нужен live 403 smoke-check.

7. Campaign management actions are not broken — **Partially satisfied**  
- В коде campaign path не менялся; build/lint ок.
- Нужен короткий live regression check.

8. No unrelated scope added — **Fully satisfied (code/report)**  
- Изменения ограничены grant/revoke reliability + feedback.

## Короткое объяснение (простыми словами)
Исправлен узкий дефект 13C: grant/revoke теперь подтверждаются надежнее после записи, а revoke учитывает не только profile, но и активный workspace entitlement цели. В owner console добавлены понятные сообщения, чтобы не было "тихих" неуспехов.

## Manual test checklist
1. Войти owner-аккаунтом (из `PREMIUM_ADMIN_TELEGRAM_USER_IDS`).
2. Открыть Profile -> owner admin section.
3. Ввести Telegram numeric user ID цели -> `Resolve target`.
4. Нажать `Grant premium`.
5. Убедиться, что owner console показывает успешный результат и `Current premium state = Premium active`.
6. Войти целевым аккаунтом и проверить Profile premium status (должен быть premium).
7. Вернуться owner-аккаунтом, нажать `Revoke premium`.
8. Убедиться, что owner console показывает успешный revoke и free-состояние.
9. Повторно проверить целевой аккаунт (должен вернуться в free).
10. Проверить non-admin попытку admin actions (должно быть запрещено server-side).
11. Коротко проверить campaign create/list/deactivate, что не регресснули.

## Git Bash commands
```bash
git status
git add src/lib/premium/admin-service.ts src/lib/i18n/localization.tsx docs/phase13c1_fix_manual_premium_grant_revoke_owner_admin_console_report.md
git commit -m "phase13c1: fix manual premium grant/revoke reliability in owner admin console"
git push origin main
```

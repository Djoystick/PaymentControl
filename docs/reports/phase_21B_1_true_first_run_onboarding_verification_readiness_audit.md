# Phase 21B.1 — True First-Run Onboarding Verification Readiness Audit

## Objective
Проверить, готов ли проект к детерминированной ручной верификации именно true first-run onboarding (а не replay), и определить минимально необходимый шаг: audit-only или узкий enabling fix.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Текущий подтвержденный статус пользователя:
  - Phase 19B = manual verified
  - Phase 19C = manual verified
  - Phase 20B = manual verified
  - Phase 20C = manual verified
  - Phase 20D = manual verified
  - Phase 20E = manual verified
  - Phase 20F = accepted working compression pass
  - Phase 20G = manual verified
  - Phase 20H = manual verified
  - Phase 21A.1 = manual verified

## Were Code Changes Needed?
Нет. По результатам аудита кодовые изменения не требуются: детерминированная проверка true first-run уже возможна через существующую модель флага и внешнюю очистку локального состояния.

## Files Inspected
- `src/components/app/app-shell.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/internal_version_history.md` (для синхронизации статуса pass)

## Files Changed
- `docs/reports/phase_21B_1_true_first_run_onboarding_verification_readiness_audit.md` (новый отчет)
- `docs/reports/internal_version_history.md` (новая запись фазы)

## Exact Current True First-Run Onboarding Trigger Model
1. Источник истины first-run:
- `ONBOARDING_STORAGE_KEY = "payment_control_onboarding_v10c_done"` (`src/components/app/app-shell.tsx`).

2. Условие показа onboarding на первом запуске:
- на mount `AppShell` читает `window.localStorage.getItem(ONBOARDING_STORAGE_KEY)`;
- если значение не равно `"1"`, onboarding открывается автоматически.

3. Фиксация прохождения:
- при `closeOnboarding()` ключ записывается в `"1"`.

4. Fallback-поведение:
- при ошибке доступа к `localStorage` onboarding тоже открывается (через `catch`), что ожидаемо для ограниченных окружений.

## Exact Current Replay Onboarding Model
1. Replay отделен от first-run:
- `ONBOARDING_REPLAY_EVENT = "payment-control-replay-onboarding"`.

2. Путь запуска replay:
- кнопка `Show onboarding again` в Profile (`profile-scenarios-placeholder.tsx`) отправляет `window.dispatchEvent(new Event(ONBOARDING_REPLAY_EVENT))`.

3. Что делает replay:
- в `AppShell` обработчик event выставляет `onboardingStepIndex = 0` и `isOnboardingVisible = true`.
- replay не очищает `ONBOARDING_STORAGE_KEY` и не подменяет first-run gate.

Итог: replay и true first-run реализованы как разные ветки и не смешаны.

## Can Tester Deterministically Reproduce True First-Run Today?
Да, детерминированно возможно.

Важно: это делается не через replay-кнопку, а через управление `ONBOARDING_STORAGE_KEY` (очистка/удаление) и перезапуск.

## Exact Manual Steps for Deterministic True First-Run Verification
### Вариант A (предпочтительно, с DevTools/WebView desktop)
1. Открыть приложение.
2. Убедиться, что onboarding закрыт (обычный пользовательский режим).
3. В DevTools удалить ключ `payment_control_onboarding_v10c_done` в `localStorage` для текущего origin.
4. Полностью перезагрузить страницу Mini App (`Ctrl+Shift+R`).
5. Проверить, что onboarding открылся автоматически на шаге 1 (это true first-run путь).
6. Пройти `Skip/Next/Finish`, убедиться, что ключ снова стал `"1"`.
7. Перезагрузить страницу и убедиться, что auto-open больше не происходит.
8. Нажать `Show onboarding again` в Profile и подтвердить, что это replay (отдельный путь).

### Вариант B (Telegram mobile без DevTools)
1. Полностью очистить локальное состояние Mini App для этого пользователя/устройства (через очистку webview/site data на устройстве).
2. Открыть Mini App впервые после очистки.
3. Проверить, что onboarding открылся автоматически.
4. Завершить onboarding и перезапустить Mini App — автостарт onboarding больше не должен происходить.

Примечание: вариант B зависит от платформенной процедуры очистки, поэтому для строгой детерминированности QA рекомендуется вариант A.

## What Was Intentionally NOT Changed
- Не изменялись onboarding step order и тексты из 21A.
- Не изменялись overlay/fixed/portal behavior из 21A.1.
- Не изменялись replay и first-run runtime механики.
- Не добавлялись новые debug-кнопки/feature flags.
- Не затронуты бизнес-правила, backend/API, premium/admin/workspace/flows.

## Validation Executed
- `npm run lint` — passed
- `npm run build` — passed

## Risks / Follow-up Notes
- Для мобильного Telegram окружения без DevTools процедура true first-run опирается на ручную очистку локального состояния, что менее удобно операционно.
- Если в будущем потребуется полностью in-app deterministic QA без внешних инструментов, можно отдельным узким pass добавить вторичный verification-only control в текущей onboarding verification area (не в основном UX), но в этой фазе это не требуется.

## Is Project Now Ready for True First-Run Manual Verification?
Да. Проект готов: модель first-run/replay прозрачна, разделена и детерминированно проверяема, а точные ручные шаги задокументированы.

## Encoding Safety Check
- Кодовые RU/EN строки не менялись.
- Новый отчет и обновление internal history сохранены в UTF-8.
- Признаков mojibake в затронутых файлах не обнаружено.

## Pre-Report Self-Check Against Prompt/Scope
1. Фаза выполнена как audit-readiness pass, без scope drift.
2. Точно описаны: trigger first-run, storage key, replay-модель и разделение веток.
3. Даны точные детерминированные manual steps.
4. Код не менялся без необходимости.
5. Верифицированные флоу/правила не затронуты.
6. Валидация выполнена (`lint`, `build`).

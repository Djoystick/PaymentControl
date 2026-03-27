# Phase 13B — Gift premium campaign foundation (quota + claim tracking)

Модель: ChatGPT 5.3 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны актуальные отчеты до `Phase 13A` включительно.
- Статус-override из запроса принят: **Phase 13A = manual verified** (последний подтвержденный этап до 13B).

## Цель Phase 13B
Добавить foundation для gift premium campaigns:
- модель кампаний,
- модель claim/activation,
- квота (cap),
- безопасный путь от успешного claim к premium entitlement из 13A,
- минимальная verification-поверхность без публичного promo-rollout.

## Exact files changed
1. `supabase/migrations/20260327120000_phase13b_gift_premium_campaign_foundation.sql`
2. `src/lib/auth/types.ts`
3. `src/lib/premium/gift-campaign-repository.ts`
4. `src/app/api/premium/gift-campaigns/claim/route.ts`
5. `src/lib/auth/client.ts`
6. `src/hooks/use-current-app-context.ts`
7. `src/components/app/profile-scenarios-placeholder.tsx`
8. `src/lib/i18n/localization.tsx`
9. `README.md`
10. `docs/runtime_setup_guide_for_beginner.md`
11. `docs/phase13b_gift_premium_campaign_foundation_quota_claim_tracking_report.md`

## Campaign model introduced
Статус: **Confirmed in code/report**

Миграция:
- `supabase/migrations/20260327120000_phase13b_gift_premium_campaign_foundation.sql`

Таблица кампаний: `public.premium_gift_campaigns`
- поля:
  - `id`
  - `campaign_code` (уникальный код)
  - `title`
  - `campaign_status` (`draft | active | paused | ended`)
  - `total_quota`
  - `starts_at`, `ends_at`
  - `premium_duration_days`
  - `metadata`
  - `created_at`, `updated_at`
- ограничения:
  - валидный статус,
  - `total_quota > 0`,
  - `premium_duration_days > 0`,
  - валидное временное окно.

## Claim model introduced
Статус: **Confirmed in code/report**

Таблица клеймов: `public.premium_gift_campaign_claims`
- поля:
  - `id`
  - `campaign_id` (nullable для invalid-code попыток)
  - `profile_id`
  - `workspace_id`
  - `claim_code`
  - `claim_status`
  - `entitlement_id` (если entitlement реально выдан)
  - `failure_reason`
  - `created_at`
- статусы claim:
  - `granted`
  - `rejected_invalid_code`
  - `rejected_inactive_campaign`
  - `rejected_outside_window`
  - `rejected_quota_exhausted`
  - `rejected_already_claimed`
- аудит:
  - индекс по campaign/time,
  - индекс по profile/time,
  - уникальность успешного grant для пары (campaign, profile).

## How quota is handled
Статус: **Confirmed in code/report**

Добавлена SQL-функция:
- `public.claim_premium_gift_campaign(p_campaign_code, p_profile_id, p_workspace_id)`

Что делает функция:
1. Нормализует и проверяет код.
2. Лочит строку кампании (`FOR UPDATE`) для безопасного quota-check под конкуренцией.
3. Проверяет:
- campaign exists,
- campaign active,
- campaign window,
- already claimed by profile,
- quota exhaustion.
4. Вставляет claim с конкретным результатом (`granted`/`rejected_*`).

Это дает foundation-level quota/cap control с audit trail.

## How entitlement is granted on successful claim
Статус: **Confirmed in code/report**

Внутри SQL-функции при успешном claim:
1. Создается запись в `public.premium_entitlements` (foundation 13A):
- `scope = profile`
- `entitlement_source = gift_campaign`
- `status = active`
- `starts_at = now`
- `ends_at = now + premium_duration_days`
- `metadata` содержит campaign attribution
2. `premium_gift_campaign_claims.entitlement_id` связывается с выданным entitlement.

Итог: успешный claim реально подключен к существующей premium foundation.

## Minimal verification surface
Статус: **Confirmed in code/report**

В Profile добавлен компактный раскрывающийся блок:
- `Gift premium claim (verification)`
- поле ввода кода
- кнопка claim
- вывод статуса, quota used, claim id, entitlement id (если выдан)

Это verification/dev surface, а не публичная маркетинговая страница.

## Backend/app read path
Статус: **Confirmed in code/report**

- Новый endpoint:
  - `POST /api/premium/gift-campaigns/claim`
- API route:
  - `src/app/api/premium/gift-campaigns/claim/route.ts`
- Repository вызов RPC:
  - `src/lib/premium/gift-campaign-repository.ts`
- Client API вызов:
  - `src/lib/auth/client.ts`
- Интеграция в app context hook:
  - `src/hooks/use-current-app-context.ts`
- После успешного grant hook автоматически обновляет premium status из 13A.

## What was intentionally NOT implemented yet
Статус: **Confirmed in code/report**

Не реализовано намеренно:
- публичный promo landing
- full deep-link campaign UX
- advertiser/campaign dashboard
- referral mechanics
- purchase flow / billing processing
- paywall-блокировки core free функций

## Docs / ops updates
Статус: **Confirmed in code/report**

1. `README.md`
- добавлен 13B foundation block
- добавлен endpoint `POST /api/premium/gift-campaigns/claim`
- миграция 13B добавлена в migration order

2. `docs/runtime_setup_guide_for_beginner.md`
- добавлена миграция `20260327120000_phase13b_gift_premium_campaign_foundation.sql`
- добавлены таблицы `premium_gift_campaigns`, `premium_gift_campaign_claims`

## Risks / follow-up notes
1. Сейчас нет admin UI для создания кампаний; это ожидаемо для foundation pass.
2. Пока нет публичного deep-link UX; подключается отдельным будущим pass.
3. Валидация кампаний и quota реализована на SQL уровне, но нужен live runtime smoke после deploy.

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. Реальная проверка claim в Telegram runtime через Profile verification block.
2. Проверка quota exhaustion на реальных последовательных claim.
3. Проверка повторного claim (`already claimed`) для того же профиля.
4. Проверка, что premium статус из 13A обновляется после успешного grant.
5. Regression smoke по core free flow после deploy.

## Encoding safety check
Проверены touched файлы с русскоязычным UI/доками:
1. `src/lib/i18n/localization.tsx`
2. `src/components/app/profile-scenarios-placeholder.tsx`
3. `docs/runtime_setup_guide_for_beginner.md`
4. `docs/phase13b_gift_premium_campaign_foundation_quota_claim_tracking_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Моджибейка/битой кириллицы в новых изменениях не обнаружено.
- Дополнительных исправлений encoding не потребовалось.

## Pre-report self-check against prompt

1. The app/backend has a defined gift premium campaign foundation — **Fully satisfied**
- Реальная DB модель кампаний + migration + API + repository + hook.

2. Claims can be recorded safely — **Fully satisfied**
- Реальная claim-таблица + SQL-функция + статусные исходы `granted/rejected_*`.

3. Quota/cap logic exists at foundation level — **Fully satisfied**
- quota check реализован в SQL-функции с row lock кампании.

4. Successful claims can grant entitlement via 13A foundation — **Fully satisfied**
- при `granted` создается запись в `premium_entitlements` (`source = gift_campaign`).

5. Current core flows are NOT blocked — **Fully satisfied (code-level)**
- pay-lock на core действия не добавлялся.

6. Existing verified behavior is preserved — **Partially satisfied**
- по коду изменения изолированы в premium/gift foundation.
- нужен live regression smoke после deploy.

7. Implementation clearly does NOT yet become full promo/growth/public rollout — **Fully satisfied**
- добавлен только verification surface, без публичного growth UX.

8. No unrelated feature scope was added — **Fully satisfied**
- изменения ограничены 13B foundation + docs sync.

## Короткое объяснение (простыми словами)
В 13B добавлена база для gift premium кампаний: таблица кампаний, таблица клеймов, квота, и безопасный путь выдачи premium entitlement при успешном claim. Core бесплатные функции не блокируются, а в Profile есть только минимальный проверочный блок для ручной проверки.

## Manual test checklist
1. Применить миграции 13A и 13B.
2. Создать тестовую кампанию в `premium_gift_campaigns` со статусом `active`, квотой и сроком.
3. Открыть Profile -> `Gift premium claim (verification)`.
4. Ввести валидный код и выполнить claim.
5. Проверить успешный статус, `quota used`, `claim id`, `entitlement id`.
6. Проверить в БД, что:
- в `premium_gift_campaign_claims` появилась запись `granted`,
- в `premium_entitlements` появилась запись `source = gift_campaign`.
7. Повторить claim тем же профилем и проверить `rejected_already_claimed`.
8. Проверить сценарий исчерпания квоты (`rejected_quota_exhausted`).
9. Проверить invalid code (`rejected_invalid_code`).
10. Проверить, что core flow (add/edit/mark paid/undo/family basics/reminders/history) не блокируется.

## Git Bash commands
```bash
git status
git add supabase/migrations/20260327120000_phase13b_gift_premium_campaign_foundation.sql src/lib/auth/types.ts src/lib/premium/gift-campaign-repository.ts src/app/api/premium/gift-campaigns/claim/route.ts src/lib/auth/client.ts src/hooks/use-current-app-context.ts src/components/app/profile-scenarios-placeholder.tsx src/lib/i18n/localization.tsx README.md docs/runtime_setup_guide_for_beginner.md docs/phase13b_gift_premium_campaign_foundation_quota_claim_tracking_report.md
git commit -m "phase13b: add gift premium campaign foundation with quota and claim tracking"
supabase db push
supabase migration list
git push origin main
```

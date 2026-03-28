# Phase 18A — Performance audit + safe storage caching strategy

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Reports read:
  - `docs/reports/phase_17A_reminders_interaction_model_redesign.md`
  - `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`
  - `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md`
  - `docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md`
- Status context used:
  - current UI stabilization wave closed
  - latest confirmed stage: Phase 17B.1 (manual verified)

## Exact files changed

1. `src/lib/payments/client-cache.ts` (new)
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `docs/reports/phase_18A_performance_audit_safe_storage_caching_strategy.md` (this report)

## Performance audit: what was slow and why

### 1) Repeated network fetches after tab remount

Because tab content is mounted by active tab, `Home` / `Reminders` / `History` screens remount on tab switches.  
Each of these screens triggered fresh API loads on each remount:

- Home dashboard: `/api/payments/dashboard` + `/api/payments/recurring/list`
- Reminders: `/api/payments/recurring/list`
- History: `/api/payments/recurring/list`

Result: repeated waits for already-known data during repeated visits.

### 2) No shared snapshot cache for read-mostly payment data

Before this pass, these surfaces had no client snapshot cache.  
Even recently loaded data had to be re-fetched before rendering useful content.

### 3) Home compact filter state reset behavior

Home compact summary filter did not persist per workspace between visits/remounts, causing extra repeated taps and less efficient repeated scanning.

## What was optimized

### 1) Added safe client cache layer for payment snapshots

New module: `src/lib/payments/client-cache.ts`

- two-level cache: in-memory + `localStorage`
- per-workspace keys
- validation of cache envelopes and value shapes before use
- stale safety:
  - fresh TTL: 60s
  - hard max age: 24h

### 2) Home (`PaymentsDashboardSection`) switched to stale-while-revalidate behavior

- on load: tries cached dashboard + cached recurring list snapshot first
- if snapshot exists: shows data immediately (no blocking loading state)
- always revalidates in background via network
- on successful fetch: updates state and refreshes cache
- on fetch error:
  - if snapshot exists, keeps usable data instead of dropping to empty
  - if no snapshot, keeps existing error handling

### 3) History (`PaymentsActivitySection`) switched to stale-while-revalidate for recurring list

- reads cached recurring list snapshot first
- revalidates in background
- writes successful server result back to cache
- avoids blocking/fallback regression when valid snapshot already exists

### 4) Reminders (`RecurringPaymentsSection`) switched to stale-while-revalidate + mutation-aware cache refresh

- reads cached recurring list snapshot on screen load
- revalidates in background
- writes successful list fetch into cache
- after successful payment mutations (create/update/archive/mark/undo/pause/resume), updates cache immediately through local replacement path

This keeps Home/History repeated visits fast after Reminders actions.

### 5) Home compact filter persistence per workspace

In `PaymentsDashboardSection`:
- stores compact filter in `localStorage` by workspace key
- restores filter when returning to Home in the same workspace

This is UI-state acceleration only, no business-truth impact.

## What was cached/stored locally

### Cached snapshots (performance layer only)

1. Recurring payments list snapshot per workspace:
- payments list
- responsible payer options

2. Dashboard summary snapshot per workspace:
- dashboard payload (summary + due buckets)

### Stored UI convenience state

1. Home compact summary filter per workspace:
- `none | all | upcoming | overdue`

## What was intentionally NOT cached and why

Critical server-authoritative states were intentionally left unchanged:

1. Premium entitlement state
2. Owner/admin permissions
3. Gift campaign quota/claim state
4. One-time family invite validity
5. Security-sensitive access/session truth
6. All mutation source-of-truth logic

Reason:
- correctness and security require server authority;
- local cache here is only acceleration/snapshot, never final truth.

## How revalidation works

Implemented pattern on Home/Reminders/History:

1. Read cache snapshot (if available) and render it immediately.
2. Run network request in background.
3. If network succeeds:
- replace UI with fresh server data
- refresh cache timestamp/data.
4. If network fails:
- keep snapshot if one exists;
- use existing error path only when no snapshot is available.

This provides faster repeated-use experience while preserving server correctness.

## Validation

1. `npm run lint` — passed
2. `npm run build` — passed

## Risks / follow-up notes

1. Snapshot freshness policy is intentionally simple (60s fresh, 24h hard max). Future tuning may adjust TTLs based on production behavior.
2. If server payload shapes change in future phases, cache version keys should be rotated (`v18a` suffix already used for safe evolution).
3. This pass optimizes repeated visits and tab revisit latency; cold-start network latency still depends on backend/API response time.

## What still requires live manual verification

1. Real Telegram WebView perception for repeated tab switches.
2. Home repeat visit speed after returning from Reminders/History.
3. Reminders -> mutation -> Home/History revisit freshness and consistency.
4. Workspace switch correctness with workspace-scoped cache keys.

## Exact manual checklist (RU)

1. Открыть Home в рабочем пространстве и дождаться полной загрузки сводки.
2. Перейти в Reminders, затем вернуться на Home:
- убедиться, что повторный показ сводки быстрее и не начинается с “пустого” состояния.
3. Перейти в History, затем обратно на Home:
- убедиться, что повторный показ карточек/сегментов быстрее.
4. В Home выбрать фильтр сегмента (`Скоро` или `Просрочено`), уйти на другую вкладку и вернуться:
- проверить восстановление фильтра для того же workspace.
5. В Reminders выполнить действие `Mark paid` / `Undo paid`.
6. Вернуться на Home и History:
- проверить, что данные быстро показываются и после фоновой ре-валидации остаются корректными.
7. Переключить workspace и повторить шаги 1–4:
- убедиться, что кэш не “протекает” между разными workspace.
8. Проверить, что ключевые потоки не сломаны:
- RU/EN switching + persistence
- Theme switching
- Mark paid / Undo paid
- family shared flow (`Who pays` / `Paid by`)
- one-time invite flow
- premium/admin surfaces
- bug report flow
- help popovers

## Encoding safety check

Checked touched files:

1. `src/lib/payments/client-cache.ts`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `docs/reports/phase_18A_performance_audit_safe_storage_caching_strategy.md`

Result:
- UTF-8 preserved in touched files.
- No mojibake introduced in touched code/report content.
- Existing RU/EN dictionaries were not modified in this pass.

## Pre-report self-check against prompt

1. Goal alignment (performance audit + safe caching strategy) — **PASS**.
2. Strict scope (performance/caching only, no random feature wave) — **PASS**.
3. Real analysis quality (identified concrete fetch/remount causes in current code paths) — **PASS**.
4. Meaningful optimizations implemented — **PASS**.
5. Safe local caching introduced and actually used in affected screens — **PASS**.
6. Critical server-authoritative states not moved to local storage — **PASS**.
7. Repeated visits expected to feel faster via snapshot-first rendering — **PASS (implementation-level), live UX confirmation still required**.
8. Existing verified flows preserved by scope and validation — **PASS**.

---

## Короткое объяснение (по-русски)

В Phase 18A добавлен безопасный snapshot-кеш (memory + localStorage) для Home/Reminders/History по workspace и включён stale-while-revalidate: сначала показывается последний известный срез, затем идёт фоновая ре-валидация с сервера. Это ускоряет повторные заходы и переходы между вкладками без переноса критичной бизнес-истины в local storage.

## Ручной тест-чеклист (по-русски)

1. Пройти Home -> Reminders -> Home и Home -> History -> Home, проверить ускорение повторных показов.
2. Проверить, что после `Mark paid/Undo paid` Home и History быстро показывают актуальный срез.
3. Проверить восстановление фильтра Home-сводки при возврате в тот же workspace.
4. Проверить отсутствие “протекания” данных между разными workspace.
5. Пройти базовую регрессию core flow (RU/EN, theme, family, premium/admin, bug-report, popovers).

## Git Bash commands (реальный workflow)

```bash
git status
git add src/lib/payments/client-cache.ts src/components/app/payments-dashboard-section.tsx src/components/app/payments-activity-section.tsx src/components/app/recurring-payments-section.tsx docs/reports/phase_18A_performance_audit_safe_storage_caching_strategy.md
git commit -m "phase18a: add safe workspace-scoped snapshots and stale-while-revalidate for payments surfaces"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.

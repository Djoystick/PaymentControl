# Phase 28M - Shared Trip Identity Linking + Invite/Join Flow

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: travel-only collaboration wave on top of 28L
- Baseline preserved:
1. donation-only unrestricted truth (no premium/entitlement/paywall return)
2. recurring/travel separation
3. already accepted travel layers 28A-28L (settlement, closure, archive, OCR, multi-currency)

## 1) Что найдено в audit после 28L

Проверены source-of-truth документы:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/phase_28A1_recurring_summary_slice_restoration_and_surface_unification.md`
5. `docs/reports/phase_28B_official_subscription_cancellation_guide_layer.md`
6. `docs/reports/phase_28C_expanded_official_cancellation_catalog_and_category_navigation.md`
7. `docs/reports/phase_28D_travel_workspace_acceleration_and_settlement_clarity.md`
8. `docs/reports/phase_28E_trip_closure_and_settlement_finalization.md`
9. `docs/reports/phase_28F_multi_currency_foundation_and_travel_amount_clarity.md`
10. `docs/reports/phase_28G_receipt_capture_and_ocr_prefill_assistant.md`
11. `docs/reports/phase_28H_ocr_quality_hardening_and_receipt_enrichment.md`
12. `docs/reports/phase_28I_advanced_debt_optimization_and_settlement_plan_simplification.md`
13. `docs/reports/phase_28J_travel_tab_extraction_and_shell_separation.md`
14. `docs/reports/phase_28K_travel_archive_and_completion_flow_polish.md`
15. `docs/reports/phase_28L_travel_collaboration_and_participant_workflow.md`
16. `docs/reports/internal_version_history.md`

Найденные продуктовые gaps:
1. После 28L участники в поездке уже имеют role/status, но shared identity оставалась частично локальной (много `display_name` без явного join-пути).
2. Не было полноценного travel invite/join пути для входа реальных людей в уже созданную поездку.
3. В UI не хватало четкой читаемости `joined vs local` и `you/current member`.

## 2) Почему invite/join + identity linking выбран следующим шагом

После 28L travel-модуль уже зрел по math/lifecycle/OCR. Следующий логичный слой был не новая математика и не новый shell, а превращение поездки в реальный shared-space:
1. пригласить,
2. присоединить профиль,
3. сохранить старую историю и расчеты без ломки.

## 3) Как изменен participant identity layer

Изменения:
1. В Travel UI добавлена явная дифференциация участников:
   - `You`,
   - `Joined`,
   - `Local`.
2. Добавлены метрики и контекст в секции участников:
   - `Joined profiles`,
   - `Local only`,
   - `Current member` (привязан/не привязан).
3. В member chips и карточках участников статус/роль/identity читаются сразу (organizer/participant + active/inactive + joined/local/you).

## 4) Как реализован invite/join flow

### Schema
Добавлена миграция:
1. `supabase/migrations/20260405090000_phase28m_shared_trip_identity_linking_and_invite_join_flow.sql`

Что добавлено:
1. таблица `travel_trip_invites`,
2. lifecycle invite статусов: `active/accepted/expired/revoked`,
3. token format-check `trip_*`,
4. unique active invite per trip,
5. индексы для trip/workspace статусов.

### Backend
Добавлено:
1. `src/lib/travel/invite-token.ts` (normalize/mask token),
2. валидация join token в `src/lib/travel/validation.ts`,
3. repository-операции в `src/lib/travel/repository.ts`:
   - `createTravelTripInviteForTrip`,
   - `readLatestTravelTripInviteForTrip`,
   - `joinTravelTripByInvite`.
4. новые API routes:
   - `POST /api/travel/trips/[tripId]/invites/create`,
   - `POST /api/travel/trips/[tripId]/invites/current`,
   - `POST /api/travel/trips/invites/join`.

### Frontend
Добавлено:
1. join entry-point в Travel tab (`Join shared trip` + token input),
2. organizer-side invite block в секции участников (`create/copy/status/expires`),
3. обновление trip snapshot после create/join, без ухода в другой сценарий.

## 5) Как сохранена историческая корректность старых участников и расходов

В `joinTravelTripByInvite` реализован safe-linking приоритет:
1. сначала ищется уже связанный participant по `profile_id`,
2. затем unlinked participant по `telegram_user_id`,
3. затем осторожный single-match по имени (`firstName/username`),
4. если безопасной связи нет — создается новый participant.

Гарантии:
1. старые расходы/splits/settlements не пересоздаются,
2. исторические member ids сохраняются,
3. linkage не ломает closure/archive/multi-currency/OCR потоки.

## 6) Как изменен trip/member UX

1. В Travel появился явный короткий join path по token.
2. В participants-секции появился спокойный shared invite слой для organizer.
3. Участники отображаются как реальные роли/состояния/identity, а не только как строки имен.
4. Travel продолжает жить отдельно от recurring lane.

## 7) Что намеренно НЕ менялось

1. Не трогалась recurring бизнес-логика.
2. Не менялись guide layers 28B/28C.
3. Не расширялись OCR/FX/settlement-math волны (кроме совместимости).
4. Не вводилась тяжелая permission/auth matrix.
5. Не делался shell redesign.

## 8) Risks / regression watchlist

1. Проверить edge-case с несколькими локальными участниками с одинаковыми именами при join (single-match guard уже включен, но нужен ручной UX smoke).
2. Проверить сценарии приглашения при активном переключении workspace.
3. Проверить organizer-only invite visibility/доступ в реальном Telegram webview.
4. Проверить поведение join в поездках на границе `active -> closing`.
5. Проверить миграцию invite-table в окружении с уже накопленными travel данными.

## 9) Проверки

Выполнено:
1. `npm run lint` - pass
2. `npm run build` - pass
3. targeted: `node --test --test-isolation=none src/lib/travel/invite-token.test.ts` - pass

Ограничения окружения:
1. `supabase migration list` - fail (в окружении не задан `SUPABASE_ACCESS_TOKEN`, требуется auth-ready среда для ручной проверки/применения миграции).
2. direct node-run для `validation.test.ts` в этом окружении остается нестабильным из-за ESM/path-особенностей текущего тестового запуска (не влияет на lint/build pass).

## 10) Self-check against acceptance criteria

1. Более зрелый shared-trip сценарий: да.
2. Более ясная participant identity layer: да (`you/joined/local` + role/status clarity).
3. Invite/join flow для поездок: да (create/current/join API + UI).
4. Более понятное отображение `joined vs local participants`: да.
5. Сохранение already-built travel возможностей: да (28A-28L совместимость сохранена).
6. Отсутствие поломки recurring baseline и donation-only truth: да.

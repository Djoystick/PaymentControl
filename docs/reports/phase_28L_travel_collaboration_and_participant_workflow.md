# Phase 28L - Travel Collaboration + Participant Workflow

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: collaboration/participant maturity wave on top of 28K lifecycle baseline
- Baseline preserved:
  - unrestricted donation-only truth
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) Что было найдено в audit после 28K

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
15. `docs/reports/internal_version_history.md`

Найденные продуктовые seams:
1. Travel уже зрелый по math/closure/OCR/lifecycle, но участники в UI все еще выглядели как плоский список без явного collaboration-смысла.
2. Не было явного пользовательского слоя ролей/состояний (`organizer`/`participant`, `active`/`inactive`) в runtime UX.
3. Не хватало безопасного пути редактирования состава: добавить участника, перевести в inactive для новых трат, вернуть обратно, назначить организатора.
4. Выбор плательщика/участников split в форме трат не отражал collaborative-state (active vs inactive) и мог быть визуально шумным.

## 2) Почему collaboration/participant workflow выбран следующим шагом

После 28A-28K Travel покрывает:
1. foundation + splits + balances,
2. correction/edit/delete,
3. closure/finalization,
4. multi-currency,
5. receipt OCR layer,
6. optimized settlement plan,
7. active/closed/archived lifecycle.

Следующий логичный продуктовый слой — сделать сценарий удобным для группы, а не только для одного человека-оператора.

## 3) Как изменен participant UX

Изменения в `src/components/app/travel-group-expenses-section.tsx`:
1. Добавлен отдельный участковый collaboration-блок в Trip workspace:
   - добавление нового участника,
   - быстрый rename,
   - перевод active <-> inactive,
   - назначение organizer.
2. В summary усилена читаемость participant-state:
   - отдельные метрики `Active members` и `Inactive`,
   - чипы участников показывают роль/статус/profile-link.
3. UI явно объясняет, что inactive-участники:
   - исключаются из новых трат по умолчанию,
   - но остаются в истории и исторических расчетах.

## 4) Как реализованы participant states/roles

Domain/model:
1. В `src/lib/travel/types.ts` добавлены:
   - `TravelTripMemberRole = organizer | participant`
   - `TravelTripMemberStatus = active | inactive`
2. `TravelTripMemberPayload` расширен полями:
   - `role`
   - `status`
   - `inactiveAt`
3. `TravelTripSummaryPayload` расширен:
   - `activeMemberCount`
   - `inactiveMemberCount`

Validation/API:
1. `src/lib/travel/validation.ts`:
   - `validateTravelCreateTripMemberInput(...)`
   - `validateTravelUpdateTripMemberInput(...)`
2. Добавлены member endpoints:
   - `POST /api/travel/trips/[tripId]/members`
   - `PATCH /api/travel/trips/[tripId]/members/[memberId]`
3. Добавлены error-codes member-слоя:
   - `TRAVEL_MEMBER_VALIDATION_FAILED`
   - `TRAVEL_MEMBER_NOT_FOUND`
   - `TRAVEL_MEMBER_CREATE_FAILED`
   - `TRAVEL_MEMBER_UPDATE_FAILED`

Repository/business rules (`src/lib/travel/repository.ts`):
1. Организатор должен оставаться active.
2. Нельзя напрямую демотировать текущего organizer без назначения нового.
3. Нельзя оставить поездку без active participants.
4. При смене organizer выполняется безопасная ротация с rollback-попыткой при ошибке.
5. Добавление участника возможно с `linkToCurrentProfile` (мягкая shared/workspace привязка).

## 5) Как изменен member selection flow в тратах

Create/edit expense flow теперь использует participant-aware pool:
1. Для новых трат по умолчанию доступны только active participants.
2. Для редактирования существующих трат доступен safe allowlist:
   - active participants
   - плюс historical participants, уже участвующие в данной трате.
3. Это сохраняет историческую корректность без возврата inactive участников в новые default-сценарии.

Дополнительно:
1. В `createTravelExpenseForTrip` payer должен быть active participant.
2. В `updateTravelExpenseForTrip` payer/split разрешены по historical-aware allowlist (active + already present in this expense).
3. UI формы явно подсказывает, когда inactive участник отображается только из-за истории конкретной траты.

## 6) Как сохранена history/settlement consistency при изменении состава участников

Сохранены инварианты:
1. Перевод участника в inactive не удаляет его из старых расходов.
2. Старые split-строки и settlement-математика остаются корректными.
3. Исторические edit-path остаются возможны для уже связанных участников.
4. Closure/finalization/archive слои 28E/28K не изменены концептуально.
5. Multi-currency/OCR/optimized settlement logic остаются совместимыми.

## 7) Schema/migration changes

Добавлена миграция:
1. `supabase/migrations/20260405070000_phase28l_travel_collaboration_and_participant_workflow.sql`

Что делает:
1. Добавляет в `travel_trip_members` поля:
   - `role`
   - `status`
   - `inactive_at`
2. Добавляет checks:
   - валидные role/status,
   - organizer должен быть active,
   - `inactive_at` согласован со `status`.
3. Нормализует текущие записи:
   - снимает лишние inactive timestamps у active,
   - выставляет inactive timestamp у inactive.
4. Гарантирует organizer-consistency:
   - демотирует дубликаты organizer внутри trip,
   - назначает organizer в trips, где его не было.
5. Добавляет индексы:
   - unique organizer per trip (`travel_trip_members_trip_organizer_unique`)
   - trip/status list index (`travel_trip_members_trip_status_created_idx`)

## 8) Что намеренно НЕ менялось

1. Travel settlement math (28I) не перерабатывалась.
2. OCR/receipt model (28G/28H) не расширялась.
3. Multi-currency core logic (28F) не менялась.
4. Closure/archive semantics (28E/28K) не расширялись новой волной.
5. Recurring baseline, Profile guide layer (28B/28C), donation-only truth не трогались.
6. Root shell/navigation (28J) не перестраивались.

## 9) Risks / regression watchlist

1. Проверить длинные сессии с активным редактированием состава участников в Telegram mobile webview.
2. Проверить edge-case ротации organizer при нестабильной сети (особенно rollback-path).
3. Проверить UX редактирования исторических трат с inactive участниками на реальных данных.
4. Проверить, что trip closure блокировки по-прежнему не обходятся через participant actions.
5. Проверить migration-path в окружении с уже накопленными travel trips (existing data backfill).

## 10) Validation

Выполнено:
1. `node --test --test-isolation=none src/lib/travel/validation.test.ts src/lib/travel/split.test.ts src/lib/travel/receipt-ocr.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass
4. `supabase migration list` - blocked (нет `SUPABASE_ACCESS_TOKEN` в текущем окружении), требуется ручная проверка в auth-ready среде.

## 11) Self-check against acceptance criteria

1. Более зрелый participant workflow в Travel: да.
2. Более ясные роли/состояния участников: да (`organizer/participant`, `active/inactive`).
3. Более удобный shared-trip сценарий: да (add/rename/activate/deactivate/promote organizer).
4. Более понятный member selection flow в расходах и расчетах: да (active-first + historical-safe edit allowlist).
5. Сохранены ранее собранные travel-возможности 28A-28K: да.
6. Recurring baseline и общая donation-only product truth не нарушены: да.

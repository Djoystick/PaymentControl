# Phase 28K - Travel Archive + Completion Flow Polish

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: lifecycle-polish wave for mature Travel tab after 28J extraction
- Baseline preserved:
  - unrestricted donation-only truth
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) Что было найдено в audit после 28J

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
14. `docs/reports/internal_version_history.md`

Найденные gaps в runtime:
1. В списке поездок не хватало спокойного пост-trip слоя: закрытые поездки копились рядом с активными.
2. После `closed` не было отдельного lifecycle-состояния для разгрузки рабочего списка.
3. Не хватало явного `archive -> restore` пути без удаления истории.
4. Travel tab сильна в active-flow, но слабее как модуль для long-term хранения завершенных поездок.

## 2) Почему archive/completion polish стал следующим логичным шагом

После 28E (closure/finalization) и 28J (dedicated Travel tab) следующим узким и практичным шагом было завершить lifecycle:
1. оставить активную рабочую поверхность чистой,
2. сохранить завершенные поездки доступными,
3. убрать давление старых поездок из основного travel workspace,
4. не трогать settlement/OCR/multi-currency математику без необходимости.

## 3) Как изменен lifecycle trip

Добавлен отдельный архивный слой поверх существующих состояний:
1. `active`
2. `closing`
3. `closed` (completed)
4. `archived` (новый lifecycle state)

Новая миграция:
1. `supabase/migrations/20260405043000_phase28k_travel_archive_and_completion_flow_polish.sql`

Что делает миграция:
1. добавляет `travel_trips.archived_at`;
2. расширяет `travel_trips_status_check` до `active|closing|closed|archived`;
3. добавляет `travel_trips_archived_state_check` (архивный статус <-> `archived_at`);
4. добавляет индекс `travel_trips_workspace_status_updated_idx`.

## 4) Как реализованы distinctions active / closed / archived

Domain/API:
1. `TravelTripStatus` расширен до `archived`.
2. В payload добавлен `archivedAt` для trip detail/list.
3. Closure API принимает новые действия `archive` и `unarchive`.

Repository rules:
1. `archive` разрешен только из `closed`.
2. `unarchive` разрешен только из `archived` и возвращает поездку в `closed`.
3. `reopen` из `archived` блокируется с явным сообщением (сначала restore).

## 5) Как изменен trip list / filters / grouping

В `Travel` списке добавлен явный сегментированный фильтр:
1. `Active`
2. `Completed`
3. `Archived`
4. `All`

Поведение:
1. `Active` показывает `active + closing` как рабочую зону.
2. `Completed` показывает `closed`.
3. `Archived` показывает только архив.
4. Для каждого фильтра есть count и отдельный empty-state текст.

## 6) Как устроен archive path

Пользовательский путь:
1. Завершить поездку (`close`) в существующем 28E flow.
2. В статусе `closed` нажать `Move to archive`.
3. Подтвердить архивирование в отдельном спокойном confirm-блоке.
4. Поездка уходит из `Completed` в `Archived` без удаления истории.

## 7) Как выглядит completed/archived trip UX

`Closed`:
1. остается читаемой, с итогами settlement;
2. сохраняет read-only характер (без expense edit/create);
3. дает action `Reopen trip` и `Move to archive`.

`Archived`:
1. остается читаемой (summary/history/settlement доступны);
2. помечена как read-only;
3. активные edit-flow действия недоступны;
4. отображается отдельно от active/completed.

## 8) Restore/unarchive path

Добавлен и включен:
1. В `archived` доступен `Restore from archive`.
2. Restore возвращает поездку в `completed` (`closed`) без потери истории.
3. Это исключает жесткий irreversible dead-end.

## 9) Что намеренно НЕ менялось

1. OCR/receipt слой (28G/28H) не расширялся.
2. Settlement math optimization (28I) не менялась.
3. Multi-currency модель (28F) не менялась.
4. Recurring lane и release baseline core-flows не менялись.
5. Guide layer 28B/28C в Profile не трогался.
6. Бизнес-логика recurring/payment не менялась.

## 10) Validation

Выполнено:
1. `node --test --test-isolation=none src/lib/travel/split.test.ts src/lib/travel/finalization.test.ts src/lib/travel/currency.test.ts src/lib/travel/validation.test.ts src/lib/travel/receipt-ocr.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass

Migration apply check in this environment:
1. `supabase migration list` - failed (missing `SUPABASE_ACCESS_TOKEN` / `supabase login` required).
2. Manual environment debt remains for linked Supabase project:
   - `supabase db push`
   - `supabase migration list`

## 11) Risks / regression watchlist

1. Проверить UX-понятность разницы `closing` vs `closed` vs `archived` на мобильном Telegram WebView.
2. Проверить, что Home/continuity переходы не приводят пользователя в пустой фильтр без явного next-step.
3. Проверить восстановление (`unarchive`) в длинных списках поездок и корректный пересчет selection/filter состояния.
4. Проверить, что archived-trip не пропускает mutating операции через receipt/expense endpoints.

## 12) Self-check against acceptance criteria

1. Более зрелый lifecycle поездок: да.
2. Явное разделение `active / closed / archived`: да.
3. Более чистая и полезная Travel tab: да.
4. Archive/completion flow разгружает список поездок: да.
5. Все собранные travel-возможности сохранены: да.
6. Recurring baseline и общая product truth не сломаны: да.

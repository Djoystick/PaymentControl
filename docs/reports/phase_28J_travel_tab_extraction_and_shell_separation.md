# Phase 28J - Travel Tab Extraction + Shell Separation

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: структурный shell-pass (вынос Travel в отдельную root-вкладку без новой доменной волны)
- Baseline preserved:
  - unrestricted donation-only truth
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) Что было найдено в audit текущего shell после 28I

Проверены:
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
13. `docs/reports/internal_version_history.md`

Найденные seams:
1. Travel оставался внутри смешанного `Reminders` runtime, хотя к 28I уже стал зрелым самостоятельным сценарием.
2. Root-shell из 4 вкладок продолжал держать Recurring и Travel в одном экране с mode-switch.
3. Home/continuity точки входа уже требовали более явного разделения `Recurring` и `Travel`.

## 2) Почему tab extraction стал следующим логичным шагом

После 28A-28I Travel получил собственный полноценный домен (trip/workspace, settlements, closure, multi-currency, receipt/OCR, optimization). Дальше держать его как внутренний toggle в Recurring стало менее понятно, чем развести сценарии по отдельным root tabs.

## 3) Как изменен root shell

Изменения в `src/components/app/app-shell.tsx`:
1. `AppTab` расширен до 5 вкладок: `home`, `reminders`, `travel`, `history`, `profile`.
2. Bottom nav переведен на 5-кнопочную сетку (`grid-cols-5`).
3. Вкладка `reminders` получила пользовательский label `Recurring`.
4. Добавлена новая root-вкладка `Travel` с отдельной иконкой.
5. Onboarding copy подправлен под новую shell-семантику (`Recurring` как отдельный lane, без смешения с Travel).

## 4) Как Travel вынесен в отдельную вкладку

Изменения в `src/components/app/profile-scenarios-placeholder.tsx`:
1. Удалена сборка mixed-surface через `RemindersAndTravelSection`.
2. `reminders` экран теперь рендерит только `RecurringPaymentsSection`.
3. Добавлен отдельный `travel` экран с `TravelGroupExpensesSection`.
4. В `AppShell` переданы отдельные экраны для `reminders` и `travel`.

Удалено:
1. `src/components/app/reminders-and-travel-section.tsx` (старый mode-switch слой).

## 5) Как очищен recurring lane

1. Recurring больше не содержит встроенного переключателя сценариев Travel/Recurring.
2. Recurring снова воспринимается как чистая рабочая поверхность регулярных трат.
3. Все travel-возможности остались в отдельной вкладке `Travel` без дублирования в recurring UI.

## 6) Как обновлены Home/continuity entry-points

`src/components/app/landing-screen.tsx`:
1. Primary CTA переназван в recurring-семантику: `Open Recurring and add payment`.
2. Resume-labels для recurring контекста приведены к `Recurring` naming.
3. Добавлен отдельный resume label для travel-снимка: `Resume Travel workspace`.

`src/components/app/payments-dashboard-section.tsx`:
1. В compact action lane добавлен явный CTA `Open Travel workspace`.
2. Recurring CTA теперь явно ведут в recurring срез (`Open action-now Recurring` / `Open Recurring for actions`).
3. Empty-state CTA recurring обновлен до `Add first recurring payment`.

`src/components/app/payments-activity-section.tsx`:
1. Empty/no-results copy обновлен с `Reminders` на `Recurring` для согласованности shell.

## 7) RU/EN parity и локализация

`src/lib/i18n/localization.tsx` дополнен новыми ключами 28J:
1. новые shell labels/hints (`Travel`, `Recurring payments routine`, `Trips, receipts, and settlements`),
2. recurring/travel continuity строки (`Resume Recurring...`, `Resume Travel workspace`),
3. Home/History обновленные recurring-фразы,
4. profile quick-start copy под отдельный recurring lane.

## 8) Что намеренно НЕ менялось

1. Travel domain model и БД-сущности 28A-28I не менялись.
2. Settlement math/OCR/multi-currency слои не расширялись.
3. Recurring payment business logic не менялась.
4. Guide layer 28B/28C в Profile не перерабатывался.
5. Новые миграции не добавлялись.

## 9) Risks / regression watchlist

1. Проверить, что все Home CTA продолжают вести в правильные root-вкладки после длительной сессии и возвратов.
2. Проверить continuity (resume/start-clean) между `home -> recurring/travel/history` на реальных Telegram mobile webview.
3. Проверить, что пользователи не теряют контекст при переходе из старых сохраненных snapshot (до 28J).
4. Проверить copy parity в RU/EN на измененных entry-points.

## 10) Validation

Выполнено:
1. `node --test --test-isolation=none src/lib/app/context-memory.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass

## 11) Self-check against acceptance criteria

1. Отдельная root-вкладка Travel: да.
2. Чистый recurring lane без смешения с travel: да.
3. Сохранение travel-функциональности 28A-28I: да (модуль перенесен без урезания).
4. Более понятная shell-структура: да (`Home / Recurring / Travel / History / Profile`).
5. Release baseline и product truth не нарушены: да.


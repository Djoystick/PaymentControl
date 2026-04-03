# Phase 27G - Release Candidate Consolidation + Final Active-Surface Closure

- Date: 2026-04-04
- Status: implemented (final RC consolidation wave), manual verification completed by user (release-line accepted)
- Scope type: final active-surface closure and release-level cohesion hardening (no new product branch)
- Source-of-truth baseline:
  1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
  2. `docs/reports/phase_27A_full_project_audit.md`
  3. `docs/reports/phase_27A_remaining_roadmap_reset.md`
  4. `docs/reports/phase_27B_core_design_system_hardening_and_primary_surface_recomposition.md`
  5. `docs/reports/phase_27C_action_first_workflow_compression_and_cross_surface_navigation_clarity.md`
  6. `docs/reports/phase_27D_guided_reminders_workspace_and_progressive_disclosure_simplification.md`
  7. `docs/reports/phase_27E_calm_context_memory_and_helpful_micro_automation.md`
  8. `docs/reports/phase_27F_release_reliability_hardening_and_legacy_residue_cleanup.md`
  9. `docs/reports/internal_version_history.md`

## 1) Что было проанализировано

Проверенные активные поверхности и связки:
1. Home (`LandingScreen` + compact dashboard flow)
2. Reminders (guided workspace + composer + context reset)
3. History (focus modes + low-data states + continuity)
4. Profile (support/donation/supporter/bug-report/owner helper layers)
5. Family/workspace continuity
6. onboarding replay поведение в связке с context-memory
7. bug-report runtime-context path
8. language/theme controls и пользовательские состояния
9. empty/loading/no-results/low-data сценарии
10. continuation / restored / Start clean пути

Ключевые файлы runtime:
1. `src/components/app/landing-screen.tsx`
2. `src/components/app/recurring-payments-section.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/app-shell.tsx`
5. `src/lib/i18n/localization.tsx`

Reference:
1. `ui-ux-pro-max` skill guidance (cohesion/state consistency/error-recovery patterns) через локальные skill data файлы.
2. Запуск python-скрипта skill в этой среде недоступен (ограничение доступа к `python.exe`), поэтому применен fallback по локальным CSV/правилам.

## 2) Найденные final release-quality gaps

1. Home показывал `Continue where you left off` даже для возврата в Profile, что создавало лишний шум в основном рабочем сценарии.
2. Home показывал технический `Runtime stage` даже в production-like stage (`prod`), что не соответствует release-facing UX.
3. В History low-data сценариях не хватало явного действия на следующий шаг (быстрый переход к добавлению платежа).
4. `Start clean` в History/Reminders очищал контекст, но в Reminders не сбрасывал активный feedback-месседж (неполный “чистый старт”).
5. Требовалась финальная синхронизация master anchor к фактическому RC состоянию после 27B-27G.

## 3) Какие active-surface seams закрыты

## 3.1 Home

Файл:
1. `src/components/app/landing-screen.tsx`

Изменения:
1. Resume-карта теперь не показывается для последней вкладки `profile` (оставлена для рабочих контекстов `reminders/history`).
2. `Runtime stage` скрыт в production-like stages (`production`, `prod`), оставлен для non-prod.

Эффект:
1. Home чище и более action-first в реальном ежедневном сценарии.
2. Меньше release-шумов на пользовательской поверхности.

## 3.2 History

Файл:
1. `src/components/app/payments-activity-section.tsx`

Изменения:
1. В low-data состояниях добавлено явное действие `Open Reminders and add payment`.
2. Добавлен безопасный переход в `reminders_add_payment` с сохранением workspace context.
3. `Start clean` теперь также очищает локальный feedback.

Эффект:
1. Empty/low-data состояния ведут к следующему полезному действию.
2. Сценарий Home/History/Reminders стал более замкнутым и понятным.

## 3.3 Reminders

Файл:
1. `src/components/app/recurring-payments-section.tsx`

Изменения:
1. `Start clean` дополнительно очищает feedback, чтобы состояние действительно было “чистым”.

Эффект:
1. reset path стал более предсказуемым и визуально завершенным.

## 3.4 Final copy/state consistency

Файл:
1. `src/lib/i18n/localization.tsx`

Изменения:
1. Добавлен RU key для нового continuity reason:
   - `Continue from History and add first payment.`
2. После 27F cleanup повторно подтверждена полнота активных `tr(...)` ключей (missing=0).

Эффект:
1. RU/EN parity на затронутых активных участках сохранена.
2. User-facing state/copy seams после добавленных переходов закрыты.

## 4) Что изменено по обязательным областям

1. Home: да (уменьшение шума continuation/stage).
2. Reminders: да (clean reset behavior).
3. History: да (low-data next-action closure).
4. Profile: код не менялся; поверхность проверена, quiet support/donation/supporter смысл сохранен.
5. Family/workspace: код не менялся напрямую; continuity переходы и workspace-aware intent поведение сохранены.
6. bug report: в 27G не менялся (оставлен 27F hardened compact runtime-context path).
7. onboarding replay: в 27G не менялся; конфликтов с context-memory в текущей логике не добавлено.

## 5) Финальный release verification pack (русский, короткий)

Ниже финальный ручной прогон перед релизным решением:

1. **Home / continuation**
1. Открыть Reminders, выставить фокус (`Action now` или `Upcoming`), вернуться на Home.
2. Проверить, что есть понятная карточка продолжения.
3. Нажать `Start clean` и убедиться, что карточка продолжения исчезла.
4. Перейти в Profile и обратно: Home не должен навязчиво предлагать “continue profile”.

2. **Reminders core flow**
1. Добавить платеж, отредактировать, удалить (через confirm delete).
2. Проверить `Mark paid` / `Undo paid`.
3. Вызвать `Start clean` в Reminders и убедиться, что фокус/контекст/feedback сброшены.

3. **History low-data and focus**
1. В пустом/почти пустом состоянии History проверить кнопку `Open Reminders and add payment`.
2. Нажать кнопку, убедиться в корректном переходе в add-payment flow.
3. В History переключить `All / Changes / Paid`, затем `Start clean`.

4. **Profile / support / supporter**
1. Убедиться, что donation-блок остается спокойным и вторичным.
2. Проверить, что supporter badge (если активен) отображается как благодарность, без unlock-семантики.
3. Проверить owner supporter management (если доступен) по grant/revoke базовому сценарию.

5. **Family/workspace continuity**
1. Переключить workspace.
2. Убедиться, что Reminders/History не подтягивают чужой (другого workspace) контекст.

6. **Onboarding replay**
1. Запустить `Show onboarding again` из Profile.
2. Проверить, что replay работает и не ломает основной runtime после закрытия.

7. **Bug report**
1. Отправить bug report из Profile.
2. Убедиться, что форма остается простой.
3. Проверить, что в доставленном сообщении runtime-context секция компактная и читаемая.

8. **RU/EN и тема**
1. Переключить RU/EN и light/dark.
2. Проверить ключевые active surfaces (Home/Reminders/History/Profile) на отсутствие сломанных строк и state-артефактов.

## 6) Что намеренно НЕ менялось

1. Не добавлялись новые продуктовые фичи.
2. Не выполнялся новый visual overhaul.
3. Не менялись БД/миграции/API контракты.
4. Не менялась бизнес-логика платежей.
5. Не затрагивались donation-to-access механики (и не вводились новые).

## 7) Risks / regression watchlist

1. Telegram webview может по-разному вести localStorage/focus-события на отдельных устройствах.
2. Нужен обязательный ручной прогон continuity/reset на реальных mobile Telegram runtime профилях.
3. Owner-only supporter tooling следует проверить отдельно для non-owner accounts (скрытие/403 path).

## 8) Самопроверка against acceptance criteria

1. Active runtime стал более цельным и без заметных user-facing seams: да.
2. Финальная согласованность Home/Reminders/History/Profile/Family-workspace улучшена: да.
3. Support/profile layer остается спокойным, без premium residue: да.
4. Подготовлен финальный release verification pack: да (в этом отчете, раздел 5, полностью на русском).
5. Release-level docs синхронизированы: да (report + history + master anchor).
6. Product truth не изменена: да.

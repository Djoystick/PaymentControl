# Payment Control Mini App — Master Migration Anchor (2026-03-27)

## 1. Заголовок
Единый master anchor проекта Payment Control на дату 2026-03-27.

## 2. Назначение документа
Этот документ нужен, чтобы новый чат мог продолжить работу сразу, без пересказа старой истории.

## 3. Canonical source-of-truth statement
Этот файл является новым каноническим источником истины для миграций чатов:
`docs/payment_control_master_anchor_2026-03-27.md`.

Использовать в будущем именно его как базу для контекста.

## 4. Executive summary
- Старый anchor в `docs/payment_control_full_migration_anchor_post_live_family_2026-03-26.md` фиксировал состояние до Phase 9A.
- В репозитории есть phase-отчеты после 9A: `9B`, `9B.1`, `9C`, `9C.1`, `10A`, `10B`, `10C`, `10C.1`.
- По текущему входному статусу миграции от 2026-03-27 эти этапы считаются `manual verified`, хотя их исходные отчеты заканчивались как `partially verified` или `not confirmed`.
- Критические факты по коду подтверждают наличие изменений 9B-10C.1:
  - family paid/unpaid loop;
  - economics `Who pays` + `Paid by` + mismatch hints;
  - immediate UI refresh после paid/unpaid;
  - UI mobile-first уплотнение;
  - first-run onboarding;
  - replay onboarding через `Show onboarding again`;
  - фикс поломанного текста/раскладки recurring-карточки на mobile.
- Продукт стал более минималистичным и mobile-first, но архитектурно это все еще один длинный экран с якорной навигацией, а не отдельные полноценные экраны-вкладки.

## 5. Project stack / infra snapshot
- Frontend: Next.js `16.2.1`, React `19.2.4`, TypeScript, Tailwind CSS 4.
- Backend: Next Route Handlers (`/api/...`).
- DB: Supabase.
- Runtime/deploy: Vercel.
- Telegram: Mini App + Bot API + server-side `initData` verification.
- Важные runtime/setup документы:
  - `docs/runtime_setup_guide_for_beginner.md`
  - `docs/phase9a_runtime_integration_report.md`
- Миграции в репозитории идут до:
  - `supabase/migrations/20260327090000_phase9c_family_shared_economics_foundation.sql`

## 6. Latest confirmed stage
Подтверждено вручную: `Phase 10C.1`.

Источник статуса:
- Подтверждено по входному статусу миграции от 2026-03-27.
- Подтверждено по коду/отчетам, что изменения 10C.1 реально присутствуют в `src/components/app/*`.

## 7. Current factual product state in plain Russian
Подтверждено вручную:
- Базовый personal flow рабочий.
- Family foundation с invite/join рабочий.
- Family shared recurring usage loop (включая `Mark paid`/`Undo paid`) рабочий.
- Onboarding replay через `Show onboarding again` добавлен и отмечен как ручной verified.
- Фикс текста/раскладки recurring-card на mobile внесен и отмечен как ручной verified.

Подтверждено по коду/отчетам:
- В family flow есть `Who pays`, `Paid by`, mismatch hints и соответствующие счетчики в dashboard/activity/reminder visibility.
- `Mark paid` в family пишет фактического плательщика в `paid_by_profile_id`.
- После `Mark paid`/`Undo paid` есть локальная revalidation UI (`loadPayments()`).
- В UI уже есть курс на минимализм и progressive disclosure (`details/summary`, упрощенный copy, onboarding-оверлей).

Еще не подтверждено живой проверкой (в явном отдельном новом отчете внутри repo):
- Длительное наблюдение cron/scheduled-dispatch в production на длинном горизонте.
- Отдельная формальная фиксация true first-run onboarding на полностью новом устройстве/профиле (не replay-путь).

Отложено в roadmap:
- Полная split/debts/balances экономика.
- Полноценный сценарий отдельных экранов вместо одного длинного экрана.
- Premium слой, growth механики, official cancellation knowledge block.

## 8. Full phase-by-phase status matrix

| Phase | Текущий статус | Источник и пояснение |
|---|---|---|
| 0 | manual verified | Старый anchor 2026-03-26 |
| 0.1 | manual verified | Старый anchor 2026-03-26 |
| 1A | manual verified | Старый anchor 2026-03-26 |
| 2A | manual verified | Старый anchor 2026-03-26 |
| 2B bugfix | superseded / folded | Исторический bugfix, поглощен стабильным 2B-контекстом |
| 2B | manual verified | Старый anchor 2026-03-26 |
| 3A | manual verified | Старый anchor 2026-03-26 |
| 3B | manual verified | Старый anchor 2026-03-26 |
| 4A | manual verified | Старый anchor 2026-03-26 |
| 5A | manual verified | Старый anchor 2026-03-26 |
| 6A | manual verified | Старый anchor 2026-03-26 |
| 6B | manual verified | Старый anchor 2026-03-26 |
| 6C | manual verified | Старый anchor 2026-03-26 |
| 6D | manual verified | Старый anchor 2026-03-26 |
| 6E | manual verified | Старый anchor 2026-03-26 |
| 6F | manual verified | Старый anchor 2026-03-26 |
| 6F.1 | manual verified | Старый anchor 2026-03-26 |
| 6G | manual verified | Старый anchor 2026-03-26 |
| 6G.1 | manual verified | Старый anchor 2026-03-26 |
| 6H | manual verified | Старый anchor 2026-03-26 |
| 7A | manual verified | Старый anchor 2026-03-26 |
| 7B | manual verified | Старый anchor 2026-03-26 |
| 7C | manual verified | Старый anchor 2026-03-26 |
| 7D | manual verified | Старый anchor 2026-03-26 |
| 7E | manual verified | Старый anchor 2026-03-26 |
| 7F | manual verified | Старый anchor 2026-03-26 |
| 8A | manual verified | Старый anchor 2026-03-26 |
| 8B | manual verified | Старый anchor 2026-03-26 (invite accept закрыт live-проверкой) |
| 8B.1 | superseded / folded | Зафиксировано старым anchor как встроенный фикс без отдельной ценности |
| 8C | manual verified | Старый anchor 2026-03-26 |
| 8C.1 | manual verified | Старый anchor 2026-03-26 |
| 8D | manual verified | Старый anchor 2026-03-26 |
| 8E | manual verified | Старый anchor 2026-03-26 |
| 8F | manual verified | Старый anchor 2026-03-26 |
| 8G | manual verified | Старый anchor 2026-03-26 |
| 8H | manual verified | Старый anchor 2026-03-26 |
| 8I | manual verified | Старый anchor 2026-03-26 |
| 8J | manual verified | Старый anchor 2026-03-26 |
| 8K | manual verified | Старый anchor 2026-03-26 |
| 8L | manual verified | Старый anchor 2026-03-26 |
| 8M | manual verified | Старый anchor 2026-03-26 |
| 8N | manual verified | Старый anchor 2026-03-26 |
| 8O | manual verified | Старый anchor 2026-03-26 |
| 8P | manual verified | Старый anchor 2026-03-26 |
| 8P.1 | superseded / folded | Перекрыт Phase 8P.2 |
| 8P.2 | manual verified | Старый anchor 2026-03-26 |
| 8Q | manual verified | Старый anchor 2026-03-26 |
| 9A | manual verified | Старый anchor 2026-03-26 |
| 9B | manual verified | Отчет 9B был `partially verified`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 9B.1 | manual verified | Отчет 9B.1 был `partially verified`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 9C | manual verified | Отчет 9C был `partially verified`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 9C.1 | manual verified | Отчет 9C.1 был `partially verified`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 10A | manual verified | Отчет 10A был `not confirmed`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 10B | manual verified | Отчет 10B был `not confirmed`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 10C | manual verified | Отчет 10C был `not confirmed`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |
| 10C.1 | manual verified | Отчет 10C.1 был `not confirmed`; текущий migration-вход от 2026-03-27 фиксирует как manual verified |

Статусы-категории на сегодня:
- Partially verified: активных фаз нет.
- Not confirmed: активных фаз нет как отдельного phase-блока, но есть точечный verification debt (см. раздел 12).
- Pending / not started: крупные roadmap-блоки (см. раздел 11).

## 9. Live manual verification summary
Подтверждено вручную:
- Invite create/accept в family.
- Shared recurring виден и работает для household.
- `Mark paid`/`Undo paid` в family.
- Family surfaces (dashboard/activity/reminder visibility) в рабочем состоянии.
- Bottom navigation интерактивен.
- Onboarding replay через `Show onboarding again`.
- Mobile recurring text/layout bug исправлен.

Подтверждено по коду/отчетам:
- `paid_by_profile_id` колонка и логика заполнения/очистки в циклах.
- Family economics mismatch hints и счетчики.
- UI progressive disclosure и onboarding-first-run/replay механика.

Еще не подтверждено живой проверкой:
- Отдельный явно задокументированный long-horizon production мониторинг cron path.
- Формально выделенный чек true first-run onboarding на реально “чистом” окружении.

## 10. Completed roadmap blocks
- Personal foundation: 0 -> 5A.
- Reminder/delivery foundation: 6A -> 6H.
- Subscription foundation: 7A -> 7F.
- Family foundation wave: 8A -> 8Q.
- Runtime integration: 9A.
- Family shared usage + economics foundation: 9B -> 9C.1.
- UI simplification and mobile-first tightening: 10A -> 10C.1.

## 11. Remaining roadmap blocks
Отложено в roadmap:
- Полный split/debts/balances/settlement layer.
- Family parity как отдельные продвинутые подсистемы (reminders/subscriptions economics level).
- Scenario migration engine (single <-> family).
- Premium/monetization слой (без блокировки core).
- Growth/distribution/campaign layer после core readiness.
- Полный переход от длинного экрана к отдельным экранам/вкладкам:
  - Home
  - Reminders
  - History
  - Profile

## 12. Что еще нужно перепроверить из старых шагов

### 12.1 Truly closed old debts
- Старый долг по invite accept вторым профилем: закрыт.
- Старый долг по нерабочему нижнему таббару: закрыт.
- Баг `Mark paid` disabled в family: закрыт.
- Баг instant refresh после paid/unpaid: закрыт.
- Баг mobile text/layout recurring card: закрыт.
- Replay onboarding path (`Show onboarding again`): закрыт.

### 12.2 Still-open verification debts
- Долгий production-мониторинг scheduled dispatch (не разовый smoke-check, а наблюдение во времени).
- Явный ручной тест true first-run onboarding на полностью новом устройстве/профиле/чистом storage (отдельно от replay пути).

### 12.3 Non-blocking operational observation items
- README и setup-документы местами держат старый формат имен миграций (`20260325_...`), тогда как фактические файлы имеют формат `20260325010000_...`.
- В UI-фазовых бейджах сейчас отображается `Phase 10C`, хотя есть bugfix-report `10C.1` (функционально не блокирует).

## 13. UI/UX direction and product principles
- Направление: максимально простой, минималистичный, дружелюбный интерфейс.
- Низкий порог входа важнее декоративности.
- Важные действия должны быть очевидны сразу.
- Вторичный объясняющий текст держать свернутым и показывать по запросу.
- Использовать progressive disclosure и onboarding/help.
- Текущее состояние: мобильная читабельность стала лучше, но архитектурно это еще длинный single-page flow.
- Целевой долгосрочный формат:
  - Home
  - Reminders
  - History
  - Profile

## 14. Premium / pay-lock philosophy
Это обязательные продуктовые правила.

1. Premium не блокирует core-пользование приложением.
2. Free-версия должна оставаться реально полезной.
3. Free включает:
   - добавление/редактирование recurring и subscriptions;
   - `Mark paid` / `Undo paid`;
   - базовые reminders;
   - базовую history;
   - базовый dashboard;
   - базовое personal usage;
   - базовое family usage:
     - invite
     - shared payment
     - who pays
     - базовая видимость для двух профилей
4. Premium логично включает:
   - advanced reminders;
   - advanced family economics:
     - split bills
     - debts
     - balances
     - reimbursement tracking
     - settlement hints
   - advanced analytics/reports/extended history;
   - higher limits/scale;
   - power-user convenience:
     - templates
     - bulk actions
     - advanced filters
     - saved views
     - smart collections / problem payments center
5. Нельзя полностью pay-lock:
   - core payment functionality;
   - базовые reminders;
   - `Mark paid` / `Undo paid`;
   - базовую history;
   - базовый family invite/shared recurring;
   - базовую who-pays логику;
   - блок official cancellation instructions.
6. Общая монетизация:
   - не продаем право пользоваться приложением;
   - продаем удобство, масштаб и более глубокий контроль.

## 15. Gift premium / campaign premium roadmap note
Обязательный отдельный roadmap sub-block:
- временная или полная gift premium активация;
- специальные deep links / campaign links;
- квоты/лимиты активаций;
- учет:
  - выдано
  - активировано
  - удержание.

## 16. Future official cancellation-instructions block on Profile
Планируем отдельный будущий блок в `Profile`:
- официальные инструкции по отмене подписок популярных российских сервисов.
- Примеры:
  - Яндекс Музыка
  - премиум-услуги российских банков
  - Ozon Premium
  - Wildberries / WB
  - и другие массовые сервисы
- Источники только официальные (документация/официальные страницы).
- Этот блок остается бесплатным, не уходит в premium paywall.

## 17. Working rules for future chats
- Перед каждым prompt явно писать модель:
  - `ChatGPT 5.4`
  - `ChatGPT 5.3 Codex`
- Для Codex:
  - полный подробный отчет сохраняется в `.md` внутри проекта;
  - в чат идет только короткая сводка.
- Все объяснения пользователю: на русском, простыми словами.
- Если факт не подтвержден, не придумывать: явно маркировать статус.

## 18. Operational workflow rules
- Работа итерациями: один узкий pass -> отчет -> ручная проверка -> следующий pass.
- Нельзя скрывать неопределенность.
- Статусы фиксировать явно:
  - `Подтверждено вручную`
  - `Подтверждено по коду/отчетам`
  - `Еще не подтверждено живой проверкой`
  - `Отложено в roadmap`
- Не перескакивать через фундаментальные блоки.

## 19. Git Bash / deploy / live-test discipline
- Рабочий инструмент: Git Bash (не GitHub Desktop).
- После каждого pass:
  1. commit
  2. push
  3. deploy
  4. live Telegram тест
- Live Telegram runtime является источником истины.
- Dev fallback использовать только как вспомогательный локальный режим, не как финальное подтверждение.

## 20. Reporting discipline for Codex
После каждого отчета Codex обязательно автоматически добавляет:
1. Краткий анализ.
2. Чеклист ручной проверки.
3. Git Bash команды для commit/push/deploy.

Это обязательное правило, не опция.

## 21. What not to lose in future migrations
- Канонический anchor-файл: только этот документ.
- Факт, что после 9A были выполнены 9B -> 10C.1.
- Факт, что recurring card mobile text/layout bug исправлен.
- Факт, что onboarding replay через `Show onboarding again` добавлен.
- Факт, что направление продукта: минимализм + mobile-first + progressive disclosure.
- Факт, что долгосрочно нужен переход на отдельные экраны (не длинный single-page).
- Факт, что core нельзя закрывать paywall.
- Факт, что будущий блок official cancellation instructions должен быть бесплатным.

## 22. Recommended next step
Рекомендуемый следующий шаг:
сплит текущего длинного single-page UX на реальные экранные вкладки:
- Home
- Reminders
- History
- Profile

Почему это сейчас логично:
- 10A-10C.1 уже сделали мобильную чистоту и текстовую простоту, но структурный UX-долг остался.
- Текущий app-shell все еще якорный (`Home/Activity/Profile`) внутри одной страницы.
- Пользовательский сценарий станет быстрее, если reminders/history получат самостоятельные экраны.

## 23. Optional safe alternative next step
Безопасная альтернатива перед полным сплитом:
- сделать узкий verification+ops pass:
  - формально зафиксировать true first-run onboarding на чистом профиле/устройстве;
  - сделать наблюдение scheduled-dispatch в production по интервалу;
  - синхронизировать документацию миграций с фактическими именами файлов.

Это не противоречит сплиту экранов и может идти как короткий подготовительный шаг.

## 24. Final fixed line
Последний подтвержденный этап: Phase 10C.1 — Recurring card text/layout fix + onboarding replay/reset (manual verified).

# Phase 12B — Reminders density reduction + hierarchy polish report

Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Канонический roadmap-документ прочитан: `docs/payment_control_master_anchor_2026-03-27.md`.
- Дополнительные отчеты прочитаны:
  - `docs/phase11a1_real_tab_navigation_fix_report.md`
  - `docs/phase11b_verification_debt_closure_ops_doc_sync_report.md`
  - `docs/phase11c_tab_content_simplification_progressive_disclosure_polish_report.md`
  - `docs/phase11d_empty_states_first_action_guidance_polish_report.md`
  - `docs/phase12a_ru_en_localization_foundation_language_switch_report.md`
  - `docs/phase12a1_ru_localization_cleanup_mixed_string_fix_report.md`
- Актуальный override-статус учтен: **Phase 12A.1 — подтверждено вручную**.

## Что изменено в Phase 12B

### 1) Уменьшена плотность первого экрана Reminders
Статус: **Confirmed in code/report**
- В `Recurring Payments` добавлен компактный блок `Main action` с явной CTA-кнопкой открытия формы.
- CTA открывает композер и прокручивает к нему экран (`openComposer` + `scrollIntoView`), чтобы первое действие было очевиднее на мобильном.
- Вторичные блоки, которые раньше были визуально тяжелыми, переведены в progressive disclosure (`<details>`):
  - семейный snapshot
  - quick templates
  - shared help (остался доступным, но вторичным)

### 2) Упрощен Add/Edit flow в Reminders
Статус: **Confirmed in code/report**
- Форма разделена на:
  - базовые поля (первый экран)
  - раскрываемые `Advanced options`
- В `Advanced options` перенесены вторичные/реже меняемые поля:
  - category
  - currency
  - флаги required/subscription/reminders
  - timing reminders + notes
- Для edit-сценария advanced секция автоматически раскрывается, чтобы не терялись доступные параметры редактирования.

### 3) Улучшена читаемость карточек текущих платежей
Статус: **Confirmed in code/report**
- Карточки переведены на более компактную и сканируемую структуру:
  - ключевые атрибуты вынесены в короткие chip-метки (amount, category, cadence/due, required/optional, status)
  - цикл оплаты (`Current cycle`) оставлен отдельной строкой с меньшим шумом
- `Who pays` / `Paid by` / economics hints сохранены, логика не менялась.

### 4) Вторичный operational блок в Reminders де-акцентирован
Статус: **Confirmed in code/report**
- `ReminderCandidatesSection` в Reminders обернут в отдельный collapsible-блок:
  - `Reminder operations and visibility`
  - внутри сохранены readiness/dispatch/diagnostics/attempts
- Это снижает перегруз первого экрана и сохраняет visibility-поверхности из Phase 11B.

### 5) Локализация для новых UI-строк
Статус: **Confirmed in code/report**
- Добавлены RU-переводы для новых строк 12B.
- EN не ломается (базовый fallback по ключу сохранен).

## Точные файлы, измененные в 12B
1. `src/components/app/recurring-payments-section.tsx`
2. `src/components/app/profile-scenarios-placeholder.tsx`
3. `src/lib/i18n/localization.tsx`

## Что намеренно НЕ менялось
- Доменная логика платежей/семейных сценариев.
- Логика Mark paid / Undo paid.
- Логика who pays / paid by.
- 4-tab shell и навигация Home/Reminders/History/Profile.
- Логика RU/EN persistence.
- Premium/paywall, split bills/debts/balances, analytics expansion.
- Миграции БД/схема.

## Техническая проверка после изменений
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## Что все еще требует live manual verification
Статус: **Still requires live manual verification**
1. Субъективная проверка, что первый экран Reminders в Telegram реально ощущается легче на малом экране.
2. Реальное удобство Add/Edit flow пальцем на мобильном (в т.ч. раскрытие/сворачивание advanced).
3. Полный regression smoke в Telegram runtime:
   - Mark paid / Undo paid
   - family shared recurring
   - who pays / paid by
   - workspace/invite surfaces
4. Проверка RU/EN на деплое для всех новых строк 12B в Reminders.

## Риски и follow-up
- Collapsible-структура для операционного блока улучшает первый экран, но часть пользователей может реже открывать diagnostics. Это ожидаемо для progressive disclosure; блок не удален.
- Если после live-теста останется перегруз именно внутри `ReminderCandidatesSection`, следующий узкий pass можно сделать локально в этом компоненте (без затрагивания shell и доменной логики).

## Encoding safety check
Проверены файлы с русскоязычным контентом:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase12b_reminders_density_reduction_hierarchy_polish_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Моджибейка/битой кириллицы в новых/измененных строках не обнаружено.
- Дополнительных исправлений encoding не потребовалось.

## Pre-report self-check against prompt

1. Reminders first view is less dense on mobile — **Fully satisfied (code-level)**
- Добавлены collapsible вторичные блоки и явный compact main action.
- Требуется подтверждение в живом Telegram UX-впечатлении.

2. Add/Edit flow is easier to scan — **Fully satisfied (code-level)**
- Базовые поля отделены от advanced options.

3. Existing reminder cards are easier to read — **Fully satisfied (code-level)**
- Карточки переведены в более короткую и сканируемую иерархию (chips + compact lines).

4. Secondary family/helper/status sections are less dominant — **Fully satisfied (code-level)**
- Вынесены в disclosure (details), operational блок свернут по умолчанию.

5. Mark paid / Undo paid still work — **Partially satisfied**
- По коду handlers и вызовы не изменялись.
- Нужна live-проверка в Telegram runtime.

6. who pays / paid by surfaces still work — **Partially satisfied**
- Отрисовка и расчеты сохранены.
- Нужна live-проверка на реальных семейных данных.

7. RU/EN localization still works on touched UI — **Partially satisfied**
- Добавлены нужные RU ключи, EN fallback сохранен.
- Нужна live-проверка переключения и фактических строк на деплое.

8. 4-tab shell still works as before — **Partially satisfied**
- Shell не менялся.
- Нужна короткая live smoke-проверка переключения табов в Telegram.

9. No unrelated feature scope added — **Fully satisfied**
- Изменения ограничены Reminders UX/иерархией и локальными строками.

## Короткое объяснение (по-простому)
В этом pass мы сделали Reminders легче на первом экране: добавили явное главное действие, свернули вторичные блоки, упростили форму через «основные поля + расширенные параметры» и сделали карточки платежей более читаемыми. Логику платежей и семейных сценариев не трогали.

## Чеклист ручной проверки
1. Открыть Reminders в Telegram и проверить, что первый экран стал заметно спокойнее.
2. Нажать `Open payment form` и убедиться, что форма открывается и прокручивается в видимую область.
3. Проверить Add/Edit: базовые поля видны сразу, `Advanced options` раскрываются и сохраняют доступ ко всем нужным параметрам.
4. Проверить карточки существующих платежей: данные читаются быстрее, важные статусы и действия на месте.
5. Проверить `Mark paid` и `Undo paid` на personal и family сценариях.
6. Проверить `Who pays` и `Paid by` в семейных карточках.
7. Проверить, что блок `Reminder operations and visibility` свернут по умолчанию и открывается вручную.
8. В RU режиме проверить новые строки Reminders на отсутствие RU/EN-смеси.
9. Переключить на EN и обратно на RU, обновить приложение, убедиться в сохранении языка.
10. Проверить, что Home/History/Profile и переключение 4 табов не регресснули.

## Git Bash команды
```bash
git status
git add src/components/app/recurring-payments-section.tsx src/components/app/profile-scenarios-placeholder.tsx src/lib/i18n/localization.tsx docs/phase12b_reminders_density_reduction_hierarchy_polish_report.md
git commit -m "phase12b: reduce reminders density and polish hierarchy"
git push origin main
```

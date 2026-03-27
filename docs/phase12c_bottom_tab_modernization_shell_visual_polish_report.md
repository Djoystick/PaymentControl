# Phase 12C — Bottom tab modernization + shell visual polish report

Модель: ChatGPT 5.3 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и актуальный статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты:
  - `docs/phase11a1_real_tab_navigation_fix_report.md`
  - `docs/phase11b_verification_debt_closure_ops_doc_sync_report.md`
  - `docs/phase11c_tab_content_simplification_progressive_disclosure_polish_report.md`
  - `docs/phase11d_empty_states_first_action_guidance_polish_report.md`
  - `docs/phase12a_ru_en_localization_foundation_language_switch_report.md`
  - `docs/phase12a1_ru_localization_cleanup_mixed_string_fix_report.md`
  - `docs/phase12b_reminders_density_reduction_hierarchy_polish_report.md`
- Статус-override из запроса принят: **Phase 12B — manual verified** (последний подтвержденный этап до 12C).

## Цель Phase 12C
Сделать shell-уровень визуально современнее и удобнее на мобильном:
- модернизировать нижний таб-бар,
- обеспечить комфортный fit длинных меток (включая RU `Напоминания`),
- улучшить ритм/целостность оболочки,
- не менять бизнес-логику и подтвержденные flow.

## Exact files changed
1. `src/components/app/app-shell.tsx`
2. `docs/phase12c_bottom_tab_modernization_shell_visual_polish_report.md`

## Что именно модернизировано в bottom tab bar
Статус: **Confirmed in code/report**

1. Визуальная модель табов обновлена:
- вместо старых простых pill-кнопок добавлен более современный tab-button с иконкой + подписью;
- активный таб получил более явный visual state (accent фон, бордер, мягкая тень);
- неактивные вкладки оставлены читаемыми, но менее доминирующими.

2. Повышен touch comfort:
- у каждой таб-кнопки выставлена комфортная минимальная высота (`min-h-14`);
- внутренние отступы и плотность перестроены под мобильный формат.

3. Улучшена читаемость labels:
- подпись вынесена отдельной строкой под иконку;
- для текста вкладок сохранен читаемый размер и вес (`text-[11px]`, `font-semibold`), без агрессивного уменьшения;
- уменьшены горизонтальные отступы контента shell, чтобы дать больше полезной ширины под длинные labels.

4. Без изменения архитектуры:
- по-прежнему строго 4 таба: `Home / Reminders / History / Profile`;
- логика переключения активного экрана и рендер only-active-screen не менялась.

## Как обработан RU/EN label fit
Статус: **Confirmed in code/report**, live UX требует ручного подтверждения

- Локализационные ключи и значения для табов не менялись.
- Fit улучшен через layout/spacing:
  - больше доступной ширины в shell на мобильном (`px-3` вместо прежнего плотного ритма);
  - более компактный контейнер таб-бара (`gap-1`, меньше внутренних паддингов);
  - подпись в выделенной нижней строке с центрированием.
- Подход не ломает EN и не вводит сокращения/обрезки пользовательских названий табов.

## Какой shell-level polish применен
Статус: **Confirmed in code/report**

1. Header surface polish:
- скорректированы радиус, бордер и тень шапки;
- шапка выглядит более целостно с обновленным таб-баром.

2. Rhythm polish:
- выровнены верхние внешние отступы контейнера (`pt`, `px`) под мобильный;
- слегка уплотнен вертикальный ритм между экранами (`space-y-2.5`) для более спокойного флоу.

3. Bottom shell surface polish:
- обновлены скругление, тень, прозрачность и blur у контейнера таб-бара;
- сохранена поддержка safe-area inset.

## Что намеренно НЕ менялось
- 4-tab архитектура и переходы между табами.
- Бизнес-логика всех доменов (payments/family/reminders/history/workspaces).
- RU/EN механизм локализации и persistence.
- Mark paid / Undo paid и связанная серверная логика.
- Premium/paywall и любые новые продуктовые фичи.
- Схема БД, миграции, API-контракты.

## Техническая проверка после изменений
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## Риски и follow-up notes
1. Основной риск этого pass — визуальная оценка субъективна, поэтому финальное принятие требует live проверки в Telegram на реальном мобильном экране.
2. Если на конкретных устройствах `Напоминания` все еще выглядит плотновато, безопасный follow-up: точечный micro-typography pass только для таб-подписей (без смены архитектуры/логики).

## Что still requires live manual verification
Статус: **Still requires live manual verification**
1. Фактическое визуальное восприятие модернизированного таб-бара на реальном телефоне (Telegram runtime).
2. Комфорт fit RU метки `Напоминания` без ощущения «зажатости».
3. Комфорт fit EN labels после деплоя.
4. Smoke regression всех ранее подтвержденных flow в живом runtime.

## Encoding safety check
Проверены файлы, затронутые в этом pass:
1. `src/components/app/app-shell.tsx`
2. `docs/phase12c_bottom_tab_modernization_shell_visual_polish_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Моджибейка/битой кириллицы в новых изменениях не обнаружено.
- Дополнительных исправлений encoding не потребовалось.

## Pre-report self-check against prompt

1. Bottom tab bar looks noticeably more modern — **Fully satisfied (code-level)**
- Новый визуальный стиль табов реализован (иконки, активное состояние, modern surface).

2. Long labels like `Напоминания` fit comfortably in Russian — **Partially satisfied**
- По коду доступная ширина и структура метки улучшены.
- Требуется финальная live-проверка на реальном мобильном Telegram runtime.

3. English labels also fit cleanly — **Partially satisfied**
- По коду EN fit обеспечен тем же новым layout.
- Требуется live-проверка на реальном экране.

4. 4-tab shell still works exactly as before — **Fully satisfied (code-level)**
- Навигационная логика и структура 4 табов не изменены.

5. Existing verified flows are preserved — **Partially satisfied**
- Бизнес-логика не тронута, изменение было только visual/shell.
- Нужен обязательный live smoke regression.

6. Shell-level spacing/visual rhythm is improved — **Fully satisfied (code-level)**
- Внесены ограниченные, но системные правки ритма и поверхностей.

7. No unrelated feature scope was added — **Fully satisfied**
- Pass строго ограничен shell-визуалом и мобильным UX.

## Короткое объяснение (простыми словами)
В 12C обновлен внешний вид оболочки: нижний таб-бар стал современнее, активные/неактивные состояния читаются лучше, а длинные подписи получили больше комфортного места. Логику приложения и рабочие сценарии не меняли.

## Чеклист ручной проверки
1. Открыть приложение в Telegram на телефоне и проверить новый внешний вид нижнего таб-бара.
2. Проверить, что `Напоминания` в RU не выглядит зажатым и читается комфортно.
3. Переключить язык на EN и проверить fit всех 4 меток.
4. Пройтись по всем 4 табам и убедиться, что переключение экрана работает как раньше.
5. На Reminders проверить `Mark paid` и `Undo paid`.
6. В family контексте проверить `Who pays` / `Paid by` surfaces.
7. В Profile проверить `Show onboarding again`, workspace/invite и сохранение языка после перезагрузки.
8. Проверить, что readiness/recent attempts/source visibility остались доступными.

## Git Bash команды
```bash
git status
git add src/components/app/app-shell.tsx docs/phase12c_bottom_tab_modernization_shell_visual_polish_report.md
git commit -m "phase12c: modernize bottom tabs and polish shell rhythm"
git push origin main
```

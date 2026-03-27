# Phase 12A.1 — RU localization cleanup and mixed-string fix

Модель: ChatGPT 5.3 Codex

## 1) Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитан предыдущий отчет: `docs/phase12a_ru_en_localization_foundation_language_switch_report.md`.
- Принят статус-override:
  - `Phase 11A.1` — manual verified
  - `Phase 11B` — manual verified
  - `Phase 11C` — manual verified
  - `Phase 11D` — manual verified
- `Phase 12A` признан рабочим по foundation, но не принят по качеству русской копии.

## 2) Root cause mixed-string проблемы (точно)
1. В RU-словаре часть значений была только частично русифицирована.
- Примеры: `workspace`, `Who pays`, `dispatch`, `readiness`, `onboarding`, `invite token` внутри русских фраз.

2. В `Reminders` подписи Quick Add шаблонов рендерились как `template.label` без локализации.
- В RU-режиме это давало английские названия кнопок шаблонов.

3. В `Reminders` тип активного пространства отображался как сырой `workspace.kind`.
- В RU-режиме это давало `personal/family` вместо русских обозначений.

## 3) Что изменено

### 3.1 RU-словарь очищен от смешанных RU/EN фрагментов
**Confirmed in code/report**
- Обновлены переводы в `src/lib/i18n/localization.tsx` для профильных/семейных/операционных/onboarding строк.
- Приведены к русскому виду проблемные группы:
  - `workspace`-связанные подписи,
  - `Who pays`-связанные подписи,
  - `dispatch/readiness` видимые подписи,
  - onboarding/profile пояснения,
  - invite/workspace системные сообщения.

### 3.2 Quick Add шаблоны в Reminders
**Confirmed in code/report**
- В `src/components/app/recurring-payments-section.tsx` подписи шаблонов изменены на `tr(template.label)`.
- В словарь добавлены RU-переводы для системных шаблонных ярлыков:
  - `Internet`, `Mobile`, `Rent`, `Utilities`, `Water`, `Electricity`, `Gym`, `Streaming`, `Loan`, `Insurance`.
- Сообщение о применении шаблона локализовано:
  - `Template "{template}" applied. Review and add payment.`

### 3.3 Тип пространства в Reminders
**Confirmed in code/report**
- Отображение `workspace.kind` заменено на локализованный `tr(workspace.kind)` в строке текущего пространства.

## 4) Exact files changed in 12A.1
- `src/lib/i18n/localization.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `docs/phase12a1_ru_localization_cleanup_mixed_string_fix_report.md`

## 5) Что именно по-русски дочищено
- Profile: сессия/dev fallback/onboarding notes/workspace-family-invite формулировки.
- Home: системные подсказки и общая RU-консистентность словаря сохранена.
- Reminders: `Who pays`-формулировки, `workspace`-формулировки, dispatch/readiness подписи, Quick Add шаблоны.
- History: `Who pays`/family activity подписи опираются на очищенные RU-строки словаря.
- Family/workspace: переводы в заголовках, ошибках и operational-сообщениях приведены к цельному русскому тексту.

## 6) Что намеренно НЕ менялось
- 4-tab shell архитектура.
- RU/EN механизм переключения и persistence логика.
- Бизнес-логика `Mark paid / Undo paid`, family flows, workspace/invite поведение.
- Backend/API/migrations.
- Пользовательские данные не переводились:
  - названия платежей,
  - имена,
  - токены,
  - пользовательские заметки,
  - произвольные значения из данных.

## 7) Проверки перед отчетом

### Confirmed in code/report
1. `npm run lint` — успешно.
2. `npm run build` — успешно.
3. Проверены и исправлены источники смешанных RU/EN строк (словарь + рендер шаблонов + `workspace.kind`).
4. Покрытие ключей `tr(...)` сохранено без пропусков (по локальной проверке).

### Still requires live manual verification
- Финальная визуальная приемка RU-режима в Telegram runtime.
- Проверка полного reopen и сохранения выбранного языка на реальном клиенте.

## 8) Encoding safety check
Проверены файлы с русским текстом, измененные в этом проходе:
- `src/lib/i18n/localization.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `docs/phase12a1_ru_localization_cleanup_mixed_string_fix_report.md`

Результат:
- UTF-8 читаемость сохранена.
- Моджибейк/битая кириллица в измененных файлах не обнаружены.
- Дополнительных правок по кодировке после проверки не потребовалось.

## 9) Pre-report self-check against prompt

### 9.1 Проверка цели
- Цель: убрать смешанные RU/EN интерфейсные строки в RU-режиме без расширения scope.
- Статус: **Fully satisfied (code/report), live UI приемка pending**.

### 9.2 Проверка strict scope
- Только cleanup локализационных строк и их источников: **Fully satisfied**.
- Без feature/design/backend расширения: **Fully satisfied**.

### 9.3 Проверка non-negotiable rules
1. Сохранить verified behavior (tabs/switch/persistence/flows): **Partially satisfied (code/build), live unverified**.
2. Не переводить user-generated data: **Fully satisfied**.
3. Narrow scope: **Fully satisfied**.
4. Maintainable fix (через словарь/источники рендера): **Fully satisfied**.

### 9.4 Проверка acceptance criteria (по пунктам)
1. RU-UI без очевидных mixed RU/EN интерфейсных лейблов: **Fully satisfied (code)**.
2. Profile RU-copy связная: **Fully satisfied (code)**.
3. History RU-copy связная: **Fully satisfied (code)**.
4. Home RU-copy связная: **Fully satisfied (code)**.
5. Reminders RU-copy связная: **Fully satisfied (code)**.
6. Family/workspace visible labels переведены последовательно: **Fully satisfied (code)**.
7. RU/EN switching работает: **Partially satisfied (code), live unverified**.
8. Persistence работает: **Partially satisfied (code), live reopen unverified**.
9. User-generated content не переводится ошибочно: **Fully satisfied (code)**.
10. Кодировка не повреждена: **Fully satisfied (checked in touched files)**.

## 10) Риски / follow-up
1. Часть технических значений из API может оставаться на языке источника (например diagnostic codes), это не UI-copy словаря.
2. Финальная приемка остается за live Telegram проверкой, особенно для реального reopen-поведения.

---

## Короткое объяснение
В 12A.1 исправлены причины смешанного RU/EN интерфейса: очищены проблемные RU-строки словаря и локализованы оставшиеся видимые точки в Reminders (включая Quick Add ярлыки и тип пространства). Логика приложения не менялась.

## Ручной чеклист
1. Включить `Русский` в `Profile`.
2. Проверить вкладки `Home / Reminders / History / Profile` на отсутствие смешанных RU/EN системных подписей.
3. В `Reminders` проверить:
   - строку текущего пространства,
   - подписи `Who pays/Кто платит` зон,
   - Quick Add шаблоны,
   - readiness/dispatch блоки.
4. В `Profile` проверить onboarding/replay/workspace/invite сообщения.
5. Переключить на `English` и обратно на `Русский`.
6. Сделать reload и reopen Mini App, убедиться, что язык сохраняется.
7. Проверить, что user-generated данные (названия платежей, имена, токены, заметки) не переводятся автоматически.

## Git Bash команды
```bash
git status
git add src/lib/i18n/localization.tsx src/components/app/recurring-payments-section.tsx docs/phase12a1_ru_localization_cleanup_mixed_string_fix_report.md
git commit -m "Phase 12A.1: clean RU mixed strings and localization mappings"
git push origin main
```

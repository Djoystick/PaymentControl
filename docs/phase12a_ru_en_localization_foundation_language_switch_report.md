# Phase 12A — RU/EN localization foundation + language switch

## 1) Контекст и актуальный статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты:
  - `docs/phase11a1_real_tab_navigation_fix_report.md`
  - `docs/phase11b_verification_debt_closure_ops_doc_sync_report.md`
  - `docs/phase11c_tab_content_simplification_progressive_disclosure_polish_report.md`
  - `docs/phase11d_empty_states_first_action_guidance_polish_report.md`
- Принят статус-override из запроса:
  - `Phase 11A.1` — manual verified
  - `Phase 11B` — manual verified
  - `Phase 11C` — manual verified
  - `Phase 11D` — manual verified
- Для этого прохода `Phase 11D` принят как последний подтвержденный этап до изменений 12A.

## 2) Цель Phase 12A
Сделать простую и поддерживаемую основу локализации RU/EN без изменения бизнес-логики:
- переключение языка в текущем UI,
- сохранение выбора языка после перезагрузки,
- перевод текущего видимого shell/tab UI,
- сохранение уже подтвержденных рабочих потоков.

## 3) Что изменено

### 3.1 Локализационная основа
**Confirmed in code/report**
- Добавлен новый слой локализации: `src/lib/i18n/localization.tsx`.
- Реализованы:
  - `LocalizationProvider`
  - `useLocalization()`
  - `tr(text, params?)` с простой подстановкой параметров (`{key}`)
  - тип языка `UiLanguage = "en" | "ru"`
- Добавлен единый RU-словарь для текущего видимого UI (shell + вкладки + empty/help/ops labels).
- Проверено покрытие ключей `tr(...)` в коде: пропусков не найдено.

### 3.2 Переключатель языка в UI
**Confirmed in code/report**
- Переключатель добавлен в `Profile` (в блоке `Session`):
  - кнопки `Русский` / `English`
  - активный язык визуально подсвечивается
- Точка входа выбрана компактная и без лишнего UI-шумa.

### 3.3 Персистентность выбора языка
**Confirmed in code/report**
- Язык сохраняется в `localStorage` ключом:
  - `payment_control_ui_language_v12a`
- Начальная инициализация:
  1. сначала читается сохраненный выбор из `localStorage`
  2. если выбора нет, используется `navigator.language` (`ru*` -> `ru`, иначе `en`)
- Выбор пользователя всегда приоритетнее браузерной подсказки после первого сохранения.

### 3.4 Где применен перевод в текущем UI
**Confirmed in code/report**
- Локализованы текущие экраны и видимые системные подписи:
  - `Home`
  - `Reminders`
  - `History`
  - `Profile`
- Переведены:
  - подписи табов и заголовки shell
  - onboarding/replay видимые элементы
  - empty-state тексты
  - кнопки и основные helper labels
  - operational/readiness/dispatch видимые лейблы в текущих секциях

## 4) Exact files changed
- `src/lib/i18n/localization.tsx` (новый файл)
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `docs/phase12a_ru_en_localization_foundation_language_switch_report.md`

## 5) Что намеренно НЕ менялось
- Архитектура 4-tab shell (`Home / Reminders / History / Profile`) не переделывалась.
- Бизнес-правила платежей/family/invite не менялись.
- Premium/paywall логика не трогалась.
- Миграции/схема БД не добавлялись.
- User-generated данные не переводятся автоматически:
  - названия платежей,
  - имена пользователей,
  - workspace titles,
  - invite token/raw пользовательские данные.

## 6) Что проверено перед отчетом

### Confirmed in code/report
1. `npm run lint` — успешно.
2. `npm run build` — успешно.
3. В коде есть реальный switch RU/EN в `Profile`.
4. В коде есть персистентность выбора языка через `localStorage`.
5. 4-tab shell и существующие рабочие действия не менялись по доменной логике.
6. Ключи `tr(...)` покрыты RU-словарем (по кодовой проверке без пропусков).

### Still requires live manual verification
- Проверка в Telegram runtime, что все ключевые видимые строки действительно переключаются RU/EN в реальном потоке пользователя.
- Проверка поведения после полного reopen Mini App (не только soft reload).
- Финальная UX-проверка на мобильных устройствах (плотность текста и читаемость после перевода).

## 7) Риски / follow-up
1. Некоторые backend/server error messages приходят динамически и могут оставаться на языке источника (это не перевод user-generated/domain payload).
2. Перевод сейчас словарный и целевой для текущего UI; при добавлении новых экранов нужно продолжать использовать `tr(...)` централизованно.
3. Нужен обязательный live smoke-check после деплоя, чтобы подтвердить финальное поведение в Telegram окружении.

## 8) Pre-report self-check against prompt

### 8.1 Проверка цели
- RU/EN foundation + switch + persistence без feature creep.
- Статус: **Fully satisfied (code/report), live verification pending**.

### 8.2 Проверка strict scope
- Добавлена локализационная основа: **Fully satisfied**.
- Добавлен user-facing switch в Profile: **Fully satisfied**.
- Персистентность выбора: **Fully satisfied**.
- Без premium/split/debts/analytics scope: **Fully satisfied**.

### 8.3 Проверка non-negotiable rules
1. Сохранить verified behavior (tabs, mark paid/undo, family/invite, onboarding replay): **Partially satisfied (code/build), live unverified**.
2. Без ненужного расширения scope: **Fully satisfied**.
3. Поддерживаемая структура (не ad-hoc): **Fully satisfied**.
4. Без миграций: **Fully satisfied**.
5. Не переводить user-generated content: **Fully satisfied**.

### 8.4 Проверка acceptance criteria (по пунктам)
1. UI переключается между RU и EN: **Fully satisfied (code)**.
2. Переключатель достижим из текущего UI: **Fully satisfied (code)**.
3. Выбор языка сохраняется после reload/reopen: **Partially satisfied (code), live reopen unverified**.
4. Текущий shell/tab user-visible copy переведен в двух языках: **Fully satisfied (code/report)**.
5. User-generated content не переводится автоматически: **Fully satisfied**.
6. 4-tab shell работает как раньше: **Partially satisfied (code/build), live unverified**.
7. Ранее подтвержденные потоки сохранены: **Partially satisfied (code/build), live unverified**.
8. Unrelated feature scope не добавлен: **Fully satisfied**.

## 9) Итоговый статус Phase 12A
- Технический статус: **готово к live-проверке**.
- Верификационный статус: **partially verified**.
- Причина: код/сборка подтверждены, но финальная приемка должна быть в live Telegram runtime.

---

## Короткое объяснение
В 12A добавлена базовая инфраструктура локализации RU/EN, переключатель языка в Profile и сохранение выбора языка между сессиями. Логика платежей/семьи/навигации не расширялась и не менялась по бизнес-правилам.

## Ручной чеклист
1. Открыть Mini App в Telegram.
2. Перейти в `Profile` и переключить язык на `Русский`.
3. Проверить, что на всех вкладках (`Home`, `Reminders`, `History`, `Profile`) видимые системные подписи/кнопки/empty-state поменялись на RU.
4. Переключить на `English` и повторно проверить те же экраны.
5. Сделать reload и reopen Mini App, убедиться, что выбранный язык сохранился.
6. Проверить, что user-generated названия платежей и имена не переводятся автоматически.
7. Проверить критичные потоки:
   - `Mark paid` / `Undo paid`
   - family shared recurring + who pays / paid by
   - workspace / invite
   - `Show onboarding again`
8. Проверить, что 4-tab навигация осталась рабочей и без regressions.

## Git Bash команды (commit / push / deploy)
```bash
git status

git add src/lib/i18n/localization.tsx \
  src/components/app/app-shell.tsx \
  src/components/app/landing-screen.tsx \
  src/components/app/payments-dashboard-section.tsx \
  src/components/app/payments-activity-section.tsx \
  src/components/app/reminder-candidates-section.tsx \
  src/components/app/recurring-payments-section.tsx \
  src/components/app/profile-scenarios-placeholder.tsx \
  docs/phase12a_ru_en_localization_foundation_language_switch_report.md

git commit -m "Phase 12A: add RU/EN localization foundation and language switch"
git push origin <your-branch>

# deploy (пример)
vercel --prod
```

# Phase 10C — First-run onboarding & progressive disclosure foundation

## 1) Что изменено

### A. Добавлен first-run onboarding (простой, локальный, без новой архитектуры)
- В `AppShell` добавлен минимальный onboarding-оверлей с пошаговыми подсказками.
- Onboarding показывается только при первом запуске (через `localStorage`):
  - ключ: `payment_control_onboarding_v10c_done`
- Сценарий onboarding:
  1. Короткое объяснение Home
  2. Короткое объяснение recurring-действий
  3. Короткое объяснение Activity
  4. Короткое объяснение Profile
- Управление:
  - `Next`
  - `Back`
  - `Skip`
  - `Finish`
- При шагах onboarding экран мягко скроллится к соответствующей зоне (`home/activity/profile`) через уже существующий tab-target механизм.

### B. Progressive disclosure: уменьшен постоянный вспомогательный текст
- Идея pass: вторичный explanatory copy меньше виден постоянно, но остается доступным по требованию.
- Изменения:
  - Dashboard: упрощен intro-блок, убран лишний постоянный поясняющий абзац.
  - Activity: упрощен intro, оставлены короткие полезные counters.
  - Reminder (family): сокращен intro-copy, оставлена только ключевая подсказка.
  - Recurring:
    - family explanatory block переведен в `details` (help по требованию);
    - убран лишний постоянный абзац под Quick Add;
    - ранее добавленные `Subscription insights` остаются в свернутом блоке.
  - Profile:
    - убраны некоторые постоянные explanatory абзацы (workspace switch / family invite);
    - базовая функциональность и важные действия сохранены.

### C. Визуальная консистентность фазы
- В основных секциях обновлены phase badges на `Phase 10C`.

## 2) Точные файлы, которые изменены
- `src/components/app/app-shell.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`

## 3) Подтверждение по миграциям
- Миграции не добавлялись.
- База данных и backend/domain не менялись.

## 4) Риски и ограничения
- Onboarding хранится в `localStorage`, поэтому:
  - при очистке данных браузера/вебвью onboarding может показаться снова;
  - на другом устройстве/профиле onboarding показывается отдельно (что ожидаемо для UI-first onboarding).
- Onboarding intentionally легкий:
  - без сложного engine,
  - без таргет-подсветки каждого DOM-элемента,
  - без серверного состояния.
- Поведение кросс-профильного real-time sync не расширялось (и не требовалось в scope).

## 5) Техническая проверка в этом pass
- Выполнен `npm run lint` — успешно, ошибок нет.

## 6) Manual test checklist
1. Открыть Mini App в Telegram на телефоне.
2. Убедиться, что при первом входе показывается onboarding-оверлей.
3. Пройти шаги `Next/Back` и проверить, что переходы логичны.
4. Проверить `Skip` и `Finish`:
   - onboarding закрывается корректно,
   - при повторном открытии сразу не показывается.
5. Проверить, что на основном экране меньше постоянного explanatory текста.
6. Проверить, что ключевая информация на recurring cards видна:
   - payment name
   - amount
   - current cycle/state
   - who pays
   - paid by
   - economics hint
7. Проверить, что `Mark paid / Undo paid` продолжают работать.
8. Проверить, что `Archive` и `Pause/Resume` остаются disabled там, где это задумано.
9. Проверить, что workspace switch / invite UI продолжают работать без регрессий.

## 7) Финальный статус
not confirmed


# Phase 10C.1 — Recurring card text fix + onboarding replay/reset

## 1. Scope
- Узкий UI-only bugfix pass.
- Без миграций БД.
- Без backend/domain изменений.
- Без изменения бизнес-правил по платежам и доступности действий.

## 2. Что было изменено

### 2.1 Fix: broken recurring card text/layout on mobile
- Проблема: на мобильном экране текст карточки recurring мог сжиматься из-за соседней колонки кнопок, что визуально ломало чтение.
- Решение:
  - карточка переведена в mobile-first раскладку:
    - на mobile: вертикальный поток (контент сверху, кнопки ниже);
    - на `sm+`: прежняя двухколоночная логика.
  - это устраняет «ломаные» переносы и делает текст снова компактным и читаемым.
- Важные поля остались видимыми на карточке:
  - payment name
  - amount
  - frequency/due
  - current cycle/status
  - who pays
  - paid by
  - economics hint
  - reminder status

### 2.2 Fix: onboarding replay/reset path for existing user
- Проблема: onboarding показывался только для first-run, у уже существующего пользователя не было безопасного UI-пути повторного показа.
- Решение:
  - добавлен локальный replay-триггер через событие `payment-control-replay-onboarding` в `AppShell`;
  - добавлена кнопка `Show onboarding again` в Profile (Session block), которая запускает onboarding заново без ручной очистки storage.
- First-run поведение сохранено (через `localStorage` ключ `payment_control_onboarding_v10c_done`).

## 3. Точные файлы, которые изменены
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`

## 4. Подтверждение по миграциям
- Миграции не добавлялись.
- Изменений схемы БД нет.

## 5. Риски и ограничения
- Replay onboarding — локальная UI-функция (через `window` event + local state), без серверного состояния.
- Onboarding не стал «heavy tutorial engine»: это осознанно простой и локальный путь.
- Кросс-профильный realtime sync в scope не входил и не менялся.

## 6. Manual test checklist
1. Открыть Mini App в Telegram на телефоне.
2. Проверить recurring card:
   - текст читается нормально;
   - нет «сломанного» вертикального переноса по одному слову.
3. Проверить, что основные поля карточки видны и читаемы:
   - amount / due / status / who pays / paid by / economics hint / reminders.
4. В Profile нажать `Show onboarding again`.
5. Убедиться, что onboarding действительно стартует заново.
6. Пройти onboarding (`Next/Back/Finish`) и проверить корректное закрытие.
7. Проверить core flow:
   - `Mark paid` / `Undo paid` работают.
8. Проверить, что `Archive` и `Pause/Resume` остаются disabled там, где задумано.
9. Проверить, что workspace switch и invite/join UI работают как раньше.

## 7. Финальный статус
not confirmed


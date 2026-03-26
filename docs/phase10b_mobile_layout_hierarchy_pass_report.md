# Phase 10B — Mobile-first layout simplification & information hierarchy pass

## 1. Scope
- Pass выполнен строго как UI-only.
- Backend/domain поведение не менялось.
- Правила действий (`Mark paid/Undo paid`, `Archive`, `Pause/Resume`, workspace/invite/switch) не менялись.
- Миграции БД не добавлялись.

## 2. Что было изменено

### 2.1 Home: уменьшение эффекта «очень длинного листа»
- В `LandingScreen` укорочен верхний блок:
  - обновлен заголовок/подпись на более нейтральные;
  - длинный список foundation steps перенесен в компактный `details` (по умолчанию свернут).
- Блок `Bootstrap status` немного уплотнен по вертикальным отступам.

### 2.2 Общая мобильная плотность
- В основных секциях уменьшен внутренний padding (`p-4` -> `p-3`) для более компактного мобильного ритма:
  - Dashboard
  - Activity
  - Reminder
  - Recurring
  - Profile
- В `AppShell` уменьшен вертикальный gap между секциями (`space-y-4` -> `space-y-3`).

### 2.3 Улучшение иерархии блоков на Home
- В `ProfileScenariosPlaceholder` изменен порядок рендера для более практичного mobile flow:
  1) Dashboard  
  2) Reminder  
  3) Recurring  
  4) Activity  
  5) Profile
- Это делает Home более «задачно-ориентированным» сверху и уводит profile-management ниже, не ломая навигационные якоря.

### 2.4 Упрощение второстепенной информации (без потери доступа)
- В `Profile`:
  - `Accept invite diagnostic` перенесен в `details` (по умолчанию свернут).
  - `Scenario cards` перенесены в `details` (по умолчанию свернут).
- В `Recurring`:
  - блоки подписочной аналитики (`Subscriptions Summary`, `Health`, `Renewals`, `Cost Pressure`, `Paused`) сгруппированы в один `details` раздел `Subscription insights` (по умолчанию свернут).
  - Основной рабочий flow создания/редактирования/карточек платежей остается сразу видимым.

### 2.5 Визуальная согласованность фазы
- Обновлены badges на `Phase 10B` в секциях:
  - Dashboard
  - Activity
  - Reminder
  - Recurring
  - Profile

## 3. Точные файлы, которые изменены
- `src/components/app/landing-screen.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`

## 4. Подтверждение по миграциям
- Миграции отсутствуют.
- Изменений в `supabase/migrations/*` нет.

## 5. Что проверено технически в этом pass
- Локально выполнен `npm run lint` — успешно, ошибок нет.

## 6. Риски и ограничения
- Использован `details/summary` для сжатия второстепенных блоков. Это безопасно, но фактический UX нужно подтвердить в Telegram mobile runtime.
- Порядок секций на Home изменен для лучшей мобильной сканируемости; функционально это не должно ломать сценарии, но нужна живая ручная проверка ощущения и скорости навигации.
- Этот pass не добавляет новые feature-механики и не меняет бизнес-правила.

## 7. Manual test checklist
1. Открыть Mini App в Telegram на телефоне.
2. Проверить, что Home визуально стал компактнее и быстрее сканируется.
3. Проверить, что главные рабочие секции (Dashboard/Reminder/Recurring) читаются раньше и проще.
4. Проверить, что `Subscription insights` можно раскрыть и данные внутри на месте.
5. Проверить, что `Scenario cards` и `Accept invite diagnostic` доступны через раскрытие и не мешают основному экрану.
6. Проверить, что `Mark paid` / `Undo paid` продолжают работать.
7. Проверить, что family context остается понятным (`Who pays`, `Paid by`, economics hint).
8. Проверить, что `Archive` и `Pause/Resume` остаются отключенными там, где это было задумано.
9. Проверить, что `Profile` и workspace/invite действия работают как раньше.

## 8. Финальный статус
not confirmed


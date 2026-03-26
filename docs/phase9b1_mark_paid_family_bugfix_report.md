# Phase 9B.1 — Fix disabled Mark paid for family shared recurring in live runtime

## 1. Scope
Это ультра-узкий bugfix pass поверх 9B.

Цель: починить только один баг — в family workspace на shared recurring карточке `Mark paid / Undo paid` оставался disabled в живом runtime, хотя в 9B это должно было быть рабочим сценарием.

Что намеренно не трогалось:
- `Archive` (остается disabled в family);
- `Pause/Resume` (остается disabled в family);
- invite/join логика;
- новые family economics функции;
- backend/domain рефакторинг;
- миграции.

## 2. Root cause
Root cause был в UI-правиле disabled для `Mark paid / Undo paid`:
- правило было общим и не задавало явный family shared intent;
- в family runtime это могло оставлять кнопку disabled в поддерживаемом shared-кейсе.

Ключевая проблема: не было отдельного явного predicate для family shared действия, и доступность действия определялась только общими флагами.

## 3. Что исправлено
В `RecurringPaymentsSection` добавлен узкий helper `isCycleToggleDisabled(...)` с явной семантикой:

1. Всегда disabled, если:
- идет сохранение (`isSaving`), или
- payment archived.

2. Для family workspace:
- action разрешен только для `paymentScope = shared`;
- family shared item больше не блокируется неявным общим условием.

3. Для personal workspace:
- сохранена старая логика (например, paused subscription остается disabled для cycle toggle).

Также badge секции обновлен до `Phase 9B.1`.

## 4. Нужна ли миграция
Нет, миграция не нужна и не добавлялась.

## 5. Точные файлы, измененные в этом pass
- `src/components/app/recurring-payments-section.tsx`

## 6. Риски и ограничения
1. Это UI-gating bugfix, не расширение доменной логики.
2. `Archive` и `Pause/Resume` в family по-прежнему disabled по дизайну.
3. Family economics/split/debts не добавлялись.
4. Ручная live-проверка в Telegram вторым профилем в рамках Codex не выполнялась — нужна ручная проверка по чеклисту ниже.

## 7. Manual test checklist (live runtime)

### A. Profile A (создатель shared recurring)
1. Открыть family workspace.
2. Открыть shared recurring item с `currentCycle.state = unpaid`.
3. Проверить, что `Mark paid` теперь активна (не disabled).
4. Нажать `Mark paid`.
5. Убедиться, что карточка показывает `Current cycle: paid`.

### B. Profile B (второй участник household)
1. Переключиться в тот же family workspace.
2. Нажать `Refresh` в recurring section.
3. Убедиться, что тот же shared item виден с paid state.

### C. Undo
1. На одном из профилей нажать `Undo paid`.
2. Проверить переход обратно в unpaid.
3. Проверить согласованность состояния на втором профиле после refresh.

### D. Guardrails
1. Проверить, что `Archive` в family остается disabled.
2. Проверить, что `Pause/Resume` в family остается disabled.

## 8. Техническая проверка в этом pass
Выполнено локально:
- `npm run lint` — успешно.
- `node --test src/lib/payments/validation.test.ts` — успешно.

## 9. Финальный статус
partially verified

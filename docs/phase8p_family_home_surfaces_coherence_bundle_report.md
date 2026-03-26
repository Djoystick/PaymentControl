# Phase 8P — Family home surfaces coherence bundle

## 1. Scope
В этом pass выполнен локальный coherence bundle для Home family-секций:
- Dashboard
- Reminder visibility
- Activity

Цель: сделать family Home более цельным по текстам, пустым состояниям и refresh-кнопкам, без новых backend/domain систем.

## 2. What was implemented
1. Нормализован family wording на Home:
- `Dashboard`: “Read-only home overview for shared payments in the current family workspace.”
- `Reminder`: “Read-only reminder visibility for shared payments in the current family workspace.”
- `Activity`: “Read-only recent activity for shared payments in the current family workspace.”

2. Приведены к единому стилю refresh-контролы family секций:
- `Refresh family overview`
- `Refresh family reminders`
- `Refresh family activity`

3. Согласованы family empty/early states:
- в Dashboard при `shared payments = 0`: единый стартовый смысл “No shared payments yet in this family workspace…”
- в Reminder: согласованная подача для `shared = 0` и `reminders off`
- в Activity: пустое состояние не выглядит как ошибка и не спорит с Dashboard/Reminder.

4. Улучшена ясность family context на Home:
- во всех трёх секциях явно, но коротко зафиксировано, что данные относятся к текущему family workspace и shared payments.

5. Personal контекст не расширялся:
- personal wording и personal flow в Dashboard/Reminder/Activity сохранены.

## 3. What was intentionally NOT implemented
- новый dashboard subsystem;
- новый reminder subsystem;
- новый audit/history engine;
- migrations;
- API changes;
- invite/member/business logic expansions.

## 4. Exact files created/modified
### Modified
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/payments-activity-section.tsx`

### Created
- `docs/phase8p_family_home_surfaces_coherence_bundle_report.md`

## 5. Manual verification steps
1. Переключиться в family workspace и проверить:
- согласованный wording в Dashboard/Reminder/Activity;
- согласованные названия refresh-кнопок.

2. Проверить early/empty states в family:
- shared payments = 0;
- reminders off на shared payments;
- отсутствие recent activity.

3. Переключиться в personal workspace и проверить:
- personal тексты и поведение не получили family wording leaks.

## 6. Known limitations
- Это UI coherence pass, не новый функциональный family subsystem.
- Family reminder dispatch parity и полноценный history/audit trail по-прежнему не реализуются в этом pass.

## 7. Runtime confirmation status
Подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Не подтверждено вручную в этом pass:
- ручная runtime-проверка UI в браузере/Telegram после 8P изменений.

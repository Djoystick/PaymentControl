# Phase 11C — Tab content simplification + progressive disclosure polish

## 1) Контекст и актуальный статус
- Канонический anchor прочитан: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты:
  - `docs/phase11a1_real_tab_navigation_fix_report.md`
  - `docs/phase11b_verification_debt_closure_ops_doc_sync_report.md`
- Статус-override из запроса принят:
  - `Phase 11A.1` — manual verified
  - `Phase 11B` — manual verified
  - 4-tab shell (`Home / Reminders / History / Profile`) уже принят и не перерабатывается.

## 2) Цель Phase 11C
Сделать текущие 4 таба заметно легче и чище по восприятию на мобильном экране:
- меньше постоянного вторичного текста,
- лучше иерархия,
- больше progressive disclosure,
- без изменения бизнес-логики.

## 3) Что изменено

### 3.1 Home (компактность и calm first view)
**Что изменено**
- `LandingScreen` упрощен до короткого `Today snapshot` блока.
- Вторичный runtime-блок (Telegram/Supabase/Stage) свернут в `details`.
- Удалена лишняя постоянная поясняющая нагрузка в первом экране.

**Эффект**
- Home стал короче и более summary-first.
- Runtime-техдетали остаются доступными, но не перегружают первый экран.

### 3.2 Reminders (операционный фокус и меньше визуального шума)
**Что изменено**
- В `RecurringPaymentsSection`:
  - семейные вспомогательные блоки частично свернуты (`details`),
  - форма `Add/Edit payment` сделана сворачиваемой (авто-раскрытие при `editingPaymentId`),
  - в карточках платежей вторичные тексты (reminder settings/notes) перенесены в `details`,
  - убран лишний always-visible текст (`Personal payment` строка и часть дублирующих пояснений).
- В `ReminderCandidatesSection`:
  - readiness оставлен в первом уровне как короткий статус,
  - детальные diagnostics + scheduled observation перенесены в `details`,
  - onboarding help и binding verification перенесены в `details`,
  - recent attempts/last operation blocks свернуты (видимы по запросу),
  - кнопочный ряд сделан `flex-wrap` для мобильной устойчивости.

**Что важно сохранено**
- `Mark paid / Undo paid` путь не менялся.
- `who pays / paid by` surfaces не удалены.
- `readiness / recent attempts / source visibility` из 11B сохранены (теперь через progressive disclosure).

### 3.3 History (читаемость и группировка)
**Что изменено**
- Упрощен верхний summary: короткие счетчики вместо длинных поясняющих строк.
- Семейный контекст (who-pays/mismatch) вынесен в сворачиваемый блок.
- Элементы activity стали более сканируемыми:
  - бейдж типа события,
  - время справа,
  - компактная основная строка,
  - сокращенный family-контекст.

**Эффект**
- История читается быстрее, меньше «стены текста».

### 3.4 Profile (фокус на workspace/settings/help)
**Что изменено**
- Уточнен и укорочен copy в workspace/profile блоках.
- Сохранены:
  - `Show onboarding again`,
  - `Onboarding verification notes` (из 11B),
  - workspace/invite flows.
- Сценарные карточки оставлены в `details` без усиления веса в первом экране.
- Удален лишний дублирующий explanatory footer-текст.

### 3.5 Stage label sync
- Phase-бейджи в tab-компонентах подняты до `Phase 11C`.

## 4) Exact files changed
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `docs/phase11c_tab_content_simplification_progressive_disclosure_polish_report.md`

## 5) Что намеренно НЕ менялось
- Навигационный 4-tab shell (архитектура переключения экранов).
- Бизнес-логика payments/reminders/family.
- Premium/paywall логика.
- Split/debts/balances/split-bills слой.
- Analytics/reporting wave.
- Миграции/схема БД.
- API/domain протоколы напоминаний.

## 6) Что улучшено по табам (краткая матрица)
- Home: компактнее первый экран, runtime спрятан в `details`.
- Reminders: более операционный фокус, шум уменьшен, вторичные блоки свернуты.
- History: более чистые activity-карточки и summary.
- Profile: фокус на workspace/account/help, меньше постоянного вторичного текста.

## 7) Техническая проверка
**Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.
- По коду сохранены ключевые ранее подтвержденные paths:
  - `Mark paid / Undo paid`
  - family shared recurring surfaces
  - `who pays / paid by`
  - workspace/invite
  - `Show onboarding again`
  - onboarding verification notes
  - readiness/recent attempts/source visibility (11B)

**Still requires live manual verification**
- Финальная UX-оценка в Telegram runtime на мобильном экране после deploy.
- Подтверждение, что визуально «calmer and clearer» достигнуто в реальном использовании.

## 8) Риски / follow-up notes
1. Часть operational блоков перенесена в `details`; это снижает шум, но требует явного раскрытия при диагностике.
2. `RecurringPaymentsSection` все еще функционально насыщен; в будущем можно отдельным pass разделить “операционный список” и “управление формой” сильнее, если потребуется.
3. Live UX-эффект (особенно на разных устройствах) нужно подтвердить ручной Telegram-проверкой.

## 9) Pre-report self-check against prompt

### 9.1 Проверка против цели
- Цель: сделать контент внутри табов легче/чище без feature creep.
- Статус: **Fully satisfied (code/report), live UX pending**.

### 9.2 Проверка против strict scope
- Home: сделан более компактным и summary-first.
- Reminders: сохранен как основной рабочий экран, уменьшен шум.
- History: улучшена сканируемость и группировка.
- Profile: оставлен как workspace/settings/help, вторичный текст сокращен.
- Без premium/split/debts/analytics feature expansion.
- Статус: **Fully satisfied**.

### 9.3 Проверка against non-negotiable rules
1. Сохранить verified behavior — **Partially satisfied (code/build), live unverified**.
2. Без нового business scope — **Fully satisfied**.
3. UI/UX focus, без schema churn — **Fully satisfied**.
4. Progressive disclosure — **Fully satisfied**.
5. Mobile-first cleanliness — **Partially satisfied (code intent), live UX unverified**.

### 9.4 Проверка acceptance criteria (1-by-1)
1. Home заметно компактнее и summary-first — **Fully satisfied**.
2. Reminders легче сканируется как operational tab — **Fully satisfied**.
3. History чище и легче читается — **Fully satisfied**.
4. Profile более сфокусирован на workspace/settings/help — **Fully satisfied**.
5. Secondary text уменьшен/деэмфазирован — **Fully satisfied**.
6. 4-tab shell работает как раньше — **Partially satisfied (code), live unverified**.
7. Existing verified flows сохранены — **Partially satisfied (code/build), live unverified**.
8. Unrelated feature scope не добавлен — **Fully satisfied**.

## 10) Итоговый статус Phase 11C
- Технический статус: **готово к live-проверке**.
- Верификационный статус: **partially verified**.
- Причина: в Codex-среде подтверждены код/сборка/границы scope; финальное подтверждение UX и flow-поведения — только в live Telegram runtime.

---

## Короткое объяснение
В 11C сделана именно UX/content-полировка: меньше постоянного текста, больше сворачиваемых вторичных блоков, чище структура внутри Home/Reminders/History/Profile. Бизнес-логика и 4-tab shell не менялись.

## Ручной чеклист
1. Открыть Telegram Mini App и пройти табы `Home / Reminders / History / Profile`.
2. Проверить, что Home стал короче и первый экран спокойнее.
3. В Reminders проверить, что основной список/действия читаются быстрее, а вторичные блоки доступны через `details`.
4. Проверить `Mark paid / Undo paid` на Reminders.
5. Проверить family shared surfaces и `who pays / paid by`.
6. Проверить, что readiness/recent attempts/source visibility доступны и читаемы (с учетом `details`).
7. В History проверить компактные карточки событий и корректность времени/контекста.
8. В Profile проверить `Show onboarding again`, onboarding verification notes, workspace/invite flows.
9. Проверить, что shell остается true 4-tab switching (без anchor-scroll поведения).

## Git Bash команды (commit / push / deploy)
```bash
git status

git add src/components/app/app-shell.tsx \
  src/components/app/landing-screen.tsx \
  src/components/app/payments-dashboard-section.tsx \
  src/components/app/reminder-candidates-section.tsx \
  src/components/app/recurring-payments-section.tsx \
  src/components/app/payments-activity-section.tsx \
  src/components/app/profile-scenarios-placeholder.tsx \
  docs/phase11c_tab_content_simplification_progressive_disclosure_polish_report.md

git commit -m "Phase 11C: simplify tab content and strengthen progressive disclosure"
git push origin <your-branch>

# deploy (пример)
vercel --prod
```

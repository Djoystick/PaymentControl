# Phase 11D — Empty states + first-action guidance polish

## 1) Контекст и актуальный статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты:
  - `docs/phase11a1_real_tab_navigation_fix_report.md`
  - `docs/phase11b_verification_debt_closure_ops_doc_sync_report.md`
  - `docs/phase11c_tab_content_simplification_progressive_disclosure_polish_report.md`
- Принят статус-override из запроса:
  - `Phase 11A.1` — manual verified
  - `Phase 11B` — manual verified
  - `Phase 11C` — manual verified
- Для этого прохода `Phase 11C` принят как последний подтвержденный этап до изменений 11D.

## 2) Цель Phase 11D
Снизить friction первого использования без расширения бизнес-логики:
- сделать empty/low-data состояния более понятными,
- сделать первый шаг очевидным,
- сохранить минимализм и mobile-first,
- не ломать уже подтвержденные потоки.

## 3) Что изменено

### 3.1 Home
**Confirmed in code/report**
- `LandingScreen` получил более явную стартовую подсказку:
  - короткий смысл экрана,
  - явный next step: открыть `Reminders` и добавить первый платеж.
- `PaymentsDashboardSection` (compact) теперь показывает отдельный empty-state блок `No payments yet` при отсутствии активных платежей.
- В compact dashboard скрыт вторичный блок `Due now details`, когда активных платежей еще нет (меньше визуального шума в first-use).

### 3.2 Reminders
**Confirmed in code/report**
- В `RecurringPaymentsSection` добавлен явный empty-state блок с first-action guidance и кнопкой `Open add payment form`.
- Форма `Add payment` стала проще для first-use:
  - добавлен локальный state раскрытия формы,
  - форма автоматически доступна на пустом состоянии,
  - кнопка из empty-state явно ведет к первому действию.
- Блок `Subscription insights` теперь показывается только когда платежи уже есть (`payments.length > 0`), чтобы новый пользователь не видел лишний массив метрик.
- Фильтр `Show subscriptions only` скрыт, пока платежей нет.
- Кнопки внизу формы сделаны `flex-wrap` для мобильной устойчивости.
- В `ReminderCandidatesSection` добавлен personal empty-state `No reminders yet` с коротким пояснением, что сначала нужно добавить recurring payment выше.
- Текст `No reminder candidates in current pass` заменен на более прямой `No reminder candidates right now`.

### 3.3 History
**Confirmed in code/report**
- В `PaymentsActivitySection` заголовок таба приведен к `History`.
- Пустые состояния переписаны как guidance:
  - `History is empty` + короткое объяснение первого шага,
  - `No recent updates yet` + подсказка про `Mark paid`/редактирование в Reminders.

### 3.4 Profile
**Confirmed in code/report**
- В `Profile` добавлен компактный блок `Quick start` с первым шагом.
- Для personal-пользователя блок семейных действий де-эмфазирован:
  - `Family next step` свернут в `details` как `Family workspace (optional)`.
  - create/join flows сохранены, но не перегружают первый экран.
- `Show onboarding again` и `Onboarding verification notes` сохранены.

### 3.5 Stage label sync
**Confirmed in code/report**
- Бейджи обновлены до `Phase 11D` в измененных таб-компонентах.

## 4) Exact files changed
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `docs/phase11d_empty_states_first_action_guidance_polish_report.md`

## 5) Что намеренно НЕ менялось
- Архитектура 4-tab shell (`Home / Reminders / History / Profile`).
- Domain/API логика платежей и family economics.
- Логика `Mark paid / Undo paid`.
- Workspace/invite бизнес-правила.
- Premium/paywall.
- Split/debts/balances/analytics/реферальные механики.
- Миграции и schema changes.

## 6) Что проверено перед отчетом

### Confirmed in code/report
1. `npm run lint` — успешно.
2. `npm run build` — успешно.
3. По коду сохранены ключевые потоки:
   - true 4-tab переключение,
   - `Mark paid / Undo paid`,
   - family shared recurring surfaces,
   - who pays / paid by surfaces,
   - workspace / invite area,
   - `Show onboarding again`,
   - operational visibility из 11B (`readiness`, `recent attempts`, `source`, scheduled snapshot).

### Still requires live manual verification
- Финальная UX-оценка в живом Telegram runtime (первое впечатление и читаемость на мобильных устройствах).
- Финальное подтверждение, что измененные empty states не ухудшили реальные сценарии пользователя.

## 7) Риски / follow-up
1. Часть сложных блоков в Reminders сохранена (по scope), поэтому следующий безопасный шаг — отдельный узкий pass по дополнительному упрощению только при необходимости после live-фидбека.
2. `Family workspace (optional)` теперь свернут по умолчанию; это снижает шум, но требует явного раскрытия для family-онбординга.
3. Нужен live Telegram smoke-check после deploy, чтобы подтвердить UX-эффект на реальных устройствах.

## 8) Pre-report self-check against prompt

### 8.1 Проверка против цели
- Цель: улучшить first-use ясность и empty states без feature creep.
- Статус: **Fully satisfied (code/report), live UX unverified**.

### 8.2 Проверка strict scope
- Home: улучшен empty/low-data first view — **Fully satisfied**.
- Reminders: добавлен явный first-action guidance без изменения бизнес-правил — **Fully satisfied**.
- History: пустые состояния сделаны понятнее — **Fully satisfied**.
- Profile: снижена перегрузка для нового пользователя через де-эмфазирование optional family-блока — **Fully satisfied**.
- Без premium/split/debts/analytics scope — **Fully satisfied**.

### 8.3 Проверка non-negotiable rules
1. Сохранить verified behavior — **Partially satisfied (code/build), live unverified**.
2. Без нового business scope — **Fully satisfied**.
3. Только usability/UI pass, без schema churn — **Fully satisfied**.
4. Progressive disclosure — **Fully satisfied**.
5. Mobile-first — **Partially satisfied (code intent), live unverified**.

### 8.4 Проверка acceptance criteria (по пунктам)
1. Empty/low-data Home стал понятнее и более intentional — **Fully satisfied**.
2. Empty/low-data Reminders делает первый шаг очевиднее — **Fully satisfied**.
3. Empty/low-data History стал чище и понятнее — **Fully satisfied**.
4. Profile стал менее пугающим для нового пользователя — **Fully satisfied**.
5. Guidance короткий и контекстный, без wall-of-text — **Fully satisfied**.
6. 4-tab shell работает как прежде — **Partially satisfied (code), live unverified**.
7. Ранее verified flows сохранены — **Partially satisfied (code/build), live unverified**.
8. Unrelated feature scope не добавлен — **Fully satisfied**.

## 9) Итоговый статус Phase 11D
- Технический статус: **готово к live-проверке**.
- Верификационный статус: **partially verified**.
- Причина: изменения подтверждены кодом/сборкой, но финальная приемка UX выполняется только в live Telegram runtime.

---

## Короткое объяснение
В 11D сделан узкий usability-проход: пустые состояния стали более осмысленными, первый шаг понятнее, а вторичный шум в первых экранах уменьшен. Бизнес-логика и подтвержденные рабочие потоки не расширялись.

## Ручной чеклист
1. Открыть Mini App в Telegram и пройти табы `Home / Reminders / History / Profile`.
2. Проверить Home при пустых данных:
   - есть явный next step,
   - нет ощущения «пустого недоделанного экрана».
3. Проверить Reminders при пустых данных:
   - есть явный first-action блок,
   - форма добавления легко открывается,
   - после добавления платежа список и подсказки обновляются ожидаемо.
4. Проверить History при пустых данных:
   - есть понятное объяснение, что здесь появится позже,
   - после действий в Reminders в History появляется активность.
5. Проверить Profile:
   - `Show onboarding again` доступен,
   - `Onboarding verification notes` доступен,
   - `Family workspace (optional)` раскрывается и все create/join действия работают.
6. Проверить критичные потоки:
   - `Mark paid` / `Undo paid`,
   - family shared recurring,
   - who pays / paid by,
   - workspace/invite.
7. Проверить, что readiness/recent attempts/source visibility из 11B остались доступны в Reminders.
8. Проверить мобильную читаемость (без длинных перегруженных first-view блоков).

## Git Bash команды (commit / push / deploy)
```bash
git status

git add src/components/app/app-shell.tsx \
  src/components/app/landing-screen.tsx \
  src/components/app/payments-dashboard-section.tsx \
  src/components/app/recurring-payments-section.tsx \
  src/components/app/reminder-candidates-section.tsx \
  src/components/app/payments-activity-section.tsx \
  src/components/app/profile-scenarios-placeholder.tsx \
  docs/phase11d_empty_states_first_action_guidance_polish_report.md

git commit -m "Phase 11D: polish empty states and first-action guidance"
git push origin <your-branch>

# deploy (пример)
vercel --prod
```

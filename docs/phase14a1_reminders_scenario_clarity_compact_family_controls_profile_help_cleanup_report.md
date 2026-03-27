# Phase 14A.1 — Reminders scenario clarity + compact family controls + profile help cleanup

Модель: ChatGPT 5 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны релевантные отчеты:
  - `docs/phase12b_reminders_density_reduction_hierarchy_polish_report.md`
  - `docs/phase12c_bottom_tab_modernization_shell_visual_polish_report.md`
  - `docs/phase13a_premium_entitlement_foundation_no_core_paylock_report.md`
  - `docs/phase13c_owner_only_premium_admin_console_campaign_control_report.md`
  - `docs/phase13c1_fix_manual_premium_grant_revoke_owner_admin_console_report.md`
  - `docs/phase14a_information_audit_onboarding_expansion_onetime_family_invite_flow_report.md`
- Статус-override из запроса принят:
  - `11A.1`, `11B`, `11C`, `11D`, `12A.1`, `12B`, `12C`, `13A`, `13C` — manual verified.
- Live-review note из запроса учтен:
  - History не менялся целенаправленно.
  - Фокус только на Reminders + Profile help cleanup.

## Цель Phase 14A.1
Сделать Reminders и Profile более компактными и контекстными:
- убрать bulky постоянные help-блоки,
- объединить дублирующие family controls,
- сделать шаблоны сценарно-разделенными и редактируемыми,
- явно развести “Платежи” и “Подписки”,
- скрыть технический onboarding-help за локальным question-mark popover.

## Exact files changed (Phase 14A.1)
1. `src/components/app/recurring-payments-section.tsx`
2. `src/components/app/profile-scenarios-placeholder.tsx`
3. `src/components/app/help-popover.tsx` (new)
4. `src/lib/payments/starter-templates.ts`
5. `src/lib/i18n/localization.tsx`
6. `docs/phase14a1_reminders_scenario_clarity_compact_family_controls_profile_help_cleanup_report.md`

## Что изменено в Reminders
Статус: **Confirmed in code/report**

### 1) Scenario help переведен в локальный question-mark popover
- Убран отдельный bulky helper-блок в Reminders.
- Рядом со строкой `Workspace: ...` добавлен компактный `?` trigger.
- Поведение:
  - `family` сценарий: показывается текст про `Who pays` и `Paid by`.
  - `personal` сценарий: показывается короткая personal-подсказка.
- Popover локально якорится рядом с триггером, не привязан к краю экрана.

### 2) Family control информация объединена в один компактный блок
- Вместо нескольких разрозненных карточек:
  - `Family payment setup`
  - `Household members for who pays`
  - внешнего отдельного блока `Reminder operations and visibility`
- Сделан единый `Family controls` details-блок, внутри:
  - setup метрики (members/shared/unassigned),
  - список участников для `Who pays`,
  - вложенный блок `Reminder operations and visibility` с `ReminderCandidatesSection`.
- Дублирование контекста убрано, вертикальная плотность снижена.

### 3) Templates разделены по сценарию и сделаны редактируемыми
- Введены отдельные default template sets:
  - `personalStarterPaymentTemplates`
  - `familyStarterPaymentTemplates`
- В UI Reminders отображается только активный сценарный набор:
  - `Personal templates` в personal режиме,
  - `Family templates` в family режиме.
- Добавлены lightweight edit capabilities:
  - `Save current form as template` (из формы),
  - `Save as template` на карточке платежа,
  - `Delete` для custom templates.
- Custom templates хранятся локально (localStorage), отдельно по сценарию:
  - `personal` и `family` независимы.

### 4) Платежи и подписки разведены компактным переключателем
- Добавлен сегментированный переключатель:
  - `Payments`
  - `Subscriptions`
- Список внизу больше не смешивает оба типа в одном плоском потоке.
- `Subscription insights` показываются в режиме `Subscriptions`, чтобы разделение было явно читаемым.

## Что изменено в Profile
Статус: **Confirmed in code/report**

### 1) Onboarding verification notes убраны из постоянного шумного блока
- Удален видимый details-блок `Onboarding verification notes`.
- Возле кнопки `Show onboarding again` добавлен `?` popover с тем же explanatory содержимым.
- Popover открывается локально рядом с кнопкой.

### 2) Технический шум Session-блока снижен
- Убран постоянный технический `stateLabel` текст.
- Сохранены полезные элементы:
  - source/status label,
  - language switch,
  - replay onboarding trigger.

### 3) Reminder operations блок больше не дублируется в Profile wrapper
- `remindersScreen` больше не рендерит отдельный внешний details с `ReminderCandidatesSection`.
- Эта часть теперь структурно находится в Reminders внутри компактной family/personal логики.

## Как работает tooltip/popover pattern
Статус: **Confirmed in code/report**

Добавлен переиспользуемый компонент:
- `src/components/app/help-popover.tsx`

Поведение:
- компактный `?` trigger;
- popover рендерится рядом с trigger (`absolute` относительно локального контейнера);
- закрывается:
  - по tap/click вне popover,
  - по `Esc`,
  - по явной кнопке закрытия;
- один и тот же паттерн используется в:
  - Reminders scenario help,
  - Profile onboarding help.

## Как теперь работают шаблоны
Статус: **Confirmed in code/report**

1. Сценарное разделение:
- `family` режим -> только family templates;
- `personal` режим -> только personal templates.

2. Редактируемость:
- Add:
  - сохранить текущую форму как шаблон;
  - сохранить существующий платеж как шаблон.
- Delete:
  - удаление custom template.

3. Легковесность:
- Без отдельной тяжелой template-subsystem.
- Без новых API/migrations.
- LocalStorage уровень достаточен для UX-pass 14A.1.

## Как разведены Payments и Subscriptions
Статус: **Confirmed in code/report**

- Введен компактный segmented control `Payments / Subscriptions`.
- Bottom list показывает только выбранный тип.
- Смешанный “один общий поток” убран.
- Subscription operational insights показываются только в subscriptions context.

## Миграции / storage changes
Статус: **No DB migration required**

- Миграции БД не добавлялись.
- Минимальный storage support для editable templates:
  - localStorage key: `payment-control-custom-templates-v1`
  - структура с независимыми scenario buckets (`personal`, `family`).

## Что намеренно НЕ менялось
Статус: **Confirmed in code/report**
- История (History) не редизайнилась.
- Premium/growth scope не расширялся.
- Family economics mechanics не менялись.
- API/DB контракт по core payments/reminders/premium/admin не расширялся.
- 4-tab shell, one-time invite flow 14A, owner admin console, grant/revoke и campaign control не переписывались.

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## Risks / follow-up notes
1. Popover positioning визуально сделан локальным; нужен live mobile check в Telegram runtime на разных экранах.
2. Custom templates сейчас local-only (per browser/storage), без серверной синхронизации — для этого pass это intentionally acceptable.
3. Для UX финализации может понадобиться микрополировка текстовой плотности `Family controls` после live walkthrough.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. Поповеры в Reminders/Profile действительно воспринимаются локальными (не edge-glued) на реальном мобильном экране.
2. Family controls блок стал заметно компактнее и понятнее без потери полезной информации.
3. Templates в family/personal не смешиваются в live-сценариях.
4. Add/Delete/Save-as-template flow удобен в реальном Telegram UX.
5. Разделение Payments vs Subscriptions воспринимается ясно и не вызывает путаницы.
6. Core verified flows не регресснули (Mark paid/Undo paid, who pays/paid by, workspace switching, one-time invite, premium/admin flows).

## Exact manual checklist (Phase 14A.1)
1. Открыть Reminders в personal workspace и проверить `?` popover рядом со строкой `Workspace`.
2. Переключиться в family workspace и проверить family-версию scenario popover в том же месте.
3. Убедиться, что в family режиме есть единый `Family controls` блок вместо нескольких дублирующих карточек.
4. Внутри `Family controls` проверить наличие:
   - setup метрик,
   - member list,
   - reminder operations/visibility блока.
5. Проверить переключатель `Payments / Subscriptions` и соответствующую фильтрацию списка.
6. Проверить, что в subscriptions режиме видны subscription insights, а в payments режиме список не смешан с подписками.
7. В personal режиме убедиться, что templates section показывает только personal templates.
8. В family режиме убедиться, что templates section показывает только family templates.
9. В форме платежа нажать `Save current form as template` и проверить появление шаблона.
10. На карточке существующего платежа нажать `Save as template` и проверить добавление шаблона.
11. Удалить custom template через `Delete`.
12. В Profile возле `Show onboarding again` открыть `?` popover и проверить, что onboarding notes доступны там, но не как постоянный большой блок.
13. Проверить RU/EN переключение для новых строк в Reminders/Profile.
14. Пройти regression smoke: Mark paid/Undo paid, family shared flow, who pays/paid by, one-time invite, owner admin actions.

## Encoding safety check
Проверены все затронутые файлы с русскоязычными/пользовательскими строками:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase14a1_reminders_scenario_clarity_compact_family_controls_profile_help_cleanup_report.md`

Результат:
- UTF-8 сохранен.
- Битой кириллицы/mojibake в новых изменениях не обнаружено.
- Дополнительных encoding-исправлений не потребовалось.

## Pre-report self-check against prompt

1. Scenario help moved to contextual `?` pattern — **Satisfied (code/report), live UX check pending**  
- Убран bulky helper, добавлен локальный popover рядом с workspace line для family/personal.

2. Popover appears near related control — **Satisfied (code/report), live UX check pending**  
- Якорение локальное через relative/absolute рядом с trigger; не full-width banner и не bottom sheet.

3. Family control info merged compactly — **Satisfied (code/report)**  
- Дублирующие family блоки объединены в один `Family controls`.

4. Family/single templates separated — **Satisfied (code/report)**  
- Отдельные scenario template sets + сценарный рендер.

5. Templates can be added/deleted — **Satisfied (code/report)**  
- Add from form/payment card, delete custom templates.

6. Manual payment creation can save as template — **Satisfied (code/report)**  
- Явная кнопка `Save as template` в форме.

7. Payments vs subscriptions separated — **Satisfied (code/report)**  
- Segmented view разделяет list context.

8. Profile technical text reduced and onboarding notes moved behind `?` — **Satisfied (code/report)**  
- Heavy onboarding notes block removed from always-visible view.

9. Existing verified flows preserved — **Satisfied (code/report), live regression pending**  
- Изменения локальны в Reminders/Profile UX layer.

10. No unrelated scope added — **Satisfied (code/report)**  
- История/premium-growth/deep rewrites не добавлялись.

---

## Короткое объяснение (по-русски)
В 14A.1 Reminders и Profile стали компактнее и понятнее: сценарные подсказки ушли в локальные `?` popover, family controls объединены без дублирования, шаблоны разделены по сценарию и стали редактируемыми, а список в Reminders теперь явно разделяет “Платежи” и “Подписки”.

## Ручной чек-лист (по-русски)
1. Проверить локальные `?` popover в Reminders (personal/family) и Profile (рядом с `Show onboarding again`).
2. Проверить, что family controls не раздуты и не дублируются.
3. Проверить templates:
   - personal/family разделение,
   - добавление из формы,
   - сохранение из карточки,
   - удаление custom шаблона.
4. Проверить переключатель `Платежи / Подписки` и соответствующую фильтрацию.
5. Сделать regression smoke по core flow (Mark paid/Undo paid, who pays/paid by, workspace/invite, premium admin).

## Git Bash команды (реальный workflow)
```bash
git status
git add src/components/app/recurring-payments-section.tsx src/components/app/profile-scenarios-placeholder.tsx src/components/app/help-popover.tsx src/lib/payments/starter-templates.ts src/lib/i18n/localization.tsx docs/phase14a1_reminders_scenario_clarity_compact_family_controls_profile_help_cleanup_report.md
git commit -m "phase14a1: refine reminders clarity, compact family controls, and profile contextual help"
git push origin main
```

Примечание: в этом pass миграции БД не добавлялись, поэтому `supabase db push` и `supabase migration list` не требуются.

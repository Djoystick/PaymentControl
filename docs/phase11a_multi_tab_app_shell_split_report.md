# Phase 11A — Multi-tab app shell split (Home / Reminders / History / Profile)

## 1) Цель pass
Перевести UI из длинного single-page потока в реальные таб-экраны:
- Home
- Reminders
- History
- Profile

Без расширения доменной логики и без изменений paywall/premium.

## 2) Что было изменено

### 2.1 Новый реальный tab shell
Сделан новый режим `AppShell` с явными экранами вместо anchor-jump модели:
- табы теперь: `Home / Reminders / History / Profile`
- отображается только один активный экран
- убраны hash-якоря как основная модель навигации
- добавлен 4-кнопочный мобильный footer-nav

Файл:
- `src/components/app/app-shell.tsx`

### 2.2 Разделение длинного экрана на 4 screen-ноды
`ProfileScenariosPlaceholder` теперь формирует и передает в `AppShell` 4 отдельных экрана:

1. `home`
- `LandingScreen`
- `PaymentsDashboardSection` в `compact` режиме

2. `reminders`
- `RecurringPaymentsSection`
- `ReminderCandidatesSection`

3. `history`
- `PaymentsActivitySection`

4. `profile`
- session/workspace/invite/settings блоки
- `Show onboarding again` сохранен

Файл:
- `src/components/app/profile-scenarios-placeholder.tsx`

### 2.3 Home стал компактным
Home очищен до коротких блоков:
- quick overview
- runtime status
- компактный payment snapshot

Файлы:
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`

### 2.4 Dashboard: добавлен компактный режим
В `PaymentsDashboardSection` добавлен проп `variant`:
- `full` (старый полный режим)
- `compact` (новый home-режим)

`compact` показывает:
- ключевые счетчики
- короткие списки due/upcoming
- быстрый refresh

Файл:
- `src/components/app/payments-dashboard-section.tsx`

### 2.5 Точка входа страницы
`app/page.tsx` теперь рендерит новую tab-сборку напрямую.

Файл:
- `src/app/page.tsx`

### 2.6 Обновлены phase badges на текущий pass
Обновлены видимые phase-бейджи до `Phase 11A` в ключевых разделах.

Файлы:
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/app-shell.tsx`

## 3) Точные файлы, которые были изменены
- `src/app/page.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/payments-activity-section.tsx`

## 4) Что намеренно НЕ менялось
- Не добавлялись новые бизнес-фичи (split bills, debts, advanced analytics и т.д.)
- Не менялась premium/paywall логика
- Не менялись API-контракты
- Не менялась БД-схема и миграции
- Не делались большие backend/domain refactor
- Не менялись правила Archive/Pause/Resume для family

## 5) Подтверждение по миграциям
Миграции не добавлялись.

Изменений в `supabase/migrations/*` нет.

## 6) Техническая проверка в этом pass
Выполнено:
1. `npm run lint` — успешно
2. `npm run build` — успешно

## 7) Проверка сохранения критичных уже-верифицированных путей

### Confirmed in code/report
- Поддержка `Mark paid / Undo paid` сохранена
- После `Mark paid / Undo paid` остается локальная revalidation (`void loadPayments()`)
- Family shared flow не удален
- `Who pays / Paid by` поверхности сохранены
- `Show onboarding again` сохранен в Profile
- Invite/workspace блоки сохранены в Profile
- Mobile-first layout и compact подход сохранены

### Still requires live manual verification
- Реальная UX-проверка tab flow в Telegram webview
- Реальная проверка скорости переключения между вкладками на мобильном
- Реальная e2e проверка family/shared действий в новом разрезе вкладок

## 8) Риски и follow-up
1. `PaymentsActivitySection` все еще содержит `id="activity-section"` как исторический остаток. Это не ломает работу, но больше не нужен для навигации и можно убрать отдельным микро-pass.
2. Home intentionally компактный: если потребуется больше данных на Home, лучше добавлять очень аккуратно, чтобы снова не получить длинный overloaded экран.
3. Для окончательной фиксации статуса `manual verified` нужен live Telegram проход после deploy.

## 9) Manual verification checklist (exact)

### A. Tab shell
1. Открыть Mini App в Telegram.
2. Проверить, что внизу есть 4 вкладки:
- Home
- Reminders
- History
- Profile
3. Нажать каждую вкладку и проверить, что открывается отдельный экран, а не скролл по длинной общей странице.

### B. Home
1. Проверить, что Home короткий и не перегруженный.
2. Проверить, что виден compact snapshot (ключевые счетчики).
3. Проверить, что `Refresh snapshot` работает.

### C. Reminders (главный operational экран)
1. Проверить, что recurring list и reminder section находятся на одной вкладке Reminders.
2. Проверить `Mark paid`.
3. Проверить `Undo paid`.
4. Проверить, что карточка обновляется сразу без ручного reopen.
5. Проверить, что family `Who pays / Paid by` отображается как раньше.

### D. History
1. Открыть History и проверить наличие activity-ленты.
2. Проверить, что recent items отображаются.
3. Для family проверить отображение строк `Who pays / Paid by` в activity.

### E. Profile
1. Проверить workspace switch.
2. Проверить create invite / accept invite блоки.
3. Нажать `Show onboarding again`.
4. Проверить, что onboarding стартует повторно.

### F. Regression smoke
1. Проверить personal и family контекст после переключения вкладок.
2. Проверить, что Archive/Pause/Resume правила не изменились неожиданно.
3. Проверить, что интерфейс на телефоне читаемый и не перегружен.

## 10) Финальный статус pass
not confirmed

Причина: в этом pass выполнены кодовые и сборочные проверки, но живая ручная Telegram runtime-проверка не выполнялась в рамках среды Codex.

---

## 11) Краткий анализ (RU, plain)
Структурная цель pass достигнута: длинный single-page поток разделен на реальные вкладки Home/Reminders/History/Profile. Это снижает когнитивную нагрузку и ускоряет мобильную навигацию. Критичные рабочие механики сохранены в коде, но финальная фиксация качества требует live-проверки в Telegram после deploy.

## 12) Чеклист ручной проверки (RU, plain)
1. Открыть Mini App в Telegram и проверить 4 вкладки.
2. На Reminders проверить `Mark paid` -> мгновенный update -> `Undo paid`.
3. На History проверить отображение recent activity.
4. На Profile проверить `Show onboarding again` и workspace/invite блоки.
5. Пройти quick smoke в personal и family контексте.

## 13) Git Bash команды (commit / push / deploy)
```bash
git status
git add src/app/page.tsx \
  src/components/app/app-shell.tsx \
  src/components/app/landing-screen.tsx \
  src/components/app/payments-dashboard-section.tsx \
  src/components/app/profile-scenarios-placeholder.tsx \
  src/components/app/recurring-payments-section.tsx \
  src/components/app/reminder-candidates-section.tsx \
  src/components/app/payments-activity-section.tsx \
  docs/phase11a_multi_tab_app_shell_split_report.md
git commit -m "Phase 11A: split app into real tabs (Home/Reminders/History/Profile)"
git push origin <your-branch>

# deploy (пример для Vercel CLI)
vercel --prod
```

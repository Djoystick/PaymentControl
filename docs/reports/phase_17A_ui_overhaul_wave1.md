# Phase 17A — UI Overhaul Wave 1 (Payment Control)

- Date: 2026-03-28
- Project: Telegram Mini App `Payment Control`
- Primary design source: `.codex/skills/ui-ux-pro-max/SKILL.md`
- Additional local framework reference reviewed before edits:  
  `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`,  
  `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`,  
  `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`

## Что изменено

### 1) Reminders: новая модель экрана (главное изменение)

Вместо старой перегруженной последовательности с конкурирующими блоками введена явная двухрежимная модель:

- `Main action` — быстрые ежедневные действия:
  - компактный action-summary (Due today / Overdue / Visible),
  - быстрые кнопки,
  - список карточек с `Mark paid / Undo paid`,
  - фильтр Payments/Subscriptions и связанные карточки.
- `Setup and templates` — конфигурация:
  - композер добавления/редактирования,
  - шаблоны,
  - семейные контролы,
  - блок операций/диагностики напоминаний.

Это уменьшает когнитивную нагрузку за счёт явного разделения `действовать сейчас` vs `настраивать`.

### 2) Templates UX

- Шаблонные элементы сделаны tappable по всей строке (а не только по тексту кнопки).
- Для мобильных касаний усилены touch-target/padding (`min-h-[44px]`, `touch-manipulation`).
- У custom templates сохранено отдельное удаление с безопасным `stopPropagation`.

### 3) Глобальная визуальная унификация (Home / History / Profile / shell)

- Подполирован контейнер shell и нижний tab-bar для более app-like mobile-подачи.
- На Home оставлен только главный заголовок приложения (убран лишний верхний label).
- Убраны шумные phase-бейджи из ключевых экранных секций (Dashboard / History / Profile / Reminder Candidates) для более спокойного единого стиля.

## Почему это изменено

- Основная проблема Reminders была в конкуренции блоков и слабом разделении первичных действий и вторичных настроек.
- По UI/UX Pro Max применены принципы:
  - mobile-first hierarchy,
  - progressive disclosure,
  - снижение постоянного пояснительного шума,
  - усиление tap affordance,
  - более чистая screen composition.

## Файлы, которые были изменены

- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/reminder-candidates-section.tsx`

## Какая UI-модель введена

Новая модель Reminders: `Action-first` с двухрежимным переключением.

- Режим `Main action`:
  - быстрый скан текущей ситуации,
  - прямой доступ к оперативным действиям по карточкам.
- Режим `Setup and templates`:
  - все конфигурационные и вспомогательные блоки вынесены отдельно,
  - ежедневный поток больше не «забивается» вторичными настройками.

## Что намеренно НЕ менялось

- Бизнес-логика и продуктовые правила.
- Потоки `Mark paid / Undo paid`, recurring flows, family/single workspace behavior.
- Premium entitlement, owner-only admin access rules.
- Onboarding replay behavior.
- Tab navigation behavior.
- База данных, API-контракты и серверные правила.

Изменения ограничены UI-структурой, визуальной иерархией и интерактивной подачей.

## Проверка качества

Выполнено:

- `npm run lint` — OK
- `npm run build` (Next.js 16.2.1 + TS) — OK

## Риски и follow-up

- В режиме `Setup and templates` остаются тяжёлые operational блоки (ReminderCandidatesSection) — они уже вынесены из ежедневного потока, но в следующей волне можно дополнительно ужать их внутри самого setup-режима.
- Возможен следующий пасс на единый компонентный токен-слой (кнопки/карточки/бейджи), чтобы полностью стандартизировать стили между всеми секциями.

## Ручной чеклист (RU)

1. Открыть `Reminders` и проверить, что экран делится на `Main action` и `Setup and templates`.
2. В `Main action` проверить быстрый сценарий: выбрать карточку и выполнить `Mark paid`, затем `Undo paid`.
3. Убедиться, что в `Main action` нет лишней конфигурационной перегрузки.
4. Переключиться в `Setup and templates`, открыть форму и добавить/отредактировать платёж.
5. Проверить, что строка шаблона нажимается целиком (не только текст).
6. Проверить, что custom template удаляется отдельной кнопкой без ложных срабатываний.
7. Пройти Home / Reminders / History / Profile и визуально подтвердить более единый стиль.
8. Проверить RU/EN переключение: новые/изменённые интерфейсные подписи не дают смешанного RU/EN в UI.
9. Проверить отсутствие горизонтального скролла на мобильной ширине.
10. Повторно проверить family/premium/admin/onboarding/core flows на предмет регрессий поведения.

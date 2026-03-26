# Phase 8P.1 — Bottom navigation interactivity bugfix

## 1. Scope
В этом pass исправлен только один runtime-баг:
- нижняя навигация `Home / Activity / Profile` рендерилась, но не реагировала на нажатия.

Без расширения feature scope и без изменения бизнес-логики family/personal flows.

## 2. Root cause
Причина была в `app-shell`:
- кнопки нижней навигации были зашиты с атрибутом `disabled`;
- из-за этого клики/тапы физически не проходили.

Это был UI-interactivity bug, не backend и не data-path проблема.

## 3. What was implemented
1. В `AppShell` убран `disabled` у нижних кнопок и добавлен рабочий click handler.
2. Добавлен простой локальный tab state (`home | activity | profile`) для visual active highlight.
3. Реализован scroll-to-section переход:
- `Home` → `#home-section`
- `Activity` → `#activity-section`
- `Profile` → `#profile-section`
4. Добавлены id-якоря в соответствующие секции.

## 4. What was intentionally NOT implemented
- Роутинг/страницы по табам;
- новый навигационный subsystem;
- изменения family foundation логики;
- backend/API/migration изменения.

## 5. Exact files created/modified
### Modified
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`

### Created
- `docs/phase8p1_bottom_navigation_interactivity_bugfix_report.md`

## 6. Manual verification steps
1. Открыть приложение и нажать `Home`:
- экран скроллится к верхнему home-блоку.
2. Нажать `Activity`:
- экран скроллится к activity-секции.
3. Нажать `Profile`:
- экран скроллится к profile-секции.
4. Проверить, что active tab highlight меняется при нажатии.
5. Проверить, что family/personal контекст и существующие блоки не ломаются.

## 7. Runtime confirmation status
Что подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка кликов/тапов в браузере/Telegram.

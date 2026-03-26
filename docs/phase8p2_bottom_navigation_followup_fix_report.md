# Phase 8P.2 — Bottom navigation interactivity follow-up fix

## 1. Scope
В этом pass выполнен узкий follow-up bugfix только для нижней навигации `Home / Activity / Profile`.

Цель: восстановить реальную интерактивность таббара без изменения доменной/бизнес логики.

## 2. Root cause (фактическая причина)
Проблема оказалась не только в `disabled` из предыдущего pass.

После снятия `disabled` нижний бар всё ещё оставался хрупким в runtime из-за комбинации факторов:
- таббар жил в обычном потоке без приоритетного слоя (`z-index`) и без safe-area отступа;
- обработка строилась только на JS `onClick` у кнопок;
- в webview/мобильном контейнере нижняя зона могла перехватывать тапы нестабильно.

Итог: визуально бар есть, но нажатия внизу экрана могли не срабатывать как ожидается.

## 3. What was implemented
1. Локально усилена interactivity устойчивость tab bar:
- контейнер навигации сделан `sticky` у нижней границы;
- добавлен повышенный слой (`z-index`);
- добавлен safe-area нижний padding.

2. Переведена навигация на anchor-first подход:
- `Home/Activity/Profile` теперь ссылки (`href=#...`) с JS-enhanced поведением;
- даже без идеального JS path остаётся нативный якорный fallback.

3. Сохранён и улучшен active state:
- локальный `activeTab`;
- синхронизация через `hashchange`;
- визуальный active highlight не сломан.

4. Scroll-to-section сохранён:
- клик по табу скроллит к целевой секции (`home-section`, `activity-section`, `profile-section`).

## 4. What was intentionally NOT implemented
- Роутинг по отдельным страницам для Home/Activity/Profile;
- новый навигационный subsystem;
- изменения family business logic;
- backend/API/migrations изменения.

## 5. Exact files created/modified
### Modified
- `src/components/app/app-shell.tsx`

### Created
- `docs/phase8p2_bottom_navigation_followup_fix_report.md`

## 6. Manual verification steps
1. Открыть приложение и нажать `Home`:
- проверить, что таб активируется и скролл идёт к home-секции.

2. Нажать `Activity`:
- проверить активацию таба и скролл к activity-секции.

3. Нажать `Profile`:
- проверить активацию таба и скролл к profile-секции.

4. Повторить в personal и family контексте:
- убедиться, что таббар одинаково интерактивен в обоих.

5. Проверить нижнюю область экрана на мобильном webview:
- тапы по таббару должны стабильно срабатывать.

## 7. Runtime confirmation status
Что подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка кликов/тапов в браузере/Telegram webview.

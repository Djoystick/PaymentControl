# Phase 11A.1 — Real tab navigation fix

## 1) Контекст и цель
После live проверки Phase 11A был отклонен:
- в Telegram наблюдался старый UX (длинная страница + anchor-скролл)
- внизу было 3 кнопки
- кнопки работали как прокрутка секций, а не как реальные экраны

Цель 11A.1: жестко зафиксировать реальный 4-tab shell с отображением только активного экрана.

## 2) Root cause отклонения 11A
По результату сверки:
1. В live runtime был показан нецелевой shell-поведение (старый anchor-scroll UX).
2. Для предотвращения повтора в коде нужно было усилить tab-shell так, чтобы:
- 4 вкладки были зафиксированы явно в одном месте;
- рендер происходил только для активного экрана;
- не оставалось якорных хвостов из старой модели.

Практический вывод: исправление выполнено как узкий hardening shell-логики + удаление остаточного якорного следа.

## 3) Что исправлено в 11A.1

### 3.1 Жестко зафиксирован набор табов (ровно 4)
В `AppShell` добавлен единый источник правды:
- `tabItems = [home, reminders, history, profile]`

Нижняя навигация теперь рендерится только из этого массива.

### 3.2 Рендер только активного экрана
В `AppShell` `main` теперь рендерит только `screens[activeTab]` в отдельном контейнере с `key={activeTab}`.

Это исключает модель «все секции длинным вертикальным стеком + jump по якорям».

### 3.3 Удален остаточный anchor-хвост
В `PaymentsActivitySection` удален `id="activity-section"`.

Это убирает историческую привязку к старому section-anchor поведению.

## 4) Exact files changed (Phase 11A.1)
- `src/components/app/app-shell.tsx`
- `src/components/app/payments-activity-section.tsx`
- `docs/phase11a1_real_tab_navigation_fix_report.md`

## 5) Что было удалено/починено
Удалено:
- остаточный `activity-section` anchor id

Починено/усилено:
- явный фиксированный список из 4 табов
- гарантированный рендер только активного tab screen
- более надежное разделение экранов без anchor-scroll модели

## 6) Что намеренно НЕ менялось
- Бизнес-логика recurring/family/reminders/history
- API и domain слой
- БД и миграции
- Premium/paywall
- Invite/workspace семантика

## 7) Подтверждение по миграциям
Миграции не добавлялись.

## 8) Техническая проверка
Выполнено:
1. `npm run lint` — успешно
2. `npm run build` — успешно

## 9) Подтверждение критериев

### Confirmed in code/report
1. Внизу ровно 4 таба: `Home / Reminders / History / Profile`.
2. Нажатие таба меняет `activeTab` и активный screen.
3. Рендерится только один активный screen (`screens[activeTab]`).
4. Home остается компактным (Landing + compact snapshot).
5. Reminders, History, Profile остаются отдельными экранами.
6. Сохранены пути:
- `Mark paid / Undo paid`
- family shared recurring
- `Who pays / Paid by`
- workspace/invite area
- `Show onboarding again`

### Still requires live manual verification
- Финальное подтверждение в Telegram runtime после deploy (что пользователь реально видит 4-tab shell без скролл-якорей).

## 10) Явное итоговое утверждение
В текущем коде приложение использует TRUE tab switching (активный экран переключается по tab state) и не использует scroll anchors как пользовательскую модель навигации.

## 11) Exact manual verification checklist

### A. Shell
1. Открыть Mini App в Telegram.
2. Проверить 4 кнопки снизу:
- Home
- Reminders
- History
- Profile
3. Проверить, что по нажатию меняется экран, а не скролл секции.

### B. Home
1. Открыть Home.
2. Проверить, что экран короткий и компактный.

### C. Reminders
1. Открыть Reminders.
2. Проверить доступность recurring/reminder рабочих блоков.
3. Проверить `Mark paid` и `Undo paid`.

### D. History
1. Открыть History.
2. Проверить activity-ленту и семейные строки `Who pays / Paid by`.

### E. Profile
1. Открыть Profile.
2. Проверить `Show onboarding again`.
3. Проверить workspace/invite блоки.

## 12) Финальный статус
not confirmed

Причина: код и сборка подтверждены локально, но финальная live Telegram проверка выполняется вне среды Codex.

---

## 13) Короткое объяснение (RU)
В 11A.1 сделан узкий corrective fix: shell теперь жестко держит 4 таба и рендерит только активный экран. Якорная модель как пользовательский путь убрана.

## 14) Ручной чеклист (RU)
1. Открыть Telegram Mini App и проверить 4 таба.
2. Проверить, что тап по табу переключает экран, а не скроллит длинную страницу.
3. Проверить `Mark paid/Undo paid` в Reminders.
4. Проверить `Show onboarding again` в Profile.
5. Проверить History экран.

## 15) Git Bash команды (commit / push / deploy)
```bash
git status
git add src/components/app/app-shell.tsx \
  src/components/app/payments-activity-section.tsx \
  docs/phase11a1_real_tab_navigation_fix_report.md
git commit -m "Phase 11A.1: enforce true 4-tab shell and remove anchor remnants"
git push origin <your-branch>

# deploy (пример)
vercel --prod
```

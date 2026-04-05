# Phase 28Q - Final Travel Consolidation + Verification Pack

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: финальная консолидация Travel как цельного v1-модуля после 28P (polish + consistency + unified verification pack)
- Baseline preserved:
  - donation-only product truth без ограничений
  - без возврата Premium/paywall/unlock-механик
  - без смешения Recurring и Travel
  - без новой feature-wave поверх 28A-28P

## 1) Что найдено в финальном audit после 28P

Проверка выполнялась по всему Travel runtime:
1. Travel tab entry + trip list + new trip modal + join/invite.
2. Participant roles/states + shared trip context.
3. Trip workspace, create/edit/delete expense, balances/settlements, closure/archive.
4. Multi-currency create/edit/history/detail + FX assistance.
5. Receipt drafts + OCR review + receipt ↔ expense linkage.
6. Empty/loading/filter edge-states и RU/EN consistency в Travel-компоненте.

Найденные user-facing seams:
1. В некоторых пустых filtered состояниях не хватало короткого reset-path (пользователь видел “пусто”, но без явного “показать всё”).
2. Empty-state истории трат был не нейтрален для read-only поездок (сообщение “добавьте первую трату” выглядело спорно в closed/archived).
3. В локализации Travel-компонента отсутствовало несколько ключей, из-за чего в RU могли всплывать EN-строки.

## 2) Какие seams были закрыты

В `src/components/app/travel-group-expenses-section.tsx`:
1. Добавлен явный reset-path для пустых trip-фильтров:
   - кнопка `Show all trips`.
2. Добавлен явный reset-path для пустых receipt-фильтров:
   - кнопка `Show all receipts`.
3. Исправлен history empty-state:
   - для active trip сохраняется “добавьте первую трату”;
   - для read-only trip показывается нейтральный текст без ложного CTA на редактирование.

В `src/lib/i18n/localization.tsx`:
1. Закрыты missing RU keys для Travel-поверхности (включая `Cancel`, invite-load error и новые reset/empty-state строки).
2. Дополнительно синхронизированы строки для новых Travel edge-state сообщений.

## 3) Какие final UX/runtime inconsistencies были исправлены

Исправлено в рамках safe polish:
1. Consistency пустых фильтров: теперь у пользователя есть короткий и предсказуемый возврат в полный список.
2. Consistency lifecycle language: read-only trip не подсказывает действие, которое уже недоступно.
3. Consistency RU/EN: устранены локальные точки fallback на EN в Travel runtime.

## 4) Как улучшены empty/no-data/edge states

Улучшения:
1. `Trips filtered empty` -> добавлен быстрый `Show all trips`.
2. `Receipts filtered empty` -> добавлен быстрый `Show all receipts`.
3. `No expenses in read-only trip` -> нейтральное объяснение вместо активного add-CTA.

Это закрывает финальные “шероховатости контекста” без нового редизайна и без изменения бизнес-логики.

## 5) Единый final Travel verification pack (RU)

Ниже компактный пакет ручной финальной проверки всего Travel v1:

1. Вкладка Travel открывается отдельно от Recurring, без смешанного mode-switch.
2. На entry surface понятны три действия: открыть поездку, создать новую, присоединиться по invite.
3. В trip list корректно работают фильтры Active / Completed / Archived / All.
4. В пустых filtered trip-state работает `Показать все поездки`.
5. New trip modal открывается/закрывается стабильно на мобильном экране.
6. Join/invite flow ведет в правильный trip context, без потери состояния.
7. Participant layer: organizer/participant + active/inactive + joined/local + you читаются сразу.
8. Добавление/редактирование/деактивация участника не ломает старую историю расходов.
9. Quick add expense остается коротким для same-currency сценария.
10. Для cross-currency видны pair/rate/preview и понятно, что курс фиксируется вручную.
11. FX assistance (last saved/recent) работает только как подсказка, без silent save.
12. Edit expense пересчитывает балансы предсказуемо и показывает корректный контекст.
13. Settlement секция читаема: recommended plan, open/settled, шаги урегулирования.
14. Closure flow: start finalization -> mark settled -> close/reopen ведет себя предсказуемо.
15. Archive flow: completed -> archive -> restore без потери истории.
16. Receipt drafts: capture, parse/reparse, replace photo, reset hints, use-in-form работают.
17. OCR review модалка показывает status/quality/next action без перегруза.
18. Receipt ↔ expense linkage двусторонняя и понятная.
19. Empty-states спокойные и контекстные (trip/receipt/history).
20. RU/EN строки в Travel не содержат случайных fallback/смешения.

## 6) Что уже считается зрелой Travel v1

На момент 28Q зрелой и завершенной v1 считается следующий контур:
1. Отдельная Travel root-surface.
2. Полный trip lifecycle: active -> closing -> closed -> archived (+ restore).
3. Shared participant workflow + invite/join identity linking.
4. Stable settlement layer с optimized plan и finalization flow.
5. Fixed-rate multi-currency с понятным UX (включая FX assistance).
6. Receipt/OCR assistant layer с manual confirmation и review workflow.
7. Консистентные empty/edge states и связные переходы между travel-поверхностями.

## 7) Что намеренно НЕ менялось

1. Не добавлялись новые heavy features (OCR-core/FX-core/math-core/shell-wave).
2. Не менялась travel schema/API модель и не добавлялись миграции.
3. Не трогались Recurring lane и guide layer 28B/28C.
4. Не запускалась новая roadmap-ветка внутри этого pass.

## 8) Risks / Regression Watchlist

1. Проверить UX discoverability новых reset-кнопок в фильтрах на очень маленьких экранах.
2. Проверить read-only history copy для archived/closed сценариев с нулевыми расходами.
3. Проверить RU/EN переключение языка после hot navigation в Travel (без stale strings).
4. Проверить Telegram WebView keyboard behavior в new trip modal и FX cross-currency блоке.

## 9) Проверки

Выполнено:
1. `npm run lint` - pass (warnings only: existing `@next/next/no-img-element` for receipt previews)
2. `npm run build` - pass
3. targeted tests for touched areas:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/receipt-ocr.test.ts` - pass

## 10) Самопроверка против acceptance criteria

1. Более цельный и зрелый Travel runtime - выполнено.
2. Закрыты последние заметные user-facing seams - выполнено.
3. Улучшены final empty/no-data/edge states - выполнено.
4. Собран единый final Travel verification pack - выполнено.
5. Зафиксирован зрелый Travel v1-контур - выполнено.
6. Recurring baseline и общая product truth не сломаны - выполнено по scope и проверкам.

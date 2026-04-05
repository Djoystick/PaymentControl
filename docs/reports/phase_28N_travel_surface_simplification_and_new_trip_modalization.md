# Phase 28N - Travel Surface Simplification + New Trip Modalization

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: UX-simplification wave inside dedicated Travel tab (post-28M baseline), without domain/model expansion
- Baseline preserved:
  - unrestricted donation-only truth
  - no Premium/entitlement/claim/unlock return
  - no recurring/travel merge
  - all Travel capabilities from 28A-28M remain available

## 1) Что было найдено в audit после 28M

После роста Travel-функциональности (28A-28M) первый экран вкладки стал перегруженным:
1. На верхнем уровне одновременно конкурировали join-flow, inline create-flow, trip list и моментальный вход в выбранную поездку.
2. Создание поездки занимало много вертикального пространства прямо на главной поверхности.
3. Вторичные блоки (participant admin/invite, receipt drafts, lifecycle actions) визуально шумели на том же уровне, что и частые действия.
4. Автовыбор первой поездки сразу разворачивал большой workspace и ухудшал “список как точку входа”.

## 2) Почему travel simplification выбран следующим шагом

После 28J (отдельная Travel-tab) и 28M (identity + invite/join) следующим логичным шагом стал UX-компрессор surface-уровня:
1. сохранить зрелую функциональность,
2. вернуть первому экрану простоту,
3. сделать создание поездки легким и коротким,
4. увести второстепенное на 2-3 план без удаления возможностей.

## 3) Как упрощен главный экран Travel

Сделано:
1. Убран inline-блок создания поездки с главного экрана.
2. Добавлен компактный action-first верхний слой:
   - primary action `Create trip`;
   - secondary action `Join shared trip`.
3. Join-поток переведен в отдельный сворачиваемый блок (`details`) вместо постоянно раскрытой формы.
4. Сохранен фильтруемый список поездок (`active/completed/archived/all`), но главный вход теперь читабельнее как список+действия.
5. Убран автовыбор первой поездки при загрузке: сначала показывается список, пользователь явно выбирает нужную поездку.

## 4) Как реализован modal flow создания поездки

Сделано:
1. Создание поездки вынесено в portal modal (`pc-modal-overlay` / `pc-modal-dialog`).
2. В модалке сохранен текущий рабочий набор полей:
   - название;
   - базовая валюта;
   - заметка;
   - стартовый список участников.
3. Добавлен mobile-safe режим:
   - ограничение высоты через `100dvh` + safe-area,
   - внутренний скролл диалога,
   - autofocus на поле названия,
   - закрытие по overlay и `Esc` (кроме момента активного submit).
4. После успешного создания:
   - модалка закрывается,
   - поездка становится выбранной,
   - continuity “создали -> сразу в workspace” сохранен.

## 5) Какие элементы унесены на 2-3 план

Без удаления функционала:
1. `Join shared trip` — в сворачиваемый блок.
2. `Participants` (включая organizer/invite/member-state инструменты) — в отдельный сворачиваемый слой.
3. `Receipt drafts` (capture/parse/reparse/reset/replace/apply) — в отдельный сворачиваемый слой.
4. Lifecycle actions (`start finalization`, `close/reopen/archive/unarchive`) — в отдельный сворачиваемый слой внутри trip summary.

## 6) Как улучшена навигационная понятность

Сделано:
1. На входе в Travel теперь очевидны главные действия: открыть существующую поездку / создать новую / присоединиться по invite.
2. При наличии поездок и отсутствии выбора показывается явный next-step prompt “выберите поездку”.
3. Разделение active/completed/archived сохранено через фильтры, но не перегружает верхний action-layer.

## 7) Что намеренно НЕ менялось

1. Не менялись travel domain model и миграции.
2. Не менялась settlement math (28I), multi-currency logic (28F), OCR domain (28G/28H), invite identity semantics (28M).
3. Не менялись recurring baseline и guide layer (28B/28C).
4. Не менялся root shell beyond existing 28J separation.

## 8) Risks / Regression Watchlist

1. Проверить поведение модалки на мобильной клавиатуре Telegram WebView (высота/скролл/фокус).
2. Проверить discoverability сворачиваемых secondary-блоков (participants/receipts/lifecycle) для новых пользователей.
3. Проверить continuity после join-invite (поездка должна корректно открываться и не терять контекст фильтра).
4. Проверить, что отсутствие автовыбора первой поездки не ухудшает сценарий power-user (переход в workspace в 1 тап сохраняется).

## 9) Проверки

Выполнено:
1. `npm run lint` - pass
2. `npm run build` - pass
3. targeted tests:
   - `node --test --test-isolation=none src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/currency.test.ts src/lib/travel/split.test.ts` - pass

## 10) Самопроверка против acceptance criteria

1. Более простой и дружелюбный Travel screen - выполнено.
2. Более удобная навигация внутри Travel - выполнено (action-first + explicit choose-trip).
3. Modal flow для создания новой поездки - выполнено.
4. Второстепенное унесено на 2-3 план - выполнено (join/participants/receipts/lifecycle).
5. Уже собранные travel-возможности сохранены - выполнено.
6. Recurring baseline и общая product truth не сломаны - выполнено по scope и проверкам.

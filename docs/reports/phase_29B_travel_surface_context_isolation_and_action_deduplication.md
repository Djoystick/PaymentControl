# Phase 29B - Travel Surface Context Isolation + Action Deduplication

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: targeted UX/UI cleanup pass for Travel tab after 29A/29A.1 (no schema/API/domain expansion)
- Baseline preserved:
  - donation-only product truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline from 28A-28Q
  - Telegram language model from 29A/29A.1 (Telegram `language_code` + English fallback + manual override priority)

## 1) Что именно было изменено

Проведен узкий pass по структуре Travel UI, чтобы убрать перегруз и разделить контексты:
1. Убран дублирующийся join entry-point на корневой поверхности Travel.
2. Join flow оставлен как один сценарий через отдельную модалку.
3. Create flow подтвержден как изолированный модальный сценарий.
4. Root surface и выбранная поездка разведены по отдельным состояниям рендера.
5. Внутри поездки добавлено переключение рабочих слоев (`Expenses` / `Settlements` / `History`) вместо одновременного показа всех крупных блоков.
6. Добавлен безопасный fallback-сценарий для ошибки загрузки деталей поездки (с явным возвратом к списку поездок).

## 2) Какие entry points убраны/объединены

1. Удален дублирующий inline/expand join-блок на root surface (`Join shared trip` больше не дублируется рядом с primary CTA).
2. Оставлен один root secondary CTA `Join shared trip`, который открывает отдельную join-modal.
3. Создание поездки по-прежнему открывается только через отдельный create-modal (без развернутой формы в общей поверхности).

## 3) Как теперь устроены create/join/view trip flows

### Travel root surface
1. Короткая поверхность: список поездок + 2 действия (`Create trip`, `Join shared trip`).
2. Без длинного описательного полотна и без дублирующихся действий.

### Create trip
1. Изолированная модалка (`pc-modal-dialog`) с минимально нужными полями.
2. После успешного создания пользователь попадает в контекст новой поездки.

### Join trip
1. Изолированная модалка с токеном приглашения.
2. Есть autofocus на input и закрытие по `Esc`/overlay (кроме состояния активного join).
3. После успешного join пользователь попадает в контекст поездки.

### Selected trip
1. Добавлен явный `Back to trips`, чтобы контекст поездки был отделен от root-списка.
2. В поездке включена layer-навигация:
   - `Expenses` -> участники / receipts / форма трат;
   - `Settlements` -> балансы и settlement plan;
   - `History` -> история трат.
3. Основные блоки больше не рендерятся одной непрерывной «простыней».

## 4) Затронутые файлы

1. `src/components/app/travel-group-expenses-section.tsx`
   - удален join-дубликат на root;
   - join вынесен в отдельную modal-поверхность;
   - root и selected-trip контексты разведены;
   - добавлен `Back to trips`;
   - добавлен workspace-layer switch (`expenses/settlements/history`);
   - добавлен fallback при недоступных деталях поездки.
2. `src/lib/i18n/localization.tsx`
   - добавлены RU-строки для новых UI-state/CTA в Travel pass.

## 5) Что сознательно НЕ менялось

1. Не менялись БД-схемы, миграции, travel domain model и API.
2. Не менялись бизнес-правила settlement/closure/archive/OCR/multi-currency/invite identity.
3. Не трогались Recurring lane, shell-архитектура root tabs и bot-facing manual-only слой.
4. Не менялась language/analytics логика 29A/29A.1.

## 6) Risks / Regression Watchlist

1. Проверить в Telegram runtime, что переключение `Expenses/Settlements/History` воспринимается как ожидаемая навигация, а не как скрытие данных.
2. Проверить, что join modal корректно ведет себя с мобильной клавиатурой (focus/close).
3. Проверить edge-case при временной ошибке загрузки trip detail: fallback-card должен возвращать пользователя в список без зависания.
4. Следить за discoverability вторичных блоков внутри `Expenses` слоя (participants/receipt details остаются в прогрессивном раскрытии).

## 7) Manual Verification Notes

Проверить руками в Telegram Mini App:
1. На Travel root нет дубликата `Присоединиться к поездке`.
2. `Создать поездку` открывает отдельную модалку и после close возвращает на чистую root-поверхность.
3. `Присоединиться к поездке` работает только через join-modal и успешно открывает trip context.
4. При открытии существующей поездки список поездок и join/create поверхности не рендерятся одновременно.
5. Переключатели `Expenses/Settlements/History` действительно уменьшают вертикальную перегрузку.
6. Кнопка `Назад к поездкам` всегда возвращает в список.
7. Временная ошибка загрузки trip detail показывает fallback с возвратом к списку.
8. Рабочие функции сохранены: add/edit/delete expense, participants, settlements, history, receipts, lifecycle.

## 8) Проверки

Выполнено:
1. `npm run lint` - pass (warnings only: существующие `@next/next/no-img-element` в receipt-превью)
2. `npm run build` - pass
3. targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 9) Самопроверка против acceptance criteria

1. Дубликат `Join shared trip` на root surface удален - выполнено.
2. Create trip остается изолированным modal flow - выполнено.
3. Вход в существующую поездку дает отдельный trip context без одновременного root-полотна - выполнено.
4. Налипание информации уменьшено через layer-based trip workspace - выполнено.
5. Travel root surface стала короче и чище - выполнено.
6. Recurring baseline, product truth и 29A/29A.1 language/analytics правила не затронуты - выполнено.

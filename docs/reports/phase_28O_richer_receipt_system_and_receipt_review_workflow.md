# Phase 28O - Richer Receipt System + Receipt Review Workflow

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: UX/workflow enrichment of existing Travel receipt layer (post-28N), without new OCR-core or shell wave
- Baseline preserved:
  - unrestricted donation-only truth
  - no Premium/entitlement/unlock return
  - no recurring/travel merge
  - all Travel capabilities from 28A-28N remain available

## 1) Что было найдено в audit после 28N

В runtime после 28N чековый слой работал, но оставался “черновым” в ежедневном использовании:
1. Список чеков был плоским и слабо разделял “требует действий” vs “уже обработано”.
2. Review path требовал лишних переходов: детальный разбор OCR и действия с чеком были размазаны по карточке.
3. Связь `receipt -> expense` была неочевидной в обе стороны.
4. При нескольких чеках в поездке быстро терялась фокусировка: что проверить сейчас, что уже закрыто.

## 2) Почему richer receipt system выбран следующим шагом

После 28G/28H (capture + OCR quality) и 28N (surface simplification) следующим практичным шагом стало доведение receipt workflow до зрелого “рабочего” состояния:
1. быстрый triage нескольких чеков,
2. ясный review-сценарий,
3. прозрачная связь чека с созданной тратой,
4. без изменения core-модели OCR/manual-confirmation.

## 3) Как изменен receipt list / review workflow

Сделано:
1. Добавлен status-driven receipt triage:
   - `Needs attention`
   - `Ready`
   - `Processed`
   - `All`
2. Добавлены компактные счетчики по статусам и фильтры, чтобы не теряться в большом списке.
3. Обновлены пустые состояния по фильтрам (человеческие подсказки “что здесь появляется”).
4. У карточек чеков оставлен только “быстрый” набор:
   - мини-превью,
   - статус,
   - timestamp,
   - короткий next-action,
   - OCR amount (если есть),
   - linkage hint.
5. Добавлен отдельный modal review flow (`Receipt review`):
   - статус + summary,
   - parse metadata (attempts / last attempt / image updated),
   - detected values + field quality pills,
   - OCR raw snippet,
   - связанные действия (reparse/reset/replace/apply/delete в допустимых состояниях).

## 4) Как изменена связь receipt ↔ expense

Сделано:
1. В receipt review модалке добавлен явный linked-expense блок.
2. Добавлено действие `Open linked expense` из receipt list/review.
3. При открытии связанной траты:
   - переключается сортировка истории в `Newest`,
   - скролл ведет в history-секцию,
   - карточка связанной траты визуально подсвечивается.
4. В history-карточке траты с прикрепленным чеком добавлена обратная точка входа `Review receipt`.

## 5) Как сохранены OCR/manual confirmation rules

Сохранено без ослабления:
1. OCR по-прежнему не создает трату молча.
2. `Use in expense form` остается prefill-only действием, финальное сохранение всегда ручное.
3. User corrections остаются приоритетом над OCR suggestions.
4. Existing parse/reparse/reset/replace-photo ограничения по статусам и trip-editability сохранены.

## 6) Что намеренно НЕ менялось

1. Не менялся OCR-core/провайдер и логика извлечения (только workflow/surface слой).
2. Не менялись FX/multi-currency расчеты (28F).
3. Не менялись settlement/closure/archive/collaboration/invite domain rules (28E-28M).
4. Не менялся root shell и recurring lane.
5. Не добавлялись миграции и schema/API расширения.

## 7) Risks / Regression Watchlist

1. Проверить на мобильном Telegram WebView, что modal review стабилен с длинным OCR text (scroll/close UX).
2. Проверить быстрые последовательные действия parse/reset/replace в одном draft (race-like UX случаи).
3. Проверить открытие linked expense для старых поездок, где linked expense уже отсутствует.
4. Проверить discoverability фильтров (`Needs attention/Ready/Processed`) для first-time пользователей.

## 8) Проверки

Выполнено:
1. `npm run lint` - pass (warnings only: existing `@next/next/no-img-element` for receipt previews)
2. `npm run build` - pass
3. targeted tests/checks for touched area:
   - `npm run lint -- src/components/app/travel-group-expenses-section.tsx src/lib/i18n/localization.tsx` - pass (same warnings only)

Примечание:
1. Отдельных unit/integration test scripts для этой UI-секции в `package.json` нет; выполнен максимально целевой автоматический check через scoped lint.

## 9) Самопроверка против acceptance criteria

1. Более зрелый receipt workflow - выполнено.
2. Более понятные receipt list + review screen - выполнено.
3. Более ясная связь `receipt ↔ expense` - выполнено.
4. Более удобная работа с несколькими чеками - выполнено (status filters + counters + compact list).
5. OCR quality/manual confirmation правила сохранены - выполнено.
6. Recurring baseline и общая product truth не сломаны - выполнено по scope и проверкам.

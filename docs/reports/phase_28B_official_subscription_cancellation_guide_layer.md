# Phase 28B - Official Subscription Cancellation Guide Layer

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: аккуратный справочный слой с официальными инструкциями по отключению популярных подписок
- Baseline preserved:
  - unrestricted donation-only truth
  - no premium/entitlement/claim/unlock return
  - travel module (28A) and recurring unification (28A.1) unchanged by domain logic

## 1) Что было проанализировано

Перед реализацией проверены:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/phase_28A1_recurring_summary_slice_restoration_and_surface_unification.md`
5. `docs/reports/internal_version_history.md`

Runtime-точки интеграции:
1. `src/components/app/profile-scenarios-placeholder.tsx` (новый справочный блок в Profile)
2. `src/components/app/payments-dashboard-section.tsx` (тихий Home entry-point)
3. `src/components/app/app-shell.tsx` (короткое onboarding mention)
4. `src/lib/i18n/localization.tsx` (RU/EN strings для новых UI-элементов)

## 2) Первый набор сервисов (включено)

В каталог первого pass вошли:
1. Яндекс Плюс
2. Ozon Premium
3. СберПрайм
4. T-Premium
5. T-Pro
6. МТС Premium

## 3) Официальные источники

Использованы только официальные страницы:
1. Яндекс Плюс: `https://yandex.ru/support/plus-ru/ru/manage/unsubscribe`
2. Ozon Premium: `https://docs.ozon.ru/common/pravila-prodayoi-i-rekvizity/usloviya-podpiski-na-ozon-premium/`
3. СберПрайм: `https://help.zvuk.com/article/46228`
4. T-Premium: `https://www.tbank.ru/tinkoff-premium/grades/`
5. T-Pro: `https://www.tbank.ru/bank/help/general/pro/pro-subscription/control/`
6. МТС Premium: `https://support.mts.ru/mts-premium/upravlenie-podpiskoi/kak-otklyuchit-mts-premium`
7. App Store cancellation fallback: `https://support.apple.com/ru-ru/118428`
8. Google Play cancellation fallback: `https://support.google.com/googleplay/answer/7018481?hl=ru`

## 4) Что сознательно НЕ добавлялось в первый набор

Не добавлялись дополнительные сервисы, где в этом pass не было найдено достаточно ясной и стабильной официальной пользовательской инструкции с понятным отключением автопродления.

Причина:
1. приоритет на качество и достоверность над количеством,
2. явное требование использовать только официальные источники,
3. избегание сомнительных агрегаторов/пересказов.

## 5) Как реализован каталог (data-driven)

Добавлен отдельный каталог:
1. `src/lib/subscription-guides/catalog.ts`

Структура каждой инструкции включает:
1. `id`
2. название сервиса (RU/EN)
3. категорию
4. короткое описание
5. `verifiedOn`
6. массив `officialSources`
7. пошаговые действия (`steps`)
8. важные примечания (`importantNotes`)
9. channel-specific caveats (`channelCaveats`)
10. `keywords` для расширения

Дополнительно:
1. helper `getLocalizedGuideText(...)` для аккуратного выбора RU/EN без хаотичного хардкода по UI.

## 6) Как устроен UI в Profile

В `Profile` добавлен отдельный спокойный collapsible-блок:
1. заголовок: `How to cancel subscriptions`
2. выбор сервиса через `select`
3. карточка выбранного сервиса (категория, short-description, verified date)
4. пошаговые инструкции
5. важные примечания
6. channel-specific примечания (если есть)
7. список официальных ссылок (кликабельные)

Ключевые свойства:
1. блок вторичный и компактный,
2. без визуального перегруза и без превращения Profile в энциклопедию,
3. раскрытие деталей только после выбора сервиса.

## 7) Home и onboarding mentions

Добавлено аккуратно:
1. Home (`payments-dashboard-section`): тихая helper-card с CTA `Open cancellation guides`, ведущая в Profile.
2. Onboarding (`app-shell`): короткий пункт в шаге Profile о наличии официальных инструкций.

Без агрессивных баннеров и без смещения core utility иерархии.

## 8) Channel-specific различия

Явно учтены там, где это важно:
1. для Яндекс Плюс добавлены caveats по App Store / Google Play / partner channel,
2. для СберПрайм добавлен caveat о зависимости пути отключения от канала подключения,
3. в соответствующих caveats приложены официальные store sources (Apple/Google).

Для сервисов без подтвержденной channel-specific развилки в официальном тексте оставлен базовый путь без выдуманных универсальных советов.

## 9) Что намеренно НЕ менялось

1. travel data model/API/UI (28A) не менялись,
2. recurring business logic не менялась,
3. donation/supporter product truth не менялась,
4. БД и миграции не добавлялись,
5. нет новых тяжелых зависимостей.

## 10) Validation

Выполнено:
1. `node --test --test-isolation=none src/lib/subscription-guides/catalog.test.ts src/lib/app/context-memory.test.ts src/lib/support/bug-report-runtime-context.test.ts src/lib/travel/split.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass

Добавлен targeted test:
1. `src/lib/subscription-guides/catalog.test.ts`:
   - проверка присутствия обязательного стартового набора сервисов,
   - проверка официальных HTTPS-host источников,
   - проверка language helper.

## 11) Risks / regression watchlist

1. Официальные страницы сервисов могут менять структуру/URL, требуется периодическая ревизия каталога.
2. Channel-specific правила у сервисов могут обновляться быстрее, чем release cadence приложения.
3. Для расширения каталога важно сохранять тот же standard: только официальные источники + проверяемые шаги.

## 12) Self-check against acceptance criteria

1. Новый раздел в Profile с официальными инструкциями: да.
2. Первый полезный каталог популярных сервисов: да.
3. Пошаговые инструкции внутри приложения: да.
4. Мягкое упоминание в onboarding: да.
5. Ненавязчивое упоминание на Home: да.
6. Data-driven расширяемая основа: да.
7. Travel/release baseline не сломан: да.

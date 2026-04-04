# Phase 28C - Expanded Official Cancellation Catalog + Category Navigation

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: расширение guide-layer из 28B в полноценный официальный каталог с категориями и поиском
- Baseline preserved:
  - unrestricted donation-only model
  - no premium/entitlement/claim/unlock return
  - no travel/recurring domain merge

## 1) Что было проанализировано

Перед реализацией сверены:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/phase_28A1_recurring_summary_slice_restoration_and_surface_unification.md`
5. `docs/reports/phase_28B_official_subscription_cancellation_guide_layer.md`
6. `docs/reports/internal_version_history.md`

Проверены runtime-точки:
1. `src/lib/subscription-guides/catalog.ts`
2. `src/components/app/profile-scenarios-placeholder.tsx`
3. `src/components/app/payments-dashboard-section.tsx`
4. `src/components/app/app-shell.tsx`
5. `src/lib/i18n/localization.tsx`

## 2) Какие категории введены

Введены 5 основных категорий:
1. App stores / каналы оформления (`app_store_channels`)
2. Банки / премиальные банковские сервисы (`banking_premium`)
3. Маркетплейсы / retail membership (`marketplace_retail_membership`)
4. Медиа / digital services (`media_digital_services`)
5. Телеком / bundled premium services (`telecom_bundles`)

## 3) Какие сервисы вошли в расширенный каталог

Добавлен расширенный официальный набор:
1. App Store subscriptions
2. Google Play subscriptions
3. Яндекс Плюс
4. Ozon Premium
5. СберПрайм
6. T-Premium
7. T-Pro
8. МТС Premium
9. Okko
10. Иви
11. X5 «Пакет»

## 4) Какие официальные источники использовались

Использованы только официальные страницы:
1. Apple Support: `https://support.apple.com/ru-ru/118428`
2. Google Play Help: `https://support.google.com/googleplay/answer/7018481?hl=ru`
3. Яндекс Плюс: `https://yandex.ru/support/plus-ru/ru/manage/unsubscribe`
4. Ozon Premium docs: `https://docs.ozon.ru/common/pravila-prodayoi-i-rekvizity/usloviya-podpiski-na-ozon-premium/`
5. СберПрайм (официальный support-канал экосистемы): `https://help.zvuk.com/article/46228`
6. T-Premium: `https://www.tbank.ru/tinkoff-premium/grades/`
7. T-Pro: `https://www.tbank.ru/bank/help/general/pro/pro-subscription/control/`
8. МТС Premium: `https://support.mts.ru/mts-premium/upravlenie-podpiskoi/kak-otklyuchit-mts-premium`
9. Okko: `https://help.okko.tv/subs/cancel`
10. Иви (сайт): `https://ask.ivi.ru/knowledge-bases/10/articles/51701-kak-otklyuchit-avtomaticheskoe-prodlenie-na-sajte-iviru`
11. Иви (общая инструкция): `https://ask.ivi.ru/knowledge-bases/10/articles/29931-kak-otklyuchit-avtomaticheskoe-prodlenie-podpiski`
12. Иви (App Store channel-specific): `https://ask.ivi.ru/knowledge-bases/10/articles/45099-kak-otmenit-podpisku-podklyuchennuyu-cherez-app-store`
13. X5 «Пакет» terms: `https://x5paket.ru/docs/terms_of_use.pdf`

## 5) Какие сервисы сознательно исключены и почему

В этом pass сознательно исключены кандидаты, где не удалось подтвердить качественную, явную и актуальную пользовательскую инструкцию на официальном источнике:
1. VK Музыка (в поисковой выдаче преобладали неофициальные видео/пересказы)
2. иные сервисы, где находились только агрегаторы/форумы/репосты без надежного official help-flow

Причина исключения:
1. strict official-only policy,
2. приоритет качества и проверяемости над «количеством любой ценой».

## 6) Как устроены категории и поиск

Укреплена data-driven архитектура:
1. `SubscriptionGuide` расширен полями:
   - `displayName`
   - `categoryId`
   - `notes`
   - `channelSpecificNotes`
   - `keywords`
   - `aliases`
   - `priority`
   - `featured`
   - `regionContextNote` (optional)
2. добавлены `subscriptionGuideCategories`
3. добавлен `filterSubscriptionGuides(category, query)`:
   - фильтр по категории,
   - поиск по display name + aliases + keywords + description,
   - сортировка `featured -> priority -> name`

В UI Profile:
1. поиск по каталогу (`Find service`)
2. category chips (`All categories` + 5 категорий)
3. featured quick-picks (`Popular services`)
4. выпадающий список сервисов уже на отфильтрованном наборе
5. счетчик найденных записей

## 7) Как учтены channel-specific различия

Явно отражены channel-specific ветки там, где это критично:
1. App Store и Google Play вынесены отдельными записями как каналы оформления
2. для сервисов (Яндекс Плюс, СберПрайм, Иви и др.) добавлены блоки «если оформляли через ...»
3. для X5 «Пакет» добавлено ограничение по partner-channel semantics на основе официального соглашения

Принцип:
1. не даются «универсальные» шаги там, где реальный путь зависит от канала оплаты.

## 8) Как сохранена мягкость UX

Сохранены UX-инварианты:
1. guide-layer остается вторичным collapsible-блоком в Profile
2. Home mention не превращен в шумный баннер
3. onboarding mention остался коротким
4. детали показываются после навигации (категория/поиск/выбор), а не как wall-of-text

## 9) Что намеренно НЕ менялось

1. travel-модуль 28A не менялся
2. recurring business logic не менялась
3. reminders/history/workspace/family flows не менялись
4. БД, API и миграции не трогались
5. donation/supporter truth не менялась
6. anchor не обновлялся (новой product truth не появилось)

## 10) Validation

Выполнено:
1. `node --test --test-isolation=none src/lib/subscription-guides/catalog.test.ts src/lib/app/context-memory.test.ts src/lib/support/bug-report-runtime-context.test.ts src/lib/travel/split.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass

Добавлены/обновлены targeted tests:
1. `src/lib/subscription-guides/catalog.test.ts`
   - проверка обязательного расширенного набора сервисов
   - проверка official https-host policy
   - проверка category/query filtering
   - проверка localization helpers

## 11) Risks / regression watchlist

1. Официальные help URL могут меняться, нужен периодический линк-аудит.
2. Channel-specific правила сервисов могут обновляться чаще release cadence.
3. При дальнейшем расширении важно не снижать official-only дисциплину и не добавлять агрегаторные источники.

## 12) Self-check against acceptance criteria

1. Сильно расширенный официальный каталог: да.
2. Категории и навигация добавлены: да.
3. Поиск по каталогу добавлен: да.
4. Слой остался data-driven и расширяемым: да.
5. Профиль/Home/onboarding остались спокойными: да.
6. Travel и release baseline не сломаны: да.

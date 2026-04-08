# Phase 30S - Subscription Cancellation Guide Expansion and Official Step-by-Step Instructions

- Date: 2026-04-07
- Status: implemented, pending manual verification
- Scope: отдельный pass на расширение и углубление блока инструкций по отключению подписок с official-only источниками
- Baseline preserved:
  - donation-only модель без paywall/unlock
  - recurring/travel separation
  - существующий app shell и verified flows

## 1) Что было прочитано перед началом

Обязательные source-of-truth документы прочитаны полностью:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`

Дополнительно:
1. `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
2. `docs/reports/phase_28C_expanded_official_cancellation_catalog_and_category_navigation.md`

## 2) Как использован `ui-ux-pro-max`

Использован локальный skill:
- `.codex/skills/ui-ux-pro-max/SKILL.md`

Применение в pass:
1. Выполнен `design-system` поиск под задачу knowledge UX (search + progressive disclosure + calm profile).
2. Зафиксированы принципы:
   - low-noise mobile-first,
   - компактный searchable список,
   - отдельный детальный слой для длинных шагов,
   - явные confirm-проверки результата отключения,
   - без giant content wall в Profile.
3. В UI реализована схема:
   - inline поиск/фильтр/выбор,
   - detail-инструкция во вложенном `ModalSheet`.

## 3) Как использован `DESIGN.md`

Ключевые правила `DESIGN.md`, примененные в изменениях:
1. Root surface brevity: Profile не перегружен длинным текстом.
2. Progressive disclosure: полный step-by-step вынесен в отдельный слой.
3. One clear next action: карточки сервисов с явным CTA `Открыть инструкцию`.
4. Text restraint: на верхнем уровне только summary + verified marker.
5. Mobile-first flow: быстрый поиск -> компактная карточка -> полный гайд.

## 4) Что изменено в данных (data-driven модель)

`src/lib/subscription-guides/catalog.ts` переведен на более управляемую структуру:
1. Категории:
   - `app_store_channels`
   - `ecosystem_content_services`
   - `banking_premium_options`
   - `marketplace_memberships`
   - `telecom_mobile_subscriptions`
   - `global_digital_services`
2. Добавлены каналы отключения (`cancellationChannels`):
   - сайт / приложение / личный кабинет / банк / оператор / App Store / Google Play / partner billing
3. Для каждого сервиса структурированы поля:
   - `id`
   - `displayName`
   - `aliases`, `keywords`
   - `categoryId`
   - `cancellationScope`
   - `shortDescription`
   - `officialSources`
   - `steps`
   - `confirmationChecks`
   - `notes`
   - optional `appStoreGooglePlayNote`
   - optional `supportContactNote`
   - `verifiedOn`
4. Поиск обновлен на stack из id/name/summary/scope/channels/keywords/aliases.

## 5) Расширение каталога сервисов

До pass: 11 сервисов.  
После pass: 18 сервисов.

Добавлены новые сервисы:
1. `start-online-cinema` (START)
2. `kion` (KION)
3. `tbank-partner-subscriptions`
4. `youtube-premium`
5. `netflix`
6. `spotify-premium`
7. `chatgpt-plus`

Сохранены и углублены существующие:
1. App Store subscriptions
2. Google Play subscriptions
3. Яндекс Плюс
4. Иви
5. Okko
6. Ozon Premium
7. X5 «Пакет»
8. T‑Pro
9. T‑Premium
10. СберПрайм
11. МТС Premium

## 6) Official-source only: как организованы источники

В каталоге оставлены только официальные источники (help/support/docs/официальные условия):
1. `support.apple.com`
2. `support.google.com`
3. `yandex.ru`
4. `start.ru`
5. `ask.ivi.ru`
6. `help.okko.tv`
7. `kion.ru`
8. `docs.ozon.ru`
9. `x5paket.ru`
10. `www.tbank.ru`
11. `help.zvuk.com`
12. `support.mts.ru`
13. `help.netflix.com`
14. `support.spotify.com`
15. `help.openai.com`

Тестом закреплено:
- только `https`
- host allowlist (официальные домены)

## 7) Что изменено в UX блока внутри приложения

`src/components/app/profile-scenarios-placeholder.tsx`:
1. Сохранен вход в блок из Profile через существующий `ModalDisclosure`.
2. Внутри блока:
   - поиск по сервисам,
   - category chips,
   - popular chips.
3. Вместо длинной inline-простыни:
   - компактные карточки сервисов,
   - отдельный detail-layer (`ModalSheet`) для полной инструкции.
4. В detail-layer показываются:
   - что отключаем,
   - verified marker,
   - каналы отключения,
   - пошаговые действия,
   - как проверить результат,
   - app-store/google-play note (если есть),
   - support note (если есть),
   - official sources.
5. Добавлен спокойный disclaimer об актуальности UI сервиса.

## 8) Измененные файлы

1. `src/lib/subscription-guides/catalog.ts`
2. `src/lib/subscription-guides/catalog.test.ts`
3. `src/components/app/profile-scenarios-placeholder.tsx`

## 9) Что сознательно НЕ менялось

1. Travel runtime и API.
2. Recurring business logic.
3. Donor/supporter/paywall truth.
4. DB schema и migrations.
5. App navigation shell beyond targeted guide block.

## 10) Проверки

Выполнено:
1. `node --test --test-isolation=none src/lib/subscription-guides/catalog.test.ts` - pass
2. `npm run lint` - pass (есть только pre-existing warnings вне scope)
3. `npm run build` - pass

## 11) Manual verification checklist

1. Profile -> `How to cancel subscriptions` открывается без регрессий.
2. Поиск по RU/EN alias находит нужные сервисы.
3. Category filters корректно меняют выдачу.
4. Карточки сервисов остаются компактными (без text wall).
5. `Открыть инструкцию` открывает `ModalSheet` с полным step-by-step.
6. В detail-layer видны:
   - channels
   - steps
   - confirmation checks
   - official sources
7. Ссылки официальных источников открываются во внешнем окне.
8. Проверить на мобильном viewport (Telegram WebView):
   - скролл модалки
   - возврат назад
   - повторный выбор другого сервиса.

## 12) Risks / maintenance notes

1. Help-центры сервисов регулярно меняют UI и тексты кнопок.
2. Некоторые сервисы меняют путь отмены по billing channel (store/operator/partner).
3. Для каталога нужен периодический source re-verification pass.
4. Для сервисов с geo-ограничениями UI может отличаться по регионам; при расхождении source остается официальная страница сервиса.

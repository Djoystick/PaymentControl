# Phase 30T - Bank Premium + Retail Subscription Guide Expansion

- Date: 2026-04-08
- Status: implemented, pending manual verification
- Scope: узкий pass на расширение блока инструкций по отключению подписок с фокусом на банковские premium/подписочные опции и retail/marketplace memberships
- Baseline preserved:
  - donation-only модель без paywall/unlock
  - recurring/travel separation
  - существующий app shell и verified flows

## 1) Что было прочитано перед началом

Обязательные source-of-truth документы прочитаны полностью:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. Контекст предыдущего pass: `docs/reports/phase_30S_subscription_cancellation_guide_expansion_and_official_step_by_step_instructions.md`

Дополнительно (framework constraint):
1. `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`

## 2) Как использован `ui-ux-pro-max`

Использован локальный skill:
- `.codex/skills/ui-ux-pro-max/SKILL.md`
- запуск design-system поиска:
  - `python .codex/skills/ui-ux-pro-max/scripts/search.py "mobile subscription cancellation knowledge bank retail" --design-system -f markdown`

Что взято в pass как практический reference:
1. anti-pattern `No search` как обязательный запрет (поиск сохраняем и не деградируем).
2. mobile-first readability: длинные инструкции остаются в detail-layer, не в root list.
3. low-noise knowledge UX: compact list + быстрый переход в пошаговый сценарий.

Что осознанно НЕ взято из design-system вывода:
1. визуальный стиль/палитра для лендингов (не релевантно задаче расширения каталога инструкций).

## 3) Как использован `DESIGN.md`

Примененные правила:
1. Root surface brevity: Profile не перегружен текстовой стеной.
2. Progressive disclosure: full step-by-step читается в отдельном detail-layer.
3. Utility over decoration: pass сосредоточен на практической полезности инструкций.
4. One clear next action: пользователь продолжает сценарий через выбор сервиса и открытие карточки инструкции.

## 4) Practical Content Gap Audit

### Что было недокрыто до pass
1. Банковский блок: ограничивался в основном T‑Bank + SberPrime.
2. Retail/marketplace блок: фактически только `Ozon Premium` и `X5 «Пакет»`.
3. Недоставало официальных пошаговых инструкций по международным consumer memberships, связанных с покупками/доставкой и банковскими paid plans.

### Что добавлено по результатам gap-аудита
1. Банк premium / подписочные банковские опции:
   - `vtb-operation-alerts`
   - `n26-premium-membership`
   - `monzo-plus-premium`
2. Retail / store / marketplace memberships:
   - `walmart-plus`
   - `instacart-plus`
   - `uber-one`

## 5) Масштаб расширения

1. Общий каталог: `18 -> 24` сервисов (`+6`).
2. Банковский блок (`banking_premium_options`): `4 -> 7` (`+3`).
3. Ритейл/маркетплейс блок (`marketplace_memberships`): `2 -> 5` (`+3`).

## 6) Official-source-only: какие источники использованы

Для каждого нового сервиса добавлены только официальные источники:
1. VTB operation alerts:
   - `https://www.vtb.ru/personal/online-servisy/sms-opovesheniya/`
2. N26 premium membership:
   - `https://support.n26.com/en-eu/memberships-and-account-types/premium-accounts/how-to-cancel-my-n26-premium-membership`
3. Monzo Plus/Premium:
   - `https://monzo.com/help/monzo-plus/plus-cancel`
   - `https://monzo.com/help/monzo-premium/premium-cancel/`
4. Walmart+:
   - `https://www.walmart.com/help/article/cancel-walmart/126c9a990a944c3abd8531de52a87440`
5. Instacart+:
   - `https://www.instacart.com/help/section/360007797952/4408784716820`
6. Uber One:
   - `https://help.uber.com/riders/article/how-do-i-cancel-my-uber-one-membership?nodeId=caae683e-de76-4308-b35d-a515c57fbe45`

Правило pass:
1. если официальный источник описывает ограничения/условия по срокам или trial, они отражены в `notes`;
2. непроверенные или сторонние шаги не добавлялись.

## 7) Как расширена структура данных

`src/lib/subscription-guides/catalog.ts`:
1. Архитектура data-driven сохранена.
2. UI hardcode не добавлялся.
3. Для новых сервисов заполнены штатные поля модели:
   - `id`, `displayName`, `categoryId`
   - `cancellationScope`, `shortDescription`
   - `verifiedOn` (для новых записей: `2026-04-08`)
   - `cancellationChannels`
   - `officialSources` (`label + url`)
   - `steps` (полноценный step-by-step)
   - `confirmationChecks`
   - `notes` / `supportContactNote` (где уместно)
   - `keywords`, `aliases`
4. Добавлены source constants для новых официальных источников.

## 8) UX поиска и просмотра инструкций

Изменения UI не требовались.

Почему:
1. текущий UX из 30S уже покрывает задачу:
   - compact searchable list,
   - category filtering,
   - detail-layer для длинных инструкций.
2. добавление новых сервисов автоматически подхватывается существующим каталогом и поиском.

Итог:
1. UX-паттерн сохранен;
2. Profile не утяжелен;
3. масштабирование достигнуто за счет контента/данных, а не новой navigation wave.

## 9) Измененные файлы

1. `src/lib/subscription-guides/catalog.ts`
2. `src/lib/subscription-guides/catalog.test.ts`
3. `docs/reports/internal_version_history.md`

Новый отчет:
1. `docs/reports/phase_30T_bank_premium_and_retail_subscription_guide_expansion.md`

## 10) Что сознательно НЕ менялось

1. `src/components/**` UI-структура блока (без новых навигационных волн).
2. Recurring и Travel модули/логика/API.
3. Donation/supporter truth, paywall/entitlement механики.
4. DB schema, migrations, backend contracts.
5. App shell и verified baseline flows.

## 11) Проверки

Выполнено:
1. `node --test --test-isolation=none src/lib/subscription-guides/catalog.test.ts` - pass
2. `npm run lint` - pass (только pre-existing warnings вне scope в `travel-group-expenses-section.tsx`)
3. `npm run build` - pass

## 12) Manual verification checklist

1. Profile -> `How to cancel subscriptions` открывается без регрессий.
2. Поиск находит новые банковские сервисы:
   - `vtb`, `n26`, `monzo`.
3. Поиск находит новые retail/marketplace сервисы:
   - `walmart`, `instacart`, `uber one`.
4. Фильтр `Банковские premium / подписочные опции` показывает расширенный список (>= 7).
5. Фильтр `Маркетплейс-подписки и retail membership` показывает расширенный список (>= 5).
6. В detail-layer каждого нового сервиса видны:
   - каналы отключения,
   - step-by-step,
   - confirmation checks,
   - официальный источник.
7. На мобильном viewport (Telegram WebView):
   - список остается компактным,
   - detail-layer читается и скроллится,
   - возврат назад не ломает контекст поиска.

## 13) Risks / maintenance notes

1. Help-страницы сервисов могут менять структуру, labels и глубину меню.
2. Для некоторых сервисов шаги отличаются по региону/платформе/типу биллинга.
3. По части банковских зарубежных сервисов условия минимального срока и cancellation fees могут меняться; требуется периодический re-verification.
4. Рекомендуем регулярный контент-pass с пере-проверкой официальных URL и терминологии кнопок.

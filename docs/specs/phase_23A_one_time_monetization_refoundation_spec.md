# Phase 23A — One-Time Monetization Refoundation Spec

Статус: APPROVED-SPEC (planning-only)
Дата: 2026-03-29
Основной source-of-truth: `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

## A) Purpose

### Почему нужен пивот
Ранее monetization-ветка строилась как Boosty-first subscription + manual claim/review.
После нового решения продукта это больше не актуальная истина.

### Текущая истина
- Premium = разовая покупка (one-time purchase), а не подписка.
- Support = отдельная добровольная поддержка (донат).
- Донат не дает Premium автоматически.
- Free-core остается нетронутым.
- Нельзя обещать авто-подтверждение оплаты, если его реально нет.

### Что историческое, но полезное
Из ветки 22A–22F полезны:
- claim lifecycle и хранение доказательств;
- owner review queue;
- owner-only visibility и owner notes;
- разделение Buy/Support/Claim в Profile;
- owner notification на событие "claim submitted";
- purchase intent/correlation code как механизм сверки.

### Что superseded
- subscription-first трактовка Premium как текущей модели.
- тексты и поля с явной подписочной семантикой (`subscription`, `premium_monthly`, `boosty_premium` как единственная целевая rail).

---

## B) Product Rules

1. Premium продается как one-time пакет/доступ на период, не как подписка.
2. Support всегда отдельный сценарий.
3. Донат не должен автоматически выдавать Premium.
4. Free-core функции не блокируются.
5. Любой "pending/approved/rejected" статус должен быть честным и понятным.
6. Нельзя писать или намекать, что оплата подтверждается автоматически, если это не реализовано.
7. Пользовательский путь должен быть коротким, спокойным и без витринной агрессии.

---

## C) User-Facing Rails Definition

## 1) Buy Premium
Что ожидает пользователь:
- понятный путь к разовой покупке Premium;
- ясное сообщение "что покупаю" и "что делать после оплаты".

Что система должна говорить:
- "Разовая покупка Premium";
- "После оплаты подтвердите покупку в приложении";
- "Базовые функции остаются бесплатными".

Что система не должна говорить:
- "Подписка Premium" как текущая истина;
- "Оплата подтверждается автоматически";
- "Support выдает Premium".

Старт действия:
- кнопка `Buy Premium` в Profile monetization блоке.

Что после отправки/перехода:
- пользователь уходит во внешний платежный rail;
- после возврата видит явный шаг `Claim / Confirm Premium purchase`.

Что видит owner:
- новый claim в очереди на проверку;
- контекст покупки (код/доказательства/ожидаемый пакет).

## 2) Support the project
Что ожидает пользователь:
- отдельный путь добровольной поддержки.

Что система должна говорить:
- "Это поддержка проекта";
- "Не выдает Premium автоматически".

Что система не должна говорить:
- "Поддержка = Premium";
- "Эта оплата автоматически активирует Premium".

Старт действия:
- кнопка `Support the project`.

Что после отправки/перехода:
- пользователь завершает донат;
- без авто-изменения entitlement.

Что видит owner:
- отдельный сигнал только если продукт позже добавит такую операционную потребность.
- в MVP 23A фокус на purchase claim queue, не на донат-модерации.

## 3) Claim / Confirm Premium purchase
Что ожидает пользователь:
- быстрый и понятный способ подтвердить уже сделанную оплату.

Что система должна говорить:
- "Вы уже оплатили? Отправьте подтверждение на проверку";
- "Статус: pending / approved / rejected";
- "Проверка выполняется owner вручную".

Что система не должна говорить:
- "Premium уже активирован автоматически" до owner approve;
- "Claim = мгновенная активация".

Старт действия:
- кнопка `I already paid / Claim Premium`.

Что после отправки:
- claim получает статус `submitted/pending review`;
- пользователь видит понятное следующее действие (ожидать решение/обновить данные и повторить).

Что видит owner:
- claim в queue;
- доказательства;
- решение approve/reject;
- заметки и метаданные проверки.

---

## D) Reuse Map from Old Monetization Branch

### Reusable as-is
1. Owner-only access model (`PREMIUM_ADMIN_TELEGRAM_USER_IDS`, server check).
2. Общий ручной review loop: claim -> owner decision -> user sees result.
3. Owner notification pattern на событие "claim submitted" (без авто-подтверждения оплаты).
4. Базовая разделенность user rails в Profile (Buy / Support / Claim как отдельные зоны).

### Reusable with adaptation
1. Claim lifecycle (`submitted`, `approved`, `rejected`, ...):
   - можно сохранить каркас, но переписать смысл/копирайтинг под one-time.
2. Purchase intent + correlation code:
   - оставить идею связи покупки и claim;
   - убрать подписочную трактовку полей и текста.
3. Owner review queue:
   - сохранить компактную операционную форму;
   - адаптировать поля tier/source под one-time package.
4. Entitlement source mapping:
   - текущий `boosty` источник в коде/БД адаптировать к neutral one-time semantics.

### Replace / rebuild
1. Явные subscription-formулировки в UI и helper text.
2. Жесткие дефолты `premium_monthly` и описание "Boosty subscription".
3. Любая семантика, где пользователь может прочитать, что Premium связан с регулярным списанием.

---

## E) Data/State Semantics Proposal (без миграций в 23A)

## 1) Что означает one-time purchase record
One-time purchase record = запись о попытке/факте разовой покупки Premium-пакета,
которая помогает сопоставить внешнюю оплату и внутренний claim.

## 2) Что означает claim в новой модели
Claim = запрос пользователя на подтверждение уже совершенной разовой оплаты,
с приложенным доказательством и контекстом.

## 3) Что означает owner review action
- `approve`: подтверждение оплаты и выдача/продление Premium согласно one-time правилам пакета.
- `reject`: отказ с сохранением free-core доступа и понятным следующим шагом для пользователя.

## 4) Нужные статусы и их смысл
Рекомендуемая целевая интерпретация:
- `submitted`: claim отправлен и ожидает owner review.
- `pending_review`: используется только если реально есть отдельный этап триажа.
- `approved`: claim подтвержден, entitlement применен.
- `rejected`: claim отклонен, можно подать новый после исправления.
- `cancelled/expired`: технически закрыт, но не активировал Premium.

Для purchase intent (если остается отдельной сущностью):
- `created`: код/контекст создан.
- `claimed`: intent привязан к claim.
- `consumed`: intent завершен после финального review outcome.
- `cancelled/expired`: intent закрыт без активации.

## 5) Какие старые поля/статусы выглядят misleading
Кандидаты на адаптацию в 23B:
- `claim_rail = boosty_premium` (слишком провайдеро- и subscription-специфично).
- `intent_rail = boosty_premium`.
- `expected_tier = premium_monthly` как дефолт.
- `entitlement_source = boosty` в approve-flow как единственный смысл.
- тексты `Boosty subscription`, `Continue to Boosty` как продуктовая норма.

---

## F) UX Copy Rules

### Базовые принципы
- коротко;
- спокойно;
- честно;
- без маркетингового давления;
- без обещаний автоматической верификации.

### Buy Premium
Нужно:
- "Разовая покупка Premium";
- "После оплаты подтвердите покупку".

Нельзя:
- "Подписка" как текущий факт;
- "авто-активация" без review.

### Support the project
Нужно:
- "Добровольная поддержка";
- "Не активирует Premium автоматически".

Нельзя:
- намек "донат = premium".

### Claim Premium
Нужно:
- "Я уже оплатил";
- "Отправьте подтверждение";
- "Ожидает проверки owner".

Нельзя:
- "Premium уже активирован" до approve.

### Состояния
- pending: "на проверке" + ожидание;
- approved: "подтверждено" + Premium активен;
- rejected: "отклонено" + понятный recovery шаг;
- needs review: нейтральная формулировка без тревожного тона.

### Owner notes
- короткие и операционные;
- без пользовательских обещаний про автоматику;
- без технического шума, который не нужен для решения.

---

## G) Profile UX Structure Proposal

Целевая структура monetization блока в Profile (сверху вниз):

1. `Premium status` (спокойный статус + last checked).
2. `Buy Premium` (главный monetization CTA, но без витринной агрессии).
3. `Support the project` (заметный, но вторичный к Buy Premium).
4. `Claim / Confirm purchase` (операционный блок для уже оплативших).
5. Compact state feedback (`pending/approved/rejected`) + next step.

Иерархия:
- Buy Premium чуть сильнее визуально;
- Support и Claim читаются отдельно и не смешиваются;
- никаких длинных маркетинговых блоков;
- фокус на понятных действиях.

---

## H) Owner Operational Flow

Простой честный flow:
1. Пользователь отправляет claim после внешней оплаты.
2. Owner получает сигнал о новом claim (notification/event).
3. Owner открывает очередь и проверяет доказательства/контекст.
4. Owner нажимает `approve` или `reject` (+ короткая заметка при необходимости).
5. Пользователь видит обновленный статус claim.

Что остается manual:
- сверка доказательства оплаты;
- финальное решение approve/reject.

Что нельзя показывать как автоматическое:
- подтверждение факта оплаты провайдером;
- авто-активацию Premium только по коду intent.

---

## I) Risk List

1. Пользовательская путаница, если в UI останутся слова про подписку как "текущую" модель.
2. Ложные ожидания, если оставить формулировки про авто-подтверждение.
3. Нарушение free-core доверия, если copy звучит как paywall для базовых функций.
4. Операционные ошибки owner review, если tier/source поля останутся подписочно-неоднозначными.
5. Смешение Support и Buy Premium может привести к конфликтам и жалобам.
6. Неполная адаптация старых статусов/дефолтов вызовет внутренние и UI-противоречия.

---

## J) Phase Breakdown Proposal

## 23B — Data/Claim Adaptation for One-Time Premium
Objective:
- адаптировать data/model смыслы claim/intent/entitlement под one-time purchase.

Scope:
- типы, дефолты, enum/валидации, owner approve semantics.

Dependencies:
- этот spec (23A).

Acceptance criteria:
- в коде/данных нет subscription-first дефолтов как active truth;
- one-time semantics читается однозначно;
- manual review truth сохранен.

Must NOT break:
- owner-only boundaries;
- existing claim queue flow;
- free-core.

## 23C — Profile Monetization UX Rebase (One-Time)
Objective:
- перевести Profile monetization UX/copy на one-time truth.

Scope:
- Buy/Support/Claim блок, тексты, шаги, статусные подсказки.

Dependencies:
- 23B.

Acceptance criteria:
- user четко понимает разницу Buy vs Support vs Claim;
- нет storefront-агрессии;
- нет подписочного copy как текущей истины.

Must NOT break:
- 4-tab shell;
- onboarding/help popover behavior;
- compact app-like rhythm.

## 23D — Owner Reconciliation Parity Pass
Objective:
- довести owner queue и review copy/metadata до one-time модели.

Scope:
- owner queue labels, notes, decision semantics, event wording.

Dependencies:
- 23B/23C.

Acceptance criteria:
- owner принимает решения быстрее и без semantic ambiguity;
- notification текст честный и короткий.

Must NOT break:
- admin visibility/security;
- existing gift/manual grant compatibility.

## 23E — End-to-End Manual Closure Pack
Objective:
- формально закрыть one-time monetization MVP ручной проверкой.

Scope:
- полный e2e checklist: buy rail, support rail, claim submit, owner review, user outcome.

Dependencies:
- 23C/23D.

Acceptance criteria:
- пройден полный manual pack без regressions;
- no false automation claims;
- free-core intact.

Must NOT break:
- core payment/reminder/history/family flows;
- owner-only boundary;
- cache/help/template invariants.

---

## Self-check (23A pass goal)
Этот 23A считается успешным, если:
- есть четкий one-time spec;
- есть честная карта reuse/adapt/replace;
- зафиксированы риски и противоречия;
- нет раннего runtime-refactor или скрытых изменений поведения.

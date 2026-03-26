# Payment Control Mini App — подробный миграционный якорь после закрытия Phase 8C

Дата фиксации: 2026-03-26  
Проект: Telegram Mini App для контроля регулярных платежей, подписок и домашних расходов  
Текущая точка переезда: **Phase 8C и Phase 8C.1 закрыты руками; переезд в новый чат можно делать сразу после этого якоря.**

---

## Короткая фраза для старта нового чата

**Последний полностью закрытый руками этап: Phase 8C.1.**  
**Phase 8B имеет статус partially verified: create invite подтвержден руками, accept invite другим реальным Telegram-профилем еще не подтвержден из-за dev fallback ограничения.**  
**Текущий следующий большой блок roadmap: продолжение family foundation после 8C, с учетом того, что 8B accept-flow нужно позже отдельно добить реальным внешним пользователем.**

---

## 1. Что это за продукт

Создается Telegram Mini App внутри Telegram для бытового контроля обязательных оплат:
- регулярные платежи;
- подписки;
- домашние расходы;
- позже — семейный режим;
- позже — premium-функции;
- позже — growth/реферальные механики.

Продукт должен ощущаться не как тяжелая бухгалтерия, а как:
- быстрый домашний центр обязательных оплат;
- понятный контроль подписок и регулярных списаний;
- удобный Telegram-native инструмент, который часто открывают.

---

## 2. Техническая основа проекта

- Frontend: **Next.js + TypeScript + Tailwind**
- Backend / DB: **Supabase**
- Telegram layer: **Telegram Mini App + Bot API**
- Deploy frontend/platform: **Vercel**
- GitHub namespace: **Djoystick**
- Локальная работа через dev fallback уже использовалась для большинства ручных проверок

---

## 3. Обязательные правила работы дальше

### Основной цикл работы
1. Я даю промт для Codex.
2. Codex делает pass.
3. Codex сохраняет **полный подробный отчет в `.md`**.
4. В чате Codex пишет только **краткий итог**.
5. Пользователь присылает сюда `.md`-отчет.
6. Здесь делается ручная проверка.
7. Только после ручного ОК дается следующий промт.

### Обязательные правила для будущих промтов
- Перед каждым промтом **явно помечать модель**:
  - **ChatGPT 5.4**
  - **ChatGPT 5.3 Codex**
- Не делать лишних рефакторингов.
- Не перескакивать через roadmap.
- Все изменения держать **минимальными и локальными**.
- Не заявлять runtime-проверку, если она реально не подтверждена.
- Полный отчет сохранять в `docs/...md`.
- В чате Codex должен писать только короткий итог:
  - A. что изменено
  - B. какие ключевые файлы созданы/изменены
  - C. что реально подтверждено / не подтверждено
  - D. блокеры / assumptions / manual setup

### Дополнительное правило по стилю работы
- Все объяснения пользователю — **на русском языке** и **простыми понятными формулировками**.
- Если для проверки что-то неудобно симулировать в dev fallback, это надо честно фиксировать как **partially verified**, а не дожимать искусственно ценой лишнего scope.

---

## 4. Архитектурные принципы

- Идти маленькими контролируемыми pass'ами.
- Сначала фундамент и устойчивость, потом расширение продукта.
- Не красить недостроенный каркас раньше времени.
- Новые сущности делать с учетом будущих слоев:
  - single mode;
  - family mode;
  - premium;
  - scenario switching;
  - referral/promo-compatible архитектура;
  - growth layer в самом конце.

---

## 5. Уже согласованные отложенные будущие требования

### 5.1. Локализация
Обязательно позже сделать отдельный контролируемый блок:
- **RU/EN localization**;
- не точечный хаотичный перевод, а отдельный системный pass;
- пользовательский интерфейс должен стать дружелюбным, а не техническим.

### 5.2. UI/UX-полировка
Позже обязательно сделать отдельный современный, дружелюбный UI/UX pass:
- меньше технического текста;
- понятные человеческие формулировки;
- чище карточки и статусы;
- современный визуальный стиль;
- нормальные пустые состояния;
- более дружелюбный copy;
- после того как продуктовая основа станет достаточно устойчивой.

### 5.3. Premium / monetization roadmap
Позже, в логичный момент roadmap, нужно добавить:
- **Boosty как стартовый paylock** для premium-функций;
- не как финальную идеальную биллинг-систему, а как практичный старт.

### 5.4. Gift premium / promo campaigns
Позже добавить отдельный блок promo campaigns:
- специальные deep links / promo links под конкретный паблик или кампанию;
- ограниченная квота активаций, например первые 50 человек;
- выдача premium по этим ссылкам;
- админский учет по кампании:
  - сколько квот выделено;
  - сколько реально активировано;
  - сколько пользователей продолжают пользоваться premium спустя время;
  - какие кампании приносят живую аудиторию.

Это нужно реализовывать не сейчас, а после базовой premium foundation.

### 5.5. Growth / promotion block
Отдельный финальный блок roadmap, только после технической готовности:
- рост через привычку/напоминания;
- семейные приглашения;
- Telegram-native распространение;
- deep links;
- контент-канал;
- сообщества;
- позже affiliate-модель.

### 5.6. MCP / extensions / extra skills
Дополнительные skills/extensions/MCP для Codex предлагать **не заранее**, а только когда они реально начнут экономить время.
На текущем этапе это еще не обязательная тема.

---

## 6. Подтвержденные этапы и текущий статус

### Полностью закрыто руками
- **Phase 0** — foundation
- **Phase 0.1** — hydration bugfix
- **Phase 1A** — auth/profile foundation
- **Phase 2A** — personal workspace foundation
- **Phase 2B** — current app context foundation
- **Phase 3A** — recurring payments CRUD foundation
- **Phase 3B** — payment cycle state foundation
- **Phase 4A** — dashboard MVP foundation
- **Phase 5A** — quick add + starter templates foundation
- **Phase 6A** — reminder preferences + candidate foundation
- **Phase 6B** — manual dispatch foundation + attempt logging + idempotency
- **Phase 6C** — Telegram delivery readiness + diagnostics + test-send path
- **Phase 6D** — Telegram chat binding onboarding/verification foundation
- **Phase 6E** — verified binding as authoritative source for delivery flows
- **Phase 6F** — delivery UX cleanup
- **Phase 6F.1** — public bot username bugfix in onboarding
- **Phase 6G** — secure scheduled dispatch foundation
- **Phase 6G.1** — scheduled dispatch type-handling bugfix
- **Phase 6H** — Vercel-cron-ready scheduled hook foundation
- **Phase 7A** — subscriptions layer foundation
- **Phase 7B** — subscription renewals visibility
- **Phase 7C** — subscription cost pressure
- **Phase 7D** — subscription pause/resume foundation
- **Phase 7E** — paused subscriptions visibility + monthly savings
- **Phase 7F** — subscription health / at-risk visibility
- **Phase 8A** — family workspace foundation
- **Phase 8C** — personal/shared payment distinction
- **Phase 8C.1** — workspace mode sync bugfix after family/personal switching

### Partially verified
- **Phase 8B** — family invite flow foundation
  - **подтверждено руками:** create invite работает, строка в `family_workspace_invites` появляется, статус `active` создается;
  - **не подтверждено руками:** accept invite другим реальным Telegram-профилем;
  - причина: даже в инкогнито поднимается тот же `Dev fallback / Dev User`, поэтому нормального второго профиля для проверки accept пока нет.

### Что это значит practically
- invite create можно считать рабочим foundation;
- accept flow позже нужно отдельно дожать реальным внешним пользователем / другим Telegram-профилем;
- это не должно блокировать продолжение roadmap.

---

## 7. Что уже реально умеет продукт на текущий момент

### 7.1. Personal recurring / payment core
- создание регулярных платежей;
- редактирование;
- archive;
- mark paid / undo paid;
- current cycle state;
- dashboard с due/upcoming/overdue;
- quick add templates.

### 7.2. Reminder foundation
Подтвержден полный рабочий путь:
- reminder preferences;
- candidate computation;
- manual dispatch;
- Telegram test send;
- verified chat binding;
- scheduled dispatch foundation;
- idempotency;
- Vercel-cron-ready hook foundation.

### 7.3. Subscriptions layer
Подписки как легкий слой над recurring payments уже подтверждены:
- `is_subscription` foundation;
- subscription-friendly templates;
- compact summary;
- renewals visibility;
- cost pressure;
- pause/resume;
- paused visibility;
- subscription health.

### 7.4. Family foundation
Сейчас подтверждено:
- family workspace creation;
- workspace switching personal ↔ family;
- owner membership persistence;
- create invite foundation;
- family/shared recurring payment distinction;
- минимальный family recurring create/list path.

Не подтверждено/не реализовано пока:
- accept invite реальным вторым пользователем;
- shared economics;
- responsibility / who pays;
- family dashboard UX;
- полноценная совместная логика reminders/subscriptions на уровне feature parity.

---

## 8. Подробный статус по крупным блокам roadmap

## Блок A. Reminder / notification foundation
### Статус
**Считается устойчиво завершенным фундаментом.**

### Что уже есть
- reminder settings;
- candidate logic;
- manual dispatch;
- attempt logging;
- Telegram readiness;
- test-send;
- verified binding;
- scheduled secure endpoint;
- Vercel-cron-ready foundation;
- idempotency manual + scheduled.

### Что пока не делать без причины
- worker/queue/retry engine;
- тяжелый autonomous scheduler framework;
- full family reminder parity;
- большой notification center.

### Возможные будущие доработки только позже
- production Vercel cron check in real deployment;
- family reminder parity;
- возможно позже richer notification history.

---

## Блок B. Subscriptions layer
### Статус
**Основной foundation уже собран и подтвержден руками.**

### Уже есть
- 7A — foundation;
- 7B — renewals visibility;
- 7C — cost pressure;
- 7D — pause/resume;
- 7E — paused visibility + savings;
- 7F — health / at-risk visibility.

### Что пока не делаем
- отдельный большой subscriptions manager;
- advanced FX conversion;
- heavy analytics;
- сложную billing/contract model.

### Возможные будущие логичные доработки позже
- мягкая UI/UX-полировка wording/summary blocks;
- возможно легкое улучшение filter copy вроде `Visible / Total`;
- более дружелюбная подача renewals/pressure/health после общего UI-прохода.

---

## Блок C. Family foundation
### Статус
**Начат и частично подтвержден. Сейчас проект находится именно в этом блоке.**

### Уже есть
- **8A** — family workspace foundation
  - family workspace creation
  - active workspace switching
  - owner membership persistence
- **8B** — invite flow foundation (partially verified)
  - create invite confirmed
  - accept invite pending real external user verification
- **8C** — personal/shared payment distinction
  - family workspace gets minimal recurring create/list support
  - shared badge in family payments
  - advanced family actions intentionally disabled
  - personal flows preserved after 8C.1 sync bugfix

### Что логично должно идти дальше
После переезда в новый чат следующий логичный шаг:
- **responsibility / who pays foundation**

То есть не family dashboard и не общая семейная бухгалтерия сразу, а сначала:
- минимальная ответственность/назначение плательщика для family/shared payment
- без shared balances/debts и без сложной экономики

### Что внутри family roadmap уже логически запланировано дальше
1. family workspace foundation — done
2. invite flow — foundation done, accept pending real-user verification
3. personal/shared payment distinction — done
4. **responsibility / who pays** — следующий логичный шаг
5. family UX / более понятный семейный сценарий — позже
6. уже после этого — более сложные shared economics, если они вообще понадобятся

### Что пока сознательно не делаем
- full family mode;
- deep-link invite onboarding;
- shared balances/debts;
- split payments;
- family dashboard;
- scenario migration engine;
- advanced family reminders parity.

---

## Блок D. Premium layer
### Статус
**Еще не начинали.**

### Что здесь уже заранее согласовано
- premium feature gates для single и family позже;
- стартовая монетизация через **Boosty paylock**;
- после этого promo/gift premium campaigns через отдельные links/campaigns;
- учет выданных и реально используемых premium-доступов.

### Что логично должно предшествовать premium
- более устойчивый family foundation;
- достаточно зрелый single/family product core;
- понятный admin/internal слой.

---

## Блок E. Scenario switching
### Статус
**Отдельно не начинали.**

### Что здесь потом нужно будет сделать
- корректный переход `single -> family`;
- корректный переход `family -> single`;
- аккуратное обращение с данными и контекстами;
- не ломать уже существующие recurring/subscription/reminder данные.

Сейчас этого блока **еще нет**, не начинать его раньше family foundation и части premium/admin foundations.

---

## Блок F. Localization
### Статус
**Отложено специально на потом.**

### Что обязательно нужно помнить
- RU/EN localization обязательно будет;
- делать отдельным контролируемым pass'ом;
- не размазывать хаотично по маленьким текущим pass'ам;
- после базовой product maturity и перед/вместе с серьезным UI/UX polish.

---

## Блок G. Referral / promo-compatible architecture
### Статус
**Активно не реализуется сейчас.**

### Что помнить
- архитектура должна оставаться совместимой с promo links / invite campaigns / premium campaign links;
- но growth-логика как продуктовый слой сейчас не включается.

---

## Блок H. Final promotion block
### Статус
**Только после технической готовности.**

### Содержимое этого будущего блока
- growth through reminders/habit;
- family invites as real growth tool;
- Telegram-native distribution;
- deep links;
- content/community;
- later affiliate model.

---

## 9. Важные реальные ограничения на момент переезда

### 9.1. 8B accept flow
**Важно явно помнить в новом чате:**
- accept invite другим профилем еще не подтвержден;
- create invite уже подтвержден;
- позже, когда появится реальный внешний пользователь / другой Telegram-профиль, нужно сделать отдельную ручную проверку:
  - вставить token;
  - нажать accept;
  - проверить `family_workspace_invites` -> `accepted`;
  - проверить `workspace_members` -> новая membership `member`.

### 9.2. Family payment scope еще не равен full family mode
После 8C family recurring foundation уже работает минимально, но это **не полноценный shared economics layer**.

### 9.3. Family reminders parity пока не обещана
Reminder foundation пока полностью зрелая в personal scope. Для family scope parity еще не заявлялась.

### 9.4. UI пока функциональный, а не финальный
Финальный дружелюбный UI/UX и полноценная локализация еще впереди.

---

## 10. Что именно нужно помнить в новом чате как рабочую точку

### Текущий фактический статус
- **Последний полностью закрытый руками этап: Phase 8C.1**
- **Phase 8B: partially verified**
- **Следующий логичный рабочий шаг после переезда: продолжение family block, а именно responsibility / who pays foundation**

### Что не нужно заново объяснять в новом чате
- reminder foundation уже рабочая;
- subscriptions layer уже собран и подтвержден;
- family workspace foundation уже есть;
- family invite create уже есть;
- family/shared payment distinction уже есть;
- 8C personal return bug уже исправлен в 8C.1;
- UI/UX polish и localization будут позже отдельными блоками;
- premium через Boosty и gift premium campaigns уже запланированы, но сейчас не реализуются.

---

## 11. Как формулировать старт нового чата

Можно начать новый чат примерно так:

> Продолжаем проект Telegram Mini App по контролю регулярных платежей и подписок.  
> Используй приложенный md-якорь как единственный актуальный источник статуса.  
> Последний полностью закрытый руками этап: Phase 8C.1.  
> Phase 8B имеет статус partially verified: create invite подтвержден, accept invite другим профилем еще не подтвержден.  
> Следующий логичный шаг — продолжение family block после 8C, без перескока через roadmap.  
> Работаем строго по схеме: ты даешь промт для Codex → Codex делает pass и сохраняет полный md-отчет → в чате Codex пишет только краткий итог → я присылаю md-отчет → мы делаем ручную проверку → только потом следующий промт.

---

## 12. Список ключевых md-отчетов, которые уже есть

- `phase6b_minimal_reminder_dispatch_foundation_report.md`
- `phase6c_telegram_delivery_readiness_report.md`
- `phase6d_telegram_chat_binding_onboarding_report.md`
- `phase6e_verified_binding_delivery_unification_report.md`
- `phase6f_delivery_ux_cleanup_report.md`
- `phase6f1_public_bot_username_bugfix_report.md`
- `phase6g_scheduled_dispatch_foundation_report.md`
- `phase6g1_scheduled_dispatch_type_bugfix_report.md`
- `phase6h_vercel_cron_hookup_report.md`
- `phase7a_subscriptions_layer_foundation_report.md`
- `phase7b_subscription_renewals_visibility_report.md`
- `phase7c_subscription_cost_pressure_report.md`
- `phase7d_subscription_pause_resume_foundation_report.md`
- `phase7e_paused_subscriptions_visibility_report.md`
- `phase7f_subscription_health_visibility_report.md`
- `phase8a_family_workspace_foundation_report.md`
- `phase8b_family_invite_flow_foundation_report.md`
- `phase8b1_family_invite_create_bugfix_report.md`
- `phase8c_personal_shared_payment_distinction_report.md`
- `phase8c1_workspace_mode_sync_bugfix_report.md`

---

## 13. Последняя короткая фиксация статуса

**Проект уже прошел путь от personal recurring foundation до зрелого reminder блока, затем до зрелого subscriptions layer, и сейчас перешел в family foundation.**  
**После переезда в новый чат надо продолжать именно family branch roadmap, не перескакивая в premium/localization/UI-overhaul раньше времени.**

# Payment Control Telegram Mini App — Master Migration Anchor (2026-03-28)

## 0) Назначение и область действия
Этот документ — новый канонический якорь миграции контекста проекта на дату `2026-03-28`.

Цель:
- перенести проект в новый чат без потери состояния;
- зафиксировать, что подтверждено, что отложено, что спорно;
- дать единые правила для следующих узких/контролируемых pass'ов.

Канонический статус этого файла:
- основной source-of-truth для следующего чата;
- заменяет старый master anchor `docs/payment_control_master_anchor_2026-03-27.md` как более свежий полный срез.

## 1) Идентичность проекта и продуктовое видение
### 1.1 Что это за продукт
`Payment Control` — Telegram Mini App для управления регулярными платежами и подписками, в personal и family-сценариях.

### 1.2 Core назначение
- быстро фиксировать регулярные обязательства;
- вовремя закрывать платежные циклы (`Mark paid` / `Undo paid`);
- держать прозрачную историю изменений;
- давать простой общий family-контекст (`Who pays` / `Paid by`) без перегруза.

### 1.3 Продуктовая философия (текущий курс)
- mobile-first и быстрый сценарий;
- минимум постоянного шума на экране;
- вторичное объяснение — через onboarding и локальные `?` popover;
- фичи добавляются итеративно, без тяжелого scope jump.

### 1.4 Free vs Premium границы
Неподлежащие блокировке core-вещи:
- базовые recurring/subscription операции;
- `Mark paid` / `Undo paid`;
- базовые reminders/history/dashboard;
- базовые family invite/shared recurring/who-pays поверхности.

Premium-философия:
- premium = удобство, расширения и масштаб;
- core free-поток не должен быть pay-locked.

### 1.5 Family/shared usage философия
- family режим должен быть практически полезен, но не тяжелым;
- ответственность и фактическая оплата должны быть читаемы (`Who pays` / `Paid by`);
- инвайт в семью должен быть безопасным и одноразовым (см. раздел 8).

### 1.6 Общая UX-направленность
- app-like, но без декоративной перегрузки;
- компактный shell и ясная иерархия;
- пользователь должен быстрее понимать, что сделать прямо сейчас.

### 1.7 Технический snapshot (для миграции в новый чат)
- Frontend: Next.js + React + TypeScript + Tailwind.
- Backend: Next API route handlers.
- Data: Supabase (миграции в `supabase/migrations`).
- Runtime: Telegram Mini App + Bot API, деплой через `main` branch workflow.

## 2) Канонический текущий статус
### 2.1 Последний полностью подтвержденный этап
По текущему статус-решению: **Phase 16B = manual verified**.

Важно:
- 16B принят по ключевым пунктам (header cleanup, template tap/localization fix, Home title cleanup);
- но Reminders концептуально все еще перегружен (см. раздел 7).

### 2.2 Статусные категории
- `manual verified` — подтверждено живой ручной проверкой по текущим решениям;
- `подтверждено по коду/отчетам` — реализовано, но нет отдельного нового live closure;
- `partially verified` — есть реализация и частичная ручная проверка, но не formal closure;
- `deferred` — сознательно отложено;
- `superseded` — этап исторически перекрыт более поздним исправлением.

### 2.3 Полная матрица ключевых этапов
| Этап | Статус | Комментарий |
|---|---|---|
| 0 | manual verified | Исторически подтверждено |
| 0.1 | manual verified | Исторически подтверждено |
| 1A | manual verified | Исторически подтверждено |
| 2A | manual verified | Исторически подтверждено |
| 2B | manual verified | Исторически подтверждено |
| 3A | manual verified | Исторически подтверждено |
| 3B | manual verified | Исторически подтверждено |
| 4A | manual verified | Исторически подтверждено |
| 5A | manual verified | Исторически подтверждено |
| 6A | manual verified | Исторически подтверждено |
| 6B | manual verified | Исторически подтверждено |
| 6C | manual verified | Исторически подтверждено |
| 6D | manual verified | Исторически подтверждено |
| 6E | manual verified | Исторически подтверждено |
| 6F | manual verified | Исторически подтверждено |
| 6F.1 | manual verified | Исторически подтверждено |
| 6G | manual verified | Исторически подтверждено |
| 6G.1 | manual verified | Исторически подтверждено |
| 6H | manual verified | Исторически подтверждено |
| 7A | manual verified | Исторически подтверждено |
| 7B | manual verified | Исторически подтверждено |
| 7C | manual verified | Исторически подтверждено |
| 7D | manual verified | Исторически подтверждено |
| 7E | manual verified | Исторически подтверждено |
| 7F | manual verified | Исторически подтверждено |
| 8A | manual verified | Исторически подтверждено |
| 8B | manual verified | Invite flow подтвержден в live |
| 8B.1 | superseded | Встроен в стабильный 8B |
| 8C | manual verified | Исторически подтверждено |
| 8C.1 | manual verified | Исторически подтверждено |
| 8D | manual verified | Исторически подтверждено |
| 8E | manual verified | Исторически подтверждено |
| 8F | manual verified | Исторически подтверждено |
| 8G | manual verified | Исторически подтверждено |
| 8H | manual verified | Исторически подтверждено |
| 8I | manual verified | Исторически подтверждено |
| 8J | manual verified | Исторически подтверждено |
| 8K | manual verified | Исторически подтверждено |
| 8L | manual verified | Исторически подтверждено |
| 8M | manual verified | Исторически подтверждено |
| 8N | manual verified | Исторически подтверждено |
| 8O | manual verified | Исторически подтверждено |
| 8P | manual verified | Исторически подтверждено |
| 8P.1 | superseded | Перекрыт 8P.2 |
| 8P.2 | manual verified | Bottom nav fix закрыт |
| 8Q | manual verified | Исторически подтверждено |
| 9A | manual verified | Runtime integration |
| 9B | manual verified | Статус поднят migration-override |
| 9B.1 | manual verified | Статус поднят migration-override |
| 9C | manual verified | Статус поднят migration-override |
| 9C.1 | manual verified | Статус поднят migration-override |
| 10A | manual verified | Статус поднят migration-override |
| 10B | manual verified | Статус поднят migration-override |
| 10C | manual verified | Статус поднят migration-override |
| 10C.1 | manual verified | Статус поднят migration-override |
| 11A | superseded | Отклонен, заменен 11A.1 |
| 11A.1 | manual verified | Реальный 4-tab shell подтвержден |
| 11B | manual verified | Verification debt closure pass принят |
| 11C | manual verified | Tab content simplification принят |
| 11D | manual verified | Empty states/first-action polish принят |
| 12A | подтверждено по коду/отчетам | Foundation локализации; качество RU доочищалось в 12A.1 |
| 12A.1 | manual verified | RU cleanup принят |
| 12B | manual verified | Reminders density pass принят |
| 12C | manual verified | Bottom tab modernization принят |
| 13A | manual verified | Premium entitlement foundation подтвержден |
| 13B | partially verified + deferred formal closure | Foundation есть, частично проверялась SQL/UI; formal live closure сознательно отложен |
| 13C | manual verified | Owner-only admin console подтвержден |
| 13C.1 | подтверждено по коду/отчетам | Фикс grant/revoke надежности; де-факто в составе рабочего 13C baseline |
| 14A | подтверждено по коду/отчетам | Большой cleanup pass, затем уточнялся в 14A.1/14A.2 |
| 14A.1 | подтверждено по коду/отчетам | Узкий refinement, затем исправлен в 14A.2 |
| 14A.2 | manual verified | Popover viewport fix + onboarding rewrite принят |
| 15A | manual verified | In-app bug report + Telegram delivery принят |
| 16A | подтверждено по коду/отчетам, не принято как финальное UX-направление | Дал основу app-like/theme/icon, но live-review выявил проблемы |
| 16B | manual verified | Текущий последний подтвержденный этап |

## 3) Полная реконструкция roadmap
### 3.1 Что уже завершено
1. Foundation wave `0 -> 5A`: core personal модель.
2. Reminder/delivery wave `6A -> 6H`.
3. Subscription visibility/ops wave `7A -> 7F`.
4. Family foundation wave `8A -> 8Q`.
5. Runtime integration `9A`.
6. Family shared/economics baseline `9B -> 9C.1`.
7. UX simplification + true tabs + localization + shell improvements `10A -> 12C`.
8. Premium/admin basis `13A + 13C (+13C.1 fix)`.
9. Onboarding/help/invite cleanup wave `14A -> 14A.2`.
10. Support path `15A`.
11. UX refinement pass `16B` (принятые пункты см. выше).

### 3.2 Частично подтвержденные/отложенные области
1. **13B**:
- модель кампаний и claim есть в БД/коде;
- частично прогонялась SQL/UI;
- formal live closure намеренно отложен.

2. **16A**:
- theme/icon/app-like foundation присутствует;
- но сам этап не принят как финальная UX-направленность;
- часть решений исправлена/перестроена в 16B.

### 3.3 Отложенные verification debt-блоки
1. Формальное закрытие 13B в live-режиме.
2. Длительное наблюдение scheduled-dispatch (long-horizon production behavior).
3. Отдельная дисциплинированная проверка true first-run onboarding на чистом окружении (не replay).

### 3.4 Будущие продуктовые блоки (еще не стартовали как formal phase)
1. Более сильный редизайн модели Reminders (главный UX-долг).
2. Дальнейший app-like polish без декоративного шума.
3. Потенциальные premium/gift/admin follow-up (строго без блокировки core).
4. Growth/public rollout/рефералки — только позже, не сейчас.
5. Более глубокий support quality loop (но без превращения в heavy support platform).
6. Точечные onboarding/help/template refinements после Reminders-перестройки.
7. Дополнительная полировка family invite UX без возврата к reusable-token модели.

### 3.5 Что сознательно не должно стартовать «прямо сейчас»
- новая волна premium-lock;
- growth/referral/public promo rollout;
- большая analytics-wave;
- broad business-logic rewrite вне UX-задачи.

## 4) Непогашенные старые долги и verification debts
1. **13B formal closure debt**:
- не забыть провести formal live-проверку полного цикла campaign claim/quota/state.

2. **Reminders концептуальный UX-долг**:
- текущий подход все еще сильно опирается на скрытие блоков и `details`;
- требуется отдельный будущий pass, который меняет модель экрана, а не только «скрывает сложность».

3. **Long-horizon dispatch observation debt**:
- нужна наблюдаемость не только snapshot-типом, но и стабильностью во времени.

4. **True first-run onboarding debt**:
- replay-путь закрыт;
- true clean first-run должен оставаться отдельной проверкой.

## 5) Правила для будущих Codex-проходов
### 5.1 Базовая дисциплина
1. Всегда читать текущий master anchor первым.
2. Работать узкими контролируемыми pass'ами.
3. Не расширять scope без прямого запроса.
4. Сохранять все ранее подтвержденные потоки.

### 5.2 Обязательный pre-report self-check
Перед финальным отчетом обязательно:
1. сравнить результат с исходной целью prompt;
2. проверить strict scope;
3. пройти acceptance criteria по пунктам;
4. если есть mismatch — исправить сначала, отчет писать потом.

### 5.3 Encoding/локализация безопасность
1. Все затронутые файлы — валидный UTF-8.
2. Не допускать mojibake/битой кириллицы.
3. Проверять RU/EN строки после правок.
4. В каждом отчете добавлять блок `Encoding safety check`.

### 5.4 Формат отчетности
1. Полный отчет сохранять в `docs/*.md`.
2. В чат — только короткая сводка.
3. После каждого pass обязательно добавлять:
- короткое объяснение на русском;
- полный manual checklist на русском;
- Git Bash команды.

### 5.5 Git Bash workflow-правила
Если pass **без** миграций:
1. `git status`
2. `git add ...`
3. `git commit -m "..."`
4. `git push origin main`

Если pass **с** миграциями Supabase:
1. `git status`
2. `git add ...`
3. `git commit -m "..."`
4. `supabase db push`
5. `supabase migration list`
6. `git push origin main`

### 5.6 Deploy note
- Не предлагать `vercel --prod` по умолчанию: production auto-deploy идет из `main`.

### 5.7 Язык и чеклисты
- Все ручные чеклисты в отчетах — полностью на русском.

## 6) Текущие подтвержденные foundations
### 6.1 Подтверждено вручную (ядро)
1. Реальный 4-tab shell и переключение `Home / Reminders / History / Profile`.
2. RU/EN переключение и persistence.
3. Core payment loop (`Mark paid` / `Undo paid`) и family shared flow.
4. `Who pays` / `Paid by` поверхности.
5. Workspace switch/create/join flow.
6. One-time family invite правило на уровне UX/поведения.
7. Premium entitlement foundation (13A) и owner-only admin console (13C baseline).
8. In-app bug report форма + server-side Telegram delivery (15A).
9. Последний общий accepted срез: 16B.
10. После 16B в accepted baseline закреплены:
- cleanup page headers (убраны лишние page-level title bars вне Home);
- template interaction fix (tap по всей строке шаблона);
- корректировка локализации системного template autofill;
- Home title cleanup (`Контроль платежей`, без `Telegram Mini App` подписи).

### 6.2 Присутствует в коде, но требует осторожного статуса
1. Gift premium campaign foundation (13B) — реализовано, но formal closure отложен.
2. Theme/icon/app-like foundation из 16A — есть в коде; 16A как финальная UX-направленность не принят.
3. Theme switch (`Light/Dark`) доступен в Profile и персистится, но дальнейшая UX-гармонизация темы остается предметом будущих pass'ов.

## 7) Текущие известные UX-слабости
Критично сохранить в памяти:
1. **Reminders остается концептуально перегруженным**.
2. Текущая реализация во многом прячет сложность в collapsible/spoiler-паттерны.
3. Нужен отдельный более сильный pass с новой, более удобной экранной моделью Reminders:
- лучшее first-screen поведение;
- более понятное разделение primary/secondary задач;
- меньше визуальной и когнитивной перегрузки без «прятания ради прятания».

Дополнительно:
- History на текущем этапе принимается как есть, не является главным объектом редизайна.

## 8) Неподвижное product-правило Family invite
Обязательное правило:
1. Инвайт генерируется по требованию (`Generate one-time invite`).
2. Один код предназначен для одного join-сценария.
3. После успешного использования код становится невалидным.
4. Старый код не должен быть постоянным «вечным» токеном на экране.
5. Для нового приглашения генерируется новый код.

## 9) Admin / Premium / Gift campaign правила
1. Admin console — owner-only.
2. Главный идентификатор для admin/user операций — стабильный numeric Telegram user ID.
3. `@username` может быть дополнительным, но не primary ключом.
4. Premium/gift управление через UI допустимо и уже частично реализовано.
5. **13B formal live verification — сознательно deferred**, не считать полностью закрытым.
6. Core функциональность приложения должна оставаться бесплатной.

## 10) UI/UX будущие блоки, которые обязательно держать в roadmap
1. Сильный редизайн Reminders (приоритетный UX-блок).
2. Продолжение app-like направления (без случайного редизайн-шума).
3. Light/Dark theme как поддерживаемая база.
4. Консистентная icon-система.
5. Разрешено использовать локальный набор иконок:
   - `H:\Work\tabler-icons-3.41.0`
6. Перенос вторичных объяснений в contextual help/onboarding вместо постоянного шума.
7. Общая очистка интерфейса по смыслу, а не ради косметики.

## 11) Bug report / support notes
Текущее состояние:
1. В Profile есть компактный entry point `Report a bug`.
2. Отправка идет server-side, без утечки bot secret в клиент.
3. Доставка идет в Telegram через bot API (`BUG_REPORT_TELEGRAM_CHAT_ID`).
4. Пользователь получает явный success/error feedback.

Что возможно позже (не сейчас):
- улучшать качество triage и формат сообщений;
- но не строить тяжелую тикетную систему без отдельного решения.

## 12) Source-of-truth guidance: что делать дальше
### 12.1 Наиболее логичный следующий шаг
**Отдельный мощный UX-pass по Reminders (новая экранная модель, не только spoilers/collapses).**

Почему:
- после 16B критичные точечные баги/чистки закрыты;
- главный незакрытый пользовательский долг — удобство и ясность Reminders как основного рабочего экрана.

### 12.2 Что не нужно приоритизировать немедленно
1. Public growth/referral/promo механики.
2. Новый premium-lock rollout.
3. Broad business-logic expansion.
4. Массовый редизайн всех вкладок сразу.

### 12.3 Что deferred сознательно
1. Formal full closure 13B.
2. Long-horizon dispatch verification.
3. True clean first-run onboarding verification.

## 13) Как использовать этот якорь в новом чате
1. Сначала прочитать этот файл полностью.
2. Использовать его как primary source-of-truth по статусам, правилам и roadmap.
3. Не просить повторно пересказывать историю фаз до 16B.
4. Любой новый prompt строить от текущего подтвержденного состояния из этого якоря.
5. Если в будущем подтвержден новый этап — выпустить новый date-stamped master anchor.

## 14) Приложение: критичные preserve-правила для всех будущих pass'ов
Нельзя ломать:
1. 4-tab shell и переключение экранов.
2. RU/EN switching и persistence.
3. Mark paid / Undo paid.
4. Family shared recurring core flow.
5. Who pays / Paid by surfaces.
6. Workspace behavior (switch/create/join).
7. One-time family invite поведение.
8. Premium status surface.
9. Owner-only admin console и его базовые действия.
10. Bug report отправку через server-side Telegram delivery.

---

Последний подтвержденный этап: Phase 16B  
Последний полный якорь для миграции: docs/payment_control_master_anchor_2026-03-28.md  
Новый чат должен продолжать работу от этого состояния без повторного ввода контекста.

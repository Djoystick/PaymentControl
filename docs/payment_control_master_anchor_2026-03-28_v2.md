# Payment Control Telegram Mini App — Master Migration Anchor v2 (2026-03-28)

## 0) Назначение документа
Этот файл — новый канонический migration-anchor для переноса проекта в новый чат без потери контекста.

Цель документа:
- зафиксировать текущее подтвержденное состояние проекта после последних pass’ов;
- разделить, что именно manual verified, что только реализовано в коде, что отложено;
- сохранить продуктовые правила, roadmap, долги верификации и рабочие правила для следующих Codex-pass’ов.

Источник истины для этого якоря:
- предыдущий master-anchor: `docs/payment_control_master_anchor_2026-03-28.md`;
- предыдущие anchor-материалы в `docs/`;
- актуальные отчеты в `docs/reports/` (особенно 17A–19A.2);
- точечная сверка текущего кода (templates/autosuggest, help popover, performance cache).

---

## 1) Идентичность проекта и продуктовое видение
### 1.1 Что это за продукт
`Payment Control` — Telegram Mini App для управления регулярными платежами и подписками в personal и family сценариях.

### 1.2 Core назначение
- быстро видеть, что нужно оплатить сейчас;
- закрывать цикл платежей через `Mark paid` / `Undo paid`;
- сохранять прозрачную историю действий;
- давать ясный family-контекст (`Who pays` / `Paid by`) без перегруза.

### 1.3 Текущая продуктовая философия
- low learning barrier;
- короткие пользовательские сессии;
- mobile-first скорость и понятность;
- минимум постоянного визуального шума;
- secondary-информация уходит в контекстные слои.

### 1.4 Free vs Premium границы
Core-функции остаются бесплатными и не уходят в paywall:
- базовые recurring/subscription операции;
- `Mark paid` / `Undo paid`;
- базовые surfaces Home/Reminders/History/Profile;
- базовые family shared сценарии.

Premium — это расширения/удобство, а не блокировка базового сценария оплаты.

### 1.5 Family/shared философия
- family-режим должен быть полезным, но не тяжелым;
- ответственность и факт оплаты должны быть читаемы;
- invite-механика должна быть безопасной и одноразовой (см. раздел 8).

### 1.6 Общий UI/UX курс (UI-first)
Проект сознательно идет в сторону:
- app-like, а не website-like;
- быстрой навигации и минимального порога входа;
- чистой иерархии действий;
- красивого, но функционального mobile-first интерфейса.

Secondary-вещи системно уводятся «в тень»:
- contextual help;
- popovers;
- quick actions;
- компактные вторичные поверхности.

---

## 2) Канонический текущий статус
### 2.1 Последний подтвержденный этап
**Последний подтвержденный этап: Phase 19A.2 (manual verified).**

Дополнительно подтверждено:
- **Phase 19A.1 = manual verified**;
- 19A.2 закрыл remaining blocker по шаблонам: autosuggest теперь строго title/name-only.

Шаблонная линия (currency normalization + strict title-only autosuggest) на текущем уровне считается закрытой.

### 2.2 Как читать статусы
- `manual verified` — подтверждено живой ручной проверкой.
- `implemented (code/report)` — реализовано и зафиксировано в отчете, но без отдельного финального live-closure.
- `partially verified` — есть частичная ручная проверка, но не formal closure.
- `deferred` — сознательно отложено.
- `superseded` — исторически перекрыто более поздним pass’ом.
- `planning-only` — аналитический/планировочный отчет без внедрения кода.

### 2.3 Статусная матрица основных этапов

| Этап | Статус | Комментарий |
|---|---|---|
| 0, 0.1, 1A, 2A, 2B, 3A, 3B, 4A, 5A | manual verified | Базовый фундамент подтвержден |
| 6A–6H (включая 6F.1, 6G.1) | manual verified | Reminder/delivery foundation подтвержден |
| 7A–7F | manual verified | Subscription layer подтвержден |
| 8A–8Q | manual verified | Family foundation подтвержден |
| 8B.1 | superseded | Встроен в стабильный 8B |
| 8P.1 | superseded | Перекрыт 8P.2 |
| 8P.2 | manual verified | Фикс навигации подтвержден |
| 9A, 9B, 9B.1, 9C, 9C.1 | manual verified | Runtime + family shared economics baseline подтверждены |
| 10A, 10B, 10C, 10C.1 | manual verified | UX/base polish wave подтверждена |
| 11A | superseded | Заменен 11A.1 |
| 11A.1, 11B, 11C, 11D | manual verified | 4-tab shell и simplification wave подтверждены |
| 12A | implemented (code/report) | Foundation локализации; RU cleanup закрыт в 12A.1 |
| 12A.1, 12B, 12C | manual verified | Localization cleanup + tab polish подтверждены |
| 13A | manual verified | Premium entitlement foundation подтвержден |
| 13B | partially verified + deferred formal closure | Есть foundation и частичная SQL/UI проверка; formal live closure отложен |
| 13C | manual verified | Owner-only admin console подтвержден |
| 13C.1 | implemented (code/report) | Важный fix grant/revoke; не выделялся отдельным formal closure |
| 14A, 14A.1 | implemented (code/report) | Подготовительные/уточняющие волны |
| 14A.2 | manual verified | Popover viewport fix + onboarding copy pass подтвержден |
| 15A | manual verified | Bug report flow + Telegram delivery подтверждены |
| 16A | implemented (code/report), не финальный accepted UX baseline | Дал app-like/theme/icon foundation |
| 16B | manual verified | Последний fully accepted этап до ветки 17+ |
| 17A (UI Overhaul Wave 1) | implemented (code/report), superseded по части решений | Исторический шаг, далее переработан в 17A/17A.1/17B линии |
| 17A (Reminders interaction redesign) | implemented (code/report) | Внедрил inline template направление; parent status отдельно не фиксировался как final manual closure |
| 17A.1 (hydration locale bugfix) | implemented (code/report) | Узкий SSR/CSR locale fix, lint/build passed |
| 17A.1 (autosuggest + Home summary cleanup) | implemented (code/report) | Почти принят; deferred RUB issue перенесен в 17B |
| 17B (app-like polish) | implemented (code/report), almost accepted | Блокер: overflow help popover |
| 17B.1 | manual verified | Закрыл popover viewport blocker; UI stabilization wave закрыта |
| 17B (Reminders rethink analysis) | planning-only | Аналитика/план без код-изменений |
| 17C | implemented (code/report) | Узкий action-lane cleanup pass; историческая ветка в рамках Reminders iteration |
| 17C.1 | implemented (code/report) | Narrow recurring-cycle visibility/cycle normalization fix |
| 18A | manual verified | Performance audit + safe workspace-scoped snapshot caching |
| 19A | implemented (code/report), parent не фиксирован как fully closed отдельно | Общий app-like/Reminders polish; затем уточнялся в 19A.1/19A.2 |
| 19A.1 | manual verified | Template currency normalization + catalog expansion + autosuggest correction |
| 19A.2 | manual verified | Строгий fix: autosuggest только по title/name (prefix), без description/helper влияния |

Критичная оговорка по parent/child:
- child-pass manual verification **не означает автоматическое формальное закрытие всех parent-pass**;
- статус каждого parent фиксируется отдельно, если есть явное подтверждение;
- для 19A-линии именно 19A.1 и 19A.2 подтверждены вручную и закрывают соответствующие блокеры.

---

## 3) Полная реконструкция roadmap
### 3.1 Что уже завершено и подтверждено
1. Foundation волны 0–12C (личный, family, reminders/subscriptions, shell, localization).
2. Premium/admin foundations: 13A, 13C (с учетом 13C.1 фиксов).
3. Support foundation: 15A bug-report pipeline.
4. UI stabilization wave через 16B и последующие уточнения 17A–17B.1.
5. Performance block: 18A (safe caching strategy).
6. Template reliability block: 19A.1 + 19A.2.

### 3.2 Частично подтвержденные или отложенные зоны
1. **13B gift-campaign formal verification debt**:
- foundation реализован;
- частично прогонялся SQL/UI;
- formal live closure сознательно отложен.

2. Долгосрочная runtime-стабильность dispatch/reminder delivery:
- не блокер текущего UI-roadmap;
- требует наблюдения на длинном горизонте.

3. Full true first-run onboarding verification:
- replay flow есть;
- отдельная полноценная проверка чистого first-run пути остается долгом.

### 3.3 Будущие продуктовые/UX блоки (структурно)
1. Продолжение UI-first refinement (app-like polish, screen composition, hierarchy).
2. Целевой future-pass по **визуальному акцентированию ключевых действий**:
- более явное выделение основных кнопок и учетных действий;
- фокус пользователя на “что сделать сейчас”.
3. Дальнейшая Reminders эволюция без возврата к management-overload.
4. После стабилизации UI-модели — **полный пересмотр onboarding** под финальную UX-архитектуру.
5. Отложенный formal closure для 13B в подходящий момент.
6. Точечные premium/gift/admin/growth волны — только контролируемо и не в ущерб core free UX.

### 3.4 Что не должно стартовать “случайно”
- широкий backend refactor ради UI-задач;
- спонтанный premium/growth scope expansion;
- тяжелая analytics wave без конкретного пользовательского долга;
- uncontrolled redesign-wave без четкого acceptance scope.

---

## 4) Непогашенные долги и долги верификации
1. **Phase 13B formal live closure debt** — обязателен к явному закрытию отдельным контролируемым pass’ом.
2. **True first-run onboarding debt** — replay есть, но чистый first-run требует формальной проверки/пересборки после финальной UI стабилизации.
3. **Long-horizon delivery behavior debt** — наблюдение scheduled/reminder поведения в реальном времени.
4. **Parent-pass status clarity debt** — сохранять дисциплину: не объявлять parent “полностью закрытым” без явной фиксации.
5. **Reminders model quality debt (остаточный)** — несмотря на улучшения, экран остается самым чувствительным UX-поверхностным блоком.

---

## 5) Правила для будущих Codex-pass’ов (обязательно)
### 5.1 Source-of-truth дисциплина
1. Всегда читать актуальный master-anchor первым.
2. Работать узкими контролируемыми pass’ами.
3. Не расширять scope без прямого запроса.
4. Сохранять все ранее verified core flows.

### 5.2 Pre-report self-check обязателен
Перед финальным отчетом обязательно:
1. Сверка с исходной целью prompt.
2. Сверка со strict scope.
3. Пунктовая сверка acceptance criteria.
4. Если найден mismatch — сначала исправить, потом отчитываться.

### 5.3 Encoding safety / RU text integrity
1. Все затронутые файлы — валидный UTF-8.
2. Не допускать mojibake/битой кириллицы.
3. Проверять видимые RU/EN строки после изменений.
4. В каждом отчете добавлять раздел `Encoding safety check`.

### 5.4 Формат отчетности
1. Полный подробный отчет сохранять в `docs/` или `docs/reports/` как `.md`.
2. В чат — только короткая сводка.
3. После каждого pass обязательно добавлять:
- короткое объяснение на русском;
- полный manual checklist на русском;
- Git Bash команды рабочего потока.

### 5.5 Git Bash workflow правила
Если pass **без миграций**:
1. `git status`
2. `git add ...`
3. `git commit -m "..."`
4. `git push origin main`

Если pass **с Supabase migration**:
1. `git status`
2. `git add ...`
3. `git commit -m "..."`
4. `supabase db push`
5. `supabase migration list`
6. `git push origin main`

### 5.6 Deploy note
- Не рекомендовать `vercel --prod` по умолчанию: production auto-deploy идет из `main`.

### 5.7 Preserve rules
Нельзя ломать:
- 4-tab shell;
- RU/EN switching + persistence;
- theme switching;
- Mark paid / Undo paid;
- family shared recurring flow;
- who pays / paid by surfaces;
- workspace switching/create/join;
- one-time family invite flow;
- premium/admin foundations;
- bug report delivery flow;
- help popovers;
- safe caching behavior из 18A.

---

## 6) Текущие подтвержденные foundations
### 6.1 Подтверждено вручную
1. Стабильный 4-tab shell (`Home`, `Reminders`, `History`, `Profile`).
2. RU/EN локализация и persistence.
3. Core payment loop (`Mark paid` / `Undo paid`).
4. Family shared surfaces (`Who pays` / `Paid by`).
5. Workspace flows (switch/create/join).
6. One-time family invite UX-правило в рабочем потоке.
7. Premium entitlement foundation + owner-only admin baseline.
8. Bug report form и server-side Telegram delivery.
9. Performance block 18A (safe snapshot caching with revalidation).
10. Template correction block 19A.1 + 19A.2.

### 6.2 Есть в коде, но требуют аккуратного статусного отношения
1. 13B gift campaign foundation — не считать fully closed без formal live verification.
2. Parent-проходы 17/19 линий — оценивать отдельно от закрытых child bugfix-пассов.
3. Некоторые улучшения Reminders/visual hierarchy требуют дальнейшей финишной калибровки под реальный mobile runtime.

---

## 7) Текущие UX-слабости и будущие UI-приоритеты
1. Главный приоритет проекта остается UI-first.
2. Курс: app-like, не website-like.
3. Основная ценность: быстрые короткие сессии и низкий когнитивный порог.
4. Secondary-информация должна уходить в contextual surfaces, а не занимать постоянный экран.
5. Reminders остается наиболее чувствительным UX-экраном и требует дальнейшей точной шлифовки модели, а не косметики.
6. Отдельный будущий pass обязателен для **сильного визуального акцента ключевых действий**:
- лучше подсветить primary actions;
- лучше направлять внимание на ключевые accounting-действия.
7. После стабилизации UI на 100% onboarding должен быть полностью пересмотрен/пересобран под финальную UX-модель.

---

## 8) Неподвижное product-правило family invite
1. Invite должен быть одноразовым.
2. Новый код генерируется по запросу.
3. Старый код после использования не должен оставаться постоянным “вечным токеном” на поверхности.
4. Reused invite-token UX нежелателен как с UX, так и с safety стороны.

---

## 9) Admin / Premium / Gift campaign правила
1. Admin console — только для owner.
2. Основной identity key для admin/user операций — **стабильный numeric Telegram user ID**.
3. `@username` допустим как вспомогательное поле, но не как основной ключ.
4. Premium/gift управление через UI допустимо как направление.
5. **Phase 13B formal full verification остается отложенным** (не маркировать как полностью закрытый без отдельного подтверждения).
6. Core-функции приложения должны оставаться бесплатными.

---

## 10) UI/UX future blocks, которые обязаны оставаться в roadmap
1. Продолжение UI-first refinement волны.
2. Дальнейший app-like polish (layout rhythm, action hierarchy, screen composition).
3. Поддержка coherent icon language.
4. Разрешено анализировать/копировать/использовать локальный icon set:
- `H:\Work\tabler-icons-3.41.0`
5. Поддержка light/dark theme как стабильного пользовательского режима.
6. Перенос вторичного поясняющего текста в contextual help/onboarding.
7. Более широкая future UI cleanup волна без бизнес-логических перезаписей.
8. Поздний полный onboarding overhaul после финальной UI стабилизации.
9. Future-pass на более сильный визуальный акцент ключевых действий и high-priority controls.

---

## 11) Статус performance/caching блока
### 11.1 Что зафиксировано
Phase 18A добавил performance-аудит и безопасную caching-стратегию:
- workspace-scoped snapshots (memory + localStorage);
- stale-while-revalidate паттерн для повторных просмотров;
- ускорение Home/Reminders/History при повторных заходах.

### 11.2 Safety-границы (обязательные)
Локальный storage/cache не является source-of-truth для:
- premium entitlement state;
- owner/admin rights;
- gift campaign quota/claim state;
- one-time invite validity;
- security-sensitive access state.

Локальный cache используется только как:
- временный snapshot;
- UI acceleration layer;
- convenience state;
- быстрый повторный показ с последующей revalidation.

### 11.3 Что оставлено неизменным сознательно
Критичная серверная истина остается сервер-авторитетной; скорость не должна ломать корректность.

---

## 12) Bug report / support notes
1. В Profile есть in-app entry point для bug report.
2. Доставка идет server-side в Telegram (без утечки bot secret в клиент).
3. Пользователь получает явный success/error feedback.
4. Будущие улучшения support/triage возможны, но без превращения в тяжелую ticket-систему без отдельного решения.

---

## 13) Source-of-truth guidance: следующий логичный шаг
### 13.1 Что логично делать следующим
Следующий рациональный блок после 19A.2:
1. Controlled UI-first pass на финальную ясность экранов с акцентом на ключевые действия.
2. Дополнительная Reminders-шлифовка только в рамках action hierarchy и минимальной когнитивной нагрузки.
3. Отдельно запланировать полный onboarding overhaul после того, как UI-модель окончательно стабилизирована.

### 13.2 Что не нужно приоритизировать прямо сейчас
1. Случайный premium/growth expansion.
2. Большой backend/system rewrite ради визуальных задач.
3. Новый тяжелый caching framework (18A уже дал безопасную базу).

### 13.3 Что остается сознательно deferred
1. Formal full closure для 13B.
2. Long-horizon production verification по dispatch/reminders.
3. Полный first-run onboarding rebuild/verification (после финальной UI стабилизации).

---

## 14) Как использовать этот якорь в новом чате
1. Сначала прочитать этот якорь полностью.
2. Использовать его как primary source of truth по статусам, правилам и roadmap.
3. Продолжать работу от зафиксированного последнего подтвержденного состояния.
4. Не запрашивать повторно уже зафиксированный контекст, если нет реальной неоднозначности.

---

## 15) Источники, использованные при сборке этого якоря
- `docs/payment_control_master_anchor_2026-03-28.md`
- `docs/payment_control_master_anchor_2026-03-27.md`
- `docs/payment_control_full_migration_anchor_post_live_family_2026-03-26.md`
- `docs/reports/phase_17A_reminders_interaction_model_redesign.md`
- `docs/reports/phase_17A_1_hydration_locale_bugfix.md`
- `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`
- `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md`
- `docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md`
- `docs/reports/phase_17B_reminders_rethink_analysis.md`
- `docs/reports/phase_17C_action_lane_cleanup.md`
- `docs/reports/phase_17C_1_recurring_cycle_visibility_fix.md`
- `docs/reports/phase_18A_performance_audit_safe_storage_caching_strategy.md`
- `docs/reports/phase_19A_app_like_polish_2_reminders_screen_model.md`
- `docs/reports/phase_19A_1_template_currency_autosuggest_catalog.md`
- `docs/reports/phase_19A_2_strict_title_only_template_matching_fix.md`
- точечная сверка кода:
  - `src/components/app/recurring-payments-section.tsx`
  - `src/lib/payments/starter-templates.ts`
  - `src/components/app/help-popover.tsx`
  - `src/lib/payments/client-cache.ts`

---

Последний подтвержденный этап: Phase 19A.2
Последний полный якорь для миграции: docs/payment_control_master_anchor_2026-03-28_v2.md
Новый чат должен продолжать работу от этого состояния без повторного ввода контекста.

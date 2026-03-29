# Payment Control — Master Anchor после monetization pivot (2026-03-29)

## 1. Project Overview
`Payment Control` — Telegram Mini App для контроля регулярных платежей, напоминаний, истории оплат и семейного режима.

Текущая зрелая модель продукта:
- mobile-first;
- app-like (не как длинный сайт);
- спокойный, понятный, рабочий интерфейс;
- 4 основные вкладки: `Home`, `Reminders`, `History`, `Profile`;
- free-core: базовая польза всегда доступна без оплаты.

Цель этого anchor:
- зафиксировать реальное текущее состояние проекта после длинной ветки UI/UX и monetization работ;
- честно развести «что подтверждено вручную», «что историческое», «что замещено новым решением»;
- дать базу для продолжения в новом чате без пересказа всей истории.

---

## 2. Source-of-Truth Rules
При конфликтах между старыми и новыми документами использовать такой приоритет:

1. Последние явные решения пользователя (включая этот anchor).
2. Последние вручную подтвержденные / формально закрытые статусы.
3. Последние отчеты в `docs/reports` и `docs/reports/internal_version_history.md`.
4. Старые master-anchor файлы.
5. Старые исторические допущения.

Важно:
- не скрывать противоречия;
- не «перекрашивать» историю задним числом;
- явно помечать: `current truth`, `historical`, `superseded`.

---

## 3. Workflow Rules for Future Chats
Рабочая схема проекта (обязательная):

1. Ассистент дает следующий prompt.
2. В prompt явно указана модель: `ChatGPT 5.4` или `ChatGPT 5.3 Codex`.
3. Пользователь запускает prompt в VSCode.
4. Codex делает работу и сохраняет полный отчет `.md` в проект.
5. В чат Codex пишет только короткий итог.
6. Пользователь присылает отчет обратно, и формируется следующий prompt.

Дополнительные правила процесса:
- объяснения для пользователя: простым русским языком, минимум сложного жаргона;
- изменения — узкие и локальные;
- без широких рефакторингов без явной необходимости;
- без скрытых feature-flag решений;
- строго следить за UTF-8 и отсутствием битой кириллицы.

---

## 4. Environment / Repo / Infra Notes
Подтвержденный операционный контекст:
- GitHub repo: `https://github.com/Djoystick/PaymentControl.git`
- Supabase project URL: `https://rzjricjmgcnkqhblvvyf.supabase.co`
- Deploy/runtime: Vercel (ветка `main` автодеплоится)
- Рабочий CLI режим пользователя: Git Bash

Текущая инфраструктурная связка:
- Telegram Mini App + Telegram Bot
- Next.js + TypeScript frontend/API routes
- Supabase DB
- Vercel runtime/cron

---

## 5. Product Philosophy
Текущая продуктовая философия (актуальная):
- быстрые короткие сессии;
- максимум пользы на первом экране;
- минимум лишнего визуального шума;
- рабочий, а не «маркетинговый» интерфейс;
- вторичная информация уходит в спокойные вторичные блоки.

---

## 6. Free-Core Rules
Нельзя ломать free-core модель:
- базовые recurring/reminder/history сценарии всегда доступны;
- `Mark paid / Undo paid` всегда в ядре бесплатного использования;
- монетизация не должна блокировать основную полезность приложения.

Premium — это расширение удобства/глубины, но не блокировка базовых действий.

---

## 7. UI/UX System Rules
Подтвержденная UI-линия:
- app-like, компактно, спокойно;
- четкая иерархия действий;
- «Calm Operational Finance» как основной визуальный стиль;
- минимизация скролла там, где это реально честно.

Обязательные активные UX-правила:
- активные кнопки и раскрытые блоки должны быть визуально понятнее;
- `Buy Premium` и `Support the project` — заметнее обычных вторичных кнопок;
- но без агрессивного storefront-стиля;
- фейковый `no-scroll` запрещен: либо честно помещается, либо честно скроллится.

---

## 8. Current Confirmed Phase-by-Phase Status

### 8.1 Foundation line (исторически подтвержденный базовый фундамент)
Состояние из прошлых anchor/отчетов:
- Фазы `0`–`12C`: фундамент продукта и инфраструктуры закрыт и подтвержден в исторической линии.
- `13A`: manual verified (premium entitlement foundation без core-paywall).
- `13C` (+ `13C.1` fix): owner-only admin baseline подтвержден.
- `15A`: bug-report flow и Telegram delivery подтверждены.
- `16B`: подтвержденная стабильная UX-база до новых волн.
- `18A`: safe cache/revalidation стратегия подтверждена.
- `19A.1` и `19A.2`: template/autosuggest/currency корректировки подтверждены.

### 8.2 UI-system maturation line (новая подтвержденная волна)
Подтвержденные статусы:
- `19B` — manual verified
- `19C` — manual verified
- `20B` — manual verified
- `20C` — manual verified
- `20D` — manual verified
- `20E` — manual verified
- `20G` — manual verified
- `20H` — manual verified

Нюанс:
- `20F` был рабочим pass по плотности;
- затем `20G` исправил честность viewport/scroll модели;
- текущая истина по scroll-поведению определяется `20G` (а не «no-scroll любой ценой»).

### 8.3 Onboarding closure line
- `21A.1` — manual verified (починил viewport overlay bug и закрыл blocker)
- true first-run onboarding verification — completed (по ветке 21B.1 audit-readiness + manual closure контекст)

### 8.4 Old deferred debt closure line
- `13B formal closure` — completed (через 21B.2 readiness + formal closure workflow)

### 8.5 Monetization implementation line (до пивота)
Подтверждено как реализованная/проверенная база ветки claim-first:
- `22A` — manual verified
- `22C` — manual verified
- `22D` — manual verified
- `22E` — manual verified

Отдельно:
- `22B` — реализован и принят в рабочем цикле (использовать как принятый этап разделения rails).
- `22F` — есть реализованный отчет/код, но дальнейшее продуктовое решение изменило направление монетизации; считать исторической частично полезной веткой (см. разделы 10/15/17/18).

---

## 9. Manual Verified / Closed Phases
Ключевые подтвержденные/закрытые этапы, важные для продолжения:
- `19B`, `19C`, `20B`, `20C`, `20D`, `20E`, `20G`, `20H` — manual verified
- `21A.1` — manual verified
- `true first-run onboarding verification` — completed
- `13B formal closure` — completed
- monetization line: `22A`, `22C`, `22D`, `22E` — manual verified
- `22B` — принят пользователем в рабочем цикле как реализованный user-facing разделитель rails

---

## 10. Implemented But Not Fully Verified / Historical / Superseded Phases

### 10.1 Implemented but not final current truth
- `22F`:
  - статус: implemented/report exists;
  - дальнейшая судьба: частично полезен, но ветка строилась вокруг subscription-first контекста;
  - после monetization pivot — не является текущей целевой монетизационной истиной.

### 10.2 Historical but useful
- subscription-era foundation (фазы 7A–7F и часть ранней линии) остается исторически важной как опыт и данные, но не как текущая monetization цель.

### 10.3 Superseded by newer decisions
- subscription-first monetization как главная целевая модель — superseded новым решением о one-time premium purchase.

---

## 11. Deferred / Operational Observations

Текущие операционные наблюдения:
- long-horizon reminder delivery observation остается рабочим наблюдением;
- это не текущий roadmap blocker;
- требует регулярного runtime-наблюдения, но не тормозит текущие продуктовые этапы.

---

## 12. Onboarding Status
Onboarding линия на текущий момент:
- структура onboarding обновлена в 21A;
- критичный UI-блокер overlay-позиционирования закрыт в `21A.1`;
- replay path и true first-run логика разведены;
- readiness/verification true first-run пройдены;
- линия onboarding на текущем этапе считается закрытой со стороны UX/implementation.

---

## 13. Premium / Admin / Gift / Claim History

Историческая последовательность:
- `13A`: premium entitlement foundation (без paywall на ядро)
- `13B`: gift campaign foundation (позже формально закрыт)
- `13C/13C.1`: owner-only admin baseline + важные корректировки
- `22A`: purchase claim foundation
- `22C`: owner claim review queue
- `22B/22D`: user-facing rails + lifecycle UX
- `22E`: purchase intent + correlation code (semi-automatic correlation, не auto-activation)
- `22F`: active-state emphasis + owner claim notification, но далее monetization-пивот

Что важно:
- Telegram numeric user ID остается основной внутренней identity-осью;
- внешняя payment identity — только вспомогательное доказательство;
- owner review остается обязательной частью manual-claim модели в исторической ветке.

---

## 14. Current Monetization Source of Truth (NEW)
Это актуальная жесткая истина после пивота:

1. Premium больше НЕ subscription-продукт.
2. Цель — one-time покупка Premium (пакет/период доступа), не подписка.
3. Support/donation — отдельный сценарий.
4. Donation не дает Premium автоматически.
5. Интерфейс обязан явно разделять:
   - `Buy Premium`
   - `Support the project`
6. Free-core философия сохраняется без изменений.
7. Нельзя делать ложные обещания авто-подтверждения оплаты.

---

## 15. Subscription Model History and Why It Is No Longer Current

Что было раньше:
- monetization ветка строилась как Boosty-first subscription rail + manual claim/review loop.

Почему больше не текущая истина:
- принято новое явное продуктовое решение: subscription-модель Premium удалена как целевая.
- теперь целевой продукт — one-time premium purchase + отдельная donation rail.

Как трактовать старую ветку:
- не удалять из истории;
- пометить как `historical branch`;
- использовать только те части, которые не завязаны на subscription-смысл.

---

## 16. New Target Monetization Model
Новая целевая модель:

### 16.1 One-time Premium purchase
- пользователь делает разовую покупку Premium-пакета/периода;
- после покупки — прозрачный и простой путь подтверждения/активации;
- без ложной «автоматической» верификации, если ее реально нет.

### 16.2 Separate donation/support flow
- donation/support — отдельный добровольный путь поддержки проекта;
- не маскируется под premium-активацию;
- не ломает free-core доступ.

---

## 17. What Remains Reusable from Old Monetization Branch
После пивота можно переиспользовать:
- таблицы и паттерны claim lifecycle (как каркас состояний);
- owner review queue подход (`approve/reject + notes + metadata`);
- разграничение user/owner visibility;
- спокойный profile-блок с разделением rails;
- purchase intent/correlation идея как вспомогательный reference-механизм (если адаптировать под one-time модель);
- owner notification pattern на событие «claim submitted» (без ложных payment-статусов).

---

## 18. What Must Be Rebuilt or Replaced
Нужно перестроить под новую истину:
- все subscription-first тексты и сценарии в `Buy Premium` пути;
- связь `Premium = подписка` в UX и формулировках;
- старые assumptions про subscription rail как «основной продуктовый путь»;
- части 22E/22F, где смысл завязан на subscription-термины, а не на one-time purchase.

Нельзя просто «переименовать кнопку»:
- нужно переформатировать flow так, чтобы пользователь видел честный one-time сценарий.

---

## 19. Active Roadmap Forward
Текущая активная продуктовая ветка после пивота:
- сохранить стабильный UI/UX baseline (19B–21A.1, 20G-правило честного скролла);
- не трогать закрытые core-потоки;
- сделать monetization re-foundation под one-time purchase и separate support.

Ключевой принцип вперед:
- сначала четкая переустановка product/source-of-truth для one-time monetization,
- потом узкие реализационные этапы,
- потом manual verification closure.

---

## 20. Recommended Next Logical Phases

### Recommended next block: Monetization Refoundation (one-time model)

| Phase | Objective | Why now | Dependencies | Acceptance criteria | Must NOT change |
|---|---|---|---|---|---|
| 23A — One-Time Monetization Refoundation Spec | Зафиксировать новую one-time модель в данных/UX/текстах и статусах | Сейчас есть конфликт: старый subscription-код vs новый source-of-truth | Текущий anchor + отчеты 22A–22F | Есть единый approved spec для one-time Premium + separate support | Не менять рабочую core-логику платежей/напоминаний |
| 23B — Data/Claim Adaptation for One-Time Premium | Адаптировать claim/intent/owner review под one-time package semantics | Чтобы backend/state не оставались subscription-first | 23A | Состояния и поля явно отражают one-time сценарий, без ложной авто-активации | Не ломать owner-only границы и free-core |
| 23C — Profile Monetization UX Rebase (One-Time) | Пересобрать профильный monetization surface под one-time смысл с простым path | Сейчас UX частично исторически завязан на subscription wording | 23A/23B | В Profile ясно разделены Buy Premium (one-time), Support, Claim; user не путается | Не превращать Profile в storefront |
| 23D — Owner Reconciliation Parity Pass | Довести owner queue/notes/статусы под one-time операционный цикл | Чтобы review-операции были быстрыми и однозначными | 23B/23C | Owner быстро видит нужный контекст, approve/reject работает стабильно | Не делать heavy admin dashboard |
| 23E — End-to-End Manual Closure Pack | Формально закрыть новую one-time monetization MVP цепочку | Нужна честная финальная ручная верификация | 23C/23D | Полный manual pack пройден: buy/support/claim/review/outcome/free-core intact | Не заявлять automation, которой нет |

---

## 21. Things That Must NOT Be Broken
Обязательные инварианты:
- 4-tab shell;
- mobile-first compact UX;
- app-like направление;
- `Mark paid / Undo paid`;
- strict title/name-only template autosuggest;
- RUB default normalization;
- safe help popover behavior;
- workspace switching/create/join;
- personal/family baseline;
- owner-only admin visibility;
- bug report flow;
- safe cache/revalidation (18A);
- onboarding replay + first-run behavior;
- честный viewport/scroll принцип из 20G;
- free-core политика без paywall на ядро.

---

## 22. Important User Style Preferences
Пользовательские предпочтения, обязательные для следующих pass:
- писать просто и по-русски;
- меньше теории, больше практики;
- шаги понятные новичку;
- не раздувать scope;
- сохранять calm hierarchy;
- активные/раскрытые элементы — визуально понятнее, но без визуальной агрессии;
- monetization заметна, но не «кричащая».

---

## 23. Commands / Release / Migration Habits

### 23.1 Базовый git-поток (без миграций)
```bash
git status
git add <нужные файлы>
git commit -m "..."
git push origin main
```

### 23.2 Безопасный порядок, если есть миграции
```bash
git status
git add <нужные файлы>
git commit -m "..."
supabase db push
supabase migration list
git push origin main
```

### 23.3 Примечания по релизу
- основная рабочая ветка: `main`;
- деплой в прод идет через push в `main` (Vercel);
- отчеты каждого pass хранить в `docs/reports`;
- держать `docs/reports/internal_version_history.md` в актуальном состоянии;
- public changelog обновлять только для реально крупных внешне-значимых изменений.

---

## 24. Final Concise Status Block

**Последний подтвержденный этап: Phase 22E (manual verified).**

**Состояние subscription-ветки монетизации:**
- subscription-first модель теперь `superseded` как текущая product truth;
- исторические результаты 22A–22F сохранены и частично переиспользуемы, но должны быть адаптированы под one-time модель.

**Следующий логичный этап:**
- запуск нового блока `23A — One-Time Monetization Refoundation Spec`,
- затем последовательная адаптация данных/UX/owner review под one-time Premium + separate donation/support.

---

## Appendix A — Status Classification Snapshot

### Current source of truth
- UI-system линия до `22E` (с учетом подтвержденных фаз) + новый monetization pivot на one-time модель.

### Historical but useful
- claim/review инфраструктура 22A/22C/22D/22E;
- часть UX и operational паттернов 22B/22F.

### Superseded by later decision
- subscription-first monetization как целевая модель Premium.

### Operational observation (not blocker)
- long-horizon reminder delivery monitoring.

---

## Appendix B — Reconciled Notes About Version Sources
Есть расхождение между источниками статуса:
- `docs/reports/internal_version_history.md` содержит несколько строк `implemented, pending manual verification` для 22-линии;
- в рабочем процессе пользователь позже отдельно подтвердил manual verification для 22A/22C/22D/22E (и принятие 22B), что имеет более высокий приоритет как latest explicit decision.

В этом anchor использован приоритет «последнее явное решение пользователя».

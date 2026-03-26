# Payment Control — Полный Migration Anchor после live family verification (2026-03-26)

## 1) Назначение документа
Это главный migration anchor проекта на текущий момент.  
Его цель: быть единым источником истины при переносе в новый чат, без повторного ручного пересказа всей истории.

Этот anchor фиксирует:
- текущий фактический статус продукта;
- статус всех фаз от Phase 0 до Phase 9A;
- что подтверждено живыми ручными проверками, а что нет;
- рабочие правила взаимодействия в новых чатах;
- следующий логичный шаг roadmap.

Использовать этот файл как базу для любого следующего prompt в новом чате.

---

## 2) Краткая сводка проекта
Проект: Telegram Mini App для контроля регулярных платежей, подписок и домашних расходов.

Текущий стек:
- Frontend: Next.js + TypeScript + Tailwind
- Backend/API: Next.js Route Handlers
- DB: Supabase
- Runtime/Deploy: Vercel
- Telegram слой: Bot API + Telegram Mini App (WebApp runtime)

Ключевая инфраструктура:
- GitHub repo: `https://github.com/Djoystick/PaymentControl.git`
- Supabase project URL: `https://rzjricjmgcnkqhblvvyf.supabase.co`
- Vercel deploy/runtime: подключен
- Telegram Bot / Mini App runtime: подключен и использован для живых проверок

Операционный режим команды:
- дальше работать через **Git Bash** (не через GitHub Desktop);
- новые миграции делать через **Git Bash**;
- все шаги с Supabase/Vercel/Telegram описывать максимально подробно, по кнопкам, как для новичка.

---

## 3) Последний подтвержденный этап
**Последний подтвержденный этап: Phase 9A — Telegram Mini App deployment/runtime integration foundation (с живыми runtime-проверками внутри Telegram и закрытием live invite accept блокера).**

---

## 4) Executive summary (очень кратко)
Что уже реально сделано:
- personal core полностью рабочий;
- reminders foundation рабочий в живом runtime;
- subscriptions layer рабочий;
- family foundation по UX/read-only поверхностям доведен до связного состояния;
- семейный invite create+accept подтвержден живым вторым Telegram-профилем;
- Home/Dashboard/Reminder/Activity family surfaces собраны и вручную проверены;
- нижняя навигация после follow-up фикса реально нажимается и работает.

Что было partially verified раньше и теперь закрыто:
- Phase 8B accept invite раньше был хвостом; после live-проверки вторым реальным профилем этот блок закрыт как manual verified.

Что осталось впереди:
- не инфраструктурный, а продуктовый следующий шаг: первый полноценный family e2e usage pass в живом двухпрофильном household-сценарии (shared recurring + who pays + сквозная видимость на обоих профилях).

---

## 5) Подробный статус по фазам

## DONE, manual verified
- Phase 0 — foundation
- Phase 0.1 — hydration bugfix
- Phase 1A — auth/profile foundation
- Phase 2A — personal workspace foundation
- Phase 2B — current app context foundation
- Phase 3A — recurring payments schema + minimal CRUD
- Phase 3B — payment cycle state foundation
- Phase 4A — dashboard MVP foundation
- Phase 5A — quick add + starter templates foundation
- Phase 6A — reminder preferences + candidates foundation
- Phase 6B — minimal reminder dispatch + attempt logging + idempotency
- Phase 6C — delivery readiness/preflight + manual test send foundation
- Phase 6D — recipient binding diagnostics + onboarding + verification path
- Phase 6E — verified binding delivery unification
- Phase 6F — delivery UX cleanup
- Phase 6F.1 — onboarding public bot username bugfix
- Phase 6G — secure scheduled dispatch foundation
- Phase 6G.1 — scheduled dispatch type bugfix
- Phase 6H — Vercel cron hookup foundation
- Phase 7A — subscriptions layer foundation
- Phase 7B — subscription renewals visibility
- Phase 7C — subscription cost pressure visibility
- Phase 7D — subscription pause/resume foundation
- Phase 7E — paused subscriptions visibility + monthly savings
- Phase 7F — subscription health visibility
- Phase 8A — family workspace foundation
- Phase 8B — family invite flow foundation (после live accept verification переведен в manual verified)
- Phase 8C — personal/shared payment distinction
- Phase 8C.1 — workspace/mode sync bugfix
- Phase 8D — family responsibility / who pays foundation
- Phase 8E — family workspace clarity UX foundation
- Phase 8F — active context switching UX cleanup
- Phase 8G — family members visibility / household clarity
- Phase 8H — context-aware family management surface cleanup
- Phase 8I — family invite clarity/continuity cleanup
- Phase 8J — family workspace summary/readiness foundation
- Phase 8K — family shared payments empty state / first-step guidance
- Phase 8L — family recurring UX polish bundle
- Phase 8M — family dashboard visibility foundation
- Phase 8N — family reminder visibility/read-only readiness
- Phase 8O — family activity visibility/read-only timeline
- Phase 8P — family home surfaces coherence bundle
- Phase 8P.2 — bottom navigation follow-up fix (живой ручной чек подтвердил работоспособность)
- Phase 8Q — family invite accept readiness/live-verification support bundle
- Phase 9A — deployment/runtime integration foundation + подробный setup guide + live runtime проверка

## DONE in code, but not independently important anymore
- Phase 8B.1 — create-invite bugfix (встроен в стабильный 8B flow, отдельной ценности уже не несет)
- Phase 8P.1 — первая попытка фикса bottom nav (перекрыта и финально закрыта 8P.2)

## Partially verified
- На текущий момент **критически важных активных partially verified фаз нет**.
- Остаются обычные эксплуатационные проверки production-уровня (например стабильность cron в длительном периоде), но это не незакрытая phase-цель.

## Pending / not started
- Первый продуктовый post-live family e2e pass (следующий шаг после 9A; см. раздел 10)
- Полноценная shared economics система (balances/debts/split)
- Family reminder dispatch parity как отдельный subsystem
- Family subscriptions parity как отдельный subsystem
- Scenario migration engine (single<->family)
- Premium/monetization layer
- Localization RU/EN
- Большой общий UI/UX redesign pass
- Growth/referrals/campaign architecture

---

## 6) Что подтверждено живыми ручными проверками
Подтверждено ручными живыми проверками (включая Telegram runtime и два реальных профиля):

1. Mini App запускается внутри Telegram (не только локально через dev fallback).
2. Профили поднимаются из живых Telegram данных.
3. Personal workspace создается и используется.
4. Family workspace создается и сохраняется.
5. Invite create в family workspace работает.
6. Invite accept вторым реальным Telegram-профилем работает.
7. Второй участник появляется в household/members.
8. Invite получает статус `accepted`.
9. `workspace_members` обновляется корректно.
10. Family workspace становится доступен для второго профиля в workspace switch.
11. Family recurring surfaces работают в живом runtime.
12. Family reminder visibility/readiness surfaces работают в живом runtime (read-only слой).
13. Family activity/read-only timeline surface работает.
14. Family dashboard/home overview работает.
15. Bottom navigation `Home / Activity / Profile` после follow-up фикса реально кликается и переключает секции.

---

## 7) Что еще остается долгом / что еще не добито

## 7.1 Старые долги (часть уже закрыта)
- Был старый долг: live accept invite вторым Telegram-профилем.  
  Статус: **закрыт**.
- Был старый долг: interactivity нижнего бара (`Home/Activity/Profile`).  
  Статус: **закрыт** после 8P.2 и ручной проверки.

## 7.2 Новые/текущие долги
- Нет критичного инфраструктурного долга, блокирующего продолжение roadmap.
- Основной долг теперь продуктовый: нет полноценного family e2e usage pass с фокусом на shared usage для двух профилей.

## 7.3 Неблокирующие хвосты
- Контент/стартовый экран/общая copy-подача еще местами “техническая”, не полностью продуктово-полированная.
- Есть локальные UX-consistency хвосты, которые можно закрывать пакетами по UI/pass’ам без backend-расширения.
- Длительная production-эксплуатация cron/scheduled path еще требует обычного наблюдения в runtime (это не блокер roadmap).

## 7.4 Крупные отложенные блоки roadmap
- Shared economics (split/debts/balances)
- Family feature parity по reminders/subscriptions как отдельные продуктовые подсистемы
- Scenario migration engine
- Premium/monetization
- Localization RU/EN
- Большой UI/UX overhaul
- Growth/referral/campaign architecture

## 7.5 Что уже НЕ является долгом
- Live Telegram runtime запуск (базовый)
- Invite create/accept с двумя реальными профилями
- Household membership видимость после join
- Bottom nav interactivity bug

## 7.6 Что еще не покрыто полноценным family e2e beyond invite/join
- Сквозной “жизненный” двухпрофильный сценарий использования family shared-платежей на длинной дистанции (не только join/видимость, но и устойчивый usage flow).

---

## 8) Текущий фактический продуктовый статус
Простыми словами:
- personal core готов и стабилен;
- reminders personal foundation готов;
- subscriptions layer готов в personal;
- family foundation живая и проверена на двух реальных Telegram-профилях (включая invite accept);
- family context в Home/Reminder/Activity/Profile/Recurring уже читается и не выглядит как заглушка;
- но полноценная shared economics система еще не сделана;
- split/debts нет;
- full scenario engine нет;
- premium нет;
- localization нет;
- большой UI redesign нет.

---

## 9) Полная roadmap на будущее

## A) Уже выполненные foundation-блоки
- [DONE] Personal foundation (0 -> 5A)
- [DONE] Reminder/delivery foundation (6A -> 6H)
- [DONE] Subscriptions layer foundation (7A -> 7F)
- [DONE] Family foundation wave 1 (8A -> 8Q, включая live invite accept readiness/clarity)
- [DONE] Runtime integration/deploy readiness (9A)

## B) Ближайший следующий логичный шаг
- Первый реальный family e2e usage pass (продуктовый, не инфраструктурный), см. раздел 10.

## C) Среднесрочные family-блоки
- Family shared usage углубление (после первого e2e pass)
- Responsibility flows consistency между профилями
- Дальнейшая family visibility/coherence полировка
- Подготовка к family feature parity по reminders/subscriptions (без резкого scope-jump)

## D) Отложенные системные блоки
- Shared economics (debts/balances/split)
- Scenario migration engine
- Более сложные доменные механики, которые не нужны до стабилизации базового family usage

## E) Инфраструктурные / release / runtime блоки
- Непрерывный мониторинг production runtime (Vercel/Supabase/Telegram)
- Операционный контроль scheduled dispatch в production
- Release discipline: фиксировать manual verified/not confirmed после каждого pass

## F) Premium / monetization
- Позже: premium foundation
- Позже: paylock (в roadmap уже запланирован логичный этап)
- Позже: campaign-aware premium distribution

## G) Localization
- Отдельный pass RU/EN после стабилизации ключевых product flows

## H) Большой UI/UX pass
- Общая визуальная и copy-полировка
- Упрощение технических формулировок
- Унификация стиля across surfaces

## I) Growth / referrals / campaign architecture
- Отложенный этап после зрелого core
- Referral/campaign-compatible архитектура как отдельный продуктовый слой

---

## 10) Следующий логичный шаг
**Следующий логичный шаг: продуктовый family e2e usage pass в живом двухпрофильном household.**

Фокус следующего pass:
1. Shared recurring payment creation/use в family workspace в live режиме.
2. Who pays assignment в живом двухпрофильном контексте.
3. Проверяемая видимость для обоих профилей на recurring/dashboard/activity/reminder surfaces.
4. Без запуска shared economics/split/debts и без крупного архитектурного рывка.

Почему именно это:
- инфраструктурный блокер (live invite accept) уже закрыт;
- логично идти в практический usage и consistency, а не в новый тяжелый subsystem.

---

## 11) Правила работы в новом чате
Критические правила, которые нельзя терять при переносе:

1. Перед каждым prompt явно указывать модель:
- `ChatGPT 5.4`
- `ChatGPT 5.3 Codex`

2. Для Codex:
- полный подробный отчет сохранять в `.md` внутри проекта;
- в чате давать только короткий итог.

3. Объяснения пользователю:
- всегда на русском;
- простыми понятными формулировками.

4. После закрытия шага:
- если нет блокеров, сразу давать следующий prompt.

5. Bundle-pass стратегия:
- UI/UX/visibility/coherence/read-only слои можно делать пакетами;
- backend/domain/migrations/auth/invite/split/debts/scenario engine — осторожно и уже не слишком широко.

6. Все внешние инструкции (Supabase/Vercel/Telegram/GitHub):
- максимально подробно;
- по шагам;
- “куда нажать/что вставить/как проверить результат”.

7. Рабочая среда:
- работать через Git Bash;
- миграции делать через Git Bash.

8. Roadmap discipline:
- строго соблюдать последовательность;
- не перескакивать через крупные блоки без причины.

9. Источник истины:
- live Telegram runtime важнее dev fallback;
- если что-то не подтверждено руками, честно помечать как `not confirmed` / `partially verified`.

10. Migration discipline:
- этот anchor использовать как source of truth при миграции в новый чат.

---

## 12) Инфраструктурный статус
Текущее состояние инфраструктуры:
- GitHub подключен
- Vercel deploy поднят
- Supabase schema присутствует (миграции применены)
- Telegram bot menu button / Mini App runtime работает
- Живая Telegram runtime verification уже выполнялась
- Live family invite accept вторым реальным профилем уже выполнялся

Что остается по infra в будущем:
- обычный операционный контроль стабильности production runtime;
- наблюдение за scheduled/cron поведением в длительном горизонте;
- но нет критичного инфраструктурного блокера для следующего продуктового этапа.

---

## 13) Операционные инструкции на будущее
Практические правила:

1. Где лежат отчеты:
- все phase-отчеты в `docs/`.

2. Нейминг новых отчетов:
- `docs/phase<номер>_<краткое_название>_report.md`.

3. Что не удалять:
- старые phase reports;
- runtime setup guide;
- anchor/status документы;
- миграции.

4. Как относиться к dev fallback:
- fallback — только вспомогательный dev-инструмент;
- истина по готовности — это live Telegram runtime.

5. Что делать при новых миграциях:
- создавать узкие миграции;
- применять и проверять через Git Bash/рабочий процесс проекта;
- фиксировать в отчете, что применено и как проверено.

6. Как фиксировать статусы шагов:
- каждый pass заканчивать явным статусом:
  - manual verified
  - partially verified
  - not confirmed
- если partial закрыт позже живой проверкой, обновлять anchor по факту, а не держать старый статус по инерции.

---

## 14) Источники, на которые опирался этот anchor
Этот anchor собран по:
- текущему состоянию репозитория;
- файлам `docs/phase..._report.md`;
- `docs/runtime_setup_guide_for_beginner.md`;
- существующим anchor/status документам в корне проекта;
- последним live verification результатам, зафиксированным в проектной истории и требованиях текущего прогона.

---

## Финальная фиксирующая строка
На дату `2026-03-26` проект перешел из инфраструктурного добивания в стадию следующего продуктового family e2e шага; ключевой старый блокер (live accept invite вторым профилем) считается закрытым.

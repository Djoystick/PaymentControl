# Payment Control - Master Migration Anchor (Post-29A.1)

- Date: 2026-04-05
- Type: documentation-only state audit + migration handoff anchor
- Goal: единый source of truth для продолжения работы в новом чате без повторного восстановления контекста

## A. Project Overview

Payment Control — Telegram Mini App для повседневного контроля регулярных платежей и групповых расходов в поездках.

Текущий зрелый контур проекта:
1. Core baseline (Recurring/History/Profile/Workspace/Family) закрыт как release-line в 27H.
2. Travel-ветка 28A-28Q собрана в зрелый Travel v1 контур.
3. Phase 29A + 29A.1 довели language/analytics platform readiness для Mini App.
4. Проект работает в donation-only модели без paywall и без unlock-механик.

Назначение этого anchor:
1. Зафиксировать активную truth и запреты на регресс.
2. Отделить active baseline от historical/superseded слоев.
3. Дать понятный handoff для нового чата.

## B. Active Product Truth

Non-negotiable product truth на текущий момент:
1. Premium полностью удален из проекта.
2. Сервис полностью без ограничений.
3. Донат добровольный, только как поддержка проекта.
4. Boosty и CloudTips — обычные внешние донатные ссылки.
5. Supporter badge — только косметическая метка, не открывает функции.
6. Старые premium/donor-to-premium/entitlement/claim-to-unlock/subscription-first линии — historical/superseded.
7. Запрещено возвращать paywall, ограничения или скрытые unlock-механики.

Domain truth:
1. Recurring и Travel — разделены как отдельные продуктовые сценарии.
2. Travel v1 после 28Q считается зрелой и фактически собранной веткой.
3. 29A/29A.1 относятся к platform-compliance слою Mini App (language + analytics), не к новой продуктовой feature-волне.

Language/analytics truth:
1. English — default/fallback язык приложения.
2. Auto-detection языка в Mini App опирается на Telegram `language_code`.
3. Manual language override внутри приложения имеет приоритет над auto-detection.
4. Browser/system/IP language detection не является auto-source.
5. Telegram Analytics SDK интегрирован в код приложения.
6. Реальный live сбор analytics зависит от корректно заданных env и ручной runtime-проверки.

## C. Historical/Superseded Branches

Явно historical/superseded, не активный roadmap:
1. Любые Premium-first модели монетизации.
2. Donor-to-premium автоматизация как путь к функциональному доступу.
3. Claim/review/entitlement как gating-механика доступа.
4. Subscription-first продуктовая логика как доминирующее направление.

Historical record сохраняется для контекста эволюции, но не должен управлять текущими решениями.

## D. Current Shell / Module Structure

Фактическая структура по runtime-коду:
1. Root layout: `src/app/layout.tsx` (Next.js app shell + `TelegramMiniAppProvider`).
2. Главная страница: `src/app/page.tsx` -> `ProfileScenariosPlaceholder`.
3. App shell: `src/components/app/app-shell.tsx`.
4. Root tabs: `Home / Recurring / Travel / History / Profile`.
5. Recurring и Travel реализованы отдельными экранами:
   - `src/components/app/recurring-payments-section.tsx`
   - `src/components/app/travel-group-expenses-section.tsx`
6. Travel runtime отделен по API/domain:
   - `src/app/api/travel/**`
   - `src/lib/travel/**`
7. Localization слой: `src/lib/i18n/localization.tsx`.
8. Telegram bootstrap/language utilities: `src/lib/telegram/web-app.ts`.
9. Telegram analytics integration: `src/lib/telegram/analytics.ts` + `src/lib/config/client-env.ts`.

Практический вывод:
1. Shell separation из 28J в коде сохранен.
2. Travel не смешан обратно в Recurring.

## E. Release Baseline Status

Release-line (до Travel expansion) считается закрытой:
1. 27H зафиксировал финальный release sign-off и closure sync.
2. 27B-27G отмечены как manual verification completed by user (release-line accepted) в `internal_version_history.md`.
3. Core stable flows считаются baseline:
   - reminders/recurring lifecycle,
   - history,
   - workspace/family,
   - add/edit/delete payment,
   - mark paid/undo paid,
   - onboarding replay,
   - bug report,
   - supporter badge foundation (cosmetic-only).

Что это значит для новых pass:
1. Эти слои не должны деградировать.
2. Любые изменения должны идти как узкие и осмысленные волны поверх baseline, а не через ломку ядра.

## F. Payment Control Core Status

Состояние core-модуля:
1. Donation-only unrestricted модель зафиксирована.
2. Support rails живут как внешние ссылки, без in-app access gating.
3. Profile содержит workspace/language/family/support/guide слои без возврата Premium unlock semantics.
4. Official cancellation guide layer (28B/28C) остается в Profile как secondary support-help поверхность.
5. Recurring lane после 28A.1 вернут в чистый сценарий регулярных трат и отделен от Travel.

Operational note:
1. Bot-facing настройки (BotFather, `/start`, menu button, profile texts/media) не управляются автоматом из Mini App runtime и остаются manual layer.

## G. Travel v1 Status

Travel v1 (28A-28Q) собран как цельный контур.

Ключевые capability blocks:
1. Foundation (28A): trip/member/expense/split/balance model.
2. Recurring corrective boundary (28A.1): recurring truth восстановлена без смешения travel.
3. Practical acceleration/correction (28D): faster entry + edit/delete flow + clearer settlement.
4. Closure/finalization (28E): `active/closing/closed` + settlement finalization.
5. Multi-currency fixed-rate foundation (28F): source amount/currency + fixed conversion rate + normalized trip totals.
6. Receipt/OCR foundation (28G) и quality hardening (28H): save-now/parse-later + OCR hints + correction/reparse.
7. Settlement optimization (28I): compact deterministic recommended settlement plan.
8. Shell extraction (28J): Travel в отдельную root tab.
9. Archive/completion lifecycle (28K): `archived` + restore path.
10. Collaboration/member workflow (28L): organizer/participant, active/inactive, historical-safe member lifecycle.
11. Shared identity + invite/join (28M): participant linkage с реальными профилями, join flow.
12. Surface simplification (28N): main Travel surface упрощена, new trip flow вынесен в modal.
13. Richer receipt workflow (28O): triage/review/list maturity + clearer receipt↔expense continuity.
14. FX assistance (28P): rate-entry simplification без нарушения fixed-rate truth.
15. Final consolidation (28Q): закрытие user-facing seams + unified RU verification pack.

Travel v1 maturity claim:
1. По документам и коду контур функционально собран.
2. Статус фаз 28A-28Q в history: implemented, pending manual verification.
3. Это зрелый baseline для дальнейших post-v1 расширений, а не незакрытый MVP.

## H. Language / Localization / Analytics Status (29A + 29A.1)

29A established:
1. Language auto-source -> Telegram `language_code`.
2. English fallback preserved as deterministic default.
3. Manual override persisted and prioritized.
4. Browser-language fallback removed as auto-source.
5. Telegram analytics npm integration added (`@telegram-apps/analytics`).
6. Env wiring added for analytics token/app name/env.

29A.1 established:
1. Fixed cold-start language flicker source in bootstrap path.
2. Initial language now resolves via manual override -> Telegram language -> English fallback.
3. Removed guaranteed delayed language reassignment path that caused first-paint mismatch.
4. Preserved analytics compatibility and 29A model.

Code-level confirmation snapshot:
1. `src/lib/i18n/localization.tsx` uses `getTelegramLanguageCode()` and manual override key `payment_control_ui_language_override_v29a`.
2. `src/lib/telegram/web-app.ts` extracts Telegram language from `initDataUnsafe` and launch params fallback.
3. `src/lib/telegram/analytics.ts` initializes SDK safely only when env configured.
4. `src/lib/config/client-env.ts` exposes:
   - `NEXT_PUBLIC_TELEGRAM_ANALYTICS_TOKEN`
   - `NEXT_PUBLIC_TELEGRAM_ANALYTICS_APP_NAME`
   - `NEXT_PUBLIC_TELEGRAM_ANALYTICS_ENV`

## I. Manual-Only Bot-Facing Tasks

Этот слой вне scope автоматических кодовых pass и требует ручной проверки/настройки в Telegram:
1. BotFather profile fields:
   - description,
   - short description,
   - menu button setup.
2. `/start` bot copy и любые бот-сообщения.
3. Bot profile media polish (preview/icon/text consistency), если требуется.
4. Проверка EN default и RU-localized bot-facing текстов в реальном Telegram UI.
5. Проверка корректного перехода menu button -> Mini App URL.

## J. Completed Phase History With Concise Status Notes

Высокоуровневая цепочка, релевантная текущему baseline:

Pre-Travel closure:
1. 26A: Premium removal + donation-only reset (implemented, manual verification completed by user).
2. 26B: donation-only UX stabilization (implemented, manual verification completed by user).
3. 26C/26D: supporter badge foundation + owner convenience.
4. 27B-27G: release-line hardening/recomposition (implemented, manual verification completed by user, release-line accepted).
5. 27H: final release sign-off + closure sync completed.

Travel + platform chain:
1. 28A: Travel foundation (implemented, pending manual verification).
2. 28A.1: Recurring corrective restoration (implemented, pending manual verification).
3. 28B: official cancellation guide layer (implemented, pending manual verification).
4. 28C: expanded official cancellation catalog (implemented, pending manual verification).
5. 28D: travel acceleration + correction UX (implemented, pending manual verification).
6. 28E: trip closure + settlement finalization (implemented, pending manual verification).
7. 28F: multi-currency fixed-rate foundation (implemented, pending manual verification).
8. 28G: receipt capture + OCR prefill assistant (implemented, pending manual verification).
9. 28H: OCR quality hardening + receipt enrichment (implemented, pending manual verification).
10. 28I: advanced settlement optimization (implemented, pending manual verification).
11. 28J: Travel tab extraction + shell separation (implemented, pending manual verification).
12. 28K: archive/completion lifecycle polish (implemented, pending manual verification).
13. 28L: collaboration + participant workflow (implemented, pending manual verification).
14. 28M: shared identity linking + invite/join (implemented, pending manual verification).
15. 28N: travel surface simplification + new trip modalization (implemented, pending manual verification).
16. 28O: richer receipt review system (implemented, pending manual verification).
17. 28P: advanced FX assistance + rate entry simplification (implemented, pending manual verification).
18. 28Q: final travel consolidation + unified verification pack (implemented, pending manual verification).
19. 29A: Telegram language compliance + analytics integration (implemented, pending manual verification).
20. 29A.1: Telegram language bootstrap flicker fix (implemented, pending manual verification).

## K. Manual Verified / Implemented / Documentation-Only Distinctions

Разделение статусов по состоянию на 2026-04-05:
1. Manual verified by user:
   - release-line acceptance chain 27B-27G (и closure sync 27H),
   - ранее: 26A/26B.
2. Implemented, pending manual verification:
   - большинство фаз 28A-29A.1 (по `internal_version_history.md`).
3. Documentation-only passes:
   - текущий pass (этот anchor) без feature/schema/runtime изменений.

Принцип интерпретации:
1. `implemented` != `manual verification completed`.
2. В спорных местах приоритет у явных user-confirmed verification пометок и живой ручной проверки.

## L. MANUAL TASKS STILL OUTSIDE CODEX SCOPE

Только актуальные manual-only задачи:
1. BotFather/profile-facing тексты и настройки:
   - EN default и RU localized description/short description,
   - menu button label/path.
2. `/start` message и прочие bot-message поверхности.
3. Deployed analytics env verification:
   - задать реальные `NEXT_PUBLIC_TELEGRAM_ANALYTICS_TOKEN` и `NEXT_PUBLIC_TELEGRAM_ANALYTICS_APP_NAME`,
   - при необходимости `NEXT_PUBLIC_TELEGRAM_ANALYTICS_ENV` (`STG`/`PROD`),
   - проверить live-init/event ingestion в реальном Telegram runtime.
4. Device/live manual run:
   - cold start Telegram language behavior (RU/EN),
   - manual override persistence after relaunch,
   - Travel v1 end-to-end manual pack из 28Q.

## M. Current Risks / Watchlist

Главные наблюдаемые риски:
1. Anchor drift:
   - `docs/anchors/payment_control_master_anchor_post_phase27A.md` фактически отстает от текущей стадии (заголовок и baseline только до post-28M), тогда как history уже включает 28N-28Q и 29A/29A.1.
2. Analytics operational risk:
   - интеграция есть, но без реальных env значений в deployment telemetry будет неактивна.
3. Manual verification debt:
   - фазы 28A-29A.1 в основном `pending manual verification` по history.
4. Telegram runtime variance:
   - edge-кейсы по языковому bootstrap/launch params между iOS/Android/Desktop требуют живой проверки.
5. OCR/receipt and FX UX:
   - функционально зрелые слои, но остаются чувствительными к реальным данным/качеству чеков и пользовательским вводам.

## N. FUTURE ROADMAP AFTER CURRENT BASELINE

С учетом текущего состояния:
1. Travel v1 считать завершенным базовым контуром.
2. Следующие волны — только post-v1 расширения или targeted reliability/ops passes, если есть реальная ценность.
3. Нет обязательного “долга ради долга”: новый roadmap должен идти от фактических пользовательских сигналов и manual verification findings.

Логичные направления без искусственного раздувания:
1. Targeted reliability hardening на основе live Telegram telemetry и реальных user reports.
2. Travel post-v1 quality increments только при доказанной практической боли.
3. Analytics event model refinement как отдельный аккуратный pass после подтверждения env/live readiness.
4. Bot-facing content operations как manual process, синхронизируемый с app truth.

## O. NON-NEGOTIABLE RULES FOR FUTURE PASSES

1. Не возвращать Premium/paywall/entitlement/unlock-механики.
2. Не ломать recurring baseline.
3. Не смешивать recurring и travel обратно.
4. Не ломать Travel v1 baseline 28A-28Q.
5. Language auto-detection через Telegram `language_code`.
6. English fallback + manual override priority сохранять.
7. Не возвращать browser/system/IP language detection как равноправный автоисточник.
8. Telegram analytics интеграцию расширять только безопасно и без фейковых конфигов.
9. Не плодить лишнюю бюрократию и дублирующие отчеты без необходимости.
10. Делать осмысленные крупные или точечные high-value волны, без циклического “перекрашивания” одних и тех же слоев.

## P. New-Chat Handoff Notes (How To Continue)

Рекомендуемый порядок старта нового чата:
1. Прочитать этот файл полностью как первичный migration anchor.
2. Сверить актуальный runtime-контекст с:
   - `docs/reports/internal_version_history.md`
   - `docs/reports/phase_28Q_final_travel_consolidation_and_verification_pack.md`
   - `docs/reports/phase_29A_telegram_language_compliance_and_mini_app_analytics_integration.md`
   - `docs/reports/phase_29A1_telegram_language_bootstrap_flicker_fix.md`
3. При планировании новых pass:
   - считать Recurring baseline и Travel v1 собранными,
   - считать bot-facing настройки manual-only слоем,
   - не реанимировать superseded premium-ветки.
4. Сначала закрывать фактические manual/runtime seams, затем запускать новую feature-wave.

Шаблон продолжения в новом чате:
1. “Используй `docs/reports/payment_control_master_migration_anchor_post_29A1.md` как главный source of truth.”
2. “Сначала проверь `internal_version_history.md` и последние релевантные phase reports.”
3. “Не возвращай premium/paywall, не смешивай recurring/travel, соблюдай 29A language model.”

## Audit Notes: Code/Docs Consistency Snapshot

По результатам этого pass:
1. Критичных конфликтов “код против phase reports 28A-29A.1” не обнаружено.
2. Главный зафиксированный doc seam:
   - active anchor в `docs/anchors/payment_control_master_anchor_post_phase27A.md` отстает от текущего baseline и не отражает 28N-28Q, 29A, 29A.1 как новую активную точку миграции.
3. Этот файл создан как актуальный migration anchor для безопасного перехода в новый чат.

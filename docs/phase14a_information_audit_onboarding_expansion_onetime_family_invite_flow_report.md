# Phase 14A — Information audit + onboarding expansion + one-time family invite flow

Модель: ChatGPT 5 Codex  
Дата: 2026-03-27  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты фаз: `11A.1`, `11B`, `11C`, `11D`, `12A`, `12A.1`, `12B`, `12C`, `13A`, `13B`, `13C`, `13C.1`.
- Статус-override из запроса принят:
  - `11A.1`, `11B`, `11C`, `11D`, `12A.1`, `12B`, `12C`, `13A`, `13C` — manual verified.
  - `13B` — foundation есть и частично вручную exercised, но не форсировался как formally completed в этом pass.
- Этот pass выполнен как controlled cleanup без расширения growth/promo scope.

## Цель Phase 14A
Снизить постоянный UI-шум, перенести объясняющий контент в onboarding, и перевести family invite в on-demand one-time flow.

## Exact files changed (Phase 14A)
1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/profile-scenarios-placeholder.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/payments-activity-section.tsx`
6. `src/components/app/payments-dashboard-section.tsx`
7. `src/components/app/reminder-candidates-section.tsx`
8. `src/hooks/use-current-app-context.ts`
9. `src/lib/workspace/repository.ts`
10. `src/lib/i18n/localization.tsx`
11. `docs/phase14a_information_audit_onboarding_expansion_onetime_family_invite_flow_report.md`

## Что изменено по strict scope

### A) Full information audit по табам
Статус: **Confirmed in code/report**

1. Home
- Удален глобальный бренд-кард из shell, чтобы он не дублировался на всех табах.
- Добавлен отдельный Home-only бренд-блок (название приложения + stage badge).
- Убран шумный runtime-status details-блок с Telegram/Supabase флагами.
- Оставлен только минимальный контекст: компактный snapshot и `Runtime stage`.

2. Reminders
- Из family readiness убрана постоянная invite-status карточка.
- Оставлена только операционная часть для текущей работы:
  - members,
  - shared payments,
  - unassigned who-pays.
- Текстовый guidance упрощен: invite-операции теперь явно отнесены в Profile.

3. History
- Верхняя постоянная grid-сводка заменена на collapsed block `History context`.
- В открытом виде остается только активная история, а summary показывается по запросу.
- Для family сохранены ключевые сигналы (who-pays assignment/mismatch), но снижена постоянная визуальная плотность.

4. Profile
- Удален большой информационный блок `Scenario cards` как low-value постоянный контент.
- Убран persistent surface с “текущим invite токеном”.
- Сохранены operationally-needed элементы:
  - language switch (RU/EN),
  - Show onboarding again,
  - workspace switch/create/join,
  - premium status + owner admin console.

### B) Onboarding expansion
Статус: **Confirmed in code/report**

- Onboarding шаги переписаны в более содержательный, но короткий mobile-friendly формат.
- Для каждого из 4 шагов добавлены concise bullets:
  - назначение Home,
  - рабочий flow Reminders,
  - смысл History,
  - Profile context + one-time family invite правило.
- Эксплейнер-контент перемещен в onboarding, чтобы постоянные экраны оставались operational-first.

### C) One-time family invite flow
Статус: **Confirmed in code/report**

UI/UX:
- В Profile вместо “вечного токена” реализован явный action:
  - `Generate one-time invite`.
- Токен показывается только после явной генерации в текущей сессии.
- Добавлены действия `Copy token` и `Hide token`.
- Если токен не генерировался в текущей сессии, показывается нейтральный текст:
  - “No token is shown by default...”.

Backend correctness:
- В `createFamilyWorkspaceInviteForProfile` изменена стратегия:
  - если есть активный и не истекший invite -> revoke (`invite_status = revoked`);
  - если active invite истек -> expire (`invite_status = expired`);
  - затем создается новый active invite.
- В `acceptFamilyWorkspaceInviteForProfile` уже существующая логика оставлена:
  - при успешном accept invite переводится в `accepted` и больше не активен.

Итог:
- активный invite больше не ведет себя как permanent reusable token;
- каждый новый invite генерируется on-demand;
- после успешного использования invite инвалидируется статусом `accepted`.

### D) App title / branding card cleanup
Статус: **Confirmed in code/report**

- Брендинг убран из `AppShell` header.
- Брендинг оставлен только на Home (`LandingScreen`).
- На Reminders / History / Profile бренд-кард не рендерится.

### E) UI simplification discipline
Статус: **Confirmed in code/report**

- Этот pass выполнен как meaning-first cleanup.
- Визуальные правки ограничены только местами, где они снижают когнитивный шум.
- Широкий redesign или новая feature-wave не добавлялись.

## Как сохранены non-negotiable правила
Статус: **Confirmed in code/report, live manual regression still required**

- Не менялась архитектура 4-tab shell и tab switching.
- RU/EN switch и persistence не ломались.
- Core flows (Mark paid / Undo paid, family shared recurring, who pays / paid by) не изменялись по смыслу.
- Show onboarding again сохранен.
- Readiness/recent attempts/source видимость не удалялась.
- Premium status surface и owner-only admin console сохранены.
- Campaign create/list/deactivate и manual grant/revoke path не переписывались.
- Новые growth/public rollout feature не добавлялись.

## Миграции / schema changes
Статус: **No migration required**

- DB-схема не менялась.
- Для one-time invite корректности хватило минимального server-logic update в repository:
  - revoke/expire существующего active invite перед генерацией нового.

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## Что намеренно НЕ менялось
Статус: **Confirmed in code/report**
- Не добавлялись public promo/referral/deep-link growth flows.
- Не добавлялся Boosty/payment processing.
- Не включался новый premium pay-lock rollout.
- Не менялась owner-admin security модель.
- Не выполнялся крупный visual redesign.
- Не форсировался formal closure для `Phase 13B`.

## Risks / follow-up notes
1. One-time token теперь intentionally session-revealed в UI; нужны live-проверки в Telegram runtime на реальных invite сценариях.
2. API `/api/workspaces/family/invites/current` остается в кодовой базе, но в Phase 14A больше не используется как постоянный surface в UI.
3. Для полной UX-уверенности нужен короткий ручной regression по всем 4 табам после deploy.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. Home/Reminders/History/Profile визуально соответствуют сниженной информационной плотности на мобильном экране.
2. Brand-card реально отображается только на Home в Telegram runtime.
3. Family owner:
   - может сгенерировать invite,
   - видит токен только после явного generate,
   - повторный generate выдает новый токен и старый больше не является active.
4. Invite accept вторым профилем:
   - successful join переводит invite в `accepted`,
   - повторный accept этим же токеном не работает как новый join.
5. Core verified flows из 11/12/13 не регресснули.
6. RU/EN переключение корректно покрывает добавленные строки onboarding/invite/history-context.

## Exact manual checklist (Phase 14A)
1. Открыть приложение в Telegram, проверить 4-tab навигацию.
2. На Home проверить наличие бренд-карточки и отсутствие тяжелого runtime details блока.
3. На Reminders проверить, что нет постоянного invite-status блока в readiness snapshot.
4. На History проверить, что summary контекст в `History context` (collapsed по умолчанию).
5. На Profile проверить, что блок `Scenario cards` отсутствует.
6. На Profile owner-family нажать `Generate one-time invite` и убедиться, что токен появляется только после действия.
7. Нажать `Copy token` и `Hide token`, проверить ожидаемый UX feedback.
8. Выполнить повторный `Generate one-time invite`, убедиться, что токен новый.
9. Вторым аккаунтом принять invite, убедиться в successful join.
10. Повторно попробовать старый токен, убедиться в невалидности для нового join.
11. Проверить `Show onboarding again`, пройти onboarding и убедиться в обновленном содержимом шагов.
12. Переключить язык RU/EN и проверить корректный рендер новых строк.
13. Проверить owner admin console: resolve target, grant/revoke, campaign list/create/deactivate (smoke regression).
14. Проверить Mark paid / Undo paid + who pays / paid by в family shared payment.

## Encoding safety check
Проверены все затронутые файлы с русскоязычным или user-visible текстом:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase14a_information_audit_onboarding_expansion_onetime_family_invite_flow_report.md`

Результат:
- UTF-8 сохранен в измененных/новом файлах.
- Битой кириллицы/mojibake в затронутых участках не обнаружено.
- Дополнительных encoding-правок не потребовалось.

## Pre-report self-check against prompt

1. Цель pass (cleaner/calmer/easier) — **Satisfied (code/report), live UX confirmation pending**  
- Постоянные экраны стали более операционными, объяснения смещены в onboarding.

2. Strict scope A (full information audit) — **Satisfied (code/report)**  
- По каждому табу удалены или де-эмфазированы low-value постоянные блоки.

3. Strict scope B (onboarding expansion) — **Satisfied (code/report)**  
- Onboarding расширен 4 шагами с короткими bullets, без “wall of text”.

4. Strict scope C (one-time family invite) — **Satisfied (code/report), live verification pending**  
- Invite генерируется on-demand; старый active invite revoke/expire; accept делает invite `accepted`.
- Постоянный reusable token surface убран.

5. Strict scope D (branding only on Home) — **Satisfied (code/report)**  
- Global shell branding removed, Home branding retained.

6. Strict scope E (meaning-first simplification) — **Satisfied (code/report)**  
- No random redesign wave; только clarity-driven правки.

7. Non-negotiable preservation of verified flows — **Satisfied (code/report), live regression pending**  
- Изменения изолированы в UI-noise cleanup + invite generation strategy.

8. No unrelated growth scope — **Satisfied (code/report)**  
- Promo/referral/payment/public rollout features не добавлялись.

---

## Короткое объяснение (по-русски)
В Phase 14A приложение стало спокойнее: лишняя постоянная информация убрана с основных экранов, объяснения перенесены в более полезный онбординг, а семейное приглашение переведено в безопасный одноразовый формат “сгенерировал -> отправил -> использовал”.

## Ручной чек-лист (по-русски)
1. Проверить 4 таба и переходы между ними.
2. Убедиться, что бренд-карточка есть только на Home.
3. Проверить, что Reminders и History показывают меньше постоянного служебного текста.
4. На Profile с owner-role создать одноразовый invite, скопировать и скрыть токен.
5. Повторно сгенерировать invite и проверить, что токен новый.
6. Вторым аккаунтом принять invite и проверить, что старый токен не годится для нового join.
7. Проверить RU/EN переключение и новые строки.
8. Пройти smoke core-flow: Mark paid, Undo paid, who pays/paid by, owner admin console.

## Git Bash команды (реальный workflow)
```bash
git status
git add src/components/app/app-shell.tsx src/components/app/landing-screen.tsx src/components/app/profile-scenarios-placeholder.tsx src/components/app/recurring-payments-section.tsx src/components/app/payments-activity-section.tsx src/components/app/payments-dashboard-section.tsx src/components/app/reminder-candidates-section.tsx src/hooks/use-current-app-context.ts src/lib/workspace/repository.ts src/lib/i18n/localization.tsx docs/phase14a_information_audit_onboarding_expansion_onetime_family_invite_flow_report.md
git commit -m "phase14a: reduce UI noise, expand onboarding, and switch family invite to one-time generation"
git push origin main
```

Примечание: в этом pass миграции не добавлялись, поэтому `supabase db push` и `supabase migration list` не требуются.

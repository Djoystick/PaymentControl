# Phase 11B — Verification debt closure + ops/doc sync

## 1) Контекст и статус
- Канонический anchor прочитан: `docs/payment_control_master_anchor_2026-03-27.md`.
- Предыдущий отчет прочитан: `docs/phase11a1_real_tab_navigation_fix_report.md`.
- Применен статус-override из запроса:
  - anchor исторически заканчивается на `Phase 10C.1`;
  - актуальный подтвержденный этап проекта: `Phase 11A.1` (ручная live-проверка пройдена);
  - true 4-tab shell (`Home / Reminders / History / Profile`) считается принятым.

## 2) Цель Phase 11B
Узко закрыть verification/ops долги без расширения бизнес-функций:
1. Разделить и прояснить `replay onboarding` vs `true first-run onboarding`.
2. Улучшить наблюдаемость scheduled-dispatch без ложного заявления о полном long-horizon closure.
3. Синхронизировать runtime/setup docs с реальными именами migration-файлов.
4. Не ломать уже подтвержденные user flow.

## 3) Что изменено

### A. First-run onboarding verification readiness
**Confirmed in code/report**
- В `Profile` добавлен компактный блок `Onboarding verification notes`.
- В блоке явно разделены два сценария:
  - `Show onboarding again` = replay-путь;
  - `true first-run` требует чистого окружения (новый профиль/устройство/чистое storage состояние).
- Добавен локальный индикатор onboarding-флага (`completed / not completed / unknown`) для операционной диагностики.
- Для стабильности использованы общие константы onboarding key/event из `AppShell`.

**Still requires live manual verification**
- Финальное подтверждение true first-run возможно только в реальном Telegram runtime на действительно чистом окружении.

### B. Scheduled-dispatch verification readiness
**Confirmed in code/report**
- `POST /api/payments/reminders/readiness` теперь возвращает `recentAttempts` (snapshot последних попыток), а не только readiness.
- В Reminders UI:
  - `recentAttempts` теперь обновляется и при `Refresh delivery status`, а не только после `Run dispatch`/`Send test message`;
  - добавлен блок `Scheduled dispatch observation` с последней scheduled-попыткой в текущем snapshot;
  - в списке `Recent Attempts` показан `Source` (`manual dispatch`, `manual test send`, `scheduled dispatch`).
- В UI явно зафиксировано: это operational snapshot, а не long-horizon доказательство стабильности cron.

**Operationally improved but not fully closed**
- Наблюдаемость улучшена (быстрее видно, есть ли scheduled попытки в последних записях).
- Долг полного long-horizon production мониторинга остается открытым до наблюдения во времени.

### C. Migration/setup documentation sync
**Confirmed in code/report**
- Обновлен `README.md`:
  - список migration синхронизирован с фактическими файлами `supabase/migrations`;
  - формат явно указан как `YYYYMMDDHHMMSS_name.sql`;
  - добавлены отсутствующие migration `8D` и `9C` в setup-последовательность;
  - добавлена операционная пометка, что scheduled endpoint дает snapshot, но не закрывает long-horizon мониторинг.
- Обновлен `docs/runtime_setup_guide_for_beginner.md`:
  - старые имена вида `20260325_...` заменены на реальные `20260325010000_...`;
  - добавлен `20260327090000_phase9c_family_shared_economics_foundation.sql`.

## 4) Exact files changed
- `src/components/app/app-shell.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/app/api/payments/reminders/readiness/route.ts`
- `src/lib/payments/types.ts`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `README.md`
- `docs/runtime_setup_guide_for_beginner.md`
- `docs/phase11b_verification_debt_closure_ops_doc_sync_report.md`

## 5) Что намеренно НЕ менялось
- Архитектура 4-tab shell (11A.1) не перерабатывалась.
- Бизнес-логика recurring/family/payments не расширялась.
- Premium/paywall не трогался.
- Split/debts/balances/analytics фичи не начинались.
- DB schema/migrations не добавлялись.

## 6) Что проверено перед отчетом
**Confirmed in code/report**
- Типы/API согласованы после добавления `recentAttempts` в readiness response.
- `npm run lint` — успешно.
- `npm run build` — успешно.
- Код сохраняет существующие пути `Mark paid / Undo paid`, family shared flow, workspace/invite, onboarding replay (по анализу кода, без live runtime).

**Still requires live manual verification**
- Поведение в Telegram production runtime после deploy.
- True clean first-run onboarding (реально чистое окружение).
- Long-horizon scheduled-dispatch дисциплина во времени.

## 7) Риски / follow-up notes
1. Snapshot `recentAttempts` полезен для быстрой диагностики, но не заменяет регулярный production-мониторинг cron.
2. Локальный onboarding-флаг помогает операционно, но не является доказательством true first-run без чистого runtime.
3. В рабочем дереве есть и другие изменения/файлы вне узкого 11B-коммита (их нужно осознанно отбирать при commit).

## 8) Pre-report self-check against prompt

1. Критерий: корректно учтен актуальный статус (`anchor + override 11A.1 manual verified`)
- Статус: **Fully satisfied**.
- Проверка: явно отражено в разделе 1.

2. Критерий: четкое разделение replay onboarding и true first-run onboarding
- Статус: **Fully satisfied**.
- Проверка: добавлены явные пояснения в Profile UI + зафиксировано в отчете.

3. Критерий: явно разделено, что подтверждено кодом и что требует live clean test
- Статус: **Fully satisfied**.
- Проверка: во всех профильных разделах добавлены блоки `Confirmed in code/report` и `Still requires live manual verification`.

4. Критерий: улучшена scheduled-dispatch verification posture без fake-claim
- Статус: **Fully satisfied**.
- Проверка: readiness теперь отдает `recentAttempts`; UI показывает scheduled snapshot и явно предупреждает, что long-horizon не закрыт.

5. Критерий: синхронизированы stale migration/setup references
- Статус: **Fully satisfied**.
- Проверка: обновлены `README.md` и `docs/runtime_setup_guide_for_beginner.md` под фактические имена migration.

6. Критерий: не сломаны ранее verified user flows
- Статус: **Partially satisfied (code/build), live runtime unverified**.
- Проверка: локально пройдены lint/build и изменения узкие; финальная гарантия только после Telegram live smoke-check.

## 9) Итоговый статус Phase 11B
- Технический статус: **готово к live-проверке**.
- Верификационный статус: **partially verified**.
- Причина: в среде Codex подтверждены код/типы/сборка; финальное закрытие долгов требует реального Telegram runtime и наблюдения во времени.

---

## Короткое объяснение
В этом проходе мы не трогали продуктовый scope. Мы закрыли операционную ясность: разделили replay onboarding и true first-run, улучшили видимость scheduled-dispatch через readiness + UI snapshot, и синхронизировали setup docs с реальными migration-файлами.

## Ручной чеклист
1. Открыть Telegram Mini App (prod), перейти в `Profile` и проверить блок `Onboarding verification notes`.
2. Нажать `Show onboarding again` и убедиться, что это replay-путь.
3. Отдельно провести true first-run тест на чистом окружении (новый профиль/устройство/чистое storage).
4. Открыть `Reminders` -> нажать `Refresh delivery status`.
5. Проверить, что `Recent Attempts` обновился без ручного dispatch/test-send.
6. Проверить блок `Scheduled dispatch observation` (есть/нет scheduled строк в snapshot).
7. Проверить, что в `Recent Attempts` есть поле `Source` и корректные значения.
8. Пройти smoke-проверку критичных flow: `Mark paid`, `Undo paid`, family shared visibility, workspace/invite, `Show onboarding again`.
9. Повторить проверку scheduled-dispatch через интервалы времени (не один запуск), сверяя Vercel logs и `trigger_source = scheduled_dispatch`.

## Git Bash команды (commit / push / deploy)
```bash
git status

git add README.md \
  docs/runtime_setup_guide_for_beginner.md \
  docs/phase11b_verification_debt_closure_ops_doc_sync_report.md \
  src/app/api/payments/reminders/readiness/route.ts \
  src/lib/payments/types.ts \
  src/components/app/app-shell.tsx \
  src/components/app/profile-scenarios-placeholder.tsx \
  src/components/app/reminder-candidates-section.tsx \
  src/components/app/payments-dashboard-section.tsx \
  src/components/app/payments-activity-section.tsx \
  src/components/app/recurring-payments-section.tsx

git commit -m "Phase 11B: close verification debt and sync ops/docs"
git push origin <your-branch>

# deploy (пример)
vercel --prod
```

# Phase 8M — Family dashboard visibility / home overview foundation

## 1. Scope
В этом pass сделан узкий foundation для family-aware Home/Dashboard.

Цель: в family workspace показывать понятный read-only overview на уровне Home, без запуска отдельной family dashboard системы и без backend/domain расширения.

Вне scope оставлено:
- migrations;
- новый backend/domain слой;
- расширение invite/accept логики;
- member actions / role editing / owner transfer;
- shared economics / split / debts;
- family reminder parity как отдельная система;
- premium, localization, scenario engine, глобальный redesign.

## 2. What was implemented
1. Включен family workspace в dashboard API path:
- `/api/payments/dashboard` теперь резолвит scope с `allowFamilyWorkspace: true`.

2. Dashboard repository path сделан family-aware по scope:
- `readPaymentsDashboardByWorkspace` теперь принимает `paymentScope`;
- для family workspace передаётся `shared`, для personal — `personal`.

3. Обновлен Home Dashboard UI для context-aware рендера:
- personal workspace сохраняет текущий личный overview;
- family workspace показывает read-only overview с явным family wording:
  - `Family workspace overview`,
  - `Shared due today / Shared upcoming / Shared overdue`,
  - `Shared paid this cycle / Shared unpaid this cycle`.

4. Добавлен узкий family early-state в Dashboard:
- если в family workspace нет активных shared recurring payments, показывается компактный понятный блок:
  - “No shared payments yet”,
  - мягкий next step: добавить первый shared payment в recurring section ниже.

5. Bucket titles и empty labels для family сделаны family-specific:
- empty-state тексты в списках не выглядят personal-only.

6. Обновлен phase badge dashboard секции:
- `Phase 4A` → `Phase 8M`.

## 3. What was intentionally NOT implemented
- Новый family dashboard продукт/экран;
- новые admin/actions controls;
- сложные family KPI;
- дополнительные API endpoints;
- рефактор recurring/reminder/subscription домена.

## 4. Exact files created/modified
### Modified
- `src/app/api/payments/dashboard/route.ts`
- `src/lib/payments/repository.ts`
- `src/components/app/payments-dashboard-section.tsx`

### Created
- `docs/phase8m_family_dashboard_visibility_foundation_report.md`

## 5. Manual verification steps
1. Переключиться в personal workspace:
- убедиться, что Dashboard рендерится как personal overview и не содержит family-specific copy.

2. Переключиться в family workspace:
- убедиться, что Dashboard рендерится как family overview с shared wording.

3. Проверить family early-state:
- при отсутствии shared recurring payments увидеть блок `No shared payments yet`.

4. Проверить family non-empty state:
- при наличии shared recurring payments увидеть корректные counters/lists (due today, upcoming, overdue, paid/unpaid this cycle).

5. Нажать `Refresh family overview`:
- убедиться, что данные перезагружаются без ошибок.

## 6. Known limitations
- Это read-only overview foundation, не полноценный family dashboard.
- Метрики ограничены существующим dashboard агрегатом (без новой сложной аналитики).
- Family invite accept flow по-прежнему остаётся partially verified и не расширялся в этом pass.

## 7. Runtime confirmation status
Что подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка UI в браузере/Telegram для personal/family переключений dashboard.

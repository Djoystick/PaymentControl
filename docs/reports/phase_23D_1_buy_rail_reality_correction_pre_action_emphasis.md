# Phase 23D.1 — Buy Rail Reality Correction + Pre-Action Emphasis

Дата: 2026-03-29  
Статус: implemented (runtime fix + UX emphasis + report), pending manual verification

## 1) Цель этапа

Устранить live-блокер, из-за которого Buy Premium фактически вел в старую subscription-ветку, и добавить заметный pre-action акцент для важных кнопок/спойлеров до клика.

## 2) Source of truth

- `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
- `docs/specs/phase_23A_one_time_monetization_refoundation_spec.md`
- `docs/reports/phase_23A_one_time_monetization_refoundation_spec.md`
- `docs/reports/phase_23B_data_claim_adaptation_for_one_time_premium.md`
- `docs/reports/phase_23C_profile_monetization_ux_rebase_one_time.md`
- `docs/reports/phase_23D_owner_reconciliation_parity_pass.md`
- `docs/reports/internal_version_history.md`

## 3) Что inspected

- `src/lib/config/client-env.ts`
- `.env.local`
- `.env.example`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/app/globals.css`
- `src/lib/i18n/localization.tsx`

## 4) Точная причина live-блокера

### Что открывалось в Buy Premium
В активном runtime `Buy Premium` использовал `clientEnv.premiumBuyUrl`, где fallback был жестко задан как:

`https://boosty.to/tvoy_kosmonavt/purchase/3867384?ssource=DIRECT&share=subscription_link`

### Почему пользователь видел subscription как текущую истину
1. В `.env.local` не было `NEXT_PUBLIC_PREMIUM_BUY_URL`/one-time URL, поэтому включался fallback из кода.
2. Этот fallback указывал именно на subscription-link (`share=subscription_link`).
3. В handoff-блоке показывался рабочий CTA `Open payment page` на этот URL.

Итого: даже при one-time copy, фактический runtime rail оставался подписочным.

## 5) Что изменено

### 5.1 Runtime Buy rail correction (`src/lib/config/client-env.ts`)

Сделано:
- удален жесткий fallback на старую subscription-ссылку;
- добавлена явная резолюция one-time URL:
  - `NEXT_PUBLIC_PREMIUM_ONE_TIME_BUY_URL` (приоритетный);
  - `NEXT_PUBLIC_PREMIUM_BUY_URL` (legacy alias);
- добавлен guard, который блокирует legacy subscription URLs (по `subscription_link`) даже если они попали в env;
- если валидного one-time URL нет, `premiumBuyUrl` возвращается пустым значением.

Дополнительно:
- `supportProjectUrl` оставлен отдельным rail с текущим fallback donation URL.

### 5.2 Profile Buy Premium behavior correction (`src/components/app/profile-scenarios-placeholder.tsx`)

Сделано:
- введен флаг `isBuyPremiumRailReady`;
- при отсутствии one-time rail:
  - кнопка Buy Premium отключается,
  - показывается честный calm статус (`One-time rail unavailable`),
  - пользователь не уводится в старую subscription-ссылку;
- `preparePremiumPurchaseIntent()` теперь останавливается с честным feedback, если one-time rail не настроен;
- в handoff-карточке `Open payment page` показывается только когда `isBuyPremiumRailReady === true`;
- при отсутствии rail вместо кнопки открытия показывается предупреждающий status-pill;
- Claim rail остается доступным и понятным для сценария “уже оплатил”.

### 5.3 Env documentation update (`.env.example`)

Добавлено:
- `NEXT_PUBLIC_PREMIUM_ONE_TIME_BUY_URL` (новый явный one-time rail);
- `NEXT_PUBLIC_PREMIUM_BUY_URL` (legacy alias);
- `NEXT_PUBLIC_SUPPORT_PROJECT_URL` (отдельный donation rail).

### 5.4 Pre-action emphasis update (`src/app/globals.css` + touched Profile summary)

Для pre-click/pre-open заметности:
- усилил idle-визуал `pc-btn-secondary` и `pc-btn-quiet` (чуть сильнее поверхность/тень/feedback);
- усилил idle-состояние summary для `details.pc-detail-surface` и `details.pc-state-card` (граница, фон, тень, hover-подсказка);
- open-state остался сильнее idle (accent border + stronger shadow);
- для claim spoiler в Profile добавлен `pc-summary-action` для более явной интерактивности до открытия.

### 5.5 Минимально нужный copy fix (`src/lib/i18n/localization.tsx`)

Добавлены точечные фразы для честного fallback-сценария:
- one-time rail на настройке;
- Buy Premium временно недоступен до настройки one-time rail;
- one-time rail unavailable/not configured.

## 6) Что намеренно НЕ менялось

- backend claim/review semantics из 23B;
- owner queue mechanics из 23D;
- Support rail semantics (donation не выдает Premium автоматически);
- gift/manual premium compatibility;
- owner-only security boundaries;
- reminders/history/family/core payment logic.

## 7) Validation

Выполнено:
- `npm run lint`
- `npm run build`

Оба завершились успешно.

## 8) Риски / follow-up

1. Сейчас true one-time external rail отсутствует в локальном env, поэтому Buy Premium работает в честном временном режиме “not configured”.
2. Для полного открытия Buy rail нужен реальный one-time URL в `NEXT_PUBLIC_PREMIUM_ONE_TIME_BUY_URL` (или в legacy alias без subscription-параметров).
3. Остальная subscription-терминология в приложении (в контексте recurring payments) не трогалась этим узким pass.

## 9) Рекомендованный следующий шаг

`Phase 23E — Formal Monetization MVP Manual Closure Pack` (только после ручной проверки 23D.1 в live):
- подтвердить, что Buy Premium больше не уводит в subscription-flow;
- подтвердить разделение Buy / Support / Claim и owner review loop;
- зафиксировать formal closure checklist.

## 10) Manual verification notes

1. Открыть Profile как обычный пользователь.
2. Проверить Buy Premium:
- при отсутствии one-time rail кнопка должна быть честно недоступна,
- не должно быть перехода на subscription URL.
3. Проверить, что Support открывает отдельный donation rail.
4. Проверить, что Claim Premium остается доступным и рабочим.
5. Проверить pre-action визуал:
- важные кнопки читаются как интерактивные до клика;
- spoiler/summary виден как интерактивный до открытия;
- open/active все еще заметно сильнее idle.

## 11) Encoding safety check

- Измененные файлы сохранены в UTF-8.
- Битая кириллица в добавленных строках не обнаружена.

## 12) Pre-report self-check against scope

Проверено:
- блокер исправлен на уровне реального runtime поведения, не только copy;
- broad-refactor не выполнялся;
- owner/security/free-core не затронуты;
- ложная автоматизация оплаты не добавлена.

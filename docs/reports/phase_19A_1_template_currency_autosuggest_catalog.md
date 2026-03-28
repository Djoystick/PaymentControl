# Phase 19A.1 — Template currency normalization + title-only autosuggest + template catalog expansion

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Reports read:
  - `docs/reports/phase_17A_reminders_interaction_model_redesign.md`
  - `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`
  - `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md`
  - `docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md`
  - `docs/reports/phase_18A_performance_audit_safe_storage_caching_strategy.md`
  - `docs/reports/phase_19A_app_like_polish_2_reminders_screen_model.md`
- Status context used: latest fully confirmed stage = Phase 18A (manual verified)

## Exact files changed

1. `src/lib/payments/starter-templates.ts`
2. `src/components/app/recurring-payments-section.tsx`
3. `src/lib/i18n/localization.tsx`
4. `docs/reports/phase_19A_1_template_currency_autosuggest_catalog.md` (this report)

## What was corrected in system template data

### 1) Currency normalization for built-in templates

Updated `src/lib/payments/starter-templates.ts`:

- replaced stale system-default `USD` usage with `RUB` default for built-in templates,
- introduced `createStarterTemplate(...)` helper to enforce safe defaults for system templates:
  - `currency: "RUB"`,
  - reminder defaults,
  - notes default.

Audit result:
- built-in catalog no longer contains `USD` defaults,
- all system templates now use `RUB` unless explicitly changed in future data edits.

### 2) Custom templates were not mutated

No migration or rewrite was added for `custom-*` templates from local storage.

- user-created templates remain exactly as user saved them,
- only built-in system catalog data was changed.

## How autosuggest matching was changed

Updated `src/components/app/recurring-payments-section.tsx`.

Old behavior concern from live review:
- suggestions could appear inconsistently because real-world expectation is matching by template name/title only.

Current behavior:
- prefix matching (`startsWith`) now checks **template name/title only**:
  - system template name (`label`, localized via `tr(...)`),
  - system template title (`title`, localized via `tr(...)`),
  - custom template name/title from user data (unchanged raw user values).
- matching does **not** use description/help text/notes/category or hidden metadata.

Implementation detail:
- query is normalized to lowercase,
- comparison is lowercase prefix,
- suggestion list still closes on template selection (existing behavior preserved).

## What template families/categories were added

Catalog was significantly expanded for realistic everyday usage.

### Personal (single-user) coverage expanded

Added/expanded practical templates for:
- housing: rent, mortgage,
- utilities: electricity, water, gas,
- internet/mobile,
- groceries,
- transport: pass, fuel, parking,
- pharmacy/medicine,
- gym/sports,
- insurance,
- loan,
- banking fees,
- streaming/gaming/cloud,
- pet care,
- household services.

### Family coverage expanded (including family-with-children)

Added/expanded practical templates for:
- shared rent/mortgage,
- family groceries,
- education: school, kindergarten,
- children activities: clubs, sports, tutors,
- family mobile/internet,
- utilities,
- family transport/fuel,
- family insurance,
- family streaming/gaming,
- family pharmacy,
- family pet care,
- household services,
- family bank fees.

## Scenario split preservation

Scenario isolation remains unchanged:
- personal workspace -> `personalStarterPaymentTemplates`
- family workspace -> `familyStarterPaymentTemplates`

No scenario mixing was introduced.

## RU/EN localization handling for built-in templates

System template localization remains consistent with existing model:

- built-in template strings (`label`, `title`, `category`) are localized with `tr(...)` at runtime,
- added missing RU translations in `src/lib/i18n/localization.tsx` for all newly introduced template strings,
- EN remains source keys (fallback behavior),
- user-created template text remains exactly as saved and is not auto-translated.

Validation helper check:
- compared all `label/title/category` values from starter templates against localization keys,
- result: no missing translation keys for the updated system catalog.

## What was intentionally NOT changed

1. No premium/growth features.
2. No admin redesign.
3. No bug report redesign.
4. No shell/layout redesign.
5. No history redesign.
6. No backend/business-rule changes unrelated to templates/autosuggest.
7. No mutation of user-created templates.

## Validation

1. `npm run lint` — passed.
2. `npm run build` — passed.

## Risks / follow-up notes

1. Existing users may still have old custom templates created earlier with `USD` values; this is expected and correct by current rules (custom templates are user-owned data and intentionally not mutated).
2. Future catalog growth should stay practical; avoid adding niche/noisy templates that increase suggestion noise.
3. Suggestion ranking is still simple prefix order by source arrays; if needed later, recency weighting can be added in a separate controlled pass.

## What still requires live manual verification

1. In RU mode, typing `С` in payment title should surface templates like sports-related entries by name prefix.
2. In EN mode, prefix behavior should remain intuitive for new template names.
3. Personal/family split should remain strict after workspace switching.
4. Applying a built-in template should populate `RUB` by default in form values.
5. Existing custom templates should remain unchanged after app reload.

## Exact manual checklist (RU)

1. Открыть Reminders в personal-сценарии и форму платежа.
2. Ввести первые буквы для проверки подсказок (например: `С`, `Т`, `И`).
3. Убедиться, что подсказки формируются по названию/имени шаблона, а не по описаниям.
4. Выбрать несколько встроенных шаблонов и проверить, что валюта подставляется `RUB`.
5. Проверить, что новые категории реально присутствуют (жилье, коммунальные, транспорт, аптека, банк, спорт, подписки и т.д.).
6. Переключиться в family-сценарий и повторить проверку:
   - видны family-шаблоны,
   - есть покрытие family-with-children (сад, кружки, репетитор и др.).
7. Убедиться, что personal/family шаблоны не смешиваются.
8. Создать пользовательский шаблон вручную, перезапустить экран и проверить, что его текст/валюта не переписаны автоматически.
9. Проверить, что после выбора шаблона список подсказок закрывается (регрессия 17A.1).
10. Пройти короткую регрессию core flow:
   - Mark paid / Undo paid,
   - RU/EN + persistence,
   - theme switching,
   - workspace switching,
   - family invite flow,
   - premium/admin surfaces,
   - bug report flow,
   - Home summary drill-down,
   - help popovers.

## Encoding safety check

Checked UTF-8 and RU/EN visibility in touched files:

1. `src/lib/payments/starter-templates.ts`
2. `src/components/app/recurring-payments-section.tsx`
3. `src/lib/i18n/localization.tsx`
4. `docs/reports/phase_19A_1_template_currency_autosuggest_catalog.md`

Result:
- UTF-8 preserved in touched files.
- No new mojibake/garbled Cyrillic introduced.
- Added RU strings are readable.

## Pre-report self-check against prompt

1. System templates default to RUB — **PASS**.
2. User-created templates unchanged — **PASS**.
3. Autosuggest matching by template title/name only — **PASS**.
4. Prefix matching behavior preserved and clarified — **PASS**.
5. Template catalog expanded significantly with practical coverage — **PASS**.
6. Single/family scenario split preserved — **PASS**.
7. RU/EN behavior for system templates preserved — **PASS**.
8. Existing verified flows preserved by scope and validation — **PASS**.
9. No unrelated scope added — **PASS**.

---

## Короткое объяснение (по-русски)

В 19A.1 исправлены данные и логика шаблонов: встроенные шаблоны нормализованы на `RUB`, автоподсказки переведены на префиксный match только по имени/названию шаблона, и каталог сильно расширен реальными повседневными кейсами для personal/family (включая family-with-children), без мутации пользовательских шаблонов.

## Ручной test checklist (по-русски)

1. Проверить префиксный autosuggest в personal и family.
2. Проверить, что встроенные шаблоны подставляют `RUB`.
3. Проверить отсутствие смешивания personal/family наборов.
4. Проверить, что custom templates не переписываются.
5. Проверить, что новые шаблоны покрывают реальные категории (жилье/коммунальные/транспорт/дети/подписки/аптека/банк и т.д.).
6. Пройти регрессию основных потоков.

## Git Bash commands (реальный workflow)

```bash
git status
git add src/lib/payments/starter-templates.ts src/components/app/recurring-payments-section.tsx src/lib/i18n/localization.tsx docs/reports/phase_19A_1_template_currency_autosuggest_catalog.md
git commit -m "phase19a.1: normalize template currency to RUB, title-only autosuggest, expand practical template catalog"
git push origin main
```

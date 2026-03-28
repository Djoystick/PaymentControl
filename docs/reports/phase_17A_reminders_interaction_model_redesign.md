# Phase 17A — Reminders interaction model redesign

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Canonical context read first: `docs/payment_control_master_anchor_2026-03-27.md`
- Latest relevant reports read:
  - `docs/phase14a1_reminders_scenario_clarity_compact_family_controls_profile_help_cleanup_report.md`
  - `docs/phase14a2_popover_viewport_fix_onboarding_copy_rewrite_report.md`
  - `docs/phase15a_inapp_bug_report_form_telegram_bot_delivery_report.md`
  - `docs/phase16a_app_like_shell_polish_theme_foundation_icon_system_report.md`
  - `docs/phase16b_reminders_reorganization_header_cleanup_localization_template_fix_report.md`
- Status override applied from prompt: Phase 16B treated as latest confirmed stage.

## Exact files changed

1. `src/components/app/recurring-payments-section.tsx`
2. `src/lib/i18n/localization.tsx`
3. `docs/reports/phase_17A_reminders_interaction_model_redesign.md` (this report)

## New Reminders interaction model

Phase 17A keeps the 17C action-lane direction and redesigns template interaction as form-level intelligence:

1. Main visible surface remains action-first:
- context/workspace
- due-state snapshot
- quick actions
- actionable recurring list with mark/undo

2. Template management is no longer a standalone visible block in Reminders setup.
- The old dedicated templates section (payment templates + subscription templates + template name field + list/delete UI) was removed.

3. Template reuse moved into create/edit flow where intent happens.
- User starts typing title in payment form.
- Suggestions appear directly under title input.
- Tap suggestion -> template is applied to form instantly.

This shifts Reminders away from “template inventory screen” toward “short-session action surface + contextual assistance”.

## How autocomplete/autosuggest works now

Implementation in `src/components/app/recurring-payments-section.tsx`:

1. Data source:
- Uses existing scenario-scoped template pool (`templatesForScenario`): custom templates first, then system starter templates.

2. Trigger:
- Suggestions are shown while creating (not while editing) when title input is non-empty.

3. Match logic:
- Case-insensitive partial match against template label and title.
- For system templates, matching uses localized strings (`tr(...)`) in current UI language.
- For custom templates, matching uses raw user-saved strings.

4. Render behavior:
- Up to 5 suggestions are shown.
- Entire row is tappable.
- Each row shows template label, title preview, and payment/subscription badge.

5. Apply behavior:
- Tap row calls existing `applyTemplate(...)` and fills form fields.

## How scenario-specific templates are handled

No scenario-mixing was introduced.

1. Scenario selection remains existing logic:
- family workspace -> family template pool
- personal/single workspace -> personal template pool

2. Suggestions are derived only from active scenario pool.

Result: family and personal template suggestions remain isolated as required.

## How save-as-template works now

1. `Save as template` remains in the form action row.
2. It stays compact (no separate template management screen required).
3. Template label defaults to current form title (compact behavior).
4. Existing card action `Save as template` is preserved.

## What was intentionally NOT changed

1. No History redesign.
2. No Premium/Growth/Admin redesign.
3. No bug-report redesign.
4. No API or DB schema changes.
5. No recurring business-rule rewrite.
6. No changes to 4-tab shell.
7. No changes to core verified flows (Mark paid/Undo paid, family/shared, who pays/paid by, workspace switching, invite flow, admin ownership boundaries).

## Risks / follow-up notes

1. Custom template delete UI was removed together with standalone template block; this is intentional for lower clutter, but if delete is still needed it should be reintroduced as a minimal contextual control (not as a large management section).
2. Suggestion ranking is simple substring matching; no fuzzy ranking/recency weighting yet.
3. Live UX validation is still required on real Telegram mobile runtime for perceived speed and tap comfort.

## What still requires live manual verification

1. Reminders first-screen cognitive load is visibly lower in real Telegram runtime.
2. Typing in title field reliably shows suggestions in both RU and EN.
3. Scenario separation of suggestions is correct when switching personal/family contexts.
4. Applying suggestion fills form correctly and remains one-tap friendly.
5. Save-as-template flow is understandable without standalone template manager.
6. No regression in Mark paid/Undo paid and family shared loops.

## Exact manual checklist

1. Open Reminders and confirm no permanent dedicated templates block is visible.
2. Open Add payment form and type a title prefix matching existing template.
3. Confirm suggestions appear under title field.
4. Tap one suggestion row and verify form autofill is applied.
5. Verify suggestion rows are full-row tappable on mobile width.
6. Switch workspace scenario (personal <-> family) and repeat typing:
- only scenario-relevant templates should appear.
7. In RU mode, apply a system template and verify localized system autofill.
8. Create/save custom template with user text and verify user text remains unchanged when reused.
9. Confirm Save as template works from form and from payment card action.
10. Run regression smoke:
- Mark paid / Undo paid
- who pays / paid by
- payments vs subscriptions separation
- workspace switching
- one-time family invite
- premium/admin surfaces
- bug report flow

## Validation run

1. `npm run lint` — passed.
2. `npm run build` — passed.

## Encoding safety check

Checked touched files for UTF-8 integrity and Cyrillic safety:

1. `src/components/app/recurring-payments-section.tsx`
2. `src/lib/i18n/localization.tsx`
3. `docs/reports/phase_17A_reminders_interaction_model_redesign.md`

Result:
- UTF-8 preserved.
- No mojibake/replacement-character corruption detected in touched content.

## Pre-report self-check against prompt

1. Original goal (Reminders model redesign, not just hiding) — **Satisfied**
- Template interaction moved into form-level flow.
- Dedicated template management block removed from visible surface.

2. Strict scope compliance — **Satisfied**
- Changes limited to Reminders interaction and small localization additions.
- No broad cross-product redesign.

3. Acceptance criteria verification:

1) Reminders materially less overloaded — **Satisfied (code-level)**
- Removed large template management section.

2) Simpler model, not deeper spoiler nesting — **Satisfied**
- Removed block instead of adding deeper nesting.

3) Visible dedicated templates block removed — **Satisfied**
- No standalone templates section remains in Reminders surface.

4) Title typing shows suggestions — **Satisfied**
- Implemented inline autosuggest under title input.

5) Applying suggestion fills form — **Satisfied**
- Reuses `applyTemplate(...)` flow.

6) User can still save template — **Satisfied**
- Form action `Save as template` preserved.

7) Family/single templates stay separate — **Satisfied**
- Uses existing scenario bucket logic.

8) Payments/subscriptions stay separated — **Satisfied**
- Existing separation retained.

9) Existing verified flows preserved — **Satisfied by scope + lint/build**, live smoke still required.

10) No unrelated scope added — **Satisfied**
- No premium/growth/history/admin redesign performed.

---

## Короткое объяснение (по-русски)

В этом pass Reminders переведен на более короткий сценарий: большой отдельный блок шаблонов убран, а шаблоны теперь подсказываются прямо в поле названия платежа при вводе. Пользователь может одним тапом применить шаблон и так же компактно сохранить текущую форму как новый шаблон, без отдельного экрана управления шаблонами.

## Ручной тест-чеклист (по-русски)

1. Открыть Reminders и убедиться, что отдельного большого блока шаблонов больше нет.
2. В форме добавления начать ввод названия платежа.
3. Проверить, что под полем появляются подсказки шаблонов.
4. Тапнуть по подсказке и проверить корректное автозаполнение формы.
5. Проверить, что в family видны только family-шаблоны, а в personal — только personal.
6. Проверить `Save as template` из формы.
7. Проверить `Save as template` на карточке платежа.
8. В RU проверить локализованное автозаполнение системных шаблонов.
9. Проверить, что пользовательские шаблоны не переводятся автоматически и остаются как были сохранены.
10. Пройти регрессионно: Mark paid/Undo paid, who pays/paid by, переключение workspace, invite flow, premium/admin, bug report.

## Git Bash команды (реальный workflow)

```bash
git status
git add src/components/app/recurring-payments-section.tsx src/lib/i18n/localization.tsx docs/reports/phase_17A_reminders_interaction_model_redesign.md
git commit -m "phase17a: redesign reminders template interaction to inline autosuggest"
git push origin main
```

## Env / migrations

Для этого pass новые env-переменные и SQL-миграции не требуются.

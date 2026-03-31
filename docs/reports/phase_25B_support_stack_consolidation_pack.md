# Phase 25B - Support Stack Consolidation Pack

- Date: 2026-03-31
- Status: implemented (major combined support-stack clarity wave), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
  - `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
  - `docs/reports/phase_24C_support_claim_operational_clarity.md`
  - `docs/reports/phase_24D_optional_rail_activation_hardening.md`
  - `docs/reports/phase_25A_reminders_productivity_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime/operational surfaces:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/i18n/localization.tsx`
- support claim/reference helpers through active runtime usage (`src/lib/auth/client.ts`, `src/lib/auth/types.ts`)
- `src/app/globals.css` (shared surface/button/disclosure behavior)

## 2) Remaining support-stack friction found (post-24D, post-25A)

1. Profile support area had correct semantics but still read as dense and linear; next step was not obvious enough.
2. Secondary rail pending state was honest but too generic in duplicate-URL misconfiguration cases.
3. Claim form still relied on post-click validation for missing proof fields, which slowed user flow.
4. Claim status block stated lifecycle truth but lacked explicit action-oriented next-step guidance.
5. Owner queue remained operational but scan speed suffered under mixed claim states; no quick focus lane existed.
6. Temporary legacy verification block in owner console remained visually equal to active operational controls.

## 3) What changed in Profile support area clarity

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Added compact top snapshot cards inside Support/Premium section:
- rail snapshot (primary/secondary readiness),
- 3-step support flow summary.
2. Removed redundant repeated free-core line in premium status block.
3. Kept support area secondary at Profile end (`order-last`) and preserved calm non-storefront framing.
4. Tightened support-reference helper copy to a more operational, shorter form.
5. Added explicit claim next-step line in status card (`Next step`) based on current lifecycle.

## 4) What changed in rail hierarchy and configured/pending behavior

Files:
- `src/lib/config/client-env.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`

1. Extended support rail config with explicit pending reason support:
- `pendingReason: missing_or_invalid_url | duplicates_primary | null`.
2. Kept Boosty as primary and CloudTips as secondary.
3. Added explicit CloudTips duplicate-primary handling message:
- if CloudTips URL equals primary, slot stays pending with clear explanation.
4. Strengthened visual hierarchy:
- primary configured rail receives stronger emphasis,
- secondary remains visible but calmer,
- pending cards remain clearly non-actionable.
5. Preserved honest external/manual review truth:
- no automation claims,
- no fake activation promises.

## 5) What changed in user claim readability

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Added pre-submit proof readiness indicator in claim form.
2. Submit action now disables until at least one required proof field is present.
3. Kept full proof fields and claim semantics unchanged.
4. Added lifecycle-driven `Next step` text for no-claim, pending, approved, rejected, and closed states.

## 6) What changed in owner/admin queue scan clarity

File: `src/components/app/premium-admin-console.tsx`

1. Added queue sorting optimized for action:
- reviewable claims first,
- then resolved claims,
- newest first within groups.
2. Added queue focus lane with counts:
- `Needs review`, `All`, `Approved`, `Rejected`, `Closed`.
3. Added visible context counters (`Visible / In queue`) and focus helper text.
4. Upgraded claim summary row for faster scan:
- claim id,
- current vs legacy marker,
- needs-review marker,
- rail,
- support reference code (if present),
- submitted timestamp,
- proof field completeness.
5. Strengthened decision controls:
- approve as primary action (`pc-btn-primary`),
- reject as explicit destructive secondary (`pc-btn-danger`).
6. Demoted old 22A.1 temporary verification helper into collapsed details by default.

## 7) RU/EN parity updates

File: `src/lib/i18n/localization.tsx`

Added RU translations for all newly introduced runtime strings in:
- profile support snapshot/flow,
- rail pending duplicate explanation,
- claim readiness/next-step guidance,
- owner queue focus/count/summarization labels.

## 8) What was intentionally not changed

1. No reminders/runtime productivity regressions from 24I-25A.
2. No support claim business model rewrite.
3. No owner review fallback logic changes.
4. No provider/webhook/payment automation work.
5. No compatibility-boundary cleanup.
6. No migrations.

## 9) Risks / follow-ups

1. Queue default focus is now `Needs review`; manual verification should confirm this improves daily owner routine on real mixed datasets.
2. CloudTips duplicate-primary message is operationally explicit; future optional owner diagnostics page could surface this at config level too.

## 10) Exact recommended next step

Run live manual verification with `phase_25B_support_stack_manual_checklist.md` in RU/EN with:
- configured Boosty + pending CloudTips,
- configured Boosty + configured CloudTips,
- owner queue containing mixed statuses.

If pass, mark 25B as manual-verified and freeze support stack baseline before any new domain expansion.

## 11) Concise manual verification notes

1. Verify Profile support block remains last and secondary in Profile.
2. Verify primary/secondary rail hierarchy and duplicate CloudTips pending messaging.
3. Verify claim submit is disabled until at least one proof field is filled.
4. Verify claim status `Next step` changes correctly across lifecycle states.
5. Verify owner queue focus lane, counts, sorting, and action clarity on mixed claims.
6. Verify RU/EN parity for all touched strings.

## 12) Validation

- `npm run lint` - pass
- `npm run build` - pass

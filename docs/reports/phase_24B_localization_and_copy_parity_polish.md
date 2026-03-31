# Phase 24B — Localization and Copy Parity Polish

- Date: 2026-03-31
- Status: implemented (runtime text/localization only), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`

## 1) Scope and files inspected

Inspected for active runtime wording/parity:
- `src/lib/i18n/localization.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/help-popover.tsx`
- `src/lib/config/client-env.ts` (dynamic rail labels used in UI)

## 2) Main parity/copy issues found

1. Missing RU translations after 24A
- New 24A strings (tab hints, support-reference labels, claim helpers, pending CloudTips slot text) were not localized.
- RU users saw fallback EN for multiple active labels.

2. Mixed RU/EN wording in active Profile support surfaces
- Some active translations still used mixed technical wording (claim/gift/owner fragments).
- Several phrases were heavier than needed for the calm low-friction model.

3. Minor copy debt in active Profile wording
- A few lines were verbose or used older phrasing patterns not fully aligned with soft donor-perk truth.

## 3) Runtime wording changes made

## 3.1 `src/components/app/profile-scenarios-placeholder.tsx`

Updated active copy (no logic changes):
- `Validated external support (legacy mapping)` -> `Validated external support`
- `Failed to submit premium claim.` -> `Failed to submit support claim.`
- removed redundant heavy line and replaced with concise: `Core features stay free.`
- support-reference helper text simplified:
  - now asks to add code to support note/comment if provider allows
- `Open support claim` -> `Open claim form`
- `I already supported / submit claim` -> `I already supported, submit claim`

## 3.2 `src/lib/i18n/localization.tsx`

Added/updated Phase 24B RU parity keys for all active 24A-touched strings, including:
- tab hint set:
  - `Snapshot and next step`
  - `Main action lane`
  - `Recent payment updates`
  - `Workspace and settings`
- Home/History short helpers:
  - `Today focus`
  - `One short routine: Reminders for actions, History for proof.`
  - `Recent events from your payment routine.`
- support/perk/profile section:
  - `Support and Premium`, `Support rails`, `Support reference code`, `Reference status`,
  - `Prepare support reference code`, `Open claim form`,
  - `I already supported, submit claim`,
  - `Submit support claim`,
  - `Support rail slot prepared. URL is not configured yet.`, `Pending setup`,
  - `No support rails are configured yet.`,
  - all new support-reference status/feedback strings.
- dynamic rail labels from config:
  - `Boosty`, `CloudTips`, `Primary support rail`, `Secondary support rail`, `Open CloudTips`.
- claim/gift wording normalization in active runtime labels:
  - RU wording shifted from mixed EN/RU fragments to natural compact Russian.

Validation check used during pass:
- literal `tr("...")` strings in touched runtime components vs localization keys -> missing count reduced to `0`.

## 4) Old wording removed/normalized

Removed from active runtime copy in touched user surfaces:
- legacy-mapping mention in entitlement source line,
- `premium claim` error wording where support-claim semantics is now active,
- slash-heavy claim CTA phrasing (`... / submit ...`) in Profile.

Subscription-first active truth was not reintroduced.

## 5) Translation keys added/updated

Yes. `src/lib/i18n/localization.tsx` received a dedicated 24B override block with new and normalized keys for all 24A-added runtime strings and dynamic support-rail labels.

## 6) Intentionally not changed

- No navigation/model redesign.
- No business logic/state/backend changes.
- No support-rail behavior changes.
- No migration changes.
- No visual interaction rollback from 24A.

Preserved unchanged:
- 4-tab shell,
- reminders/history/family/core payment logic,
- Mark paid / Undo paid,
- workspace create/join/switch,
- onboarding replay + first-run behavior,
- bug report flow,
- help popover behavior,
- support-rail config semantics,
- owner-review fallback semantics.

## 7) Risks / follow-ups

1. `localization.tsx` contains historical legacy keys from older phases; active runtime parity is fixed, but a future archival cleanup could reduce dictionary noise.
2. Owner-only admin surfaces still intentionally include historical terminology in places for compatibility context.

## 8) Validation

Executed:
- `npm run lint` — pass
- `npm run build` — pass

## 9) Manual verification notes (concise)

1. Switch RU/EN in Profile and verify all 24A support/perk labels stay parity-consistent.
2. Open Profile -> Support and Premium block and verify no fallback EN appears in RU.
3. Verify pending CloudTips slot text is calm/honest in both languages.
4. Verify Home/History short helper lines read compact and operational in both RU/EN.

## 10) Recommended next step

Phase 24C: support-claim operational clarity for owner review queue wording (admin-facing), while keeping donor-support-first user truth and free-core behavior unchanged.

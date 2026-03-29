# Phase 17B — Reminders Rethink Analysis (Planning-Only Pass)

- Date: 2026-03-28
- Scope: Analysis and redesign planning only (no implementation)
- Project: Telegram Mini App `Payment Control`
- Sources used:
  - Master anchor: `docs/payment_control_master_anchor_2026-03-28.md`
  - Current UI code: `src/components/app/recurring-payments-section.tsx`, `src/components/app/reminder-candidates-section.tsx`
  - Prior reports: `docs/reports/phase_17A_ui_overhaul_wave1.md`, `docs/phase16b_reminders_reorganization_header_cleanup_localization_template_fix_report.md`
  - Primary design intelligence: `.codex/skills/ui-ux-pro-max/SKILL.md` + targeted `search.py` runs

---

## 1) Current UX diagnosis

### Root causes (not symptoms)

1. **Role conflation on one surface**
`Reminders` still combines at least four different jobs:
- daily execution (`mark paid` / `undo`)
- entity management (create/edit/archive/template save/delete)
- family governance (who pays assignment visibility)
- delivery operations diagnostics (readiness, binding, dispatch/test attempts)

2. **Mode split exists, but cognitive split is incomplete**
Phase 17A introduced `Main action` vs `Setup and templates`, but `Setup` is still a dense management console rather than a low-friction support layer. It still competes conceptually with daily action.

3. **Progressive disclosure became structural debt**
The screen relies heavily on nested disclosure (`details` in multiple strata). This hides clutter visually, but still imposes decision load:
- users must decide what to open before knowing whether it contains what they need
- deep nesting penalizes short sessions

4. **Template model is manager-first, not action-first**
Templates are treated as an inventory/list management area. For a short-session product, template reuse should be intent-triggered inside create/edit, not a persistent block requiring navigation and scanning.

5. **Action cards are information-dense**
Payment cards mix status chips, economics, reminder settings, and multiple actions in one visual chunk. This increases scan time before the primary action.

6. **Rare operational controls are too near everyday flow**
Reminder diagnostics, binding verification, test-send, attempt logs are valid features, but they belong to a rare operations layer, not near core daily execution.

### Surface symptoms

- The screen still feels “management-heavy” despite 17A split.
- Session duration inflates from navigation between disclosure layers.
- Users are exposed to options they do not need in most visits.
- Main workflow is present, but not dominant enough.

---

## 2) Session-length analysis

### What currently increases session duration

1. **Mode/context switching**
Action tasks and setup tasks are separated, but users still jump between them for common actions (especially create/edit + template reuse).

2. **Disclosure overhead**
Multiple expandable blocks add taps before task completion. Disclosure reduces visual noise but increases interaction steps.

3. **Card-level scan friction**
Before pressing `Mark paid`, users parse many secondary signals in each card.

4. **Template retrieval friction**
Template reuse requires moving to template lists and selecting from a block, instead of receiving suggestions at the moment of typing intent.

### Interactions creating cognitive drag

1. Find and open the right surface before acting.
2. Interpret whether a control is everyday vs administrative.
3. Parse too many persistent statuses and helper phrases.
4. Handle a high option count in create/edit, even for simple entries.

### Structural density snapshot (current code, indicative)

- `RecurringPaymentsSection`: ~2145 lines, `details` x8, `button` x21
- `ReminderCandidatesSection`: ~967 lines, `details` x7, `button` x6

Interpretation: structural complexity is still high for a short-session “do-now” screen.

---

## 3) Visible vs invisible layers

### Proposed 3-layer model

1. **Layer A: Always visible (daily action lane)**
- Workspace/context chip
- `Due today` and `Overdue` counters
- Primary list with direct `Mark paid / Undo paid`
- `Add` entry point
- Optional Payments/Subscriptions quick segment

2. **Layer B: Contextual/on-demand (task-coupled)**
- Create/Edit surface
- Inline template suggestions while typing title
- Secondary card actions (`Edit`, `Archive`, `Pause/Resume`) via overflow sheet
- Family details for a specific shared item
- Reminder settings detail for current item only

3. **Layer C: Rare/system-level (operations/admin-like)**
- Delivery readiness deep diagnostics
- Binding verification
- Manual dispatch/test-send
- Recent attempt logs
- Full template management (save/delete/bulk browse)

### Classification of current Reminders elements

**Should remain Always visible**
- Due/overdue emphasis
- Actionable recurring list
- `Mark paid / Undo paid`
- quick entry into add flow

**Should become Contextual/on-demand**
- Template choice UI
- Most create/edit options
- Family extended info (member lists, mismatches details)
- Reminder settings details

**Should move to Rare/system-level**
- `ReminderCandidatesSection` operational diagnostics stack (for personal mode)
- binding verify / test send / attempt logs

---

## 4) Template strategy rethink

### Candidate models

1. **Persistent template block (current family)**
- Pros: discoverable
- Cons: heavy, list-management feel, competes with primary flow
- Fit for short sessions: weak

2. **Secondary template sheet only**
- Pros: cleaner main screen
- Cons: still requires explicit navigation and deliberate search
- Fit: medium

3. **Inline autocomplete in title field**
- Pros: zero context switch, matches intent timing, fastest reuse path
- Cons: requires careful ranking and conflict handling
- Fit: strong

4. **Quick chips (recent/common)**
- Pros: one-tap speed for repeated items
- Cons: limited catalog depth
- Fit: strong as complement

5. **Hybrid model**
- Inline autocomplete + recent chips + optional full library in secondary sheet
- Fit: strongest overall

### Evaluation of inline template suggestions while typing

This should be primary template interaction for Reminders because it minimizes taps and decision branching.

Recommended behavior:

1. In title input, after 1-2 chars, show local scenario-filtered suggestions.
2. Suggest from:
- recent used templates first
- scenario-compatible templates next
- optional fuzzy match on title/category
3. Tap suggestion applies mapped fields instantly.
4. Show lightweight “Template applied” feedback + one-step revert.
5. Do not force suggestions; manual typing remains first-class.

### Recommended template model

**Hybrid, with inline-first priority**

1. Primary: inline autocomplete in create/edit title field
2. Secondary: 3-5 recent template chips directly under title field
3. Tertiary: `Browse all templates` sheet
4. Rare: `Manage templates` moved to setup/system area, not main action screen

Why this is best:
- lowest time-to-completion for repeat adds
- lowest context switching
- best alignment with low-noise short-session behavior

---

## 5) Recommended new Reminders information architecture

### New screen model (target)

1. **Top strip**
- workspace indicator
- concise due-state snapshot

2. **Action list (core)**
- default sorted by urgency
- simple card anatomy:
  - title + amount + due
  - minimal state badges
  - one dominant CTA (`Mark paid` or `Undo paid`)
  - secondary actions in overflow

3. **Add entry**
- single primary add action opening compact create surface

4. **No permanent management blocks**
- templates, diagnostics, and deep config are not always visible

### Primary flow (step-by-step)

1. User opens Reminders.
2. Sees urgency-first list.
3. Taps `Mark paid` on relevant card.
4. Gets immediate confirmation + short undo affordance.
5. Leaves screen.

Target session: very short, minimal branching.

### Create/Edit flow (step-by-step)

1. Tap `Add` or `Edit`.
2. Open compact form surface (bottom sheet recommended).
3. User types title.
4. Inline suggestions appear; optional one-tap template apply.
5. User confirms core fields.
6. Save with clear feedback.
7. Return to action list automatically.

### What should be removed from permanent Reminders surface

1. Full template lists (payment + subscription) as default visible blocks.
2. Delivery diagnostics and recipient binding controls from the everyday lane.
3. Expanded family control lists from default visible state.
4. Excess helper copy where intent can be conveyed by labels and contextual `?`.

---

## 6) Interaction model recommendations

### Quick add

- Single primary affordance from Reminders main lane.
- Open compact create surface with title-focused first field.
- Inline template intelligence immediately available in that field.

### Quick mark paid

- Maintain one-tap action on card.
- Keep action always visible without entering edit surfaces.
- Keep card content lean so CTA is obvious.

### Quick undo

- Preserve `Undo paid`.
- Prefer immediate temporary undo affordance right after mark (toast/snackbar style) to reduce recovery cost.

### Template reuse

- Move from list browsing to inline prediction.
- Support recent chips for zero-typing repeat entries.

### Recent/common actions

- Add optional “recently used” small action row in create surface, not main screen.

### Family visibility

- Keep essential who-pays state visible on shared items.
- Move member-level and mismatch analysis into contextual item detail.

### Secondary controls

- Consolidate non-primary per-card actions into overflow menu/sheet.
- Keep destructive and rare actions out of primary button lane.

---

## 7) Implementation wave proposal

### Wave 1 (narrow, high-impact, low-risk)

Goal: make Reminders visually and behaviorally action-dominant.

Scope:
- reduce permanent blocks on main Reminders lane
- keep daily list + mark/undo + add entry dominant
- move rare operations entry into secondary access point (without removing functionality)

Validation:
- no behavior change in business logic
- regression checks for mark/undo, family shared, subscriptions filters

### Wave 2 (template flow modernization)

Goal: replace template-block dependence with inline intelligence.

Scope:
- title-field inline suggestions
- recent chips
- apply-template feedback + revert

Validation:
- add-payment completion time
- template reuse success rate
- RU/EN behavior consistency

### Wave 3 (create/edit ergonomics consolidation)

Goal: compact one-handed create/edit flow.

Scope:
- compact sheet layout
- reorder fields by frequency
- demote advanced settings

Validation:
- add/edit completion steps
- form error rate

### Wave 4 (family contextualization)

Goal: keep family info useful but non-intrusive.

Scope:
- always-visible minimal who-pays context
- deeper family diagnostics only on-demand

Validation:
- family user comprehension checks
- no regression in who-pays / paid-by understanding

### Wave 5 (rare operations lane hardening)

Goal: preserve operations tooling without polluting daily UX.

Scope:
- dedicated secondary entry to delivery diagnostics
- keep test/binding/attempt logs accessible but detached from daily lane

Validation:
- operators still can execute diagnostics
- daily users no longer see operational complexity by default

---

## 8) Demo mode recommendation

### Purpose

Create a safe, non-production “dense-state” UX test mode for Reminders so the redesigned model is validated under realistic load, not empty-state bias.

### Recommended dataset (future)

Minimum:

1. **14 recurring items total**
- 8 payments
- 6 subscriptions

2. **State distribution**
- 4 due today
- 3 overdue
- 5 upcoming
- 2 paid this cycle
- 2 paused subscriptions
- 2 reminders disabled

3. **Family stress cases**
- shared items with:
  - assigned who-pays
  - missing who-pays
  - paid-by mismatch

4. **Template stress cases**
- overlapping template names
- RU and EN-relevant titles
- custom + system template overlaps

5. **Value diversity**
- mixed categories
- mixed cadences
- multi-currency examples

### Delivery format recommendation

- Client-safe demo switch (`demo mode`) in UI or query param
- No mutation of real user data
- Clearly labeled as demo/testing context

### Why it matters

- validates scanability under density
- exposes scroll/tap fatigue
- reveals where secondary controls still leak into primary lane
- provides repeatable UX benchmark before and after each wave

---

## 9) Risks and preserve rules

Future implementation passes must preserve:

1. 4-tab shell
2. RU/EN switching
3. `Mark paid / Undo paid`
4. Recurring payment/subscription core flow
5. Single/family workspace behavior
6. `Who pays` / `Paid by` surfaces
7. Premium entitlement boundaries
8. Owner-only admin rules
9. Onboarding replay behavior
10. Bug report flow

Additional risk notes:

1. Over-hiding can harm discoverability; contextual layers need clear entry points.
2. Inline template intelligence must never silently override user intent.
3. Performance and responsiveness are part of UX; suggestion logic must stay fast.

---

## 10) Concrete next pass recommendation

### Recommended next implementation pass: **Phase 17C (narrow)**

**Theme:** Action-lane cleanup + template relocation preparation (without full rewrite).

Narrow target:

1. Keep Reminders main lane focused on:
- due-state snapshot
- actionable list
- mark/undo
- add entry

2. Remove permanent template list blocks from default visible Reminders surface.

3. Introduce a lightweight placeholder entry point for future inline template suggestions in create/edit flow (structure-first, behavior safe).

Out of scope for 17C:

- no business logic changes
- no reminder dispatch backend changes
- no family rules changes
- no premium/admin flow changes

Why this is the best next step:

- meaningful reduction of permanent visual noise
- immediate alignment with short-session principles
- low blast radius
- sets clean foundation for Wave 2 inline template intelligence

---

## Notes on UI/UX Pro Max usage in this analysis

Applied guidance from the installed skill was used primarily for:

1. touch target and spacing thresholds (`44x44`, minimum spacing)
2. progressive disclosure with intent-based layering
3. autocomplete recommendation as faster retrieval pattern
4. separating primary vs secondary controls

Some generated style output from `--design-system` (e.g., highly expressive visual themes) was intentionally not adopted as-is, because it conflicts with project’s current product direction (calm, low-noise, short-session utility app).

---

## Encoding safety check

1. This report was written and saved as UTF-8.
2. No source code, DB, business logic, API behavior, or core flows were changed in this pass.

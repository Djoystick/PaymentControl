# Payment Control Design Foundation

Version: 1.0 (post-29A.1 baseline)
Scope: Mini App UI/UX guidance for future passes (not a runtime rewrite)

## 1. Product Design Intent
Payment Control should feel like a calm, practical mobile utility for short daily sessions.

Target feel:
- Simple before powerful.
- Action-first before explanation-first.
- Friendly but operational (no toy UI, no enterprise heaviness).
- App-like continuity across Home, Recurring, Travel, History, Profile.

Non-negotiable intent:
- Keep friction low for first run.
- Keep root surfaces short and scannable.
- Keep one clear next step visible on every root surface.
- Avoid persistent walls of text.

## 2. Core UX Principles
1. One primary action per root surface.
2. Secondary/rare actions move to secondary layers.
3. No walls of text on main working surfaces.
4. Context isolation over mega-screens.
5. Progressive disclosure over permanent complexity.
6. Clear return path for every deeper layer.
7. Recurring and Travel remain separated.
8. Utility over decoration.
9. Predictability over hidden smart behavior.
10. Daily-use speed beats visual novelty.

## 3. Visual Direction
The product should use a clean utility aesthetic with compact density and controlled warmth.

Direction:
- Medium-compact spacing rhythm suitable for Telegram mobile viewport.
- Soft contrast surfaces, clear interactive hierarchy, restrained accents.
- Minimal decorative effects; emphasis through structure, not ornament.
- Stable card geometry and button heights across tabs.
- Consistent visual rhythm between headers, context rows, list rows, and action lanes.

## 4. Typography Rules
Typography must reduce cognitive load and avoid verbose surfaces.

Rules:
- Heading text: short, functional, no marketing tone.
- Subtitles: one short sentence max.
- Supporting text: 1-2 lines max on root surfaces.
- Labels in actions: explicit verbs (Open, Add, Continue, Reset).
- Empty states: one line for state + one line for next step.

Copy limits on root surfaces:
- Section subtitle: <= 80 chars preferred.
- Always-visible helper paragraph: avoid by default.
- If helper text is needed, hide under details/sheet.

## 5. Color and Semantic Emphasis Principles
Use color as workflow signal, not decoration.

Principles:
- Primary emphasis: one active action per section.
- Secondary emphasis: neutral secondary controls, no CTA competition.
- Neutral surfaces: most cards/layers remain neutral.
- State semantics:
  - Success = completion/settled/ready.
  - Warning = due soon/review needed.
  - Error = blocking issue or failed action.
  - Info = context, not urgency.
- Avoid storefront-like accent saturation in utility workflows.

## 6. Component Rules

### Buttons
- Root surface: one dominant CTA, rest secondary/quiet.
- Keep icon+label aligned and icon size consistent.
- Avoid two adjacent CTAs with equal visual weight for different intents.

### Cards and List Rows
- Card top line = key identity (title + key value/status).
- Meta lines remain short; optional details go into expandable layer.
- Avoid nested card-in-card stacks unless there is a clear state boundary.

### Chips and Pills
- Use only for compact status/context markers.
- Do not duplicate the same meaning in both pill and long sentence.

### Section Headers
- Header = icon + title + optional compact action lane.
- No duplicated structural icon signals near the same title.

### Context Rows
- Show only when context differs from default.
- Include concise reset/clear action.
- Hide when context is default to reduce noise.

### Empty States
- Explain state briefly.
- Present immediate useful next action.
- No long onboarding text in empty-state card.

### Forms
- Keep first visible step minimal.
- Advanced controls in secondary collapsible layer.
- Preserve explicit user confirmation where domain requires it.

### Modals / Sheets
- Use when the user must complete a focused sub-task.
- Keep modal scope single-purpose.
- Close returns user to clean prior context.

### Segmented Controls
- Use for lightweight local mode/filter switches only.
- Keep options short and mutually clear.

### Trip Workspace Sub-Navigation
- Treat selected trip as sub-workspace.
- Use stable local layers (Expenses / Settlements / History).
- Keep travel root list separate from trip workspace.

### Action Rows
- Primary action first, secondary actions grouped and lighter.
- Keep consistent spacing and min-height across surfaces.

## 7. Layout Rules

### Root Screens
- Near-zero-scroll preference where realistic.
- Show only the most relevant controls and signals.
- Move management/help content to secondary layers.

### Detail Screens / Sub-Workspaces
- Prioritize active work lane.
- Keep deep details behind tabs, details, or modal review layers.

### Secondary Layers
Use this selection logic:
- Modal: focused creation/join/edit task.
- Sheet: short contextual selection/filter utility.
- Inline disclosure: optional supporting details.
- Dedicated workspace: frequent multi-step flows.

### Spacing and Density
- Keep vertical rhythm stable across tabs.
- Avoid random density jumps between neighboring blocks.
- Keep headers, cards, and list rows on a shared spacing cadence.

## 8. Text Restraint Rules
Do not keep these always visible on root surfaces:
- Long explanatory paragraphs.
- Rare admin/diagnostic details.
- Advanced option explanations.
- Duplicate contextual hints.

Preferred approach:
- Short action-focused copy on root.
- Long explanations in help popover/details/modal.
- Replace repeated explanation with one compact context marker.

## 9. Navigation Design Rules
1. Home is an action-first routing hub, not a dashboard wall.
2. Current context should be visible when non-default.
3. Provide quick reset/start-clean for remembered contexts.
4. Back/close behavior should be consistent across layers.
5. Selected Trip remains a sub-workspace with explicit return to trips.
6. No duplicate entry points for the same scenario on one surface.
7. Secondary layers should follow one recognizable open/close pattern.

## 10. Do / Don't

### Do
- Keep root screens short, obvious, and action-driven.
- Isolate create/join/manage flows into focused layers.
- Keep statuses and labels semantically consistent across modules.
- Optimize for one-hand mobile scanning in Telegram viewport.
- Prefer small, high-value UX passes over broad redesigns.

### Don't
- Don't reintroduce premium/paywall/unlock mechanics.
- Don't merge Recurring and Travel contexts.
- Don't place multiple competing primary CTAs in one lane.
- Don't keep heavy helper copy permanently expanded.
- Don't duplicate icons/signals for the same meaning.
- Don't add decorative complexity that slows daily workflows.

## 11. Future Design Application Notes
How to use this file in future passes:
1. Start every UX pass by mapping proposed change to these principles.
2. Use `ui-ux-pro-max` as quality bar for mobile rhythm, hierarchy, and alignment.
3. Use external design references only as pattern library, never as brand template.
4. Preserve verified baseline behavior; improve structure and clarity first.
5. Validate each pass against:
   - first-action clarity,
   - context isolation,
   - text restraint,
   - back/reset predictability,
   - root-surface brevity.

Compatibility notes:
- Product rules from anchor remain authoritative.
- Language model from 29A/29A.1 remains unchanged:
  - Telegram `language_code` auto-source,
  - English fallback,
  - manual override priority.
- Bot-facing/manual Telegram profile layer stays outside app-code passes.

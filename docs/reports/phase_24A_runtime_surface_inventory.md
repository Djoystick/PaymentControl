# Phase 24A — Runtime Surface Inventory

- Date: 2026-03-31
- Scope: active runtime surfaces in Home / Reminders / History / Profile and shared shell

## Classification legend

- Keep
- Simplify
- Merge
- Demote
- Hide behind disclosure
- Remove
- Historical/inactive

## 1) Global shell and nav

| Surface | Current role | Classification | Action in 24A |
|---|---|---|---|
| 4-tab shell (`AppShell`) | Primary navigation | Keep + Simplify | Preserved 4 tabs; reduced top text noise; added compact per-tab hint; stronger idle affordance on tab buttons |
| Onboarding overlay | First-run/replay guidance | Keep | Preserved behavior; no flow-breaking changes |
| Help popover trigger | Secondary help access | Keep + Simplify | Unified trigger style using shared icon-button affordance |

## 2) Home

| Surface | Current role | Classification | Action in 24A |
|---|---|---|---|
| Home hero snapshot | Orientation + first action | Simplify | Reduced helper noise; clearer "today focus" framing |
| Primary CTA to Reminders | Main action handoff | Keep | Kept single clear CTA |
| Runtime status hint | Secondary technical context | Demote | Kept compact and lightweight |

## 3) Reminders

| Surface | Current role | Classification | Action in 24A |
|---|---|---|---|
| Recurring form core fields | High-frequency entry | Keep + Simplify | Migrated controls to shared input/select affordance primitives |
| Template autosuggest rows | Fast form fill | Keep + Simplify | Rows now visually interactive before click (`pc-action-card`) |
| Advanced details block | Secondary controls | Keep + Hide behind disclosure | Maintained collapsible advanced form section with clearer summary affordance |

## 4) History

| Surface | Current role | Classification | Action in 24A |
|---|---|---|---|
| Activity feed | Primary verification lane | Keep | Preserved |
| History context stats | Secondary diagnostics | Hide behind disclosure | Converted to collapsible details, reducing first-screen density |

## 5) Profile — context/settings/workspace

| Surface | Current role | Classification | Action in 24A |
|---|---|---|---|
| Session/language/theme controls | Core context settings | Keep + Simplify | Preserved; aligned affordance consistency |
| Workspace switch | Operational context action | Keep | Preserved logic |
| Family workspace create/join | Secondary setup path | Keep + Hide behind disclosure | Kept optional details section; improved input/summary affordance |
| Invite diagnostics | Debug/verification layer | Hide behind disclosure | Preserved under collapsible diagnostic details |
| Onboarding replay/help | Support utility | Keep | Preserved |
| Bug report form | Support utility | Keep + Simplify | Inputs and summary trigger aligned with shared interactive system |

## 6) Profile — soft Premium/support section (rebased)

| Surface | Previous shape | New role | Classification |
|---|---|---|---|
| Buy-first premium messaging | Purchase-led guidance | Replaced with donor-support-first framing | Remove (active truth) |
| Premium status block | Entitlement state display | Calm secondary status | Keep |
| Support rails list | Single dominant rail feeling | Multi-rail compact list (Boosty + CloudTips slot) | Keep + Simplify |
| Support reference code prep | Purchase handoff framing | Support claim reference helper | Keep + Rebase |
| Claim submission form | Payment-first wording | Support-proof/owner-review wording | Keep + Rebase |
| Claim status refresh area | Lifecycle visibility | Lifecycle visibility | Keep |

## 7) Historical/inactive surfaces and semantics

| Surface | Classification | Notes |
|---|---|---|
| Legacy subscription-shaped rail semantics in compatibility layers | Historical/inactive | Retained for safe backward compatibility, not active UX truth |
| Legacy one-time buy env compatibility keys | Historical/inactive | Kept as compatibility path, demoted from active product messaging |

## 8) Net inventory outcome

- Kept: core utility surfaces and critical task flows.
- Simplified: top-level messaging, first-screen scan load, and control visibility.
- Hidden behind disclosure: secondary diagnostics/context.
- Demoted/removed from active truth: subscription-first and purchase-first runtime messaging.
- Preserved historical/inactive layers safely where backend compatibility still benefits from retention.

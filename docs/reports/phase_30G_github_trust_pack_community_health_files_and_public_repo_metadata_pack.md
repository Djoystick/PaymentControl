# Phase 30G - GitHub Trust Pack + Community Health Files + Public Repo Metadata Pack

- Date: 2026-04-06
- Type: documentation/community-health pass (no runtime feature changes)
- Scope: public repository trust layer for GitHub

## 1. Objective

Build a complete public trust pack for the repository:
1. Add missing community health files.
2. Add practical issue/PR templates.
3. Add manual GitHub settings copy/paste pack.
4. Add social preview source asset.
5. Keep product/runtime code untouched.

## 2. Inputs Reviewed

Before implementation, the following were reviewed:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `README.md` (current public-facing version)
4. `.codex/skills/ui-ux-pro-max/SKILL.md` (used as quality reference for clarity, hierarchy, rhythm, trust-first structure)

Additional fact-check:
1. repository root and `.github` state audit
2. `git remote -v` for canonical repo URL usage in template links

## 3. Audit Findings (Pre-pass)

1. Community trust layer files were missing:
   - no `LICENSE`
   - no `SECURITY.md`
   - no `CONTRIBUTING.md`
   - no `CODE_OF_CONDUCT.md`
   - no `SUPPORT.md`
2. `.github` issue/PR templates and issue config were missing.
3. No dedicated GitHub manual-fill metadata pack existed.
4. No GitHub social preview asset existed in repository.
5. `README.md` still had a stale line in License section saying there was no license file.

## 4. What Was Added/Changed

## 4.1 Core trust files

Created:
1. `LICENSE` (MIT)
2. `SECURITY.md`
3. `CONTRIBUTING.md`
4. `CODE_OF_CONDUCT.md`
5. `SUPPORT.md`

Implementation notes:
1. All files are English and public-facing.
2. No internal phase/anchor/dev-jargon.
3. No deprecated monetization traces or fake claims.
4. Security and conduct contacts use explicit manual placeholders where no verified public contact exists:
   - `PASTE_SECURITY_EMAIL_HERE`
   - `PASTE_COMMUNITY_CONTACT_HERE`

## 4.2 GitHub issue/PR flow hardening

Created:
1. `.github/ISSUE_TEMPLATE/bug_report.yml`
2. `.github/ISSUE_TEMPLATE/feature_request.yml`
3. `.github/ISSUE_TEMPLATE/config.yml`
4. `.github/PULL_REQUEST_TEMPLATE.md`

Design goals:
1. Keep forms short and practical (no heavy bureaucracy).
2. Improve incoming report quality.
3. Route support/security to correct docs from issue chooser.

## 4.3 Public metadata manual-fill pack

Created:
1. `docs/github_public_trust_manual_fill_pack.md`

Contains copy/paste-ready items:
1. repository description
2. short tagline
3. homepage field guidance (`PASTE_PUBLIC_URL_HERE` if no confirmed URL)
4. suggested topics
5. social preview upload guidance
6. discussions welcome post draft
7. first release title/body draft
8. profile pinning note
9. public short pitch
10. manual settings checklist
11. placeholder replacement checklist

## 4.4 Social preview asset

Created:
1. `docs/media/github/social-preview.svg`

Why SVG source in this pass:
1. safe, editable source asset kept in repo
2. clear 1280x640 canvas and truthful content
3. manual-fill pack explicitly instructs exporting PNG for GitHub upload

## 4.5 README trust alignment

Updated:
1. `README.md`

Changes:
1. Added a concise `Community & Trust` section with links to new trust files.
2. Replaced stale License line with MIT link (`./LICENSE`).

## 5. Why MIT Was Chosen

`LICENSE` was missing, and no conflicting explicit license decision was found in repository metadata.
MIT was selected as a permissive, readable default suitable for public GitHub trust baseline.

## 6. Files Changed

Created:
1. `LICENSE`
2. `SECURITY.md`
3. `CONTRIBUTING.md`
4. `CODE_OF_CONDUCT.md`
5. `SUPPORT.md`
6. `.github/ISSUE_TEMPLATE/bug_report.yml`
7. `.github/ISSUE_TEMPLATE/feature_request.yml`
8. `.github/ISSUE_TEMPLATE/config.yml`
9. `.github/PULL_REQUEST_TEMPLATE.md`
10. `docs/github_public_trust_manual_fill_pack.md`
11. `docs/media/github/social-preview.svg`
12. `docs/reports/phase_30G_github_trust_pack_community_health_files_and_public_repo_metadata_pack.md`

Updated:
1. `README.md`
2. `docs/reports/internal_version_history.md`

## 7. What Was Intentionally Not Added

1. No fake adoption/user metrics.
2. No fake SLA promises in security/support docs.
3. No fake demo/deployment/store claims.
4. No product runtime/domain/schema/API changes.
5. No bot-facing manual Telegram profile/start/menu edits.

## 8. Manual GitHub Settings Items (Owner Action)

Still manual by design:
1. Replace `PASTE_SECURITY_EMAIL_HERE` in `SECURITY.md`.
2. Replace `PASTE_COMMUNITY_CONTACT_HERE` in `CODE_OF_CONDUCT.md`.
3. Set canonical public homepage URL (if available).
4. Export/upload PNG social preview (`1280x640`) from `docs/media/github/social-preview.svg`.
5. Enable/verify GitHub Discussions and private vulnerability reporting in repository settings.

## 9. Validation Notes

Performed:
1. File-level existence and path checks after creation.
2. README alignment check (license statement + trust links).
3. Public-facing tone check (no internal roadmap/phase noise in newly added trust files).

Not performed (not required for docs-only pass):
1. Runtime UI tests
2. lint/build (no app code changes in this pass)

## 10. Risks / Watchlist

1. Placeholders must be replaced manually, otherwise trust docs look incomplete.
2. Social preview is currently SVG source; PNG export/upload remains manual.
3. If ownership/contact policy changes, `SECURITY.md` and `CODE_OF_CONDUCT.md` contacts must stay synchronized.

## 11. Why This Improves Public Trust

1. Adds standard open-source trust signals expected on GitHub.
2. Makes reporting paths clear (support vs bug vs security).
3. Reduces ambiguity for contributors via lightweight templates.
4. Provides ready metadata pack to finish GitHub settings quickly without guesswork.
5. Aligns README with real licensing and community documentation links.

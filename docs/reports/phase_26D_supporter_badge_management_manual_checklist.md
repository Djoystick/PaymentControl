# Phase 26D - Supporter Badge Management Manual Checklist

- Date: 2026-04-03
- Scope: owner-side convenience checks for supporter badge management (no monetization/access changes)

## 1) Owner-only visibility

1. Open Profile as a non-owner account.
2. Confirm `Supporter badge management` block is not visible.
3. Open Profile as an owner allowlisted in `SUPPORTER_BADGE_OWNER_TELEGRAM_USER_IDS`.
4. Confirm `Supporter badge management` block is visible.

## 2) Easier target handling

1. In owner block, paste mixed input like ` @id 12345abc678 `.
2. Confirm input keeps only numeric digits.
3. Confirm helper text clearly says numeric Telegram user id is required.
4. Click `Use my Telegram user id` and confirm field is filled with owner numeric id.

## 3) Safe status lookup and grant/revoke flow

1. Enter a valid existing target Telegram user id.
2. Click `Check current status`.
3. Confirm snapshot appears with status and timestamps.
4. Click `Mark as supporter` and confirm explicit confirmation prompt is shown.
5. Confirm success feedback and refreshed snapshot.
6. Click `Remove supporter badge` and confirm explicit confirmation prompt is shown.
7. Confirm success feedback and refreshed snapshot.
8. Re-run grant/revoke when snapshot already matches target state and confirm no-op guidance appears.

## 4) Profile badge behavior

1. Open Profile as target user after grant.
2. Confirm supporter badge is visible, compact, and appreciation-only.
3. Confirm app access/flows remain fully unrestricted.
4. Re-open after revoke and confirm badge is no longer shown.

## 5) Product truth and access safety

1. Confirm Boosty/CloudTips donation links still work as plain donation links.
2. Confirm no text implies donation unlocks access.
3. Confirm no Premium/entitlement/claim/review wording appears in active supporter badge flow.

## 6) RU/EN parity for touched strings

1. Switch Profile to RU and verify new owner helper texts, confirmations, and snapshot labels.
2. Switch Profile to EN and verify same meaning/flow.
3. Confirm no broken placeholders in translated confirmation strings.

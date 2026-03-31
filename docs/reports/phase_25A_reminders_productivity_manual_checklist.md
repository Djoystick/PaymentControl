# Phase 25A - Reminders Productivity Manual Checklist

- Date: 2026-03-31
- Scope: live manual verification of 25A reminders productivity pack on top of accepted 24I-24L baseline

## Quick setup

1. Open app in RU and EN at least once.
2. Use a workspace with mixed reminders (recommended: 10+ active cards).
3. Ensure list contains a mix of overdue, due today, upcoming unpaid, and paid current-cycle cards.

## Pass checklist

1. Card scan clarity
- [ ] Title, amount, due, cadence, and state are readable without opening details.
- [ ] Overdue and due-today cards are immediately distinguishable from upcoming/paid cards.
- [ ] Long list does not feel like one undifferentiated wall.

2. Action-lane clarity
- [ ] Primary card action (`Mark paid` or `Undo paid`) is visually dominant.
- [ ] `Edit` and `Delete` are visible on every active card without hunting.
- [ ] Tap targets are reliable on mobile-sized viewport.

3. Focus productivity lane
- [ ] `Focus` chips (`All`, `Action now`, `Upcoming`, `Paid`) are visible and understandable.
- [ ] Counts on focus chips match visible list behavior.
- [ ] Empty-focus state is clear and calm when a focus has no cards.

4. Add/edit/delete baseline integrity (24I-24L must remain intact)
- [ ] `Add payment` still opens modal form (not in-page composer).
- [ ] Edit opens same modal with prefilled values.
- [ ] Native in-app unsaved confirmation appears only when draft is changed.
- [ ] Delete still requires explicit confirmation and archives payment from active reminders.

5. Large-list usability and responsiveness
- [ ] Scrolling and card interaction remain smooth on larger reminder sets.
- [ ] Focus switching feels immediate enough for daily use.

6. RU/EN touched strings
- [ ] `Focus`, `All`, `In list`, and `No cards in this focus yet.` display correctly in EN.
- [ ] RU equivalents display correctly and naturally in RU locale.

## Compact pass/fail matrix

| Area | Pass | Fail | Notes |
|---|---|---|---|
| Card scan clarity | [ ] | [ ] | |
| Action-lane clarity | [ ] | [ ] | |
| Focus lane behavior | [ ] | [ ] | |
| Modal baseline integrity | [ ] | [ ] | |
| Large-list usability | [ ] | [ ] | |
| RU/EN parity (touched strings) | [ ] | [ ] | |

## Verification note format

Use one line per issue:

`[Area] [Locale] [Device/Viewport] [Steps] [Expected] [Actual] [Severity: low/med/high]`

Example:

`[Focus lane] [RU] [mobile 390x844] [tap Upcoming chip] [count and list match] [count 4 but list shows 3] [Severity: med]`

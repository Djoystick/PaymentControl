# Phase 8I — Family invite clarity / continuity cleanup

## 1. Scope
В этом pass сделан только локальный UX/clarity cleanup invite-блока в family workspace.

Цель: сделать invite section более понятным и аккуратным без изменения invite-бизнес-логики.

Вне scope оставлено:
- accept invite expansion;
- multi-invite manager/history/resend/revoke logic;
- membership domain changes;
- role editing/member removal/owner transfer;
- shared economics/split/debts;
- scenario engine, premium, localization, глобальный redesign.

## 2. What was implemented
1. Улучшен заголовок и контекст invite-блока в family workspace:
- invite surface явно привязан к текущему active family workspace;
- добавлен понятный текст про continuity (принятые участники входят в этот household).

2. Улучшено отображение latest invite:
- блок теперь читается как `Current invite for <workspace title>`;
- статус отображается через понятные label'ы: `Active / Accepted / Expired / Revoked`;
- добавлены безопасные status hints по каждому статусу.

3. Улучшено представление token/expires/created:
- token показан отдельным аккуратным моноширинным блоком (не как сырой debug-текст);
- `Expires` и `Created` форматируются в человекочитаемую дату/время;
- при отсутствии expiry показано `No expiry`.

4. Улучшен empty state invite-блока:
- если invite нет, сообщение стало более продуктовым и понятным (`No active invite ... Create one when ready`).

5. Personal context не захламлен family invite management:
- основной invite management остается в family context;
- personal контекст сохраняет компактный entry/join path (как в 8H), без расширения логики.

6. Обновлена phase-метка профиля до `Phase 8I`.

## 3. What was intentionally NOT implemented
- Изменения invite accept semantics;
- дополнительные invite actions (revoke/resend/history);
- любые новые API/migration/domain-изменения;
- расширение в полноценный invite engine.

## 4. Exact files created/modified
### Modified
- `src/components/app/profile-scenarios-placeholder.tsx`

### Created
- `docs/phase8i_family_invite_clarity_cleanup_report.md`

## 5. Manual verification steps
1. Переключиться в family workspace.
2. Открыть profile/workspace screen и проверить блок `Family management (current workspace)`:
- заголовок и пояснение должны явно указывать, что invite относится к текущей family workspace.
3. При наличии latest invite проверить:
- отображается `Current invite for <workspace title>`;
- статус читается как понятный label;
- есть короткий status hint;
- token отображается аккуратно в отдельном блоке;
- даты `Expires`/`Created` читаемы.
4. При отсутствии invite проверить empty state:
- сообщение понятное и безопасное, без debug-ощущения.
5. Переключиться в personal workspace:
- family invite management не должен показываться как активная management-секция;
- остается только компактный family entry/join path.

## 6. Known limitations
- Accept invite остается partially verified и логически не расширялся в этом pass.
- Нет multi-invite management/history.
- Это только UI clarity pass без изменения invite domain behavior.

## 7. Runtime confirmation status
Что подтверждено в текущем окружении Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка в браузере/Telegram после правок invite UX.

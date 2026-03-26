# Phase 8Q — Family invite accept readiness / live-verification support bundle

## 1. Scope
В этом pass выполнен локальный readiness/diagnostics bundle вокруг `accept invite`.

Цель:
- сделать live-проверку вторым Telegram-профилем проще и прозрачнее;
- улучшить post-accept UI feedback и state refresh поведение;
- не расширять invite business-логики и не строить новый invite subsystem.

Вне scope:
- новый invite manager/history;
- revoke/resend/dashboard;
- member management/roles;
- backend API/migration изменения.

## 2. What was implemented
1. Добавлена нормализация invite token перед accept:
- поддерживается raw token и paste из ссылки (`start`/`startapp`/`token`/`invite_token`);
- если токен не распознан — быстрый понятный fail до запроса.

2. Добавлена диагностика accept attempt в клиентском контексте:
- статус попытки (`success`/`error`);
- code + human-readable message;
- время попытки;
- raw token preview и normalized token preview.

3. Улучшен feedback после успешного accept:
- показывается `joined workspace` + `invite status`;
- показывается `workspace list updated: yes/no`;
- показывается `household members` из принятого workspace.

4. Укреплен post-accept UI state refresh:
- после успешного accept локальный контекст сразу обновляется из ответа accept route;
- отдельно подтягивается latest invite для активного workspace;
- success message стал более явным для live-проверки.

5. Добавлена кнопка `Refresh context` прямо в diagnostic block для ручного recovery, если UI кажется stale.

6. Улучшена UX-подача в invite accept блоке:
- токен preview + normalized preview видны до отправки;
- при success input очищается;
- диагностика сбрасывается при изменении токена.

7. Добавлен узкий utility + тестовый файл для token normalization/masking:
- `src/lib/auth/invite-token.ts`
- `src/lib/auth/invite-token.test.ts`

## 3. What was intentionally NOT implemented
- Изменение invite-domain semantics (accepted/expired/revoked rules);
- изменение server-side accept business logic;
- расширение invite API;
- role editing / owner transfer / member actions.

## 4. Exact files created/modified
### Modified
- `src/hooks/use-current-app-context.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`

### Created
- `src/lib/auth/invite-token.ts`
- `src/lib/auth/invite-token.test.ts`
- `docs/phase8q_family_invite_accept_readiness_bundle_report.md`

## 5. Manual verification steps
1. Owner (profile A), family workspace:
- создать invite и скопировать token/ссылку.

2. Second profile (profile B), personal context:
- вставить token/ссылку в `Join by invite token`;
- проверить token preview + normalized preview;
- нажать `Accept invite`.

3. После успешного accept проверить в UI profile B:
- diagnostic block показывает success;
- `joined workspace` заполнен;
- `workspace list updated: yes`;
- `household members` не owner-only.

4. Проверить `Workspace switch`:
- family workspace доступен для profile B;
- можно переключиться на него и видеть household/members.

5. Негативные кейсы:
- пустой токен;
- неверный токен;
- уже использованный/expired токен.
Проверить, что сообщения понятные и не "немые".

## 6. Known limitations
- Accept flow всё ещё должен быть живо подтвержден вторым Telegram-профилем (это цель pass, но не подтверждено вручную в этой среде Codex).
- Тест `node --test` в этом окружении не запустился из-за sandbox `EPERM spawn`, поэтому runtime test confirmation для test-файла не получен.

## 7. Runtime confirmation status
Подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Не подтверждено в этом pass:
- ручная live-проверка accept invite вторым реальным Telegram-профилем;
- выполнение `node --test src/lib/auth/invite-token.test.ts` (blocked by `EPERM spawn` in sandbox).

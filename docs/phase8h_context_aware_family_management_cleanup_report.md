# Phase 8H Ч Context-aware family management surface cleanup

## 1. Scope
¬ этом pass выполнен только локальный context-aware cleanup экрана profile/workspace.

÷ель: убрать лишний family-management шум в personal context и показывать family-specific management surfaces там, где они действительно относ€тс€ к текущему активному family workspace.

¬не scope оставлено:
- accept invite expansion;
- member management actions;
- role editing / owner transfer;
- scenario migration engine;
- shared economics/split/debts;
- family reminder/subscription parity;
- premium/localization;
- глобальный redesign.

## 2. What was implemented
1. Ёкран сделан контекстно-зависимым по `workspace.kind`:
- `family` context: показываетс€ блок `Family management (current workspace)`;
- `personal` context: показываетс€ компактный блок `Family next step`.

2. ¬ family context оставлены только уместные family-management элементы:
- create invite button;
- latest invite info;
- по€снение, что invite controls относ€тс€ к активному family workspace.

3. »з personal context убран misleading family-management clutter:
- убраны family invite management surfaces, которые выгл€дели как Уактивные пр€мо здесьФ.

4. ¬ personal context сохранен полезный вход в family foundation:
- create family workspace path;
- join by invite token path;
- короткий пон€тный текст, что сейчас пользователь в personal context.

5. —охранены ранее подтвержденные основы:
- workspace switch остаетс€ единственным источником смены активного контекста;
- scenario cards остаютс€ read-only;
- family household/who-pays foundation не затронуты по логике.

6. ќбновлена phase-метка profile секции до `Phase 8H`.

## 3. What was intentionally NOT implemented
- Ќова€ бизнес-логика invite flow;
- изменение доменной логики memberships/who-pays;
- любые новые миграции/таблицы;
- нова€ admin-панель дл€ family;
- любые изменени€ reminder/payments architecture.

## 4. Exact files created/modified
### Modified
- `src/components/app/profile-scenarios-placeholder.tsx`

### Created
- `docs/phase8h_context_aware_family_management_cleanup_report.md`

## 5. Manual verification steps
1. ќткрыть приложение в personal workspace:
- убедитьс€, что отображаетс€ блок `Family next step`;
- убедитьс€, что `Family management (current workspace)` не показываетс€.
2. ѕроверить personal entry points:
- create family workspace доступен;
- join by invite token доступен.
3. ѕереключитьс€ в family workspace:
- убедитьс€, что отображаетс€ блок `Family management (current workspace)`;
- create invite / latest invite отображаютс€ в family context.
4. ѕроверить, что context-switch semantics не изменились:
- workspace switch по-прежнему единственный активный переключатель;
- scenario cards остаютс€ read-only.

## 6. Known limitations
- Accept invite остаетс€ в статусе partially verified (не расшир€лс€ в этом pass).
- Family management остаетс€ foundation-level без member actions и без отдельной админки.
- ѕоведение intentionally ограничено текущими фазами roadmap.

## 7. Runtime confirmation status
„то проверено в текущем окружении Codex:
- `npm run lint` Ч успешно.
- `npm run build` Ч успешно.

„то Ќ≈ подтверждено вручную в этом pass:
- ручна€ runtime-проверка в браузере/Telegram дл€ personal/family контекстов и UX-переходов.

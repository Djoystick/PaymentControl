# Phase 14A.2 — Popover viewport fix + onboarding copy rewrite

Модель: ChatGPT 5 Codex  
Дата: 2026-03-28  
Проект: Payment Control / Telegram Mini App

## Контекст и статус
- Прочитан canonical anchor: `docs/payment_control_master_anchor_2026-03-27.md`.
- Прочитаны отчеты:
  - `docs/phase14a_information_audit_onboarding_expansion_onetime_family_invite_flow_report.md`
  - `docs/phase14a1_reminders_scenario_clarity_compact_family_controls_profile_help_cleanup_report.md`
- Статус-override из запроса принят:
  - `11A.1`, `11B`, `11C`, `11D`, `12A.1`, `12B`, `12C`, `13A`, `13C` — manual verified.
- Входная оговорка учтена: `Phase 14A.1` не принят и нуждается в узком bugfix/copy pass.

## Цель Phase 14A.2
1. Устранить viewport overflow проблемы у локальных popover-подсказок (без горизонтального скролла страницы).
2. Переписать onboarding-копирайт в более строгий, короткий, практичный формат с фокусом на core actions.

## Exact files changed (Phase 14A.2)
1. `src/components/app/help-popover.tsx`
2. `src/components/app/app-shell.tsx`
3. `src/lib/i18n/localization.tsx`
4. `docs/phase14a2_popover_viewport_fix_onboarding_copy_rewrite_report.md`

## Как исправлен popover overflow/positioning
Статус: **Confirmed in code/report**

Файл: `src/components/app/help-popover.tsx`

Ключевые изменения:
1. Popover переведен с `absolute`-позиционирования на `fixed` с вычисляемыми координатами.
2. Добавлен viewport-aware расчет позиции:
   - вычисление ширины popover из `window.innerWidth` с безопасными отступами;
   - horizontal clamp (`left`) в границах viewport;
   - vertical fallback: показывать снизу триггера, а если снизу не помещается — показывать сверху;
   - финальный clamp `top` по высоте viewport.
3. Добавлены слушатели `resize`, `orientationchange`, `scroll` для перерасчета позиции.
4. Убран риск начального визуального “прыжка” через скрытие popover до получения валидных координат.
5. Popover остается локальным и компактным:
   - привязан к кнопке-триггеру,
   - закрывается по tap/click вне блока, по `Esc`, и через явную кнопку закрытия.

Почему это решает проблему:
- `fixed + clamp` исключает расширение layout по ширине и не увеличивает page-level scroll width.
- Умный пересчет позиции удерживает popover рядом с контролом и внутри видимой области.

## Что переписано в onboarding copy
Статус: **Confirmed in code/report**

Файл: `src/components/app/app-shell.tsx`

Сделано:
1. Обновлена структура onboarding шагов:
   - шаги стали более конкретными и action-oriented;
   - добавлен отдельный шаг про разделение `Payments / Subscriptions` (без перегруза).
2. Переписан текст шагов в стиле:
   - коротко,
   - строго,
   - без общих маркетинговых формулировок,
   - с прямой привязкой к действию пользователя.
3. Содержание сфокусировано на core:
   - что делает приложение,
   - что делать первым,
   - как работать с Reminders,
   - зачем History,
   - что контролируется через Profile.

Итог по копирайту:
- меньше слов и “флёра”;
- больше конкретных инструкций;
- легче сканируется на мобильном.

## Локализация изменений (RU/EN integrity)
Статус: **Confirmed in code/report**

Файл: `src/lib/i18n/localization.tsx`

- Добавлены RU-переводы для новых onboarding-строк.
- EN остается source-строкой (fallback модель сохранена).
- Существующие ключи не удалялись; изменения узко добавочные.

## Что намеренно НЕ менялось
Статус: **Confirmed in code/report**

- Не добавлялись новые продуктовые механики.
- Не менялись History, premium/growth части, template/family redesign за пределами popover bugfix.
- Не менялись API/DB/миграции.
- Не трогались verified flow контракты:
  - Mark paid / Undo paid,
  - who pays / paid by,
  - one-time invite,
  - templates behavior из 14A.1,
  - payments/subscriptions separation из 14A.1,
  - owner admin console.

## Validation run
Статус: **Confirmed in code/report**
- `npm run lint` — успешно.
- `npm run build` — успешно.

## Risks / follow-up notes
1. Алгоритм позиционирования поповера теперь viewport-safe по коду, но финальная UX-оценка все равно требует live Telegram проверки на нескольких устройствах.
2. Onboarding copy стал строже и короче; может понадобиться один микро-проход после реального first-time walkthrough с пользователем.

## What still requires live manual verification
Статус: **Still requires live manual verification**
1. На узких экранах (320-390px) popover не вызывает горизонтальный скролл страницы.
2. Family scenario help popover остается рядом с триггером и не уходит за край.
3. Single scenario help popover остается рядом с триггером и не уходит за край.
4. Onboarding help popover в Profile ведет себя так же стабильно.
5. Новый onboarding copy воспринимается как более ясный и менее шумный в реальном mobile flow.

## Exact manual checklist (Phase 14A.2)
1. Открыть Reminders в personal workspace, нажать `?` у строки `Workspace`:
   - проверить отсутствие горизонтального скролла страницы.
2. Повторить на family workspace:
   - popover внутри viewport,
   - page width не расширяется.
3. В Profile нажать `?` возле `Show onboarding again`:
   - popover локальный, не edge-glued и не full-screen.
4. Проверить закрытие popover:
   - tap вне popover,
   - `Esc`,
   - кнопка закрытия.
5. Пройти onboarding заново (`Show onboarding again`) и оценить:
   - текст короткий и четкий,
   - шаги понятны на мобильном экране,
   - нет лишней “воды”.
6. Пройти regression smoke:
   - Mark paid / Undo paid,
   - who pays / paid by,
   - templates actions,
   - payments/subscriptions switch,
   - workspace switching,
   - one-time invite,
   - premium/admin surfaces.

## Encoding safety check
Проверены все затронутые файлы с русскоязычным/пользовательским текстом:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase14a2_popover_viewport_fix_onboarding_copy_rewrite_report.md`

Результат:
- UTF-8 сохранен.
- Битой кириллицы/mojibake в измененных участках не обнаружено.
- Дополнительных encoding-правок не потребовалось.

## Pre-report self-check against prompt

1. Поповер больше не должен создавать горизонтальный скролл — **Satisfied (code/report), live device check pending**  
- Внедрен viewport clamp и fixed positioning.

2. Family and single help popover остаются локальными — **Satisfied (code/report), live check pending**  
- Позиционирование рассчитывается от trigger с удержанием внутри viewport.

3. Onboarding copy стал яснее и строже — **Satisfied (code/report)**  
- Текст переписан в action-oriented стиль без лишней многословности.

4. Onboarding mobile scanability сохранена — **Satisfied (code/report), live UX check pending**  
- Шаги компактны, bullets короткие, структура читается быстро.

5. Неверифицированный scope не расширялся — **Satisfied (code/report)**  
- Изменения ограничены popover behavior + onboarding copy.

6. Verified flows preserved — **Satisfied (code/report), live regression pending**  
- Нет изменений в доменной логике core flows.

---

## Короткое объяснение (по-русски)
В 14A.2 исправлено поведение локальных help-popover на мобильных экранах: они теперь рассчитывают позицию по viewport и не должны вызывать горизонтальный скролл страницы. Одновременно переписан онбординг: текст стал короче, строже и более прикладным.

## Ручной чек-лист (по-русски)
1. Проверить `?` popover в Reminders (personal/family) и Profile на узкой ширине экрана.
2. Убедиться, что при открытии поповера нет горизонтального скролла страницы.
3. Пройти onboarding заново и оценить ясность/краткость нового текста.
4. Прогнать короткий regression smoke core flow.

## Git Bash команды (реальный workflow)
```bash
git status
git add src/components/app/help-popover.tsx src/components/app/app-shell.tsx src/lib/i18n/localization.tsx docs/phase14a2_popover_viewport_fix_onboarding_copy_rewrite_report.md
git commit -m "phase14a2: fix popover viewport overflow and rewrite onboarding copy"
git push origin main
```

Примечание: миграции не затрагивались, поэтому `supabase db push` и `supabase migration list` не требуются.

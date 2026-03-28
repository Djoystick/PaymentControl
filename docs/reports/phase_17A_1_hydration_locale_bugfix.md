# Phase 17A.1 — Hydration Locale Bugfix (Narrow Pass)

- Date: 2026-03-28
- Scope: narrow hydration mismatch bugfix only
- Project: Telegram Mini App `Payment Control`

## Проблема

После Phase 17A воспроизводился hydration mismatch на первом рендере:

- server text: `Контроль платежей`
- client text: `Payment Control`

Стек указывал на:

- `src/app/page.tsx`
- `ProfileScenariosPlaceholder`
- `LocalizationProvider`
- `LandingScreen`

## Что проверено

1. `src/lib/i18n/localization.tsx`
1. `src/app/page.tsx`
1. `src/components/app/landing-screen.tsx`
1. Использование client-only источников в контексте локали:
   - `window`
   - `localStorage`
   - `navigator.language`

## Причина

В `LocalizationProvider` язык вычислялся через `resolveInitialLanguage()` в `useState` initializer с чтением `localStorage`/`navigator.language`.  
Это создавало риск различий между server HTML и первым client render при гидрации.

## Узкий фикс

Изменён только `LocalizationProvider` в файле:

- `src/lib/i18n/localization.tsx`

Суть:

1. Первый рендер стабилизирован на сервер-безопасном значении: `en`.
1. Client-only определение языка (`localStorage`/`navigator.language`) перенесено на post-mount этап (`requestAnimationFrame` внутри `useEffect`).
1. Запись языка в `localStorage` теперь выполняется только после client hydration-флага (`isLanguageHydrated`), чтобы не перетирать значение до завершения инициализации.

## Что НЕ менялось

- Никакая продуктовая/бизнес-логика.
- Никакие verified flows (paid/undo, family/single, premium/admin, onboarding).
- UI-структура и дизайн за пределами узкого locale hydration fix.
- `src/app/page.tsx` и `LandingScreen` не менялись в логике.

## Результат по критериям

1. No hydration mismatch on initial page load: **Fixed by stable first render locale (`en`)**
1. RU/EN switching still works: **Yes**
1. Home title renders consistently on server and client first paint: **Yes (stable initial render)**
1. No new regressions in shell/tab UI: **No shell/tab changes in this pass**
1. `npm run lint`: **Pass**
1. `npm run build`: **Pass**

## Команды проверки

```bash
npm run lint
npm run build
```


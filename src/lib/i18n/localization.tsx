"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UiLanguage = "en" | "ru";

const STORAGE_KEY = "payment_control_ui_language_v12a";

const ruTranslations: Record<string, string> = {
  "Home": "Главная",
  "Reminders": "Напоминания",
  "History": "История",
  "Profile": "Профиль",
  "Telegram Mini App": "Telegram Mini App",
  "Payment Control": "Payment Control",
  "Foundation for recurring payments and household tracking": "Контроль регулярных платежей и семейных расходов",
  "Phase 12A": "Phase 12A",
  "Quick start": "Быстрый старт",
  "Start in Reminders: add a payment, then use Mark paid when done.": "Начните с Напоминаний: добавьте платеж, затем используйте Отметить оплачено.",
  "Welcome to Payment Control": "Добро пожаловать в Payment Control",
  "Home gives a compact snapshot of what needs attention today.": "На Главной коротко показано, что важно сегодня.",
  "Reminders is your main working screen": "Напоминания — ваш основной рабочий экран",
  "Use recurring cards for Mark paid / Undo paid and quick subscription control.": "Используйте карточки регулярных платежей для Отметить оплачено / Отменить и быстрого контроля подписок.",
  "History shows recent updates": "История показывает последние изменения",
  "Use History to quickly review recent shared and personal payment events.": "В Истории удобно смотреть последние личные и семейные события по платежам.",
  "Profile controls workspace context": "Профиль управляет рабочим контекстом",
  "Use Profile to switch workspace, manage family invite and check account context.": "В Профиле можно переключать workspace, работать с приглашениями семьи и проверять контекст аккаунта.",
  "Skip": "Пропустить",
  "Back": "Назад",
  "Next": "Далее",
  "Finish": "Готово",
  "Step {current} of {total}": "Шаг {current} из {total}",

  "Today snapshot": "Срез на сегодня",
  "Keep it simple: Reminders for actions, History for updates.": "Коротко: Напоминания для действий, История для изменений.",
  "First step: open Reminders and add your first payment.": "Первый шаг: откройте Напоминания и добавьте первый платеж.",
  "Runtime status": "Статус окружения",
  "Telegram": "Telegram",
  "Supabase": "Supabase",
  "Stage": "Стадия",
  "Configured": "Настроено",
  "Pending env": "Не настроено (env)",

  "Payment snapshot": "Сводка платежей",
  "Dashboard": "Панель",
  "No payments yet": "Платежей пока нет",
  "Open Reminders and add your first recurring payment.": "Откройте Напоминания и добавьте первый регулярный платеж.",
  "Due today": "К оплате сегодня",
  "Upcoming": "Скоро",
  "Overdue": "Просрочено",
  "Paid": "Оплачено",
  "Unpaid": "Не оплачено",
  "Mismatch": "Несовпадения",
  "Mismatch hints": "Подсказки о несовпадениях",
  "Missing": "Не назначено",
  "Shared": "Семейный",
  "Due": "Срок",
  "Due now details": "Детали по ближайшим платежам",
  "No unpaid payments due today.": "Сегодня нет неоплаченных платежей.",
  "No unpaid payments in upcoming window.": "Нет неоплаченных платежей в ближайшем окне.",
  "No overdue unpaid payments.": "Нет просроченных неоплаченных платежей.",
  "Refresh snapshot": "Обновить сводку",
  "Refresh dashboard": "Обновить панель",
  "Loading snapshot...": "Загрузка сводки...",
  "Loading family overview...": "Загрузка семейной сводки...",
  "Loading dashboard...": "Загрузка панели...",

  "Recurring Payments": "Регулярные платежи",
  "Workspace": "Workspace",
  "No recurring payments yet": "Регулярных платежей пока нет",
  "No shared recurring payments yet": "Семейных регулярных платежей пока нет",
  "Add your first payment below. Reminders and History will update after that.": "Добавьте первый платеж ниже. После этого обновятся Напоминания и История.",
  "Invite is ready. Add your first shared payment below.": "Приглашение готово. Добавьте первый семейный платеж ниже.",
  "Add your first shared payment below. Invite members from Profile when needed.": "Добавьте первый семейный платеж ниже. Участников можно пригласить позже из Профиля.",
  "Open add payment form": "Открыть форму добавления",
  "Shared payment help": "Подсказка по семейным платежам",
  "Shared cards use Who pays for responsibility and Paid by for who marked the cycle paid.": "В семейных карточках Who pays отвечает за ответственность, а Paid by — кто отметил цикл как оплаченный.",
  "Family readiness snapshot": "Срез готовности семьи",
  "Members": "Участники",
  "Invite": "Приглашение",
  "Shared payments": "Семейные платежи",
  "Who pays not assigned": "Who pays не назначен",
  "Household members for who pays": "Участники семьи для Who pays",
  "This household currently has only the owner.": "Сейчас в семье только владелец.",
  "Quick Add templates": "Быстрое добавление шаблонов",
  "Quick Add shared payment templates": "Быстрое добавление семейных шаблонов",
  "Subscription insights - active {active}, unpaid {unpaid}": "Сводка подписок — активных {active}, неоплаченных {unpaid}",
  "Edit payment": "Редактировать платеж",
  "Add payment": "Добавить платеж",
  "Payment title": "Название платежа",
  "Amount": "Сумма",
  "Currency (USD)": "Валюта (USD)",
  "Category": "Категория",
  "Who pays (responsible payer)": "Who pays (ответственный плательщик)",
  "Who pays": "Who pays",
  "Who pays assigned": "Who pays назначено",
  "Not assigned yet": "Пока не назначен",
  "Not captured": "Не зафиксировано",
  "Monthly": "Ежемесячно",
  "Weekly": "Еженедельно",
  "Due weekday (1-7)": "День недели (1-7)",
  "Due day (1-31)": "День месяца (1-31)",
  "Required payment": "Обязательный платеж",
  "Mark as subscription": "Отметить как подписку",
  "Reminders enabled": "Напоминания включены",
  "Remind 0 days before": "Напомнить за 0 дней",
  "Remind 1 day before": "Напомнить за 1 день",
  "Remind 3 days before": "Напомнить за 3 дня",
  "Remind on due day": "Напомнить в день оплаты",
  "Remind if overdue": "Напомнить при просрочке",
  "Notes (optional)": "Заметки (необязательно)",
  "Save changes": "Сохранить",
  "Cancel edit": "Отменить редактирование",
  "Refresh section": "Обновить раздел",
  "Clear form": "Очистить форму",
  "Show all payments": "Показать все платежи",
  "Show subscriptions only": "Только подписки",
  "Visible": "Видно",
  "Total": "Всего",
  "Loading payments...": "Загрузка платежей...",
  "Payments list is empty for now.": "Список платежей пока пуст.",
  "No paused subscriptions found for the current filter.": "Нет приостановленных подписок для текущего фильтра.",
  "No subscription payments found for the current filter.": "Нет подписок для текущего фильтра.",
  "Family shared": "Семейный",
  "Personal": "Личный",
  "Subscription": "Подписка",
  "Paused": "Приостановлено",
  "Current cycle": "Текущий цикл",
  "Paid by": "Оплатил",
  "Reminder settings": "Настройки напоминаний",
  "On": "Вкл",
  "Off": "Выкл",
  "Edit": "Редактировать",
  "Archive": "Архив",
  "Undo paid": "Отменить оплату",
  "Mark paid": "Отметить оплачено",
  "Economics hint": "Экономическая подсказка",
  "Another member": "Другой участник",
  "another member": "другой участник",
  "paid while responsibility is on": "оплатил, а ответственность назначена на",
  "Resume": "Возобновить",
  "Pause": "Пауза",

  "Reminder Visibility": "Видимость напоминаний",
  "Reminder Candidates": "Кандидаты напоминаний",
  "No reminders yet": "Напоминаний пока нет",
  "Add your first recurring payment above. Reminders will appear here when due.": "Добавьте первый регулярный платеж выше. Напоминания появятся здесь, когда наступит срок.",
  "Delivery Readiness": "Готовность доставки",
  "Bot configured": "Бот настроен",
  "Recipient resolved": "Получатель определен",
  "Delivery ready": "Доставка готова",
  "Status": "Статус",
  "Diagnostics and dispatch observation": "Диагностика и наблюдение за отправкой",
  "Scheduled dispatch observation": "Наблюдение за scheduled dispatch",
  "This is an operational snapshot only. Long-horizon cron health still requires repeated production checks over time.": "Это только операционный срез. Долгосрочное здоровье cron нужно проверять повторно в production во времени.",
  "Telegram onboarding help": "Подсказка по Telegram onboarding",
  "Open Telegram bot": "Открыть Telegram-бота",
  "Recipient binding verification": "Проверка привязки получателя",
  "Telegram private chat id": "Telegram private chat id",
  "Verify binding": "Проверить привязку",
  "Evaluation date": "Дата оценки",
  "No reminder candidates right now.": "Сейчас нет кандидатов на напоминания.",
  "Refresh candidates": "Обновить кандидатов",
  "Refresh delivery status": "Обновить статус доставки",
  "Run dispatch": "Запустить dispatch",
  "Send test message": "Отправить тест",
  "Loading reminders...": "Загрузка напоминаний...",
  "Loading readiness...": "Загрузка readiness...",
  "Dispatching reminders...": "Отправка напоминаний...",
  "Sending test message...": "Отправка теста...",
  "Verifying binding...": "Проверка привязки...",
  "Last dispatch result": "Результат последнего dispatch",
  "Dispatch result": "Результат dispatch",
  "Last test send": "Последний тест",
  "Last binding verify": "Последняя проверка привязки",
  "Recent attempts": "Последние попытки",
  "Auto-refreshed by `Refresh delivery status`.": "Автообновляется через `Обновить статус доставки`.",
  "Source": "Источник",

  "In scope": "В охвате",
  "Recent events": "Последние события",
  "Family activity context": "Семейный контекст активности",
  "History is empty": "История пока пустая",
  "Add your first payment in Reminders. Events will appear here after updates.": "Добавьте первый платеж в Напоминаниях. После изменений события появятся здесь.",
  "Add the first shared payment in Reminders. Events will appear here after updates.": "Добавьте первый семейный платеж в Напоминаниях. После изменений события появятся здесь.",
  "No recent updates yet": "Пока нет недавних изменений",
  "Mark paid or edit a payment in Reminders to populate History.": "Отметьте платеж как оплаченный или измените его в Напоминаниях, чтобы заполнить Историю.",
  "Created": "Создан",
  "Updated": "Обновлен",
  "Archived": "Архивирован",
  "Marked paid": "Отмечен как оплаченный",
  "Refresh activity": "Обновить историю",
  "Refresh family section": "Обновить семейный раздел",
  "Loading activity...": "Загрузка истории...",
  "Loading family activity...": "Загрузка семейной истории...",

  "Session": "Сессия",
  "Telegram verified": "Telegram подтвержден",
  "Dev fallback": "Dev fallback",
  "Not identified": "Не определено",
  "Loading current app context...": "Загрузка текущего контекста...",
  "Show onboarding again": "Показать onboarding снова",
  "Onboarding verification notes": "Заметки проверки onboarding",
  "Local onboarding flag": "Локальный флаг onboarding",
  "unknown (storage unavailable)": "неизвестно (storage недоступен)",
  "completed": "завершен",
  "not completed": "не завершен",
  "Show onboarding again is replay-only. It does not prove true first-run behavior.": "Show onboarding again — это только replay-путь. Он не доказывает true first-run поведение.",
  "True first-run check requires a clean Telegram profile/device storage state and first open of Mini App.": "Проверка true first-run требует чистого состояния профиля/устройства и первого открытия Mini App.",
  "Workspace state": "Состояние workspace",
  "No active workspace resolved yet.": "Активный workspace пока не определен.",
  "Workspace switch": "Переключение workspace",
  "Current": "Текущий",
  "Switch": "Переключить",
  "Family invite": "Семейное приглашение",
  "Create invite": "Создать приглашение",
  "Current invite for {workspace}": "Текущее приглашение для {workspace}",
  "Invite token": "Токен приглашения",
  "Expires": "Истекает",
  "Created at": "Создано",
  "No active invite for this family workspace yet. Create one when you are ready to invite a member.": "Для этого семейного workspace пока нет активного приглашения. Создайте его, когда будете готовы пригласить участника.",
  "Family workspace (optional)": "Семейный workspace (опционально)",
  "Create family workspace or join by invite token.": "Создайте семейный workspace или присоединитесь по invite token.",
  "Workspace persistence is not initialized yet. Apply workspace migrations to enable family workspace creation.": "Persistence для workspace еще не инициализирован. Примените миграции workspace, чтобы включить создание семейного workspace.",
  "Family workspace title": "Название семейного workspace",
  "Create family workspace": "Создать семейный workspace",
  "Join by invite token": "Присоединиться по invite token",
  "Paste family invite token": "Вставьте токен семейного приглашения",
  "Preview": "Предпросмотр",
  "empty": "пусто",
  "Normalized": "Нормализовано",
  "not detected": "не определено",
  "Accept invite": "Принять приглашение",
  "Accept invite diagnostic": "Диагностика принятия приглашения",
  "Accept invite: SUCCESS": "Принятие приглашения: УСПЕХ",
  "Accept invite: FAILED": "Принятие приглашения: ОШИБКА",
  "Code": "Код",
  "Attempted": "Попытка",
  "Raw token": "Сырой токен",
  "Joined workspace": "Присоединенный workspace",
  "Workspace list updated": "Список workspace обновлен",
  "Household members": "Участники семьи",
  "Refresh context": "Обновить контекст",
  "Scenario cards": "Сценарии",
  "Scenario cards (informational)": "Сценарии (информационно)",
  "Cards below are informational in this phase. To change active context, use Workspace switch above.": "Карточки ниже информационные. Чтобы сменить активный контекст, используйте переключение workspace выше.",
  "Active context": "Активный контекст",
  "Not active": "Неактивно",

  "Language": "Язык",
  "Russian": "Русский",
  "English": "English",
  "Active": "Активно",
  "Active recipient source": "Активный источник получателя",
  "Active unpaid subscription renewals, grouped by currency (no FX conversion).": "Активные неоплаченные продления подписок, сгруппированные по валютам (без конвертации).",
  "Advance": "Заранее",
  "Assigned member is no longer in this family workspace": "Назначенный участник больше не состоит в этом семейном workspace",
  "Binding": "Привязка",
  "Binding diagnostic status": "Статус диагностики привязки",
  "Binding reason": "Причина привязки",
  "Binding verification finished.": "Проверка привязки завершена.",
  "Bot username": "Имя бота",
  "Bot username is not configured in public env. Set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` and restart dev server.": "Имя бота не задано в public env. Укажите `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` и перезапустите dev server.",
  "Check token validity/status with owner and retry. If state looks stale, use Refresh context below.": "Проверьте валидность/статус токена у владельца и повторите попытку. Если состояние выглядит устаревшим, используйте «Обновить контекст».",
  "Controlled reminder dispatch completed.": "Контролируемый dispatch напоминаний завершен.",
  "Current cycle marked as paid.": "Текущий цикл отмечен как оплаченный.",
  "Current cycle marked as unpaid.": "Текущий цикл отмечен как неоплаченный.",
  "Delivery path is healthy for the current recipient.": "Канал доставки для текущего получателя работает корректно.",
  "Diagnostic source": "Источник диагностики",
  "Due today (unpaid)": "К оплате сегодня (неоплачено)",
  "Economics: aligned (responsible payer paid this cycle).": "Экономика: согласовано (ответственный плательщик оплатил текущий цикл).",
  "Failed to archive recurring payment.": "Не удалось архивировать регулярный платеж.",
  "Failed to load dashboard summary.": "Не удалось загрузить сводку панели.",
  "Failed to load delivery readiness.": "Не удалось загрузить readiness доставки.",
  "Failed to load family reminder visibility.": "Не удалось загрузить видимость семейных напоминаний.",
  "Failed to load recent activity.": "Не удалось загрузить недавнюю активность.",
  "Failed to load recurring payments.": "Не удалось загрузить регулярные платежи.",
  "Failed to load reminder candidates.": "Не удалось загрузить кандидатов на напоминания.",
  "Failed to mark current cycle as paid.": "Не удалось отметить текущий цикл как оплаченный.",
  "Failed to mark current cycle as unpaid.": "Не удалось отметить текущий цикл как неоплаченный.",
  "Failed to pause subscription.": "Не удалось поставить подписку на паузу.",
  "Failed to resume subscription.": "Не удалось возобновить подписку.",
  "Failed to run controlled reminder dispatch.": "Не удалось выполнить контролируемый dispatch напоминаний.",
  "Failed to run manual test send.": "Не удалось выполнить ручной тест отправки.",
  "Failed to save recurring payment.": "Не удалось сохранить регулярный платеж.",
  "Failed to verify Telegram recipient binding.": "Не удалось проверить привязку получателя Telegram.",
  "Family reminder visibility": "Видимость семейных напоминаний",
  "Family workspace overview": "Обзор семейного workspace",
  "Focus subscriptions": "Фокус на подписках",
  "Invite status": "Статус приглашения",
  "Last dispatch": "Последний dispatch",
  "Last error": "Последняя ошибка",
  "Last scheduled attempt": "Последняя scheduled попытка",
  "Load current workspace first to manage recurring payments.": "Сначала загрузите текущий workspace, чтобы управлять регулярными платежами.",
  "Load current workspace first to view activity.": "Сначала загрузите текущий workspace, чтобы смотреть активность.",
  "Load current workspace first to view dashboard.": "Сначала загрузите текущий workspace, чтобы смотреть панель.",
  "Load current workspace first to view reminder candidates.": "Сначала загрузите текущий workspace, чтобы смотреть кандидатов на напоминания.",
  "Loading family reminders...": "Загрузка семейных напоминаний...",
  "Loading...": "Загрузка...",
  "Manual test send finished.": "Ручной тест отправки завершен.",
  "Member": "Участник",
  "Member list is temporarily unavailable. Try Refresh.": "Список участников временно недоступен. Нажмите «Обновить».",
  "Monthly savings/load relief (weekly uses 52/12 monthly equivalent, grouped by currency):": "Месячная экономия/разгрузка (для weekly используется эквивалент 52/12, сгруппировано по валютам):",
  "Monthly total (weekly cadence uses 52/12 monthly equivalent):": "Месячный итог (для weekly используется эквивалент 52/12):",
  "Needs attention": "Требует внимания",
  "Next check: family workspace should appear in Workspace switch and household members should no longer be owner-only.": "Следующая проверка: семейный workspace должен появиться в переключении workspace, а состав семьи не должен быть только из owner.",
  "No active subscriptions yet.": "Активных подписок пока нет.",
  "No due-today or overdue unpaid shared payments right now.": "Сейчас нет неоплаченных семейных платежей со сроком на сегодня или просрочкой.",
  "No due-today subscription renewals.": "Нет продлений подписок на сегодня.",
  "No expiry": "Без срока",
  "No immediate subscription issues detected.": "Срочных проблем по подпискам не обнаружено.",
  "No members are visible yet.": "Участники пока не видны.",
  "No overdue subscription renewals.": "Нет просроченных продлений подписок.",
  "No paused subscriptions right now.": "Сейчас нет подписок на паузе.",
  "No scheduled attempts in current snapshot.": "В текущем срезе нет scheduled попыток.",
  "No shared payments yet in this family workspace. Add your first shared payment in the recurring section below.": "В этом семейном workspace пока нет общих платежей. Добавьте первый общий платеж в разделе регулярных платежей ниже.",
  "No upcoming subscription renewals.": "Нет ближайших продлений подписок.",
  "Open this app in Telegram to verify identity, or enable explicit dev fallback for local testing.": "Откройте приложение в Telegram для проверки личности или включите явный dev fallback для локального теста.",
  "Optional": "Необязательно",
  "Optional: enter numeric private chat id to override recipient binding and verify delivery path.": "Опционально: введите числовой private chat id, чтобы переопределить привязку получателя и проверить канал доставки.",
  "Overdue (unpaid)": "Просрочено (неоплачено)",
  "Owner": "Владелец",
  "Paid mismatch hints": "Подсказки по расхождениям оплаты",
  "Paid this cycle.": "Оплачено в текущем цикле.",
  "Paused Subscriptions": "Подписки на паузе",
  "Paused now": "Сейчас на паузе",
  "Payment archived.": "Платеж архивирован.",
  "Personal workspace overview": "Обзор личного workspace",
  "Profile scenario field": "Поле сценария профиля",
  "Reminders off": "Напоминания выключены",
  "Reminders on": "Напоминания включены",
  "Required": "Обязательный",
  "Role": "Роль",
  "Shared payments exist, but reminders are turned off for all of them.": "Общие платежи есть, но напоминания для всех выключены.",
  "Show paused subscriptions": "Показать подписки на паузе",
  "Snapshot": "Срез",
  "Sub": "Подп.",
  "Subscription Cost Pressure": "Нагрузка по стоимости подписок",
  "Subscription Health": "Состояние подписок",
  "Subscription Renewals": "Продления подписок",
  "Subscriptions Summary": "Сводка по подпискам",
  "To receive reminders, open the bot in Telegram and press Start.": "Чтобы получать напоминания, откройте бота в Telegram и нажмите Start.",
  "Type": "Тип",
  "Unpaid cycle": "Неоплаченный цикл",
  "Unpaid this cycle": "Неоплачено в текущем цикле",
  "Verified at": "Проверено",
  "Visibility date": "Дата видимости",
  "Who pays missing": "Who pays не назначен",
  "Workspace persistence is not initialized. Apply workspace migrations first.": "Persistence workspace не инициализирован. Сначала примените миграции workspace.",
  "auto-synced with active workspace where possible": "автосинхронизируется с активным workspace, где это возможно",
  "before": "за",
  "completed with failures": "завершено с ошибками",
  "covered this cycle, while responsibility is on": "оплатил этот цикл, при том что ответственность на",
  "day": "день",
  "due": "срок",
  "due day": "день оплаты",
  "duplicates": "дубликаты",
  "failed": "ошибки",
  "inference": "предположение",
  "new": "новые",
  "no": "нет",
  "none": "нет",
  "not loaded": "не загружено",
  "ok": "ок",
  "overdue": "просрочено",
  "owner": "owner",
  "recent attempts rows": "последних попыток",
  "reminders off": "напоминания выключены",
  "scheduled rows out of": "scheduled строк из",
  "seen": "просмотрено",
  "sent": "отправлено",
  "skipped": "пропущено",
  "success": "успех",
  "error": "ошибка",
  "active": "активно",
  "archived": "архив",
  "paid": "оплачено",
  "unpaid": "не оплачено",
  "unknown": "неизвестно",
  "verified stored chat id (authoritative)": "подтвержденный сохраненный chat id (authoritative)",
  "weekday": "день недели",
  "yes": "да",
  "Accepted": "Принято",
  "Expired": "Истекло",
  "Revoked": "Отозвано",
  "Loading current context...": "Загрузка текущего контекста...",
  "Invite token format is invalid. Paste raw token or invite link from owner.": "Неверный формат invite token. Вставьте сырой токен или ссылку-приглашение от владельца.",
  "single": "одиночный",
  "family": "семейный",
  "personal": "личный",
  "member": "участник",
  "\"I pay alone\"": "\"Я плачу сам\"",
  "\"Family use\"": "\"Семейное использование\"",
  "Single mode": "Режим одного пользователя",
  "Family mode": "Семейный режим",
  "Personal subscription and recurring payment tracking for one user.": "Личный учет подписок и регулярных платежей для одного пользователя.",
  "Shared household expenses with family members and future role support.": "Общие семейные расходы с участниками семьи и будущей поддержкой ролей.",
  "This invite can be used to join this family workspace.": "Это приглашение можно использовать для входа в этот семейный workspace.",
  "This invite was already used.": "Это приглашение уже использовано.",
  "This invite is no longer valid.": "Это приглашение больше недействительно.",
  "This invite was turned off.": "Это приглашение отключено.",
  "Active invite": "Активное приглашение",
  "Invite already used": "Приглашение уже использовано",
  "Invite expired": "Приглашение истекло",
  "Invite revoked": "Приглашение отозвано",
  "No current invite": "Текущего приглашения нет",
  "Manual dispatch": "Ручной dispatch",
  "Manual test send": "Ручной тест отправки",
  "Scheduled dispatch": "Scheduled dispatch",
  "Test send": "Тестовая отправка",
  "SENT": "ОТПРАВЛЕНО",
  "SKIPPED": "ПРОПУЩЕНО",
  "FAILED": "ОШИБКА",

  "Current app context loaded.": "Текущий контекст приложения загружен.",
  "Current context request failed.": "Ошибка запроса текущего контекста.",
  "Scenario updated.": "Сценарий обновлен.",
  "Scenario update failed.": "Не удалось обновить сценарий.",
  "Family workspace title is required.": "Нужно указать название семейного workspace.",
  "Family workspace created.": "Семейный workspace создан.",
  "Family workspace created, but scenario sync failed.": "Семейный workspace создан, но синхронизация сценария не удалась.",
  "Family workspace creation failed.": "Не удалось создать семейный workspace.",
  "Workspace switched.": "Workspace переключен.",
  "Workspace switched, but scenario sync failed.": "Workspace переключен, но синхронизация сценария не удалась.",
  "Workspace switch failed.": "Не удалось переключить workspace.",
  "Family invite created.": "Семейное приглашение создано.",
  "Family invite creation failed.": "Не удалось создать семейное приглашение.",
  "Invite token is required.": "Нужен invite token.",
  "Invite token format is invalid.": "Неверный формат invite token.",
  "Invite accepted and family workspace is now available.": "Приглашение принято, семейный workspace теперь доступен.",
  "Family invite accepted. Workspace list and household should now include this family workspace.": "Семейное приглашение принято. В списке workspace и составе семьи теперь должен появиться этот семейный workspace.",
  "Family invite accepted, but scenario sync failed.": "Семейное приглашение принято, но синхронизация сценария не удалась.",
  "Family invite accept failed.": "Не удалось принять семейное приглашение.",
  "Family invite accept request failed.": "Запрос принятия семейного приглашения завершился ошибкой.",
  "Invite token not found. Check token copy and try again.": "Invite token не найден. Проверьте копию токена и попробуйте снова.",
  "Invite has expired. Ask owner to create a new invite.": "Срок приглашения истек. Попросите владельца создать новое приглашение.",
  "Invite was already used. Ask owner for a new active invite.": "Приглашение уже использовано. Попросите владельца новое активное приглашение.",
  "Invite does not point to a family workspace.": "Приглашение не указывает на семейный workspace.",
  "Invite token is empty or invalid.": "Invite token пустой или недействительный.",
  "Invite may be accepted, but workspace refresh failed. Use Refresh context.": "Приглашение могло быть принято, но обновление workspace не удалось. Используйте Обновить контекст.",
};

type LocalizationContextValue = {
  language: UiLanguage;
  setLanguage: (next: UiLanguage) => void;
  tr: (text: string, params?: Record<string, string | number>) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

const isUiLanguage = (value: string | null): value is UiLanguage => {
  return value === "en" || value === "ru";
};

const resolveInitialLanguage = (): UiLanguage => {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isUiLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read errors.
  }

  const browserLanguage = window.navigator.language?.toLowerCase() ?? "";
  if (browserLanguage.startsWith("ru")) {
    return "ru";
  }

  return "en";
};

const interpolate = (
  text: string,
  params?: Record<string, string | number>,
): string => {
  if (!params) {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(resolveInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage write errors.
    }
  }, [language]);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
  }, []);

  const tr = useCallback(
    (text: string, params?: Record<string, string | number>) => {
      if (language === "ru") {
        return interpolate(ruTranslations[text] ?? text, params);
      }

      return interpolate(text, params);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      tr,
    }),
    [language, setLanguage, tr],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export const useLocalization = (): LocalizationContextValue => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used inside LocalizationProvider");
  }

  return context;
};

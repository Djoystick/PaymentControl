import type { UiLanguage } from "@/lib/i18n/localization";

export type LocalizedText = {
  ru: string;
  en: string;
};

const text = (ru: string, en: string): LocalizedText => ({ ru, en });

export type SubscriptionGuideCategoryId =
  | "app_store_channels"
  | "ecosystem_content_services"
  | "banking_premium_options"
  | "marketplace_memberships"
  | "telecom_mobile_subscriptions"
  | "global_digital_services";

export type SubscriptionGuideCategory = {
  id: SubscriptionGuideCategoryId;
  label: LocalizedText;
};

export const subscriptionGuideCategories: SubscriptionGuideCategory[] = [
  {
    id: "app_store_channels",
    label: text(
      "Каналы оформления (App Store / Google Play)",
      "Purchase channels (App Store / Google Play)",
    ),
  },
  {
    id: "ecosystem_content_services",
    label: text(
      "Экосистемы и контент-сервисы",
      "Ecosystem and content services",
    ),
  },
  {
    id: "banking_premium_options",
    label: text(
      "Банковские premium / подписочные опции",
      "Bank premium and subscription options",
    ),
  },
  {
    id: "marketplace_memberships",
    label: text(
      "Маркетплейс-подписки и retail membership",
      "Marketplace subscriptions and retail memberships",
    ),
  },
  {
    id: "telecom_mobile_subscriptions",
    label: text("Мобильные и телеком-подписки", "Mobile and telecom subscriptions"),
  },
  {
    id: "global_digital_services",
    label: text("Глобальные digital-сервисы", "Global digital services"),
  },
];

export type SubscriptionGuideChannelId =
  | "website"
  | "mobile_app"
  | "personal_account"
  | "bank_app"
  | "operator_account"
  | "app_store"
  | "google_play"
  | "partner_billing";

const guideChannelLabels: Record<SubscriptionGuideChannelId, LocalizedText> = {
  website: text("Сайт", "Website"),
  mobile_app: text("Приложение", "Mobile app"),
  personal_account: text("Личный кабинет", "Personal account"),
  bank_app: text("Банковское приложение / кабинет", "Bank app/account"),
  operator_account: text("Кабинет оператора", "Operator account"),
  app_store: text("App Store", "App Store"),
  google_play: text("Google Play", "Google Play"),
  partner_billing: text("Партнёрский канал оплаты", "Partner billing channel"),
};

export type SubscriptionGuideSource = {
  label: LocalizedText;
  url: string;
};

const source = (ruLabel: string, enLabel: string, url: string): SubscriptionGuideSource => ({
  label: text(ruLabel, enLabel),
  url,
});

export type SubscriptionGuide = {
  id: string;
  displayName: LocalizedText;
  categoryId: SubscriptionGuideCategoryId;
  cancellationScope: LocalizedText;
  shortDescription: LocalizedText;
  verifiedOn: string;
  cancellationChannels: SubscriptionGuideChannelId[];
  officialSources: SubscriptionGuideSource[];
  steps: LocalizedText[];
  confirmationChecks: LocalizedText[];
  notes: LocalizedText[];
  appStoreGooglePlayNote?: LocalizedText;
  supportContactNote?: LocalizedText;
  keywords: string[];
  aliases: string[];
  priority: number;
  featured: boolean;
};

export type SubscriptionGuideCategoryFilter = SubscriptionGuideCategoryId | "all";

const VERIFIED_ON = "2026-04-07";
const VERIFIED_ON_30T = "2026-04-08";

const APPLE_CANCEL_SOURCE = source(
  "Apple Support: отмена подписки",
  "Apple Support: cancel a subscription",
  "https://support.apple.com/en-in/118428",
);

const GOOGLE_PLAY_CANCEL_SOURCE = source(
  "Google Play Help: отмена подписки",
  "Google Play Help: cancel subscription",
  "https://support.google.com/googleplay/answer/7018481?hl=ru",
);

const YANDEX_PLUS_SOURCE = source(
  "Яндекс Плюс: Отмена мультиподписки",
  "Yandex Plus: cancel multisubscription",
  "https://yandex.ru/support/plus-ru/ru/manage/unsubscribe",
);

const VTB_OPERATION_ALERTS_SOURCE = source(
  "ВТБ: Уведомления об операциях (как отключить)",
  "VTB: operation alerts (how to disable)",
  "https://www.vtb.ru/personal/online-servisy/sms-opovesheniya/",
);

const N26_PREMIUM_CANCEL_SOURCE = source(
  "N26 Support: How to cancel my N26 premium membership",
  "N26 Support: How to cancel my N26 premium membership",
  "https://support.n26.com/en-eu/memberships-and-account-types/premium-accounts/how-to-cancel-my-n26-premium-membership",
);

const MONZO_PREMIUM_CANCEL_SOURCE = source(
  "Monzo Help: Cancelling Monzo Premium",
  "Monzo Help: Cancelling Monzo Premium",
  "https://monzo.com/help/monzo-premium/premium-cancel/",
);

const MONZO_PLUS_CANCEL_SOURCE = source(
  "Monzo Help: Cancelling Monzo Plus",
  "Monzo Help: Cancelling Monzo Plus",
  "https://monzo.com/help/monzo-plus/plus-cancel",
);

const WALMART_PLUS_MANAGE_SOURCE = source(
  "Walmart Help: Manage Walmart+ Membership",
  "Walmart Help: Manage Walmart+ Membership",
  "https://www.walmart.com/help/article/cancel-walmart/126c9a990a944c3abd8531de52a87440",
);

const INSTACART_PLUS_MANAGE_SOURCE = source(
  "Instacart Help: Manage your Instacart+ membership",
  "Instacart Help: Manage your Instacart+ membership",
  "https://www.instacart.com/help/section/360007797952/4408784716820",
);

const UBER_ONE_CANCEL_SOURCE = source(
  "Uber Help: How do I cancel my Uber One membership?",
  "Uber Help: How do I cancel my Uber One membership?",
  "https://help.uber.com/riders/article/how-do-i-cancel-my-uber-one-membership?nodeId=caae683e-de76-4308-b35d-a515c57fbe45",
);

export const subscriptionCancellationGuidesCatalog: SubscriptionGuide[] = [
  {
    id: "apple-app-store-subscriptions",
    displayName: text("Подписки в App Store", "App Store subscriptions"),
    categoryId: "app_store_channels",
    cancellationScope: text(
      "Отключение автопродления подписок, оформленных через Apple ID.",
      "Disable auto-renewal for subscriptions billed by Apple ID.",
    ),
    shortDescription: text(
      "Официальный путь Apple для отмены подписок с iPhone, iPad, Mac и через веб.",
      "Official Apple flow for cancelling subscriptions on device or web.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["app_store", "website"],
    officialSources: [APPLE_CANCEL_SOURCE],
    steps: [
      text("Откройте «Настройки» на iPhone или iPad.", "Open Settings on iPhone or iPad."),
      text("Нажмите на своё имя (Apple Account).", "Tap your Apple Account name."),
      text("Откройте раздел «Подписки».", "Open Subscriptions."),
      text("Выберите нужную подписку из списка активных.", "Select the subscription."),
      text("Нажмите «Cancel Subscription» / «Отменить подписку».", "Tap Cancel Subscription."),
      text("Подтвердите отмену на финальном экране.", "Confirm cancellation."),
    ],
    confirmationChecks: [
      text(
        "В карточке подписки нет кнопки «Отменить», а показана дата окончания.",
        "Cancel button is gone and an expiry date is shown.",
      ),
      text(
        "В Apple Account подписка отображается как отменённая.",
        "Subscription is shown as canceled in Apple account.",
      ),
    ],
    notes: [
      text(
        "Если подписка оформлена через Apple, отключайте её именно в Apple, а не на сайте сервиса.",
        "If billed by Apple, cancel in Apple account, not on the service website.",
      ),
    ],
    keywords: ["app store", "apple", "ios", "apple id", "отмена подписки"],
    aliases: ["подписки apple", "itunes subscriptions", "subscriptions ios"],
    priority: 1,
    featured: true,
  },
  {
    id: "google-play-subscriptions",
    displayName: text("Подписки в Google Play", "Google Play subscriptions"),
    categoryId: "app_store_channels",
    cancellationScope: text(
      "Отключение автопродления подписок, оформленных через Google Play.",
      "Disable auto-renewal for subscriptions billed by Google Play.",
    ),
    shortDescription: text(
      "Официальная инструкция Google Play для отмены и проверки статуса подписки.",
      "Official Google Play flow for cancellation and status verification.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["google_play", "mobile_app", "website"],
    officialSources: [GOOGLE_PLAY_CANCEL_SOURCE],
    steps: [
      text("Откройте Google Play на Android-устройстве.", "Open Google Play on Android."),
      text(
        "Перейдите в «Подписки» (Payments & subscriptions → Subscriptions).",
        "Go to Subscriptions.",
      ),
      text("Выберите подписку, которую хотите отключить.", "Select the target subscription."),
      text("Нажмите «Отменить подписку».", "Tap Cancel subscription."),
      text("Пройдите экраны подтверждения и завершите отмену.", "Finish all confirmation steps."),
    ],
    confirmationChecks: [
      text(
        "В Google Play у подписки указан статус после отмены и нет нового автосписания.",
        "Google Play shows canceled state and no new auto-renew date.",
      ),
      text(
        "Удаление приложения не отменяет подписку: проверяйте именно статус в Google Play.",
        "Uninstalling app does not cancel billing: check subscription status in Google Play.",
      ),
    ],
    notes: [text("Удаление приложения не отменяет подписку автоматически.", "Deleting app does not cancel subscription.")],
    keywords: ["google play", "play market", "android subscription", "подписка google"],
    aliases: ["подписки google play", "gplay subscriptions"],
    priority: 2,
    featured: true,
  },
  {
    id: "yandex-plus",
    displayName: text("Яндекс Плюс", "Yandex Plus"),
    categoryId: "ecosystem_content_services",
    cancellationScope: text(
      "Отключение мультиподписки Яндекс Плюс и её автопродления.",
      "Cancel Yandex Plus multisubscription and disable auto-renewal.",
    ),
    shortDescription: text(
      "Подробная официальная инструкция Яндекса с подтверждением статуса «Отменено».",
      "Detailed official Yandex guide with explicit canceled-status checks.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "personal_account", "partner_billing"],
    officialSources: [YANDEX_PLUS_SOURCE, APPLE_CANCEL_SOURCE, GOOGLE_PLAY_CANCEL_SOURCE],
    steps: [
      text("Откройте личный кабинет Плюса и войдите в нужный Яндекс ID.", "Open Plus account and sign in."),
      text("Прокрутите страницу кабинета до конца.", "Scroll to the bottom of account page."),
      text("Нажмите «Отменить мультиподписку».", "Tap Cancel multisubscription."),
      text("Подтвердите отмену и дойдите до экрана «Вы отменили подписку».", "Complete cancellation confirmation."),
      text("Проверьте статус «Отменено» и дату отключения рядом с подпиской.", "Verify canceled status and end date."),
    ],
    confirmationChecks: [
      text(
        "В кабинете отображается статус «Отменено» и конечная дата действия.",
        "Account shows Canceled status with end date.",
      ),
      text(
        "Новые списания не планируются после даты отключения.",
        "No future billing after the end date.",
      ),
    ],
    notes: [
      text(
        "Удаление приложения или аккаунта без явной отмены подписки не прекращает списания.",
        "Deleting app/account without explicit cancellation does not stop billing.",
      ),
      text("Заморозка Плюса не равна отмене.", "Freezing Plus is not the same as cancellation."),
    ],
    appStoreGooglePlayNote: text(
      "Если Плюс оформлялся через App Store / Google Play / партнёра, отменяйте подписку в соответствующем канале оплаты.",
      "If Plus was purchased via App Store / Google Play / partner, cancel in that billing channel.",
    ),
    supportContactNote: text(
      "Если не удаётся отменить в кабинете, обратитесь в поддержку Плюса.",
      "If cancellation fails in account page, contact Plus support.",
    ),
    keywords: ["яндекс плюс", "plus", "kinopoisk", "кинопоиск", "yandex plus", "отмена мультиподписки"],
    aliases: ["yandex plus", "плюс яндекс"],
    priority: 10,
    featured: true,
  },
  {
    id: "start-online-cinema",
    displayName: text("START", "START"),
    categoryId: "ecosystem_content_services",
    cancellationScope: text("Отключение автопродления подписки START.", "Disable START auto-renewal."),
    shortDescription: text(
      "START публикует путь отмены через веб-кабинет и отдельные каналы iOS/Android.",
      "START provides web cancellation flow and separate iOS/Android routes.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "mobile_app", "app_store", "google_play"],
    officialSources: [
      source("START: Вопросы и ответы", "START FAQ", "https://start.ru/faq"),
      APPLE_CANCEL_SOURCE,
      GOOGLE_PLAY_CANCEL_SOURCE,
    ],
    steps: [
      text("Откройте START и войдите в аккаунт с подпиской.", "Open START and sign in."),
      text("Перейдите в настройки аккаунта и историю платежей.", "Open account settings and payment history."),
      text("Нажмите «Отменить подписку».", "Tap Cancel subscription."),
      text("Выберите причину и отправьте подтверждение.", "Select reason and submit."),
      text("Проверьте, что появилась кнопка «Возобновить подписку».", "Verify Resume option appears."),
    ],
    confirmationChecks: [
      text(
        "Доступ сохраняется до конца оплаченного периода без нового автопродления.",
        "Access remains until paid period end without new renewal.",
      ),
      text(
        "В настройках доступна опция «Возобновить подписку».",
        "Settings show Resume subscription option.",
      ),
    ],
    notes: [
      text(
        "При оформлении через iOS/Android используйте App Store / Google Play путь.",
        "If billed through iOS/Android, use App Store / Google Play flow.",
      ),
    ],
    supportContactNote: text(
      "Для ручной помощи START указывает поддержку: support@start.ru.",
      "START support contact: support@start.ru.",
    ),
    keywords: ["start", "старт", "онлайн-кинотеатр", "отменить подписку start"],
    aliases: ["start subscription", "подписка start"],
    priority: 11,
    featured: true,
  },
  {
    id: "ivi",
    displayName: text("Иви", "Ivi"),
    categoryId: "ecosystem_content_services",
    cancellationScope: text("Отключение автоматического продления Иви.", "Disable Ivi auto-renewal."),
    shortDescription: text(
      "Иви предоставляет общий гайд и платформенные инструкции по отмене продления.",
      "Ivi provides primary and platform-specific cancellation guides.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "mobile_app", "app_store", "google_play", "partner_billing"],
    officialSources: [
      source(
        "Иви: Как отключить автоматическое продление подписки",
        "Ivi: disable auto-renewal",
        "https://ask.ivi.ru/knowledge-bases/10/articles/29931-kak-otklyuchit-avtomaticheskoe-prodlenie-podpiski",
      ),
    ],
    steps: [
      text("Войдите в аккаунт Иви, где активна подписка.", "Sign in to Ivi account."),
      text("Откройте раздел управления подпиской.", "Open subscription management."),
      text("Выберите подписку, которую нужно отключить.", "Select target subscription."),
      text("Пройдите шаги отключения автопродления до финального подтверждения.", "Complete cancellation flow."),
      text("Если подписок несколько, соблюдайте порядок отключения из статьи Иви.", "If multiple subscriptions, follow Ivi order."),
    ],
    confirmationChecks: [
      text("В карточке подписки нет активного автопродления.", "No active auto-renewal in subscription card."),
      text("Для нужной платформы применён корректный канал отмены.", "Correct platform channel was used."),
    ],
    notes: [
      text(
        "Иви даёт отдельные инструкции для Android, iOS, Smart TV, Android TV и сайта.",
        "Ivi provides separate guides for Android, iOS, Smart TV, Android TV, and web.",
      ),
    ],
    supportContactNote: text(
      "Если кнопка отключения недоступна, обратитесь в поддержку Иви через help-портал.",
      "If cancel button is unavailable, contact Ivi support via help portal.",
    ),
    keywords: ["ivi", "иви", "отключить автопродление", "кинотеатр ivi"],
    aliases: ["ivi subscription", "подписка иви"],
    priority: 12,
    featured: true,
  },
  {
    id: "okko",
    displayName: text("Okko", "Okko"),
    categoryId: "ecosystem_content_services",
    cancellationScope: text("Отключение автопродления подписки Okko.", "Disable Okko auto-renewal."),
    shortDescription: text(
      "Официальная страница Okko с шагами для сайта/приложения и мобильных устройств.",
      "Official Okko page with steps for web/app and mobile devices.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "mobile_app", "personal_account"],
    officialSources: [source("Okko Help: Как отменить подписку", "Okko Help: cancel subscription", "https://help.okko.tv/subs/cancel")],
    steps: [
      text("Откройте Okko и перейдите в настройки профиля.", "Open Okko and profile settings."),
      text("Откройте «Подписки» или «Мои подписки».", "Open Subscriptions or My subscriptions."),
      text("Выберите активную подписку.", "Select active subscription."),
      text("Нажмите «Отменить» или «Отключить автопродление».", "Tap Cancel or Disable auto-renewal."),
      text("Подтвердите действие на финальном шаге.", "Confirm cancellation."),
    ],
    confirmationChecks: [
      text("В подписке отображается отключённое автопродление.", "Subscription shows auto-renewal disabled."),
      text("Списание не запланировано на следующий период.", "No next-period charge is scheduled."),
    ],
    notes: [
      text(
        "Управление подпиской выполняется в профиле Okko, удаление приложения не отменяет продление.",
        "Manage subscription in Okko profile; deleting app does not cancel renewal.",
      ),
    ],
    supportContactNote: text(
      "Если отмена не сработала, Okko рекомендует обратиться в чат на сайте.",
      "If cancellation fails, Okko recommends using site chat support.",
    ),
    keywords: ["okko", "окко", "отключить подписку okko", "автопродление okko"],
    aliases: ["okko subscription", "okko tv"],
    priority: 13,
    featured: true,
  },
  {
    id: "kion",
    displayName: text("KION", "KION"),
    categoryId: "ecosystem_content_services",
    cancellationScope: text("Отключение подписки KION и автопродления.", "Cancel KION subscription and auto-renewal."),
    shortDescription: text(
      "Управление подпиской находится в официальной справке и личном кабинете KION.",
      "Subscription management is documented in official KION help and account.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "mobile_app", "personal_account"],
    officialSources: [source("KION: Справка и поддержка", "KION Help and support", "https://kion.ru/page/faq")],
    steps: [
      text("Войдите в KION под аккаунтом, где оформлена подписка.", "Sign in to KION with billed account."),
      text("Откройте раздел управления подпиской в профиле.", "Open subscription management in profile."),
      text("Выберите активную подписку KION.", "Select active KION subscription."),
      text("Нажмите отключение автопродления и подтвердите действие.", "Disable auto-renewal and confirm."),
      text("Проверьте статус подписки в личном кабинете.", "Verify status in account page."),
    ],
    confirmationChecks: [
      text("Подписка отображается без следующего автосписания.", "No next auto-charge is shown."),
      text("Доступ сохраняется до конца оплаченного периода.", "Access remains until end of paid period."),
    ],
    notes: [
      text(
        "Если KION подключён как часть другой подписки, отмена может выполняться в исходном сервисе оплаты.",
        "If KION is part of another bundle, cancellation may happen in original billing service.",
      ),
    ],
    keywords: ["kion", "кион", "mts media", "отключить подписку kion"],
    aliases: ["kion subscription", "подписка кион"],
    priority: 14,
    featured: false,
  },
  {
    id: "ozon-premium",
    displayName: text("Ozon Premium", "Ozon Premium"),
    categoryId: "marketplace_memberships",
    cancellationScope: text("Отключение автопродления Ozon Premium.", "Disable Ozon Premium auto-renewal."),
    shortDescription: text(
      "В официальной справке Ozon указано, что продление отключается в личном кабинете Premium.",
      "Ozon docs state renewal can be disabled in Premium account section.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "mobile_app", "personal_account"],
    officialSources: [source("Ozon Docs: Ozon Premium", "Ozon Docs: Ozon Premium", "https://docs.ozon.ru/common/ozon-premium/")],
    steps: [
      text("Откройте Ozon и войдите в нужный аккаунт.", "Open Ozon and sign in."),
      text("Перейдите в раздел Ozon Premium в профиле.", "Open Ozon Premium section."),
      text("Откройте управление подпиской.", "Open subscription management."),
      text("Отключите автопродление подписки.", "Disable subscription auto-renewal."),
      text("Проверьте, что следующая дата списания не активна.", "Verify next billing is not active."),
    ],
    confirmationChecks: [
      text("В кабинете Premium отображается отключённое продление.", "Premium account shows renewal disabled."),
      text("Доступ к преимуществам сохраняется до конца периода.", "Benefits remain until current period ends."),
    ],
    notes: [
      text(
        "Официальная документация указывает управление продлением через раздел Premium личного кабинета.",
        "Official docs place renewal controls in Premium account section.",
      ),
    ],
    keywords: ["ozon premium", "озон премиум", "marketplace subscription"],
    aliases: ["ozon membership", "подписка ozon"],
    priority: 20,
    featured: true,
  },
  {
    id: "x5-paket",
    displayName: text("X5 «Пакет»", "X5 Paket"),
    categoryId: "marketplace_memberships",
    cancellationScope: text("Отключение автопродления сервиса «Пакет».", "Disable X5 Paket auto-renewal."),
    shortDescription: text(
      "Условия X5 описывают отказ от автопродления и прекращение доступа в конце периода.",
      "X5 terms describe opt-out from auto-renewal and access ending after current period.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "personal_account", "partner_billing"],
    officialSources: [source("X5 Пакет: Пользовательское соглашение", "X5 Paket: Terms of use", "https://x5paket.ru/docs/terms_of_use.pdf")],
    steps: [
      text("Откройте личный кабинет сервиса «Пакет» от X5.", "Open X5 Paket personal account."),
      text("Перейдите к управлению текущим тарифом подписки.", "Open current subscription controls."),
      text("Отключите автопродление подписки.", "Disable auto-renewal."),
      text("Подтвердите действие в интерфейсе кабинета.", "Confirm cancellation."),
      text("Проверьте дату окончания текущего периода.", "Verify current period end date."),
    ],
    confirmationChecks: [
      text("В кабинете нет активного автопродления на следующий период.", "No active auto-renewal for next period."),
      text("Доступ закрывается в конце текущего расчётного периода.", "Access ends at the end of current billing period."),
    ],
    notes: [
      text(
        "Если подписка приобретена через партнёра, отключение может выполняться на стороне партнёра.",
        "If purchased via partner, cancellation may be managed on partner platform.",
      ),
    ],
    keywords: ["x5 пакет", "x5paket", "перекресток", "пятерочка", "retail membership"],
    aliases: ["пакет x5", "x5 membership"],
    priority: 21,
    featured: true,
  },
  {
    id: "walmart-plus",
    displayName: text("Walmart+", "Walmart+"),
    categoryId: "marketplace_memberships",
    cancellationScope: text(
      "Отключение членства Walmart+ и его автопродления.",
      "Cancel Walmart+ membership and disable auto-renewal.",
    ),
    shortDescription: text(
      "Официальная страница Walmart показывает отдельные шаги для отмены членства.",
      "Official Walmart page includes explicit steps for membership cancellation.",
    ),
    verifiedOn: VERIFIED_ON_30T,
    cancellationChannels: ["website", "mobile_app", "personal_account"],
    officialSources: [WALMART_PLUS_MANAGE_SOURCE],
    steps: [
      text("Откройте walmart.com и войдите в свой аккаунт.", "Open walmart.com and sign in."),
      text("Перейдите в раздел Account.", "Go to Account."),
      text("Откройте Walmart+ и нажмите Manage membership.", "Open Walmart+ and tap Manage membership."),
      text("Нажмите Manage рядом с Walmart+ plan.", "Select Manage next to Walmart+ plan."),
      text("Выберите Cancel рядом с Cancel membership.", "Select Cancel next to Cancel membership."),
      text("Подтвердите Confirm cancellation на финальном экране.", "Confirm cancellation on the final screen."),
    ],
    confirmationChecks: [
      text(
        "В членстве больше не отображается активное автопродление Walmart+.",
        "Walmart+ no longer shows active auto-renewal.",
      ),
      text(
        "В аккаунте указан статус после отмены, а новая дата списания не назначена.",
        "Account shows post-cancel status with no next renewal charge date.",
      ),
    ],
    notes: [
      text(
        "Walmart может предлагать промежуточный вариант (exclusive offer) перед финальным подтверждением.",
        "Walmart may show an exclusive offer step before final confirmation.",
      ),
    ],
    keywords: ["walmart+", "walmart plus", "cancel walmart plus", "marketplace membership"],
    aliases: ["walmart membership", "подписка walmart+"],
    priority: 22,
    featured: false,
  },
  {
    id: "instacart-plus",
    displayName: text("Instacart+", "Instacart+"),
    categoryId: "marketplace_memberships",
    cancellationScope: text(
      "Отключение Instacart+ и автопродления подписки.",
      "Cancel Instacart+ and stop membership auto-renewal.",
    ),
    shortDescription: text(
      "Instacart даёт официальный путь отмены через настройки аккаунта и раздел Instacart+.",
      "Instacart provides an official cancellation path in account settings under Instacart+.",
    ),
    verifiedOn: VERIFIED_ON_30T,
    cancellationChannels: ["website", "mobile_app", "personal_account"],
    officialSources: [INSTACART_PLUS_MANAGE_SOURCE],
    steps: [
      text("Откройте Instacart и войдите в аккаунт с активной подпиской.", "Open Instacart and sign in."),
      text("Перейдите в Account settings.", "Go to Account settings."),
      text("Откройте раздел Instacart+ membership.", "Open Instacart+ membership section."),
      text("Нажмите End membership / Cancel membership.", "Select End membership or Cancel membership."),
      text("Подтвердите отмену на финальном экране.", "Confirm cancellation on final screen."),
      text("Проверьте дату окончания текущего периода в разделе членства.", "Verify period-end date in membership section."),
    ],
    confirmationChecks: [
      text(
        "В аккаунте Instacart+ отображается дата окончания без нового автосписания.",
        "Instacart+ shows an end date and no next renewal charge.",
      ),
      text(
        "После отмены в настройках доступна только реактивация/повторное подключение.",
        "After cancellation, settings show reactivation path instead of active renewal.",
      ),
    ],
    notes: [
      text(
        "Если отменить пробный период, льготы могут завершиться сразу по правилам Instacart.",
        "If trial is canceled, benefits may end immediately under Instacart terms.",
      ),
    ],
    keywords: ["instacart+", "instacart plus", "cancel instacart plus", "grocery membership"],
    aliases: ["instacart membership", "подписка instacart+"],
    priority: 23,
    featured: false,
  },
  {
    id: "uber-one",
    displayName: text("Uber One", "Uber One"),
    categoryId: "marketplace_memberships",
    cancellationScope: text(
      "Отключение Uber One для заказов поездок и доставки.",
      "Cancel Uber One for ride and delivery benefits.",
    ),
    shortDescription: text(
      "Официальная помощь Uber даёт конкретные шаги отмены в приложении.",
      "Uber official help provides concrete in-app cancellation steps.",
    ),
    verifiedOn: VERIFIED_ON_30T,
    cancellationChannels: ["mobile_app", "website", "partner_billing"],
    officialSources: [UBER_ONE_CANCEL_SOURCE],
    steps: [
      text("Откройте приложение Uber и нажмите иконку профиля.", "Open Uber app and tap profile icon."),
      text("Откройте раздел Uber One.", "Open Uber One section."),
      text("Прокрутите вниз и нажмите Manage Membership.", "Scroll and select Manage Membership."),
      text("Нажмите End Membership.", "Select End Membership."),
      text("Подтвердите End Membership ещё раз для завершения отмены.", "Confirm End Membership again."),
      text("Проверьте, что в Uber One больше нет активного продления.", "Verify Uber One no longer shows active renewal."),
    ],
    confirmationChecks: [
      text(
        "В Uber One отображается завершение подписки без следующего автосписания.",
        "Uber One shows canceled state without next auto-renewal charge.",
      ),
      text(
        "Если был trial, привилегии прекращаются сразу после отмены.",
        "If on trial, benefits end immediately after cancellation.",
      ),
    ],
    notes: [
      text(
        "При отмене менее чем за сутки до даты продления возможен charge с последующим авто-возвратом.",
        "If canceled less than 24 hours before renewal, a charge may appear and auto-refund later.",
      ),
    ],
    keywords: ["uber one", "uber one cancel", "подписка uber one", "delivery membership"],
    aliases: ["uber membership", "uber one подписка"],
    priority: 24,
    featured: false,
  },
  {
    id: "t-pro",
    displayName: text("T‑Pro", "T‑Pro"),
    categoryId: "banking_premium_options",
    cancellationScope: text("Отмена продления подписки Pro в Т‑Банке.", "Cancel Pro subscription renewal in T‑Bank."),
    shortDescription: text(
      "В официальной помощи Т‑Банка описаны шаги отключения в приложении и личном кабинете.",
      "Official T‑Bank help provides cancellation steps in app and web account.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["bank_app", "personal_account", "mobile_app"],
    officialSources: [
      source(
        "Т‑Банк Help: управление подпиской Pro",
        "T‑Bank Help: Pro subscription control",
        "https://www.tbank.ru/bank/help/general/pro/pro-subscription/control/",
      ),
    ],
    steps: [
      text("В приложении Т‑Банка нажмите на своё имя.", "In T‑Bank app, tap your profile name."),
      text("Откройте блок Pro и нажмите иконку шестерёнки.", "Open Pro block and tap settings icon."),
      text("Выберите «Отключить Pro».", "Choose Disable Pro."),
      text("В веб-кабинете: имя → Pro → «Настройки подписки» → «Изменить».", "In web account: profile → Pro → settings → Edit."),
      text("Подтвердите «Отменить продление».", "Confirm Cancel renewal."),
    ],
    confirmationChecks: [
      text("Продление отключено, преимущества действуют до конца оплаченного периода.", "Renewal canceled, benefits remain until period end."),
      text("Новая дата следующего списания не формируется.", "No next renewal billing date is shown."),
    ],
    notes: [text("Официальный гайд показывает отдельный путь для приложения и web.", "Official guide has separate app and web flows.")],
    keywords: ["t pro", "тинькофф про", "tbank pro", "отменить pro"],
    aliases: ["tinkoff pro", "подписка pro tbank"],
    priority: 30,
    featured: true,
  },
  {
    id: "t-premium",
    displayName: text("T‑Premium", "T‑Premium"),
    categoryId: "banking_premium_options",
    cancellationScope: text("Отключение сервиса Premium в Т‑Банке.", "Disable Premium service in T‑Bank."),
    shortDescription: text(
      "Официальные условия Т‑Банка описывают отключение Premium в приложении и через чат в веб-кабинете.",
      "T‑Bank official terms describe Premium cancellation in app and web chat path.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["bank_app", "personal_account"],
    officialSources: [
      source(
        "Т‑Банк Help: условия сервиса Premium",
        "T‑Bank Help: Premium service terms",
        "https://www.tbank.ru/bank/help/general/premium/access/terms/",
      ),
    ],
    steps: [
      text("В приложении Т‑Банка нажмите на своё имя.", "In T‑Bank app, tap your profile name."),
      text("Откройте блок Premium и нажмите иконку шестерёнки.", "Open Premium block and tap settings icon."),
      text("Выберите «Отключить Premium».", "Select Disable Premium."),
      text("Подтвердите отключение на финальном шаге.", "Confirm cancellation."),
      text("Если используете web-кабинет, отключите через чат поддержки.", "If using web account, use support chat for cancellation."),
    ],
    confirmationChecks: [
      text("В Premium нет активного продления/списания на следующий период.", "No active Premium renewal/billing for next period."),
      text("Статус в профиле соответствует отключённому сервису.", "Profile status reflects canceled Premium service."),
    ],
    notes: [text("Для web-кабинета Т‑Банк указывает путь через чат поддержки.", "For web account, T‑Bank indicates support-chat route.")],
    keywords: ["t premium", "тинькофф премиум", "tbank premium", "отключить premium"],
    aliases: ["tinkoff premium", "подписка premium tbank"],
    priority: 31,
    featured: true,
  },
  {
    id: "tbank-partner-subscriptions",
    displayName: text("Подписки партнёров в Т‑Банке", "T‑Bank partner subscriptions"),
    categoryId: "banking_premium_options",
    cancellationScope: text(
      "Отключение партнёрских подписок в экосистеме Т‑Банка.",
      "Disable partner subscriptions managed in T‑Bank ecosystem.",
    ),
    shortDescription: text(
      "Официальная страница Т‑Банка показывает путь отключения через настройки подписки.",
      "Official T‑Bank page shows cancellation path via subscription settings.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["bank_app", "personal_account"],
    officialSources: [
      source(
        "Т‑Банк: как работают подписки партнёров",
        "T‑Bank: partner subscriptions",
        "https://www.tbank.ru/pro/help/mybook-subscription/",
      ),
    ],
    steps: [
      text("Откройте приложение Т‑Банка и выберите нужную подписку.", "Open T‑Bank app and select subscription."),
      text("Нажмите иконку шестерёнки в правом верхнем углу.", "Tap settings icon in top-right corner."),
      text("Выберите «Отключить».", "Choose Disable."),
      text("В web-кабинете: профиль → Pro/Premium → «Настройки подписки».", "In web account: profile → Pro/Premium → subscription settings."),
      text("Нажмите «Изменить» и подтвердите отключение.", "Tap Edit and confirm cancellation."),
    ],
    confirmationChecks: [
      text("В настройках видно, что продление отключено.", "Settings show renewal disabled."),
      text("Следующее списание не запланировано.", "No next charge is scheduled."),
    ],
    notes: [
      text(
        "Для телефона и компьютера в web-кабинете путь может отличаться.",
        "Web path can differ between phone and desktop layouts.",
      ),
    ],
    keywords: ["тбанк подписки", "партнерские подписки tbank", "mybook subscription"],
    aliases: ["tbank subscriptions", "partner subscriptions tbank"],
    priority: 32,
    featured: false,
  },
  {
    id: "sberprime",
    displayName: text("СберПрайм", "SberPrime"),
    categoryId: "banking_premium_options",
    cancellationScope: text("Отключение подписки СберПрайм и её продления.", "Cancel SberPrime subscription and renewal."),
    shortDescription: text(
      "Официальная статья Звук описывает базовый путь через сайт СберПрайм и варианты по каналу подключения.",
      "Official Zvuk article describes SberPrime site flow and channel-dependent variants.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "personal_account", "partner_billing", "operator_account"],
    officialSources: [source("Звук Help: Отключение подписки (СберПрайм)", "Zvuk Help: subscription cancellation (SberPrime)", "https://help.zvuk.com/article/42230")],
    steps: [
      text("Определите канал подключения: сайт СберПрайм, оператор, промокод или SberDevice.", "Identify activation channel: SberPrime site, operator, promo, or SberDevice."),
      text("Для базового СберПрайм авторизуйтесь на сайте СберПрайм.", "For standard SberPrime, sign in on SberPrime website."),
      text("Перейдите в личный кабинет → «Управлять подпиской».", "Open personal account → Manage subscription."),
      text("Нажмите «Выйти из подписки».", "Tap Leave subscription."),
      text("Для операторского/партнёрского канала отменяйте подписку в соответствующем кабинете.", "For operator/partner channel, cancel in that billing account."),
    ],
    confirmationChecks: [
      text("В канале подключения продление отключено и нет нового списания.", "Billing channel shows renewal disabled with no next charge."),
      text("Применён путь отмены из официальной статьи «Отключение подписки».", "Cancellation path from official article was applied."),
    ],
    notes: [text("Статья отдельно выделяет сценарии для оператора, промокода и SberDevice.", "Article separately covers operator, promo, and SberDevice scenarios.")],
    supportContactNote: text("При трудностях статья рекомендует обратиться в поддержку Звук.", "When cancellation is difficult, the article recommends contacting Zvuk support."),
    keywords: ["сберпрайм", "sberprime", "отключить сберпрайм", "звук подписка"],
    aliases: ["sber prime", "подписка сбер"],
    priority: 33,
    featured: false,
  },
  {
    id: "vtb-operation-alerts",
    displayName: text("ВТБ: уведомления об операциях", "VTB: operation alerts"),
    categoryId: "banking_premium_options",
    cancellationScope: text(
      "Отключение платной опции уведомлений об операциях в ВТБ Онлайн.",
      "Disable paid operation alerts option in VTB Online.",
    ),
    shortDescription: text(
      "Официальная инструкция ВТБ описывает путь отключения уведомлений через профиль в ВТБ Онлайн.",
      "Official VTB guide describes turning alerts off via profile in VTB Online.",
    ),
    verifiedOn: VERIFIED_ON_30T,
    cancellationChannels: ["bank_app", "mobile_app", "personal_account"],
    officialSources: [VTB_OPERATION_ALERTS_SOURCE],
    steps: [
      text("Войдите в ВТБ Онлайн под нужным профилем.", "Sign in to VTB Online with your profile."),
      text("Нажмите на иконку профиля в левом верхнем углу.", "Tap profile icon in the top-left corner."),
      text("Перейдите в раздел «Уведомления».", "Open Notifications section."),
      text("Откройте «Уведомления об операциях».", "Open Operation alerts."),
      text("Нажмите «Отключить».", "Tap Disable."),
      text("Проверьте в разделе, что опция уведомлений выключена.", "Verify the alerts option is disabled in the section."),
    ],
    confirmationChecks: [
      text(
        "В карточке услуги «Уведомления об операциях» отображается отключённый статус.",
        "Operation alerts service card shows disabled status.",
      ),
      text(
        "Новая комиссия за уведомления не начисляется в следующем периоде.",
        "No new alerts fee is charged in the next billing period.",
      ),
    ],
    notes: [
      text(
        "Для некоторых пакетов ВТБ (например, «Привилегия») уведомления могут быть бесплатными по условиям.",
        "For some VTB packages (for example, Privilege), alerts may be free under package terms.",
      ),
    ],
    keywords: ["втб уведомления", "vtb alerts", "отключить уведомления втб", "sms втб онлайн"],
    aliases: ["vtb online notifications", "уведомления об операциях втб"],
    priority: 34,
    featured: false,
  },
  {
    id: "n26-premium-membership",
    displayName: text("N26 Premium Membership", "N26 Premium Membership"),
    categoryId: "banking_premium_options",
    cancellationScope: text(
      "Отмена премиального плана N26 с переходом на бесплатный Standard.",
      "Cancel N26 paid plan and switch back to free Standard.",
    ),
    shortDescription: text(
      "N26 публикует официальный путь отмены платного членства через приложение.",
      "N26 documents official paid-membership cancellation flow in the app.",
    ),
    verifiedOn: VERIFIED_ON_30T,
    cancellationChannels: ["bank_app", "mobile_app", "personal_account"],
    officialSources: [N26_PREMIUM_CANCEL_SOURCE],
    steps: [
      text("Откройте приложение N26 и войдите в аккаунт.", "Open N26 app and sign in."),
      text("Перейдите в раздел My Account.", "Go to My Account."),
      text("Откройте блок Your Membership.", "Open Your Membership block."),
      text("Выберите Modify membership или Cancel membership.", "Select Modify membership or Cancel membership."),
      text("Подтвердите отмену платного плана на финальном шаге.", "Confirm paid-plan cancellation on final step."),
      text("Проверьте, что в профиле указан переход на N26 Standard.", "Verify profile shows switch to N26 Standard."),
    ],
    confirmationChecks: [
      text(
        "В разделе membership больше нет активного платного продления.",
        "Membership section no longer has an active paid renewal.",
      ),
      text(
        "В аккаунте отображается бесплатный тариф после завершения текущего периода.",
        "Account shows free plan after current paid period ends.",
      ),
    ],
    notes: [
      text(
        "В зависимости от страны и срока действия плана могут применяться условия минимального периода.",
        "Depending on country and plan term, minimum-term conditions may apply.",
      ),
    ],
    supportContactNote: text(
      "Если отмена в приложении недоступна, N26 направляет в официальный support chat.",
      "If cancellation is unavailable in-app, N26 directs users to official support chat.",
    ),
    keywords: ["n26 premium", "n26 cancel membership", "n26 paid plan", "bank premium n26"],
    aliases: ["n26 smart cancel", "n26 metal cancel"],
    priority: 35,
    featured: false,
  },
  {
    id: "monzo-plus-premium",
    displayName: text("Monzo Plus / Premium", "Monzo Plus / Premium"),
    categoryId: "banking_premium_options",
    cancellationScope: text(
      "Отключение платных планов Monzo Plus и Monzo Premium.",
      "Cancel Monzo Plus and Monzo Premium paid plans.",
    ),
    shortDescription: text(
      "Monzo публикует отдельные официальные инструкции для отмены Plus и Premium.",
      "Monzo publishes separate official cancellation guides for Plus and Premium.",
    ),
    verifiedOn: VERIFIED_ON_30T,
    cancellationChannels: ["bank_app", "mobile_app", "personal_account"],
    officialSources: [MONZO_PLUS_CANCEL_SOURCE, MONZO_PREMIUM_CANCEL_SOURCE],
    steps: [
      text("Откройте приложение Monzo и войдите в аккаунт.", "Open Monzo app and sign in."),
      text("Перейдите в раздел вашего плана (Plus или Premium).", "Open your paid plan section (Plus or Premium)."),
      text("Откройте настройки плана и выберите отмену.", "Open plan settings and select cancellation."),
      text("Проверьте предупреждение о возможной комиссии при минимальном сроке.", "Review warning about possible fee in minimum term."),
      text("Подтвердите отмену плана на финальном экране.", "Confirm plan cancellation on final screen."),
      text("Проверьте в профиле, что автопродление плана отключено.", "Verify in profile that plan auto-renewal is disabled."),
    ],
    confirmationChecks: [
      text(
        "В аккаунте Monzo платный план отмечен как отменённый/не продлевающийся.",
        "Monzo account shows paid plan canceled or non-renewing.",
      ),
      text(
        "Новая дата списания по Plus/Premium больше не назначается.",
        "No new billing date is assigned for Plus/Premium.",
      ),
    ],
    notes: [
      text(
        "Monzo указывает возможную cancellation fee, если план отменяется в обязательный период.",
        "Monzo may apply cancellation fee if canceled during minimum term.",
      ),
      text(
        "Повторное подключение старых планов может быть недоступно по текущим правилам Monzo.",
        "Re-joining legacy plans may be unavailable under current Monzo rules.",
      ),
    ],
    keywords: ["monzo plus", "monzo premium", "cancel monzo plan", "bank subscription monzo"],
    aliases: ["monzo paid plan", "отключить monzo premium"],
    priority: 36,
    featured: false,
  },
  {
    id: "mts-premium",
    displayName: text("МТС Premium", "MTS Premium"),
    categoryId: "telecom_mobile_subscriptions",
    cancellationScope: text(
      "Отключение МТС Premium через «Мой МТС» или сайт Premium.",
      "Cancel MTS Premium via My MTS app or Premium website.",
    ),
    shortDescription: text(
      "МТС публикует пошаговую инструкцию с отдельными ветками для KION/Юрент.",
      "MTS provides step-by-step cancellation with separate KION/Yurent branches.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["mobile_app", "website", "operator_account", "partner_billing"],
    officialSources: [
      source(
        "МТС Support: Как отключить подписку МТС Premium",
        "MTS Support: how to cancel MTS Premium",
        "https://support.mts.ru/mts-premium/upravlenie-podpiskoi/kak-otklyuchit-mts-premium",
      ),
    ],
    steps: [
      text("Проверьте канал подключения: если в KION или Юрент, отключайте в этих сервисах.", "Check activation channel: if in KION or Yurent, cancel there."),
      text("Для общего сценария откройте приложение «Мой МТС».", "For standard flow, open My MTS app."),
      text("Перейдите в «Подключённые услуги и сервисы».", "Go to Connected services."),
      text("На баннере МТС Premium нажмите «Настроить», затем откройте карточку подписки.", "Open MTS Premium banner and subscription card."),
      text("Нажмите «Отключить подписку», выберите причину и подтвердите.", "Tap Disable subscription, select reason, and confirm."),
    ],
    confirmationChecks: [
      text("Продление отключено, а привилегии доступны до конца оплаченного периода.", "Renewal is off while benefits remain until paid period end."),
      text("В карточке подписки нет нового автосписания.", "No new automatic charge is shown."),
    ],
    notes: [text("МТС также описывает альтернативный путь отключения на premium.mts.ru.", "MTS also describes equivalent flow on premium.mts.ru.")],
    supportContactNote: text("Если отключить не удалось, МТС рекомендует официальный чат поддержки.", "If cancellation fails, MTS recommends official support chat."),
    keywords: ["mts premium", "мтс премиум", "мой мтс", "отключить mts premium"],
    aliases: ["подписка мтс premium", "mts plus services"],
    priority: 40,
    featured: true,
  },
  {
    id: "youtube-premium",
    displayName: text("YouTube Premium", "YouTube Premium"),
    categoryId: "global_digital_services",
    cancellationScope: text("Отмена YouTube Premium / YouTube Music Premium.", "Cancel YouTube Premium / YouTube Music Premium."),
    shortDescription: text(
      "Официальный гайд YouTube с шагами отмены и проверкой канала оплаты.",
      "Official YouTube guide with cancellation steps and billing-channel checks.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["mobile_app", "website", "app_store", "google_play"],
    officialSources: [
      source("YouTube Help: Cancel YouTube Premium", "YouTube Help: cancel YouTube Premium", "https://support.google.com/youtube/answer/6308278"),
      APPLE_CANCEL_SOURCE,
      GOOGLE_PLAY_CANCEL_SOURCE,
    ],
    steps: [
      text("Откройте YouTube и нажмите на фото профиля.", "Open YouTube and tap profile picture."),
      text("Перейдите в «Paid memberships» / «Платные подписки».", "Open Paid memberships."),
      text("Выберите YouTube Premium или YouTube Music Premium.", "Select target paid membership."),
      text("Нажмите «Continue to cancel».", "Tap Continue to cancel."),
      text("Выберите причину и подтвердите «Yes, cancel».", "Select reason and confirm Yes, cancel."),
    ],
    confirmationChecks: [
      text("В youtube.com/paid_memberships статус отображается как отменённый.", "Status is canceled on youtube.com/paid_memberships."),
      text("Преимущества действуют до конца периода без нового списания.", "Benefits remain until period end with no next charge."),
    ],
    notes: [
      text("При биллинге Apple отмена выполняется через Apple Account.", "If billed by Apple, cancel via Apple account."),
      text("При биллинге Google Play отмена выполняется в подписках Google Play.", "If billed by Google Play, cancel in Google Play subscriptions."),
    ],
    appStoreGooglePlayNote: text(
      "Канал оплаты определяет место отмены: Apple Account, Google Play или прямой YouTube биллинг.",
      "Billing channel defines where to cancel: Apple account, Google Play, or direct YouTube billing.",
    ),
    keywords: ["youtube premium", "youtube music premium", "отменить youtube подписку"],
    aliases: ["ютуб премиум", "youtube paid memberships"],
    priority: 50,
    featured: false,
  },
  {
    id: "netflix",
    displayName: text("Netflix", "Netflix"),
    categoryId: "global_digital_services",
    cancellationScope: text("Отключение членства Netflix.", "Cancel Netflix membership."),
    shortDescription: text(
      "Netflix описывает официальный путь отмены через Manage your membership.",
      "Netflix documents official cancellation path via Manage your membership.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "personal_account", "partner_billing"],
    officialSources: [source("Netflix Help: How to cancel Netflix", "Netflix Help: How to cancel Netflix", "https://help.netflix.com/en/node/407")],
    steps: [
      text("Откройте страницу Manage your membership в аккаунте Netflix.", "Open Manage your membership in Netflix account."),
      text("Нажмите «Cancel».", "Tap or click Cancel."),
      text("Подтвердите «Finish Cancellation».", "Confirm Finish Cancellation."),
      text("Дождитесь письма-подтверждения на e-mail.", "Wait for confirmation email."),
      text("Проверьте раздел Membership на отсутствие нового продления.", "Check Membership section for no next renewal."),
    ],
    confirmationChecks: [
      text("Письмо-подтверждение пришло на почту аккаунта.", "Confirmation email was received."),
      text("В аккаунте Netflix нет следующего автосписания.", "No next billing is scheduled in account."),
    ],
    notes: [
      text("Выход из аккаунта или удаление приложения не отменяет подписку.", "Sign out or app deletion does not cancel membership."),
      text("Если кнопки отмены нет, Netflix направляет к платёжному партнёру.", "If cancel option is absent, Netflix directs to payment partner."),
    ],
    keywords: ["netflix", "cancel netflix", "отмена netflix"],
    aliases: ["netflix subscription", "подписка netflix"],
    priority: 51,
    featured: false,
  },
  {
    id: "spotify-premium",
    displayName: text("Spotify Premium", "Spotify Premium"),
    categoryId: "global_digital_services",
    cancellationScope: text("Отмена Premium-плана Spotify.", "Cancel Spotify Premium plan."),
    shortDescription: text(
      "Spotify публикует официальный путь: Manage your plan → Cancel subscription.",
      "Spotify official path: Manage your plan → Cancel subscription.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "personal_account", "partner_billing"],
    officialSources: [source("Spotify Support: How to cancel Premium plans", "Spotify Support: How to cancel Premium plans", "https://support.spotify.com/cg-en/article/cancel-premium/")],
    steps: [
      text("Войдите в аккаунт Spotify.", "Sign in to Spotify account."),
      text("Откройте страницу «Manage your plan».", "Open Manage your plan."),
      text("Нажмите «Cancel subscription».", "Select Cancel subscription."),
      text("Подтвердите отмену на финальном шаге.", "Confirm cancellation."),
      text("Проверьте, что аккаунт перейдёт в Free после текущей даты биллинга.", "Verify account will switch to Free after billing date."),
    ],
    confirmationChecks: [
      text("В аккаунте указан переход на Free после текущего периода.", "Account shows switch to Free after current period."),
      text("Новая оплата Premium не запланирована.", "No new Premium charge is scheduled."),
    ],
    notes: [text("Если план связан с оператором/партнёром, отмена выполняется в этом канале.", "If plan is tied to operator/partner, cancel in that channel.")],
    keywords: ["spotify premium", "spotify cancel", "отключить spotify premium"],
    aliases: ["spotify subscription", "подписка spotify"],
    priority: 52,
    featured: false,
  },
  {
    id: "chatgpt-plus",
    displayName: text("ChatGPT Plus / Pro", "ChatGPT Plus / Pro"),
    categoryId: "global_digital_services",
    cancellationScope: text("Отмена платной подписки ChatGPT Plus / Pro.", "Cancel paid ChatGPT Plus / Pro subscription."),
    shortDescription: text(
      "OpenAI указывает отдельные пути отмены для web, App Store и Google Play.",
      "OpenAI documents separate cancellation paths for web, App Store, and Google Play.",
    ),
    verifiedOn: VERIFIED_ON,
    cancellationChannels: ["website", "app_store", "google_play"],
    officialSources: [
      source(
        "OpenAI Help: возврат и ссылки на отмену подписки",
        "OpenAI Help: refund article with cancellation references",
        "https://help.openai.com/en/articles/7232895-how-do-i-request-a-refund-for-chatgpt-plus-or-chatgpt-pro",
      ),
      APPLE_CANCEL_SOURCE,
      GOOGLE_PLAY_CANCEL_SOURCE,
    ],
    steps: [
      text("Откройте ChatGPT под аккаунтом с активной подпиской.", "Open ChatGPT with subscribed account."),
      text("Перейдите в настройки аккаунта и раздел управления планом.", "Go to account settings and plan management."),
      text("Выберите отмену подписки Plus / Pro.", "Choose Plus / Pro cancellation."),
      text("Подтвердите отключение автопродления.", "Confirm auto-renew cancellation."),
      text("Если подписка оформлена в App Store / Google Play, завершите отмену в магазине.", "If billed via App Store / Google Play, finish cancellation in store."),
    ],
    confirmationChecks: [
      text("В настройках плана нет активного продления на следующий период.", "Plan settings show no active renewal."),
      text("Для мобильного биллинга отмена подтверждена в App Store или Google Play.", "For mobile billing, cancellation is confirmed in App Store or Google Play."),
    ],
    notes: [
      text(
        "Удаление аккаунта OpenAI прекращает подписку, но мобильный биллинг нужно проверять в магазине.",
        "Deleting OpenAI account stops subscription, but mobile billing should be checked in store.",
      ),
    ],
    appStoreGooglePlayNote: text(
      "При подписке через iOS/Android канал отмены находится в App Store / Google Play.",
      "If subscribed via iOS/Android billing, cancel in App Store / Google Play.",
    ),
    keywords: ["chatgpt plus", "chatgpt pro", "openai subscription cancel", "отменить chatgpt подписку"],
    aliases: ["chatgpt subscription", "подписка chatgpt"],
    priority: 53,
    featured: false,
  },
];

const normalizeGuideSearchToken = (value: string): string => {
  return value.trim().toLowerCase();
};

const buildGuideSearchStack = (guide: SubscriptionGuide): string => {
  return [
    guide.id,
    guide.displayName.ru,
    guide.displayName.en,
    guide.cancellationScope.ru,
    guide.cancellationScope.en,
    guide.shortDescription.ru,
    guide.shortDescription.en,
    ...guide.cancellationChannels,
    ...guide.keywords,
    ...guide.aliases,
  ]
    .join(" ")
    .toLowerCase();
};

const compareGuides = (left: SubscriptionGuide, right: SubscriptionGuide): number => {
  if (left.featured !== right.featured) {
    return left.featured ? -1 : 1;
  }

  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  return left.displayName.ru.localeCompare(right.displayName.ru, "ru");
};

export const filterSubscriptionGuides = (
  categoryId: SubscriptionGuideCategoryFilter,
  searchQuery: string,
): SubscriptionGuide[] => {
  const normalizedQuery = normalizeGuideSearchToken(searchQuery);

  return subscriptionCancellationGuidesCatalog
    .filter((guide) => {
      if (categoryId !== "all" && guide.categoryId !== categoryId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const stack = buildGuideSearchStack(guide);
      return stack.includes(normalizedQuery);
    })
    .sort(compareGuides);
};

export const getLocalizedGuideText = (textValue: LocalizedText, language: UiLanguage): string => {
  return language === "ru" ? textValue.ru : textValue.en;
};

export const getGuideCategoryLabel = (
  categoryId: SubscriptionGuideCategoryId,
  language: UiLanguage,
): string => {
  const category = subscriptionGuideCategories.find((item) => item.id === categoryId);
  if (!category) {
    return categoryId;
  }

  return getLocalizedGuideText(category.label, language);
};

export const getGuideChannelLabel = (
  channelId: SubscriptionGuideChannelId,
  language: UiLanguage,
): string => {
  const label = guideChannelLabels[channelId];
  if (!label) {
    return channelId;
  }

  return getLocalizedGuideText(label, language);
};

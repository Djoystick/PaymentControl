import type { UiLanguage } from "@/lib/i18n/localization";

type LocalizedText = {
  ru: string;
  en: string;
};

export type SubscriptionGuideCategoryId =
  | "app_store_channels"
  | "banking_premium"
  | "marketplace_retail_membership"
  | "media_digital_services"
  | "telecom_bundles";

export type SubscriptionGuideCategory = {
  id: SubscriptionGuideCategoryId;
  label: LocalizedText;
};

export const subscriptionGuideCategories: SubscriptionGuideCategory[] = [
  {
    id: "app_store_channels",
    label: {
      ru: "Каналы оформления (App Store / Google Play)",
      en: "Purchase channels (App Store / Google Play)",
    },
  },
  {
    id: "banking_premium",
    label: {
      ru: "Банки и премиальные сервисы",
      en: "Banking and premium services",
    },
  },
  {
    id: "marketplace_retail_membership",
    label: {
      ru: "Маркетплейсы и retail membership",
      en: "Marketplaces and retail memberships",
    },
  },
  {
    id: "media_digital_services",
    label: {
      ru: "Медиа и digital-сервисы",
      en: "Media and digital services",
    },
  },
  {
    id: "telecom_bundles",
    label: {
      ru: "Телеком и bundled-сервисы",
      en: "Telecom and bundled services",
    },
  },
];

export type SubscriptionGuideSource = {
  label: LocalizedText;
  url: string;
};

export type SubscriptionGuideChannelSpecificNote = {
  id: string;
  title: LocalizedText;
  note: LocalizedText;
  sources?: SubscriptionGuideSource[];
};

export type SubscriptionGuide = {
  id: string;
  displayName: LocalizedText;
  categoryId: SubscriptionGuideCategoryId;
  shortDescription: LocalizedText;
  verifiedOn: string;
  officialSources: SubscriptionGuideSource[];
  steps: LocalizedText[];
  notes: LocalizedText[];
  channelSpecificNotes: SubscriptionGuideChannelSpecificNote[];
  keywords: string[];
  aliases: string[];
  priority: number;
  featured: boolean;
  regionContextNote?: LocalizedText;
};

export type SubscriptionGuideCategoryFilter = SubscriptionGuideCategoryId | "all";

const APPLE_CANCEL_SOURCE: SubscriptionGuideSource = {
  label: {
    ru: "Apple Support: отмена подписки",
    en: "Apple Support: cancel a subscription",
  },
  url: "https://support.apple.com/ru-ru/118428",
};

const GOOGLE_PLAY_CANCEL_SOURCE: SubscriptionGuideSource = {
  label: {
    ru: "Google Play Help: отмена подписки",
    en: "Google Play Help: cancel a subscription",
  },
  url: "https://support.google.com/googleplay/answer/7018481?hl=ru",
};

export const subscriptionCancellationGuidesCatalog: SubscriptionGuide[] = [
  {
    id: "apple-app-store-subscriptions",
    displayName: {
      ru: "Подписки в App Store",
      en: "App Store subscriptions",
    },
    categoryId: "app_store_channels",
    shortDescription: {
      ru: "Официальный путь отмены подписок, оформленных через Apple ID.",
      en: "Official cancellation flow for subscriptions purchased via Apple ID.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [APPLE_CANCEL_SOURCE],
    steps: [
      {
        ru: "Откройте настройки Apple ID и раздел подписок.",
        en: "Open Apple ID settings and the subscriptions section.",
      },
      {
        ru: "Выберите нужную подписку и нажмите отмену/отключение автопродления.",
        en: "Select the target subscription and choose cancel/disable auto-renewal.",
      },
      {
        ru: "Проверьте дату окончания текущего оплаченного периода.",
        en: "Verify the end date of the current paid period.",
      },
    ],
    notes: [
      {
        ru: "Если подписка оформлена через App Store, отмена делается именно в Apple, а не на сайте сервиса.",
        en: "If the subscription was purchased in App Store, cancellation must be done in Apple, not on the service website.",
      },
    ],
    channelSpecificNotes: [],
    keywords: ["apple", "app store", "itunes", "подписки", "отмена", "apple id"],
    aliases: ["ios subscriptions", "подписки apple", "апп стор подписки"],
    priority: 1,
    featured: true,
  },
  {
    id: "google-play-subscriptions",
    displayName: {
      ru: "Подписки в Google Play",
      en: "Google Play subscriptions",
    },
    categoryId: "app_store_channels",
    shortDescription: {
      ru: "Официальная отмена подписок, оформленных через аккаунт Google Play.",
      en: "Official cancellation flow for subscriptions purchased via Google Play account.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [GOOGLE_PLAY_CANCEL_SOURCE],
    steps: [
      {
        ru: "Откройте Google Play и раздел «Платежи и подписки».",
        en: "Open Google Play and go to Payments & subscriptions.",
      },
      {
        ru: "Выберите подписку и выполните отмену.",
        en: "Choose the subscription and cancel it.",
      },
      {
        ru: "Проверьте, что автопродление выключено и видна дата окончания.",
        en: "Check that auto-renewal is off and the end date is visible.",
      },
    ],
    notes: [
      {
        ru: "Если сервис был оплачен через Google Play, отключение нужно делать в Google Play.",
        en: "If the service was paid via Google Play, cancellation should be done in Google Play.",
      },
    ],
    channelSpecificNotes: [],
    keywords: ["google play", "android", "отмена подписки", "play market"],
    aliases: ["подписки google", "gplay subscriptions"],
    priority: 2,
    featured: true,
  },
  {
    id: "yandex-plus",
    displayName: {
      ru: "Яндекс Плюс",
      en: "Yandex Plus",
    },
    categoryId: "media_digital_services",
    shortDescription: {
      ru: "Официальная инструкция Яндекса по отключению Плюса.",
      en: "Official Yandex guide for Plus cancellation.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "Справка Яндекс Плюс: как отключить подписку",
          en: "Yandex Plus Help: how to unsubscribe",
        },
        url: "https://yandex.ru/support/plus-ru/ru/manage/unsubscribe",
      },
    ],
    steps: [
      {
        ru: "Откройте управление Плюсом в аккаунте Яндекса.",
        en: "Open Plus management in your Yandex account.",
      },
      {
        ru: "Отключите автопродление и подтвердите действие.",
        en: "Disable auto-renewal and confirm.",
      },
      {
        ru: "Проверьте дату, до которой действует подписка.",
        en: "Check the date until which the subscription remains active.",
      },
    ],
    notes: [
      {
        ru: "Доступ обычно сохраняется до конца оплаченного периода.",
        en: "Access usually remains until the end of the paid period.",
      },
    ],
    channelSpecificNotes: [
      {
        id: "yandex-app-store-google-play",
        title: {
          ru: "Если подключали через App Store или Google Play",
          en: "If activated via App Store or Google Play",
        },
        note: {
          ru: "Отменяйте подписку через магазин, где оформляли платеж.",
          en: "Cancel via the store where the payment was made.",
        },
        sources: [APPLE_CANCEL_SOURCE, GOOGLE_PLAY_CANCEL_SOURCE],
      },
      {
        id: "yandex-partner",
        title: {
          ru: "Если подключали через партнера",
          en: "If activated via partner billing",
        },
        note: {
          ru: "Отключение выполняется через кабинет партнера/оператора.",
          en: "Cancellation is handled in partner/operator account.",
        },
      },
    ],
    keywords: ["yandex", "plus", "яндекс", "плюс", "отключить"],
    aliases: ["яндекс плюс", "yandex subscription"],
    priority: 10,
    featured: true,
  },
  {
    id: "okko",
    displayName: {
      ru: "Okko",
      en: "Okko",
    },
    categoryId: "media_digital_services",
    shortDescription: {
      ru: "Официальные инструкции Okko по отключению подписки.",
      en: "Official Okko instructions for subscription cancellation.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "Okko Help: отключение подписки",
          en: "Okko Help: cancel subscription",
        },
        url: "https://help.okko.tv/subs/cancel",
      },
    ],
    steps: [
      {
        ru: "Откройте управление подпиской в аккаунте Okko.",
        en: "Open subscription management in your Okko account.",
      },
      {
        ru: "Выберите отключение автопродления и подтвердите.",
        en: "Disable auto-renewal and confirm.",
      },
      {
        ru: "Проверьте статус подписки и дату окончания периода.",
        en: "Check subscription status and period end date.",
      },
    ],
    notes: [
      {
        ru: "Okko отдельно публикует разбор ситуации, когда отключение не сработало с первого раза.",
        en: "Okko provides a dedicated article for cancellation troubleshooting.",
      },
    ],
    channelSpecificNotes: [
      {
        id: "okko-channel-dependency",
        title: {
          ru: "Важно: канал оплаты влияет на путь отключения",
          en: "Important: billing channel changes cancellation path",
        },
        note: {
          ru: "Если подписка оформлена не напрямую в Okko, отключение может требовать канал-провайдер (магазин приложений, партнер, оператор).",
          en: "If subscription is not billed directly by Okko, cancellation may require the provider channel (store, partner, operator).",
        },
      },
    ],
    keywords: ["okko", "окко", "отключить подписку", "кино"],
    aliases: ["окко подписка", "okko subscription"],
    priority: 12,
    featured: true,
  },
  {
    id: "ivi",
    displayName: {
      ru: "Иви",
      en: "Ivi",
    },
    categoryId: "media_digital_services",
    shortDescription: {
      ru: "Официальные инструкции Иви по отключению автопродления.",
      en: "Official Ivi guides for auto-renewal cancellation.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "Иви Help: отключение автопродления на сайте",
          en: "Ivi Help: disable auto-renewal on website",
        },
        url: "https://ask.ivi.ru/knowledge-bases/10/articles/51701-kak-otklyuchit-avtomaticheskoe-prodlenie-na-sajte-iviru",
      },
      {
        label: {
          ru: "Иви Help: общая инструкция по отключению продления",
          en: "Ivi Help: general cancellation guide",
        },
        url: "https://ask.ivi.ru/knowledge-bases/10/articles/29931-kak-otklyuchit-avtomaticheskoe-prodlenie-podpiski",
      },
    ],
    steps: [
      {
        ru: "Авторизуйтесь в аккаунте Иви и откройте управление подпиской.",
        en: "Sign in to Ivi account and open subscription management.",
      },
      {
        ru: "Отключите автопродление и подтвердите действие.",
        en: "Disable auto-renewal and confirm.",
      },
      {
        ru: "Убедитесь, что в статусе подписки указано отсутствие дальнейших списаний.",
        en: "Ensure subscription status shows no future recurring charges.",
      },
    ],
    notes: [
      {
        ru: "Иви публикует разные инструкции для разных платформ (сайт, TV, магазины приложений).",
        en: "Ivi provides platform-specific guides (website, TV, app stores).",
      },
    ],
    channelSpecificNotes: [
      {
        id: "ivi-app-store",
        title: {
          ru: "Если подписка оформлена через App Store",
          en: "If subscription was purchased via App Store",
        },
        note: {
          ru: "Отключение выполняется в подписках Apple ID.",
          en: "Cancellation is done in Apple ID subscriptions.",
        },
        sources: [
          {
            label: {
              ru: "Иви Help: отмена подписки через App Store",
              en: "Ivi Help: cancel via App Store",
            },
            url: "https://ask.ivi.ru/knowledge-bases/10/articles/45099-kak-otmenit-podpisku-podklyuchennuyu-cherez-app-store",
          },
          APPLE_CANCEL_SOURCE,
        ],
      },
    ],
    keywords: ["ivi", "иви", "онлайн кинотеатр", "отключить автопродление"],
    aliases: ["ivi подписка", "ivi subscription"],
    priority: 13,
    featured: true,
  },
  {
    id: "ozon-premium",
    displayName: {
      ru: "Ozon Premium",
      en: "Ozon Premium",
    },
    categoryId: "marketplace_retail_membership",
    shortDescription: {
      ru: "Официальные условия Ozon Premium с управлением продлением.",
      en: "Official Ozon Premium terms with renewal management.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "Ozon Docs: условия подписки Ozon Premium",
          en: "Ozon Docs: Ozon Premium subscription terms",
        },
        url: "https://docs.ozon.ru/common/pravila-prodayoi-i-rekvizity/usloviya-podpiski-na-ozon-premium/",
      },
    ],
    steps: [
      {
        ru: "Откройте профиль Ozon и раздел управления Ozon Premium.",
        en: "Open Ozon profile and Ozon Premium management section.",
      },
      {
        ru: "Отключите автопродление подписки.",
        en: "Disable subscription auto-renewal.",
      },
      {
        ru: "Проверьте статус и дату конца текущего периода.",
        en: "Check status and end date of the current period.",
      },
    ],
    notes: [
      {
        ru: "Отключение продления не отменяет уже оплаченный период.",
        en: "Disabling renewal does not cancel the already paid period.",
      },
    ],
    channelSpecificNotes: [],
    keywords: ["ozon", "premium", "озон", "marketplace", "retail"],
    aliases: ["озон премиум", "ozon membership"],
    priority: 20,
    featured: true,
  },
  {
    id: "x5-paket",
    displayName: {
      ru: "X5 «Пакет»",
      en: "X5 Paket",
    },
    categoryId: "marketplace_retail_membership",
    shortDescription: {
      ru: "Официальные условия X5 «Пакет» со ссылкой на управление сервисом.",
      en: "Official X5 Paket terms with service management link.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "X5 Пакет: пользовательское соглашение",
          en: "X5 Paket: terms of use",
        },
        url: "https://x5paket.ru/docs/terms_of_use.pdf",
      },
    ],
    steps: [
      {
        ru: "Откройте личный кабинет X5 Пакет в разделе «Управление сервисом».",
        en: "Open X5 Paket account in the Service Management section.",
      },
      {
        ru: "Найдите текущий тариф и отключите подписку/автопролонгацию.",
        en: "Find current tariff and disable subscription/auto-renewal.",
      },
      {
        ru: "Проверьте, до какой даты сервис останется активным.",
        en: "Check the date until which the service remains active.",
      },
    ],
    notes: [
      {
        ru: "В соглашении X5 указано право отказа в любой момент срока действия подписки.",
        en: "X5 terms explicitly state cancellation can be requested at any time.",
      },
    ],
    channelSpecificNotes: [
      {
        id: "x5-partner-channel",
        title: {
          ru: "Если подписка куплена через партнера",
          en: "If subscription was purchased via partner",
        },
        note: {
          ru: "Для партнерских каналов условия и способ отказа могут определяться партнером.",
          en: "For partner channels, cancellation conditions can be defined by that partner.",
        },
      },
    ],
    keywords: ["x5", "пакет", "x5 пакет", "пятерочка", "перекресток"],
    aliases: ["x5paket", "пакет x5", "x5 membership"],
    priority: 21,
    featured: true,
  },
  {
    id: "sberprime",
    displayName: {
      ru: "СберПрайм",
      en: "SberPrime",
    },
    categoryId: "banking_premium",
    shortDescription: {
      ru: "Официальная инструкция экосистемы Сбера с учетом канала подключения.",
      en: "Official Sber ecosystem guidance with channel-dependent paths.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "Справка Звук: как отключить подписку СберПрайм",
          en: "Zvuk Help: how to cancel SberPrime",
        },
        url: "https://help.zvuk.com/article/46228",
      },
    ],
    steps: [
      {
        ru: "Определите канал, через который подключали СберПрайм (Сбер ID, оператор, магазин приложений).",
        en: "Identify activation channel (Sber ID, operator, app store).",
      },
      {
        ru: "Откройте управление подпиской в этом канале и отключите продление.",
        en: "Open subscription management in that channel and disable renewal.",
      },
      {
        ru: "Проверьте, что следующее списание выключено.",
        en: "Confirm the next recurring charge is disabled.",
      },
    ],
    notes: [
      {
        ru: "У СберПрайм путь отключения может сильно отличаться по каналу оформления.",
        en: "SberPrime cancellation path can differ significantly by purchase channel.",
      },
    ],
    channelSpecificNotes: [
      {
        id: "sber-app-stores",
        title: {
          ru: "Если оформляли через App Store / Google Play",
          en: "If purchased via App Store / Google Play",
        },
        note: {
          ru: "Отключайте подписку через соответствующий магазин.",
          en: "Cancel subscription in the corresponding app store.",
        },
        sources: [APPLE_CANCEL_SOURCE, GOOGLE_PLAY_CANCEL_SOURCE],
      },
    ],
    keywords: ["sber", "сбер", "сберпрайм", "sberprime"],
    aliases: ["sber prime", "сбер прайм"],
    priority: 30,
    featured: true,
  },
  {
    id: "t-premium",
    displayName: {
      ru: "T-Premium",
      en: "T-Premium",
    },
    categoryId: "banking_premium",
    shortDescription: {
      ru: "Официальная страница T-Банка с управлением сервисом Premium.",
      en: "Official T-Bank page with Premium service management details.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "T-Банк: Premium (FAQ)",
          en: "T-Bank: Premium (FAQ)",
        },
        url: "https://www.tbank.ru/tinkoff-premium/grades/",
      },
    ],
    steps: [
      {
        ru: "Откройте управление Premium в приложении/кабинете T-Банка.",
        en: "Open Premium management in T-Bank app/account.",
      },
      {
        ru: "Выполните отключение сервиса и подтвердите действие.",
        en: "Cancel the service and confirm.",
      },
      {
        ru: "Проверьте дату окончания текущего периода обслуживания.",
        en: "Check current service period end date.",
      },
    ],
    notes: [
      {
        ru: "Отключение T-Premium не влияет на доступ к функциям Payment Control.",
        en: "Cancelling T-Premium does not affect access to Payment Control features.",
      },
    ],
    channelSpecificNotes: [],
    keywords: ["t-premium", "tbank", "тинькофф премиум", "т-банк"],
    aliases: ["t premium", "tinkoff premium"],
    priority: 31,
    featured: false,
  },
  {
    id: "t-pro",
    displayName: {
      ru: "T-Pro",
      en: "T-Pro",
    },
    categoryId: "banking_premium",
    shortDescription: {
      ru: "Официальная справка T-Банка по отключению Pro.",
      en: "Official T-Bank guide for Pro cancellation.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "T-Банк Help: управление подпиской Pro",
          en: "T-Bank Help: Pro subscription control",
        },
        url: "https://www.tbank.ru/bank/help/general/pro/pro-subscription/control/",
      },
    ],
    steps: [
      {
        ru: "Перейдите в раздел подписки Pro в T-Банке.",
        en: "Open Pro subscription section in T-Bank.",
      },
      {
        ru: "Отключите подписку Pro и подтвердите.",
        en: "Disable Pro subscription and confirm.",
      },
      {
        ru: "Проверьте, что автосписание выключено.",
        en: "Verify recurring charge is disabled.",
      },
    ],
    notes: [
      {
        ru: "Официальная страница называет действие отключением подписки Pro.",
        en: "Official page explicitly describes this as Pro subscription cancellation.",
      },
    ],
    channelSpecificNotes: [],
    keywords: ["t-pro", "t pro", "тинькофф про", "т банк про"],
    aliases: ["tinkoff pro", "tbank pro"],
    priority: 32,
    featured: false,
  },
  {
    id: "mts-premium",
    displayName: {
      ru: "МТС Premium",
      en: "MTS Premium",
    },
    categoryId: "telecom_bundles",
    shortDescription: {
      ru: "Официальная инструкция МТС по отключению Premium.",
      en: "Official MTS guide to disable Premium.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "МТС Support: как отключить МТС Premium",
          en: "MTS Support: how to disable MTS Premium",
        },
        url: "https://support.mts.ru/mts-premium/upravlenie-podpiskoi/kak-otklyuchit-mts-premium",
      },
    ],
    steps: [
      {
        ru: "Откройте управление МТС Premium на сайте или в приложении Мой МТС.",
        en: "Open MTS Premium management on website or My MTS app.",
      },
      {
        ru: "Отключите автопродление подписки.",
        en: "Disable subscription auto-renewal.",
      },
      {
        ru: "Проверьте, что следующий платеж отменен.",
        en: "Confirm next recurring payment is cancelled.",
      },
    ],
    notes: [
      {
        ru: "МТС поддерживает несколько официальных способов отключения в зависимости от интерфейса.",
        en: "MTS provides multiple official cancellation methods depending on interface.",
      },
    ],
    channelSpecificNotes: [],
    keywords: ["mts", "мтс", "mts premium", "телеком", "premium"],
    aliases: ["мтс премиум", "mts subscription"],
    priority: 40,
    featured: true,
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
    guide.shortDescription.ru,
    guide.shortDescription.en,
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

export const getLocalizedGuideText = (
  text: LocalizedText,
  language: UiLanguage,
): string => {
  return language === "ru" ? text.ru : text.en;
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

import type { UiLanguage } from "@/lib/i18n/localization";

type LocalizedText = {
  ru: string;
  en: string;
};

export type SubscriptionGuideSource = {
  label: LocalizedText;
  url: string;
};

export type SubscriptionGuideChannelCaveat = {
  id: string;
  title: LocalizedText;
  note: LocalizedText;
  sources?: SubscriptionGuideSource[];
};

export type SubscriptionGuide = {
  id: string;
  serviceName: LocalizedText;
  category: LocalizedText;
  shortDescription: LocalizedText;
  verifiedOn: string;
  officialSources: SubscriptionGuideSource[];
  steps: LocalizedText[];
  importantNotes: LocalizedText[];
  channelCaveats: SubscriptionGuideChannelCaveat[];
  keywords: string[];
};

const APPLE_CANCEL_SOURCE: SubscriptionGuideSource = {
  label: {
    ru: "Apple Support: отмена подписки",
    en: "Apple Support: cancel a subscription",
  },
  url: "https://support.apple.com/ru-ru/118428",
};

const GOOGLE_PLAY_CANCEL_SOURCE: SubscriptionGuideSource = {
  label: {
    ru: "Google Play Help: отмена подписок",
    en: "Google Play Help: cancel subscriptions",
  },
  url: "https://support.google.com/googleplay/answer/7018481?hl=ru",
};

export const subscriptionCancellationGuidesCatalog: SubscriptionGuide[] = [
  {
    id: "yandex-plus",
    serviceName: {
      ru: "Яндекс Плюс",
      en: "Yandex Plus",
    },
    category: {
      ru: "Медиа и сервисы",
      en: "Media and services",
    },
    shortDescription: {
      ru: "Официальный путь отключения Плюса и автопродления.",
      en: "Official path to disable Plus and auto-renewal.",
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
        ru: "Откройте Плюс в аккаунте Яндекса и перейдите к управлению подпиской.",
        en: "Open Plus in your Yandex account and go to subscription management.",
      },
      {
        ru: "Выберите отключение автопродления и подтвердите действие.",
        en: "Disable auto-renewal and confirm the action.",
      },
      {
        ru: "Проверьте дату окончания оплаченного периода в статусе подписки.",
        en: "Check the paid-until date in the subscription status.",
      },
    ],
    importantNotes: [
      {
        ru: "После отключения доступ обычно сохраняется до конца оплаченного периода.",
        en: "After cancellation, access usually remains until the end of the paid period.",
      },
    ],
    channelCaveats: [
      {
        id: "app-stores",
        title: {
          ru: "Если оформлено через App Store или Google Play",
          en: "If purchased via App Store or Google Play",
        },
        note: {
          ru: "Отменяйте подписку в магазине, через который был оформлен платеж.",
          en: "Cancel in the store where the subscription was purchased.",
        },
        sources: [APPLE_CANCEL_SOURCE, GOOGLE_PLAY_CANCEL_SOURCE],
      },
      {
        id: "partner-billing",
        title: {
          ru: "Если оформлено через партнера",
          en: "If purchased via a partner",
        },
        note: {
          ru: "У Яндекса указано, что в этом случае отключение делается через кабинет партнера/оператора.",
          en: "Yandex states that in this case cancellation is done in the partner/operator account.",
        },
      },
    ],
    keywords: ["yandex", "plus", "яндекс", "плюс", "отключить", "подписка"],
  },
  {
    id: "ozon-premium",
    serviceName: {
      ru: "Ozon Premium",
      en: "Ozon Premium",
    },
    category: {
      ru: "Маркетплейсы",
      en: "Marketplaces",
    },
    shortDescription: {
      ru: "Официальные условия Ozon Premium с управлением автопродлением.",
      en: "Official Ozon Premium terms with auto-renewal management.",
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
        ru: "Откройте профиль Ozon и перейдите в раздел Ozon Premium / управление подпиской.",
        en: "Open your Ozon profile and go to Ozon Premium subscription management.",
      },
      {
        ru: "Отключите автопродление подписки.",
        en: "Disable subscription auto-renewal.",
      },
      {
        ru: "Проверьте дату окончания текущего периода в карточке подписки.",
        en: "Check the end date of the current period in the subscription card.",
      },
    ],
    importantNotes: [
      {
        ru: "По условиям Ozon, отключение автопродления не отменяет уже оплаченный период.",
        en: "Per Ozon terms, disabling auto-renewal does not cancel an already paid period.",
      },
    ],
    channelCaveats: [],
    keywords: ["ozon", "premium", "озон", "отключить", "автопродление"],
  },
  {
    id: "sberprime",
    serviceName: {
      ru: "СберПрайм",
      en: "SberPrime",
    },
    category: {
      ru: "Экосистема",
      en: "Ecosystem",
    },
    shortDescription: {
      ru: "Официальная инструкция из support-канала экосистемы Сбера.",
      en: "Official instructions from the Sber ecosystem support channel.",
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
        ru: "Откройте сервис, через который оформляли СберПрайм (обычно Сбер ID или приложение СберБанк Онлайн).",
        en: "Open the service where SberPrime was activated (usually Sber ID or SberBank Online app).",
      },
      {
        ru: "Перейдите в раздел подписок/управления СберПрайм и отключите автопродление.",
        en: "Go to subscriptions/SberPrime management and disable auto-renewal.",
      },
      {
        ru: "Проверьте, что в статусе подписки указано отключение дальнейших списаний.",
        en: "Confirm the subscription status shows future charges are disabled.",
      },
    ],
    importantNotes: [
      {
        ru: "Путь отключения зависит от канала подключения и может отличаться в экосистемных сервисах.",
        en: "Cancellation flow depends on the activation channel and may differ across ecosystem services.",
      },
    ],
    channelCaveats: [
      {
        id: "channel-specific",
        title: {
          ru: "Важно: отключайте в канале подключения",
          en: "Important: cancel in the activation channel",
        },
        note: {
          ru: "В официальной инструкции отдельно указаны варианты для Сбер ID, мобильных операторов и магазинов приложений.",
          en: "The official guide has separate paths for Sber ID, mobile operators, and app stores.",
        },
        sources: [APPLE_CANCEL_SOURCE, GOOGLE_PLAY_CANCEL_SOURCE],
      },
    ],
    keywords: ["sberprime", "сберпрайм", "сбер", "отключить", "подписка"],
  },
  {
    id: "t-premium",
    serviceName: {
      ru: "T-Premium",
      en: "T-Premium",
    },
    category: {
      ru: "Банковские сервисы",
      en: "Banking services",
    },
    shortDescription: {
      ru: "Официальная FAQ-страница T-Банка с управлением Premium.",
      en: "Official T-Bank FAQ page for Premium management.",
    },
    verifiedOn: "2026-04-04",
    officialSources: [
      {
        label: {
          ru: "T-Банк: уровни сервиса Premium (FAQ)",
          en: "T-Bank: Premium levels (FAQ)",
        },
        url: "https://www.tbank.ru/tinkoff-premium/grades/",
      },
    ],
    steps: [
      {
        ru: "Откройте T-Банк и перейдите в раздел управления сервисом Premium.",
        en: "Open T-Bank and go to Premium service management.",
      },
      {
        ru: "Выберите отключение сервиса и подтвердите действие.",
        en: "Choose service cancellation and confirm.",
      },
      {
        ru: "Проверьте дату, до которой действуют преимущества после отключения.",
        en: "Check the date benefits remain active after cancellation.",
      },
    ],
    importantNotes: [
      {
        ru: "Отключение не должно менять ваши доступы в Payment Control: приложение остается полностью без ограничений.",
        en: "Cancelling this service does not affect Payment Control access: the app remains fully unrestricted.",
      },
    ],
    channelCaveats: [],
    keywords: ["t-premium", "tinkoff premium", "t-bank", "премиум", "т-банк"],
  },
  {
    id: "t-pro",
    serviceName: {
      ru: "T-Pro",
      en: "T-Pro",
    },
    category: {
      ru: "Банковские сервисы",
      en: "Banking services",
    },
    shortDescription: {
      ru: "Официальная справка T-Банка по управлению подпиской Pro.",
      en: "Official T-Bank help article for Pro subscription control.",
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
        ru: "Откройте раздел подписки Pro в приложении или личном кабинете T-Банка.",
        en: "Open the Pro subscription section in the T-Bank app or web account.",
      },
      {
        ru: "Нажмите отключение подписки Pro и подтвердите действие.",
        en: "Select cancel Pro subscription and confirm.",
      },
      {
        ru: "Проверьте, что автосписание на следующий период отключено.",
        en: "Verify auto-renewal for the next period is turned off.",
      },
    ],
    importantNotes: [
      {
        ru: "Официальная страница T-Банка описывает действие как отключение подписки Pro.",
        en: "The official T-Bank page describes this action as cancelling the Pro subscription.",
      },
    ],
    channelCaveats: [],
    keywords: ["t-pro", "tbank pro", "tinkoff pro", "т-pro", "отключить pro"],
  },
  {
    id: "mts-premium",
    serviceName: {
      ru: "МТС Premium",
      en: "MTS Premium",
    },
    category: {
      ru: "Операторские сервисы",
      en: "Carrier services",
    },
    shortDescription: {
      ru: "Официальная инструкция МТС по отключению подписки Premium.",
      en: "Official MTS instructions for disabling Premium.",
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
        ru: "Откройте профиль МТС Premium в приложении Мой МТС или на сайте МТС.",
        en: "Open your MTS Premium profile in My MTS app or on the MTS website.",
      },
      {
        ru: "Перейдите в управление подпиской и отключите автопродление.",
        en: "Go to subscription management and disable auto-renewal.",
      },
      {
        ru: "Проверьте в статусе услуги, что следующее списание отменено.",
        en: "Verify in service status that the next charge is cancelled.",
      },
    ],
    importantNotes: [
      {
        ru: "На стороне МТС доступно несколько официальных способов отключения (веб и приложение).",
        en: "MTS provides multiple official cancellation methods (web and app).",
      },
    ],
    channelCaveats: [],
    keywords: ["mts premium", "мтс премиум", "мтс", "отключить", "premium"],
  },
];

export const getLocalizedGuideText = (
  text: LocalizedText,
  language: UiLanguage,
): string => {
  return language === "ru" ? text.ru : text.en;
};


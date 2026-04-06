"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";
import { readRuntimeSnapshot, rememberRuntimeSnapshot } from "@/lib/app/context-memory";

type AppShellProps = {
  screens: Record<AppTab, React.ReactNode>;
};

export type AppTab = "home" | "reminders" | "travel" | "history" | "profile";
export type AppNavigationIntent =
  | "reminders_add_payment"
  | "reminders_action_now"
  | "reminders_upcoming"
  | "reminders_all"
  | "history_recent_updates"
  | "history_recent_paid";

export type AppTabNavigationEventDetail = {
  tab?: AppTab;
  intent?: AppNavigationIntent;
  sourceTab?: AppTab;
  reason?: string;
  workspaceId?: string | null;
};

export type AppTabNavigationContext = {
  tab: AppTab;
  intent: AppNavigationIntent;
  sourceTab?: AppTab;
  reason?: string;
  workspaceId?: string | null;
  createdAt: string;
};

type OnboardingStep = {
  title: string;
  description: string;
  tab: AppTab;
  bullets: string[];
};

const tabItems: ReadonlyArray<{
  key: AppTab;
  label: string;
  icon: "home" | "reminders" | "travel" | "history" | "profile";
  hint: string;
}> = [
  { key: "home", label: "Home", icon: "home", hint: "Snapshot and next step" },
  {
    key: "reminders",
    label: "Recurring",
    icon: "reminders",
    hint: "Recurring payments routine",
  },
  {
    key: "travel",
    label: "Travel",
    icon: "travel",
    hint: "Trips, receipts, and settlements",
  },
  { key: "history", label: "History", icon: "history", hint: "Recent payment updates" },
  { key: "profile", label: "Profile", icon: "profile", hint: "Workspace and settings" },
];

export const ONBOARDING_STORAGE_KEY = "payment_control_onboarding_v10c_done";
export const ONBOARDING_REPLAY_EVENT = "payment-control-replay-onboarding";
export const APP_TAB_NAVIGATE_EVENT = "payment-control-navigate-tab";
const APP_TAB_NAVIGATION_CONTEXT_STORAGE_KEY =
  "payment_control_tab_navigation_context_v27c";
const TAB_NAVIGATION_CONTEXT_TTL_MS = 30 * 60 * 1000;
const MAX_NAVIGATION_REASON_LENGTH = 240;

const isAppTab = (value: string): value is AppTab => {
  return tabItems.some((item) => item.key === value);
};

const isAppNavigationIntent = (value: string): value is AppNavigationIntent => {
  return [
    "reminders_add_payment",
    "reminders_action_now",
    "reminders_upcoming",
    "reminders_all",
    "history_recent_updates",
    "history_recent_paid",
  ].includes(value);
};

const normalizeOptionalReason = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, MAX_NAVIGATION_REASON_LENGTH);
};

const normalizeWorkspaceId = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, 120);
};

const isFreshNavigationTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string" || !value) {
    return false;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  const ageMs = Date.now() - parsed;
  return ageMs >= 0 && ageMs <= TAB_NAVIGATION_CONTEXT_TTL_MS;
};

const readTabNavigationContextMap = (): Partial<Record<AppTab, AppTabNavigationContext>> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(
      APP_TAB_NAVIGATION_CONTEXT_STORAGE_KEY,
    );
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as Partial<Record<AppTab, AppTabNavigationContext>>;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const normalized: Partial<Record<AppTab, AppTabNavigationContext>> = {};
    let shouldRewrite = false;
    for (const [rawTab, rawContext] of Object.entries(parsed)) {
      if (!isAppTab(rawTab) || !rawContext) {
        shouldRewrite = true;
        continue;
      }

      if (
        !isAppNavigationIntent(rawContext.intent) ||
        !isAppTab(rawContext.tab) ||
        rawContext.tab !== rawTab ||
        !isFreshNavigationTimestamp(rawContext.createdAt)
      ) {
        shouldRewrite = true;
        continue;
      }

      const sourceTab =
        rawContext.sourceTab === undefined
          ? undefined
          : isAppTab(rawContext.sourceTab)
            ? rawContext.sourceTab
            : undefined;
      if (rawContext.sourceTab !== undefined && sourceTab === undefined) {
        shouldRewrite = true;
        continue;
      }

      const workspaceId = normalizeWorkspaceId(rawContext.workspaceId);
      if (rawContext.workspaceId !== undefined && workspaceId === undefined) {
        shouldRewrite = true;
        continue;
      }

      const reason = normalizeOptionalReason(rawContext.reason);
      if (rawContext.reason !== undefined && reason === undefined) {
        shouldRewrite = true;
        continue;
      }

      normalized[rawTab] = {
        tab: rawContext.tab,
        intent: rawContext.intent,
        sourceTab,
        reason,
        workspaceId,
        createdAt: rawContext.createdAt,
      };
    }

    if (shouldRewrite) {
      writeTabNavigationContextMap(normalized);
    }

    return normalized;
  } catch {
    return {};
  }
};

const writeTabNavigationContextMap = (
  value: Partial<Record<AppTab, AppTabNavigationContext>>,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      APP_TAB_NAVIGATION_CONTEXT_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {
    // Ignore localStorage write errors in restricted environments.
  }
};

export const queueTabNavigationContext = (
  value: Omit<AppTabNavigationContext, "createdAt">,
) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextMap = readTabNavigationContextMap();
  const reason = normalizeOptionalReason(value.reason);
  const workspaceId = normalizeWorkspaceId(value.workspaceId);
  nextMap[value.tab] = {
    ...value,
    reason,
    workspaceId: workspaceId ?? null,
    createdAt: new Date().toISOString(),
  };
  writeTabNavigationContextMap(nextMap);
};

export const consumeTabNavigationContext = (
  tab: AppTab,
): AppTabNavigationContext | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const nextMap = readTabNavigationContextMap();
  const target = nextMap[tab] ?? null;
  if (!target) {
    return null;
  }

  delete nextMap[tab];
  writeTabNavigationContextMap(nextMap);
  return target;
};

const clearTabNavigationContext = (tab: AppTab) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextMap = readTabNavigationContextMap();
  if (!nextMap[tab]) {
    return;
  }

  delete nextMap[tab];
  writeTabNavigationContextMap(nextMap);
};

export const clearAllTabNavigationContexts = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(APP_TAB_NAVIGATION_CONTEXT_STORAGE_KEY);
  } catch {
    // Ignore localStorage write errors in restricted environments.
  }
};

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Payment Control",
    description: "Keep daily money control simple with one short recurring routine.",
    tab: "reminders",
    bullets: [
      "First step: open Recurring and add your first payment.",
      "Use Mark paid / Undo paid directly from payment cards.",
      "Templates are scenario-specific: personal and family are independent.",
    ],
  },
  {
    title: "What this app does",
    description: "Home gives a compact snapshot of what needs attention today.",
    tab: "home",
    bullets: [
      "Use Home for a calm snapshot, not for deep management.",
      "Open Recurring for actions and History for proof of changes.",
      "Start with one recurring payment, then grow from real usage.",
    ],
  },
  {
    title: "History shows recent updates",
    description: "Use History to quickly review recent shared and personal payment events.",
    tab: "history",
    bullets: [
      "History is your lightweight activity feed.",
      "See what changed and when, without extra dashboard noise.",
      "If empty, do one action in Recurring and check back here.",
    ],
  },
  {
    title: "Profile controls workspace context",
    description: "Use Profile to switch workspace, manage family invite and check account context.",
    tab: "profile",
    bullets: [
      "Use Profile for workspace, language, and family setup.",
      "Use one-time family invites: generate, share, then generate again later.",
      "Need to stop a popular subscription? Open official cancellation guides in Profile.",
      "Use ? help on each screen when details are needed.",
    ],
  },
];

export function AppShell({ screens }: AppShellProps) {
  const { tr } = useLocalization();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  const handleTabClick = useCallback((tab: AppTab) => {
    clearTabNavigationContext(tab);
    const inferredWorkspaceId = readRuntimeSnapshot()?.workspaceId ?? null;
    setActiveTab((current) => {
      if (tab === "home" && current !== "home") {
        rememberRuntimeSnapshot({
          tab: current,
          sourceTab: "home",
          reason: "Continue from tab bar selection.",
          workspaceId: inferredWorkspaceId,
        });
      } else {
        rememberRuntimeSnapshot({
          tab,
          sourceTab: current,
          reason: "Continue from tab bar selection.",
          workspaceId: inferredWorkspaceId,
        });
      }
      return tab;
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  useEffect(() => {
    let frame = 0;

    try {
      const isCompleted = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
      if (!isCompleted) {
        frame = window.requestAnimationFrame(() => {
          setIsOnboardingVisible(true);
        });
      }
    } catch {
      frame = window.requestAnimationFrame(() => {
        setIsOnboardingVisible(true);
      });
    }

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnboardingReplay = () => {
      setOnboardingStepIndex(0);
      setIsOnboardingVisible(true);
    };

    window.addEventListener(ONBOARDING_REPLAY_EVENT, handleOnboardingReplay);
    return () => {
      window.removeEventListener(ONBOARDING_REPLAY_EVENT, handleOnboardingReplay);
    };
  }, []);

  useEffect(() => {
    const handleTabNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<AppTabNavigationEventDetail>;
      const targetTab = customEvent.detail?.tab;
      if (!targetTab) {
        return;
      }

      if (!tabItems.some((item) => item.key === targetTab)) {
        return;
      }

      if (customEvent.detail?.intent) {
        queueTabNavigationContext({
          tab: targetTab,
          intent: customEvent.detail.intent,
          sourceTab: customEvent.detail.sourceTab,
          reason: customEvent.detail.reason,
          workspaceId: customEvent.detail.workspaceId,
        });
      } else {
        clearTabNavigationContext(targetTab);
      }

      rememberRuntimeSnapshot({
        tab: targetTab,
        intent: customEvent.detail?.intent,
        sourceTab: customEvent.detail?.sourceTab,
        reason:
          customEvent.detail?.reason ??
          (customEvent.detail?.intent
            ? "Continue from previous flow."
            : "Continue from tab navigation."),
        workspaceId: customEvent.detail?.workspaceId,
      });
      setActiveTab(targetTab);
    };

    window.addEventListener(APP_TAB_NAVIGATE_EVENT, handleTabNavigation as EventListener);
    return () => {
      window.removeEventListener(
        APP_TAB_NAVIGATE_EVENT,
        handleTabNavigation as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOnboardingVisible) {
      return;
    }

    const stepTab = onboardingSteps[onboardingStepIndex]?.tab;
    if (!stepTab) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setActiveTab(stepTab);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOnboardingVisible, onboardingStepIndex]);

  useEffect(() => {
    if (!isOnboardingVisible) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOnboardingVisible]);

  const closeOnboarding = () => {
    setIsOnboardingVisible(false);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    } catch {
      // Ignore localStorage write errors in restricted environments.
    }
  };

  const activeOnboardingStep = onboardingSteps[onboardingStepIndex];
  const isLastOnboardingStep = onboardingStepIndex === onboardingSteps.length - 1;
  const activeOnboardingTabItem = activeOnboardingStep
    ? tabItems.find((item) => item.key === activeOnboardingStep.tab) ?? null
    : null;
  const onboardingOverlay =
    typeof document !== "undefined" && isOnboardingVisible && activeOnboardingStep
      ? createPortal(
          <div className="pc-modal-overlay z-[80]">
            <div
              className="pc-modal-dialog w-full max-w-md p-3.5"
              style={{
                maxHeight:
                  "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-text-muted">
                    {tr("Quick start")}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-app-text-muted">
                    {activeOnboardingTabItem ? (
                      <>
                        <AppIcon name={activeOnboardingTabItem.icon} className="h-3.5 w-3.5" />
                        {tr(activeOnboardingTabItem.label)}
                      </>
                    ) : (
                      tr("Payment Control")
                    )}
                  </p>
                </div>
                <span className="pc-status-pill">
                  {tr("Step {current} of {total}", {
                    current: onboardingStepIndex + 1,
                    total: onboardingSteps.length,
                  })}
                </span>
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-tight text-app-text">
                {tr(activeOnboardingStep.title)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-app-text-muted">
                {tr(activeOnboardingStep.description)}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {activeOnboardingStep.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="pc-state-card flex items-start gap-1.5 text-xs leading-relaxed text-app-text-muted"
                  >
                    <AppIcon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{tr(bullet)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeOnboarding}
                  className="pc-btn-quiet"
                >
                  {tr("Skip")}
                </button>
                <div className="flex items-center gap-1.5">
                  {onboardingStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setOnboardingStepIndex((current) => current - 1)}
                      className="pc-btn-secondary"
                    >
                      {tr("Back")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isLastOnboardingStep) {
                        closeOnboarding();
                        return;
                      }
                      setOnboardingStepIndex((current) => current + 1);
                    }}
                    className="pc-btn-primary min-w-[96px]"
                  >
                    {isLastOnboardingStep ? tr("Finish") : tr("Next")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-1.5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5 sm:px-2.5">
        <div className="pc-shell-frame relative flex min-h-[calc(100dvh-0.75rem)] flex-1 flex-col p-2 backdrop-blur">
          <header className="pc-shell-header mb-1.5 flex items-center justify-between gap-2">
            <p className="pc-kicker">{tr("Payment Control")}</p>
          </header>

          <main className="relative z-0 flex-1 overflow-x-clip pb-2 pt-0.5">
            <div key={activeTab} className="app-screen-enter pc-screen-stack">
              {screens[activeTab]}
            </div>
          </main>

          <footer className="pc-tabbar sticky bottom-1 z-40 mt-2 p-1.25 backdrop-blur supports-[backdrop-filter]:bg-app-surface/90 [padding-bottom:calc(env(safe-area-inset-bottom)+0.3rem)]">
            <div className="grid grid-cols-5 gap-1">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabClick(tab.key)}
                  aria-current={activeTab === tab.key ? "page" : undefined}
                  aria-label={tr(tab.label)}
                  className={`pc-tab-btn group touch-manipulation px-1.5 py-1 text-center ${
                    activeTab === tab.key ? "pc-tab-btn-active" : ""
                  }`}
                >
                  <span
                    className={`transition ${
                      activeTab === tab.key
                        ? "text-white"
                        : "text-app-text-muted group-hover:text-app-text"
                    }`}
                  >
                    <AppIcon name={tab.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span
                    className={`mt-0.5 w-full whitespace-nowrap text-[11px] font-semibold leading-4 ${
                      activeTab === tab.key
                        ? "text-white"
                        : "text-app-text-muted group-hover:text-app-text"
                    }`}
                  >
                    {tr(tab.label)}
                  </span>
                </button>
              ))}
            </div>
          </footer>
        </div>
      </div>
      {onboardingOverlay}
    </>
  );
}

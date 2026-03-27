"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalization } from "@/lib/i18n/localization";

type AppShellProps = {
  screens: Record<AppTab, React.ReactNode>;
};

export type AppTab = "home" | "reminders" | "history" | "profile";

type OnboardingStep = {
  title: string;
  description: string;
  tab: AppTab;
  bullets: string[];
};

const tabItems: ReadonlyArray<{ key: AppTab; label: string }> = [
  { key: "home", label: "Home" },
  { key: "reminders", label: "Reminders" },
  { key: "history", label: "History" },
  { key: "profile", label: "Profile" },
];

export const ONBOARDING_STORAGE_KEY = "payment_control_onboarding_v10c_done";
export const ONBOARDING_REPLAY_EVENT = "payment-control-replay-onboarding";

const onboardingSteps: OnboardingStep[] = [
  {
    title: "What this app does",
    description: "Track recurring payments and close each cycle on time.",
    tab: "home",
    bullets: [
      "Home is a quick status screen only.",
      "Reminders is the main place for daily actions.",
      "History stores proof of recent changes.",
    ],
  },
  {
    title: "Start with one payment",
    description: "Open Reminders and add one recurring payment first.",
    tab: "reminders",
    bullets: [
      "Set title, amount, cadence, and due day.",
      "Use Mark paid when paid, Undo paid if it was accidental.",
      "Keep reminders enabled unless you have a clear reason to disable them.",
    ],
  },
  {
    title: "Keep payments and subscriptions separate",
    description: "Use the list switch to review each type without mixing them.",
    tab: "reminders",
    bullets: [
      "Payments: regular bills and obligations.",
      "Subscriptions: recurring services that can be paused or resumed.",
      "Templates are scenario-specific: personal and family are independent.",
    ],
  },
  {
    title: "Use History to verify actions",
    description: "Open History after important changes to confirm what happened.",
    tab: "history",
    bullets: [
      "Check timestamps and latest updates quickly.",
      "In family mode, review Who pays and Paid by after each cycle.",
      "If History is empty, complete one action in Reminders first.",
    ],
  },
  {
    title: "Profile controls context",
    description: "Manage workspace, language, onboarding replay, and family invite here.",
    tab: "profile",
    bullets: [
      "Switch RU/EN and keep the correct active workspace.",
      "Family invite is one-time: generate, share, then create a new one later.",
      "Use Show onboarding again when onboarding needs a quick refresh.",
    ],
  },
];

const renderTabIcon = (tab: AppTab) => {
  const iconClassName = "h-[18px] w-[18px]";

  if (tab === "home") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClassName}
        aria-hidden="true"
      >
        <path d="M3.5 10.5 12 4l8.5 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
      </svg>
    );
  }

  if (tab === "reminders") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClassName}
        aria-hidden="true"
      >
        <path d="M8 5h8a4 4 0 0 1 4 4v10H4V9a4 4 0 0 1 4-4Z" />
        <path d="M9 3h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    );
  }

  if (tab === "history") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClassName}
        aria-hidden="true"
      >
        <path d="M12 6v6l4 2" />
        <path d="M4.5 12A7.5 7.5 0 1 0 7 6.5" />
        <path d="M4 6.5h3v3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
};

export function AppShell({ screens }: AppShellProps) {
  const { tr } = useLocalization();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  const handleTabClick = useCallback((tab: AppTab) => {
    setActiveTab(tab);
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

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-3 pb-4 pt-3 sm:px-4 sm:pt-4">
      <main className="relative z-0 flex-1 pb-24">
        <div key={activeTab} className="space-y-2.5">
          {screens[activeTab]}
        </div>
      </main>

      <footer className="sticky bottom-2 z-40 mt-4 rounded-[26px] border border-app-border/80 bg-app-surface/95 p-1.5 shadow-[0_12px_28px_rgba(19,32,20,0.12)] backdrop-blur supports-[backdrop-filter]:bg-app-surface/90 [padding-bottom:calc(env(safe-area-inset-bottom)+0.35rem)]">
        <div className="grid grid-cols-4 gap-1">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              aria-current={activeTab === tab.key ? "page" : undefined}
              className={`group flex min-h-14 touch-manipulation flex-col items-center justify-center rounded-2xl border px-1.5 py-1.5 text-center transition ${
                activeTab === tab.key
                  ? "border-app-accent bg-app-accent text-white shadow-[0_8px_16px_rgba(31,122,67,0.28)]"
                  : "border-transparent bg-transparent text-app-text-muted"
              }`}
            >
              <span
                className={`transition ${
                  activeTab === tab.key
                    ? "text-white"
                    : "text-app-text-muted group-hover:text-app-text"
                }`}
              >
                {renderTabIcon(tab.key)}
              </span>
              <span
                className={`mt-1 w-full whitespace-nowrap text-[11px] font-semibold leading-4 ${
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

      {isOnboardingVisible && activeOnboardingStep && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-app-border bg-app-surface p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-text-muted">
              {tr("Quick start")}
            </p>
            <p className="mt-1 text-base font-semibold text-app-text">
              {tr(activeOnboardingStep.title)}
            </p>
            <p className="mt-1 text-sm text-app-text-muted">
              {tr(activeOnboardingStep.description)}
            </p>
            <ul className="mt-2 space-y-1">
              {activeOnboardingStep.bullets.map((bullet) => (
                <li key={bullet} className="text-xs text-app-text-muted">
                  - {tr(bullet)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-app-text-muted">
              {tr("Step {current} of {total}", {
                current: onboardingStepIndex + 1,
                total: onboardingSteps.length,
              })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={closeOnboarding}
                className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text"
              >
                {tr("Skip")}
              </button>
              {onboardingStepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setOnboardingStepIndex((current) => current - 1)}
                  className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text"
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
                className="rounded-xl bg-app-accent px-3 py-2 text-xs font-semibold text-white"
              >
                {isLastOnboardingStep ? tr("Finish") : tr("Next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import { useCallback, useEffect, useState } from "react";

type AppShellProps = {
  screens: Record<AppTab, React.ReactNode>;
};

export type AppTab = "home" | "reminders" | "history" | "profile";

type OnboardingStep = {
  title: string;
  description: string;
  tab: AppTab;
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
    title: "Welcome to Payment Control",
    description: "Home gives a compact snapshot of what needs attention today.",
    tab: "home",
  },
  {
    title: "Reminders is your main working screen",
    description:
      "Use recurring cards for Mark paid / Undo paid and quick subscription control.",
    tab: "reminders",
  },
  {
    title: "History shows recent updates",
    description:
      "Use History to quickly review recent shared and personal payment events.",
    tab: "history",
  },
  {
    title: "Profile controls workspace context",
    description:
      "Use Profile to switch workspace, manage family invite and check account context.",
    tab: "profile",
  },
];

export function AppShell({ screens }: AppShellProps) {
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
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-5">
      <header className="rounded-3xl border border-app-border bg-app-surface/95 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
          Telegram Mini App
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-app-text">
          Payment Control
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-app-text-muted">
            Foundation for recurring payments and household tracking
          </p>
          <span className="rounded-full bg-app-warm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-text">
            Phase 11D
          </span>
        </div>
      </header>

      <main className="relative z-0 mt-4 flex-1 pb-24">
        <div key={activeTab} className="space-y-3">
          {screens[activeTab]}
        </div>
      </main>

      <footer className="sticky bottom-2 z-40 mt-4 rounded-3xl border border-app-border bg-app-surface p-2 shadow-sm [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="grid grid-cols-4 gap-2 text-xs font-medium">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              aria-current={activeTab === tab.key ? "page" : undefined}
              className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
                activeTab === tab.key
                  ? "bg-app-accent text-white"
                  : "bg-app-surface-soft text-app-text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </footer>

      {isOnboardingVisible && activeOnboardingStep && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-app-border bg-app-surface p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-text-muted">
              Quick start
            </p>
            <p className="mt-1 text-base font-semibold text-app-text">
              {activeOnboardingStep.title}
            </p>
            <p className="mt-1 text-sm text-app-text-muted">
              {activeOnboardingStep.description}
            </p>
            <p className="mt-2 text-[11px] text-app-text-muted">
              Step {onboardingStepIndex + 1} of {onboardingSteps.length}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={closeOnboarding}
                className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text"
              >
                Skip
              </button>
              {onboardingStepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setOnboardingStepIndex((current) => current - 1)}
                  className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text"
                >
                  Back
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
                {isLastOnboardingStep ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

type AppShellProps = {
  children: React.ReactNode;
};

type AppTab = "home" | "activity" | "profile";

type OnboardingStep = {
  title: string;
  description: string;
  tab: AppTab;
};

const tabTargets: Record<AppTab, string> = {
  home: "home-section",
  activity: "activity-section",
  profile: "profile-section",
};

const tabHashes: Record<AppTab, string> = {
  home: "#home-section",
  activity: "#activity-section",
  profile: "#profile-section",
};

const hashToTab: Record<string, AppTab> = {
  "#home-section": "home",
  "#activity-section": "activity",
  "#profile-section": "profile",
};

const ONBOARDING_STORAGE_KEY = "payment_control_onboarding_v10c_done";

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Payment Control",
    description:
      "Start on Home. Dashboard, reminders and recurring cards are your daily workspace.",
    tab: "home",
  },
  {
    title: "Recurring is your main action area",
    description:
      "Open recurring cards to use Mark paid / Undo paid, review Who pays and Paid by.",
    tab: "home",
  },
  {
    title: "Activity shows recent updates",
    description:
      "Use Activity to quickly check recent shared and personal payment events.",
    tab: "activity",
  },
  {
    title: "Profile controls workspace context",
    description:
      "Use Profile to switch workspace, manage family invite and check account context.",
    tab: "profile",
  },
];

export function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  useEffect(() => {
    const syncActiveTabFromHash = () => {
      const nextTab = hashToTab[window.location.hash];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    };

    syncActiveTabFromHash();
    window.addEventListener("hashchange", syncActiveTabFromHash);
    return () => {
      window.removeEventListener("hashchange", syncActiveTabFromHash);
    };
  }, []);

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

  const handleTabClick = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    const targetId = tabTargets[tab];
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      handleTabClick(stepTab);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [handleTabClick, isOnboardingVisible, onboardingStepIndex]);

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
        <p className="mt-1 text-sm text-app-text-muted">
          Foundation for recurring payments and household tracking
        </p>
      </header>

      <main className="relative z-0 mt-4 flex-1 space-y-3 pb-24">{children}</main>

      <footer className="sticky bottom-2 z-40 mt-4 rounded-3xl border border-app-border bg-app-surface p-2 shadow-sm [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="grid grid-cols-3 gap-2 text-xs font-medium">
          <a
            href={tabHashes.home}
            onClick={(event) => {
              event.preventDefault();
              handleTabClick("home");
            }}
            aria-current={activeTab === "home" ? "page" : undefined}
            className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
              activeTab === "home"
                ? "bg-app-accent text-white"
                : "bg-app-surface-soft text-app-text-muted"
            }`}
          >
            Home
          </a>
          <a
            href={tabHashes.activity}
            onClick={(event) => {
              event.preventDefault();
              handleTabClick("activity");
            }}
            aria-current={activeTab === "activity" ? "page" : undefined}
            className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
              activeTab === "activity"
                ? "bg-app-accent text-white"
                : "bg-app-surface-soft text-app-text-muted"
            }`}
          >
            Activity
          </a>
          <a
            href={tabHashes.profile}
            onClick={(event) => {
              event.preventDefault();
              handleTabClick("profile");
            }}
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
              activeTab === "profile"
                ? "bg-app-accent text-white"
                : "bg-app-surface-soft text-app-text-muted"
            }`}
          >
            Profile
          </a>
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

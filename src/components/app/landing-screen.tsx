"use client";

import { useEffect, useMemo, useState } from "react";
import { clientEnv } from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";
import {
  APP_TAB_NAVIGATE_EVENT,
  clearAllTabNavigationContexts,
  type AppTabNavigationEventDetail,
} from "@/components/app/app-shell";
import {
  clearAllContextMemory,
  readRuntimeSnapshot,
  type RuntimeContextSnapshot,
} from "@/lib/app/context-memory";

type LandingScreenProps = {
  workspaceId?: string | null;
};

const resolveResumeLabel = (
  snapshot: RuntimeContextSnapshot,
  tr: (text: string, params?: Record<string, string | number>) => string,
): string => {
  if (snapshot.tab === "reminders") {
    if (snapshot.intent === "reminders_add_payment") {
      return tr("Resume Reminders add-payment flow");
    }

    if (snapshot.intent === "reminders_action_now") {
      return tr("Resume action-now Reminders");
    }

    if (snapshot.intent === "reminders_upcoming") {
      return tr("Resume upcoming Reminders");
    }

    return tr("Resume Reminders");
  }

  if (snapshot.tab === "history") {
    if (snapshot.intent === "history_recent_paid") {
      return tr("Resume paid-events History");
    }

    if (snapshot.intent === "history_recent_updates") {
      return tr("Resume History updates");
    }

    return tr("Resume History");
  }

  return tr("Resume last tab");
};

export function LandingScreen({ workspaceId = null }: LandingScreenProps) {
  const { tr } = useLocalization();
  const [resumeRevision, setResumeRevision] = useState(0);

  useEffect(() => {
    const handleFocus = () => {
      setResumeRevision((current) => current + 1);
    };
    const handleStorage = () => {
      setResumeRevision((current) => current + 1);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const resumeSnapshot = useMemo(() => {
    void resumeRevision;
    const nextSnapshot = readRuntimeSnapshot({ workspaceId });
    if (
      !nextSnapshot ||
      nextSnapshot.tab === "home" ||
      nextSnapshot.tab === "profile"
    ) {
      return null;
    }

    return nextSnapshot;
  }, [resumeRevision, workspaceId]);

  const openReminders = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AppTabNavigationEventDetail>(APP_TAB_NAVIGATE_EVENT, {
        detail: {
          tab: "reminders",
          intent: "reminders_add_payment",
          sourceTab: "home",
          reason: "Open add-payment flow from Home.",
          workspaceId,
        },
      }),
    );
  };

  const continueLastSession = () => {
    if (typeof window === "undefined" || !resumeSnapshot) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AppTabNavigationEventDetail>(APP_TAB_NAVIGATE_EVENT, {
        detail: {
          tab: resumeSnapshot.tab,
          intent: resumeSnapshot.intent,
          sourceTab: "home",
          reason: resumeSnapshot.reason ?? "Continue from last saved context.",
          workspaceId: resumeSnapshot.workspaceId ?? workspaceId,
        },
      }),
    );
  };

  const startCleanSession = () => {
    clearAllContextMemory();
    clearAllTabNavigationContexts();
    setResumeRevision((current) => current + 1);
  };

  const resumeLabel = useMemo(() => {
    if (!resumeSnapshot) {
      return "";
    }

    return resolveResumeLabel(resumeSnapshot, tr);
  }, [resumeSnapshot, tr]);

  return (
    <section className="pc-surface pc-screen-stack bg-gradient-to-b from-app-surface to-app-surface-soft/45">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="pc-kicker">
            {tr("Today focus")}
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-app-text">
            {tr("Payment Control")}
          </h1>
          <p className="pc-section-subtitle">
            {tr("One short routine: Reminders for actions, History for proof.")}
          </p>
        </div>
        <span className="pc-state-card inline-flex h-9 w-9 items-center justify-center p-0 text-app-accent">
          <AppIcon name="home" className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={openReminders}
          className="pc-btn-primary w-full gap-2"
        >
          <AppIcon name="add" className="h-4 w-4" />
          {tr("Open Reminders and add payment")}
        </button>
      </div>

      {resumeSnapshot && (
        <div className="pc-detail-surface">
          <p className="text-xs font-semibold text-app-text">{tr("Continue where you left off")}</p>
          <p className="mt-0.5 text-[11px] text-app-text-muted">
            {tr("Resume your last working context in one tap, or start clean.")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={continueLastSession}
              className="pc-btn-secondary"
            >
              <AppIcon name="refresh" className="h-3.5 w-3.5" />
              {resumeLabel}
            </button>
            <button
              type="button"
              onClick={startCleanSession}
              className="pc-btn-quiet"
            >
              {tr("Start clean")}
            </button>
          </div>
        </div>
      )}

      {clientEnv.appStage !== "production" && clientEnv.appStage !== "prod" && (
        <div className="pc-state-inline">
          <AppIcon name="workspace" className="h-3.5 w-3.5" />
          <span>
            {tr("Runtime stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
          </span>
        </div>
      )}
    </section>
  );
}

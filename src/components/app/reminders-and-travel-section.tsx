"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import { AppIcon } from "@/components/app/app-icon";
import {
  APP_TAB_NAVIGATE_EVENT,
  type AppTabNavigationEventDetail,
} from "@/components/app/app-shell";
import { useLocalization } from "@/lib/i18n/localization";
import { RecurringPaymentsSection } from "@/components/app/recurring-payments-section";
import { TravelGroupExpensesSection } from "@/components/app/travel-group-expenses-section";

type RemindersAndTravelSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
};

type RemindersSurfaceMode = "recurring" | "travel";

const LANE_STORAGE_KEY = "payment_control_reminders_surface_mode_v28a";

const readStoredMode = (workspaceId: string | null): RemindersSurfaceMode => {
  if (typeof window === "undefined" || !workspaceId) {
    return "recurring";
  }

  try {
    const raw = window.localStorage.getItem(LANE_STORAGE_KEY);
    if (!raw) {
      return "recurring";
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed[workspaceId];
    if (value === "travel") {
      return "travel";
    }

    return "recurring";
  } catch {
    return "recurring";
  }
};

const writeStoredMode = (
  workspaceId: string | null,
  mode: RemindersSurfaceMode,
): void => {
  if (typeof window === "undefined" || !workspaceId) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LANE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed[workspaceId] = mode;
    window.localStorage.setItem(LANE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage write errors.
  }
};

export function RemindersAndTravelSection({
  workspace,
  initData,
}: RemindersAndTravelSectionProps) {
  const { tr } = useLocalization();
  const workspaceId = workspace?.id ?? null;
  const [mode, setMode] = useState<RemindersSurfaceMode>("recurring");

  useEffect(() => {
    setMode(readStoredMode(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    writeStoredMode(workspaceId, mode);
  }, [workspaceId, mode]);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<AppTabNavigationEventDetail>).detail;
      if (!detail || detail.tab !== "reminders") {
        return;
      }

      if (detail.intent?.startsWith("reminders_")) {
        setMode("recurring");
      }
    };

    window.addEventListener(APP_TAB_NAVIGATE_EVENT, handleNavigate);
    return () => {
      window.removeEventListener(APP_TAB_NAVIGATE_EVENT, handleNavigate);
    };
  }, []);

  const modeSubtitle = useMemo(() => {
    if (mode === "travel") {
      return tr("Travel mode keeps group trip expenses separate from recurring reminders.");
    }

    return tr("Recurring mode keeps your day-to-day reminders workflow.");
  }, [mode, tr]);

  return (
    <div className="pc-screen-stack">
      <section className="pc-surface">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="pc-kicker">{tr("Work mode")}</p>
            <h2 className="pc-section-title mt-1">
              <AppIcon name="reminders" className="h-4 w-4" />
              {tr("Reminders workspace")}
            </h2>
            <p className="pc-section-subtitle">{modeSubtitle}</p>
          </div>
          <span className="pc-state-card inline-flex h-9 w-9 items-center justify-center p-0 text-app-accent">
            <AppIcon
              name={mode === "travel" ? "travel" : "reminders"}
              className="h-[18px] w-[18px]"
            />
          </span>
        </div>
        <div className="pc-segmented mt-2">
          <button
            type="button"
            aria-pressed={mode === "recurring"}
            onClick={() => setMode("recurring")}
            className={`pc-segment-btn min-h-8 ${
              mode === "recurring" ? "pc-segment-btn-active" : ""
            }`}
          >
            <AppIcon name="reminders" className="h-3.5 w-3.5" />
            {tr("Recurring")}
          </button>
          <button
            type="button"
            aria-pressed={mode === "travel"}
            onClick={() => setMode("travel")}
            className={`pc-segment-btn min-h-8 ${
              mode === "travel" ? "pc-segment-btn-active" : ""
            }`}
          >
            <AppIcon name="travel" className="h-3.5 w-3.5" />
            {tr("Travel groups")}
          </button>
        </div>
      </section>

      <div className={mode === "recurring" ? "" : "hidden"}>
        <RecurringPaymentsSection workspace={workspace} initData={initData} />
      </div>

      {mode === "travel" && (
        <TravelGroupExpensesSection workspace={workspace} initData={initData} />
      )}
    </div>
  );
}

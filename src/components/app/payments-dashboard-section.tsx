"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  PAYMENTS_CHANGED_EVENT,
  readPaymentsDashboard,
} from "@/lib/payments/client";
import { useLocalization } from "@/lib/i18n/localization";
import type {
  DashboardPaymentItemPayload,
  PaymentsDashboardPayload,
} from "@/lib/payments/types";
import { AppIcon } from "@/components/app/app-icon";

type PaymentsDashboardSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
  variant?: "full" | "compact";
};

const formatAmount = (item: DashboardPaymentItemPayload): string => {
  return `${item.amount.toFixed(2)} ${item.currency}`;
};

const formatDueDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
};

const DashboardBucket = ({
  title,
  items,
  emptyLabel,
  dueLabel,
}: {
  title: string;
  items: DashboardPaymentItemPayload[];
  emptyLabel: string;
  dueLabel: string;
}) => {
  return (
    <article className="rounded-2xl border border-app-border bg-app-surface-soft p-3">
      <h3 className="text-sm font-semibold text-app-text">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-app-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl bg-app-surface px-2 py-1.5 text-xs text-app-text"
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-app-text-muted">
                {formatAmount(item)} - {dueLabel} {formatDueDate(item.dueDate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};

export function PaymentsDashboardSection({
  workspace,
  initData,
  variant = "full",
}: PaymentsDashboardSectionProps) {
  const { tr } = useLocalization();
  const [dashboard, setDashboard] = useState<PaymentsDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isFamilyWorkspace = workspace?.kind === "family";
  const isCompact = variant === "compact";

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return tr("Load current workspace first to view dashboard.");
    }

    if (
      workspace.kind === "personal" &&
      workspace.id.startsWith("virtual-personal-")
    ) {
      return tr(
        "Workspace persistence is not initialized. Apply workspace migrations first.",
      );
    }

    return null;
  }, [workspace, tr]);

  const hasAnyActivePayments = useMemo(() => {
    if (!dashboard) {
      return false;
    }

    return (
      dashboard.summary.paidThisCycleCount + dashboard.summary.unpaidThisCycleCount > 0
    );
  }, [dashboard]);

  const loadDashboard = useCallback(async () => {
    if (workspaceUnavailable) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await readPaymentsDashboard(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setDashboard(result.dashboard);
    } catch {
      setFeedback(tr("Failed to load dashboard summary."));
    } finally {
      setIsLoading(false);
    }
  }, [initData, tr, workspaceUnavailable]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const refreshOnPaymentChange = () => {
      loadDashboard();
    };

    window.addEventListener(PAYMENTS_CHANGED_EVENT, refreshOnPaymentChange);
    return () => {
      window.removeEventListener(PAYMENTS_CHANGED_EVENT, refreshOnPaymentChange);
    };
  }, [loadDashboard]);

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-app-text">
          <AppIcon name={isCompact ? "home" : "payments"} className="h-4 w-4" />
          {isCompact ? tr("Payment snapshot") : tr("Dashboard")}
        </h2>
        <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
          {tr("Phase 16A")}
        </span>
      </div>

      {workspaceUnavailable ? (
        <p className="rounded-xl bg-app-surface-soft px-3 py-2 text-sm text-app-text-muted">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          {isCompact ? (
            <>
              {dashboard && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Due today")}</p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.dueTodayCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Upcoming")}</p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.upcomingCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Overdue")}</p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.overdueCount}
                    </p>
                  </div>
                </div>
              )}

              {dashboard && !hasAnyActivePayments && (
                <div className="mt-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                  <p className="text-sm font-semibold text-app-text">
                    {tr("No payments yet")}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr("Open Reminders and add your first recurring payment.")}
                  </p>
                </div>
              )}

              {dashboard && hasAnyActivePayments && (
                <p className="mt-2 text-xs text-app-text-muted">
                  {tr("Paid")} {dashboard.summary.paidThisCycleCount} | {tr("Unpaid")}{" "}
                  {dashboard.summary.unpaidThisCycleCount}
                  {isFamilyWorkspace
                    ? ` | ${tr("Mismatch")} ${dashboard.summary.paidByMismatchCount}`
                    : ""}
                </p>
              )}

              {hasAnyActivePayments && (
                <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                    {tr("Due now details")}
                  </summary>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <DashboardBucket
                      title={tr("Due today")}
                      items={(dashboard?.dueToday ?? []).slice(0, 3)}
                      emptyLabel={tr("No unpaid payments due today.")}
                      dueLabel={tr("Due")}
                    />
                    <DashboardBucket
                      title={tr("Overdue")}
                      items={(dashboard?.overdue ?? []).slice(0, 3)}
                      emptyLabel={tr("No overdue unpaid payments.")}
                      dueLabel={tr("Due")}
                    />
                  </div>
                </details>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
                >
                  {tr("Refresh snapshot")}
                </button>
                {isLoading && (
                  <p className="text-xs text-app-text-muted">{tr("Loading snapshot...")}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {isFamilyWorkspace
                    ? tr("Family workspace overview")
                    : tr("Personal workspace overview")}
                </p>
              </div>

              {dashboard && (
                <div
                  className={`grid grid-cols-2 gap-2 ${
                    isFamilyWorkspace ? "md:grid-cols-6" : "md:grid-cols-5"
                  }`}
                >
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Due today").toLowerCase()}`
                        : tr("Due today")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.dueTodayCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Upcoming").toLowerCase()}`
                        : tr("Upcoming")} (
                      {dashboard.summary.upcomingWindowDays}d)
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.upcomingCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Overdue").toLowerCase()}`
                        : tr("Overdue")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.overdueCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Paid").toLowerCase()}`
                        : tr("Paid")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.paidThisCycleCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-app-surface-soft p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Unpaid").toLowerCase()}`
                        : tr("Unpaid")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.unpaidThisCycleCount}
                    </p>
                  </div>
                  {isFamilyWorkspace && (
                    <div className="rounded-xl bg-app-surface-soft p-2">
                      <p className="text-[11px] text-app-text-muted">
                        {tr("Paid mismatch hints")}
                      </p>
                      <p className="text-base font-semibold text-app-text">
                        {dashboard.summary.paidByMismatchCount}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isFamilyWorkspace && dashboard && !hasAnyActivePayments && (
                <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                    <p className="text-sm font-semibold text-app-text">
                    {tr("No shared recurring payments yet")}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr(
                      "Add your first shared payment below. Invite members from Profile when needed.",
                    )}
                  </p>
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <DashboardBucket
                  title={
                    isFamilyWorkspace
                      ? `${tr("Shared")} ${tr("Due today").toLowerCase()}`
                      : tr("Due today")
                  }
                  items={dashboard?.dueToday ?? []}
                  emptyLabel={
                    isFamilyWorkspace
                      ? tr("No unpaid payments due today.")
                      : tr("No unpaid payments due today.")
                  }
                  dueLabel={tr("Due")}
                />
                <DashboardBucket
                  title={`${
                    isFamilyWorkspace
                      ? `${tr("Shared")} ${tr("Upcoming").toLowerCase()}`
                      : tr("Upcoming")
                  } (${dashboard?.summary.upcomingWindowDays ?? 0}d)`}
                  items={dashboard?.upcoming ?? []}
                  emptyLabel={
                    isFamilyWorkspace
                      ? tr("No unpaid payments in upcoming window.")
                      : tr("No unpaid payments in upcoming window.")
                  }
                  dueLabel={tr("Due")}
                />
                <DashboardBucket
                  title={
                    isFamilyWorkspace
                      ? `${tr("Shared")} ${tr("Overdue").toLowerCase()}`
                      : tr("Overdue")
                  }
                  items={dashboard?.overdue ?? []}
                  emptyLabel={
                    isFamilyWorkspace
                      ? tr("No overdue unpaid payments.")
                      : tr("No overdue unpaid payments.")
                  }
                  dueLabel={tr("Due")}
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
                >
                  {isFamilyWorkspace ? tr("Refresh family section") : tr("Refresh dashboard")}
                </button>
                {isLoading && (
                  <p className="text-xs text-app-text-muted">
                    {isFamilyWorkspace
                      ? tr("Loading family overview...")
                      : tr("Loading dashboard...")}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {feedback && (
        <p className="mt-3 text-xs font-medium text-app-text">{feedback}</p>
      )}
    </section>
  );
}


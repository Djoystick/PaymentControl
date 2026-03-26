"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  PAYMENTS_CHANGED_EVENT,
  readPaymentsDashboard,
} from "@/lib/payments/client";
import type {
  DashboardPaymentItemPayload,
  PaymentsDashboardPayload,
} from "@/lib/payments/types";

type PaymentsDashboardSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
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
}: {
  title: string;
  items: DashboardPaymentItemPayload[];
  emptyLabel: string;
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
                {formatAmount(item)} - due {formatDueDate(item.dueDate)}
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
}: PaymentsDashboardSectionProps) {
  const [dashboard, setDashboard] = useState<PaymentsDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isFamilyWorkspace = workspace?.kind === "family";

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return "Load current workspace first to view dashboard.";
    }

    if (
      workspace.kind === "personal" &&
      workspace.id.startsWith("virtual-personal-")
    ) {
      return "Workspace persistence is not initialized. Apply workspace migrations first.";
    }

    return null;
  }, [workspace]);

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
      setFeedback("Failed to load dashboard summary.");
    } finally {
      setIsLoading(false);
    }
  }, [initData, workspaceUnavailable]);

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
        <h2 className="text-base font-semibold text-app-text">Dashboard</h2>
        <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
          Phase 10B
        </span>
      </div>

      {workspaceUnavailable ? (
        <p className="rounded-xl bg-app-surface-soft px-3 py-2 text-sm text-app-text-muted">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          <div className="mb-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {isFamilyWorkspace
                ? "Family workspace overview"
                : "Personal workspace overview"}
            </p>
            <p className="mt-1 text-sm text-app-text-muted">
              {isFamilyWorkspace
                ? "Home summary for shared payments in the current family workspace."
                : "Home summary for recurring payments in your personal workspace."}
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
                  {isFamilyWorkspace ? "Shared due today" : "Due today"}
                </p>
                <p className="text-base font-semibold text-app-text">
                  {dashboard.summary.dueTodayCount}
                </p>
              </div>
              <div className="rounded-xl bg-app-surface-soft p-2">
                <p className="text-[11px] text-app-text-muted">
                  {isFamilyWorkspace ? "Shared upcoming" : "Upcoming"} (
                  {dashboard.summary.upcomingWindowDays}d)
                </p>
                <p className="text-base font-semibold text-app-text">
                  {dashboard.summary.upcomingCount}
                </p>
              </div>
              <div className="rounded-xl bg-app-surface-soft p-2">
                <p className="text-[11px] text-app-text-muted">
                  {isFamilyWorkspace ? "Shared overdue" : "Overdue"}
                </p>
                <p className="text-base font-semibold text-app-text">
                  {dashboard.summary.overdueCount}
                </p>
              </div>
              <div className="rounded-xl bg-app-surface-soft p-2">
                <p className="text-[11px] text-app-text-muted">
                  {isFamilyWorkspace ? "Shared paid this cycle" : "Paid this cycle"}
                </p>
                <p className="text-base font-semibold text-app-text">
                  {dashboard.summary.paidThisCycleCount}
                </p>
              </div>
              <div className="rounded-xl bg-app-surface-soft p-2">
                <p className="text-[11px] text-app-text-muted">
                  {isFamilyWorkspace ? "Shared unpaid this cycle" : "Unpaid this cycle"}
                </p>
                <p className="text-base font-semibold text-app-text">
                  {dashboard.summary.unpaidThisCycleCount}
                </p>
              </div>
              {isFamilyWorkspace && (
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">
                    Paid mismatch hints
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
                No shared payments yet
              </p>
              <p className="mt-1 text-xs text-app-text-muted">
                Add your first shared payment in the recurring section to start
                family tracking here.
              </p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <DashboardBucket
              title={isFamilyWorkspace ? "Shared due today" : "Due today"}
              items={dashboard?.dueToday ?? []}
              emptyLabel={
                isFamilyWorkspace
                  ? "No unpaid shared payments due today."
                  : "No unpaid payments due today."
              }
            />
            <DashboardBucket
              title={`${isFamilyWorkspace ? "Shared upcoming" : "Upcoming"} (${dashboard?.summary.upcomingWindowDays ?? 0}d)`}
              items={dashboard?.upcoming ?? []}
              emptyLabel={
                isFamilyWorkspace
                  ? "No unpaid shared payments in upcoming window."
                  : "No unpaid payments in upcoming window."
              }
            />
            <DashboardBucket
              title={isFamilyWorkspace ? "Shared overdue" : "Overdue"}
              items={dashboard?.overdue ?? []}
              emptyLabel={
                isFamilyWorkspace
                  ? "No overdue unpaid shared payments."
                  : "No overdue unpaid payments."
              }
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              {isFamilyWorkspace ? "Refresh family section" : "Refresh dashboard"}
            </button>
            {isLoading && (
              <p className="text-xs text-app-text-muted">
                {isFamilyWorkspace
                  ? "Loading family overview..."
                  : "Loading dashboard..."}
              </p>
            )}
          </div>
        </>
      )}

      {feedback && (
        <p className="mt-3 text-xs font-medium text-app-text">{feedback}</p>
      )}
    </section>
  );
}

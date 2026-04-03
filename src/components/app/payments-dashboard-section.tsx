"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  PAYMENTS_CHANGED_EVENT,
  listRecurringPayments,
  readPaymentsDashboard,
} from "@/lib/payments/client";
import {
  readCachedPaymentsDashboard,
  readCachedPaymentsList,
  writeCachedPaymentsDashboard,
  writeCachedPaymentsList,
} from "@/lib/payments/client-cache";
import { useLocalization } from "@/lib/i18n/localization";
import { APP_TAB_NAVIGATE_EVENT, type AppTab } from "@/components/app/app-shell";
import type {
  DashboardPaymentItemPayload,
  PaymentsDashboardPayload,
  RecurringPaymentPayload,
} from "@/lib/payments/types";
import { AppIcon } from "@/components/app/app-icon";

type PaymentsDashboardSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
  variant?: "full" | "compact";
};

type CompactSummaryFilter = "none" | "all" | "upcoming" | "overdue";
const WEEKLY_TO_MONTHLY_FACTOR = 52 / 12;
const COMPACT_FILTER_STORAGE_KEY = "payment_control_home_compact_filter_v18a";

const isCompactSummaryFilter = (
  value: string | null,
): value is CompactSummaryFilter => {
  return (
    value === "none" ||
    value === "all" ||
    value === "upcoming" ||
    value === "overdue"
  );
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

const sortByDueDateThenTitle = (
  a: DashboardPaymentItemPayload,
  b: DashboardPaymentItemPayload,
): number => {
  if (a.dueDate !== b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }

  return a.title.localeCompare(b.title);
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
    <article className="pc-detail-surface">
      <h3 className="text-sm font-semibold text-app-text">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-app-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="pc-state-card text-xs text-app-text"
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
  const [activePayments, setActivePayments] = useState<RecurringPaymentPayload[]>([]);
  const [compactFilter, setCompactFilter] = useState<CompactSummaryFilter>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isFamilyWorkspace = workspace?.kind === "family";
  const isCompact = variant === "compact";
  const workspaceId = workspace?.id ?? null;

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

  useEffect(() => {
    if (!isCompact || !workspaceId || typeof window === "undefined") {
      setCompactFilter("none");
      return;
    }

    try {
      const stored = window.localStorage.getItem(
        `${COMPACT_FILTER_STORAGE_KEY}:${workspaceId}`,
      );
      if (isCompactSummaryFilter(stored)) {
        setCompactFilter(stored);
        return;
      }
    } catch {
      // Ignore storage read errors.
    }

    setCompactFilter("none");
  }, [isCompact, workspaceId]);

  useEffect(() => {
    if (!isCompact || !workspaceId || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        `${COMPACT_FILTER_STORAGE_KEY}:${workspaceId}`,
        compactFilter,
      );
    } catch {
      // Ignore storage write errors.
    }
  }, [compactFilter, isCompact, workspaceId]);

  const hasAnyActivePayments = useMemo(() => {
    if (!dashboard) {
      return false;
    }

    return (
      dashboard.summary.paidThisCycleCount + dashboard.summary.unpaidThisCycleCount > 0
    );
  }, [dashboard]);

  const openRemindersTab = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<{ tab: AppTab }>(APP_TAB_NAVIGATE_EVENT, {
        detail: { tab: "reminders" },
      }),
    );
  }, []);

  const loadDashboard = useCallback(async () => {
    if (workspaceUnavailable || !workspaceId) {
      setDashboard(null);
      setActivePayments([]);
      setFeedback(null);
      setIsLoading(false);
      return;
    }

    const cachedDashboard = readCachedPaymentsDashboard(workspaceId);
    const cachedPaymentsList = readCachedPaymentsList(workspaceId);
    const hasCachedSnapshot = Boolean(cachedDashboard || cachedPaymentsList);

    if (cachedDashboard) {
      setDashboard(cachedDashboard.value.dashboard);
    }

    if (cachedPaymentsList) {
      setActivePayments(
        cachedPaymentsList.value.payments.filter((payment) => payment.status === "active"),
      );
    }

    setIsLoading(!hasCachedSnapshot);
    setFeedback(null);
    try {
      const [dashboardResult, paymentsResult] = await Promise.all([
        readPaymentsDashboard(initData),
        listRecurringPayments(initData),
      ]);

      if (dashboardResult.ok) {
        setDashboard(dashboardResult.dashboard);
        writeCachedPaymentsDashboard(workspaceId, {
          dashboard: dashboardResult.dashboard,
        });
      } else if (!cachedDashboard) {
        setFeedback(dashboardResult.error.message);
      }

      if (paymentsResult.ok) {
        const activeSnapshot = paymentsResult.payments.filter(
          (payment) => payment.status === "active",
        );
        setActivePayments(activeSnapshot);
        writeCachedPaymentsList(workspaceId, {
          payments: paymentsResult.payments,
          responsiblePayerOptions: paymentsResult.responsiblePayerOptions,
        });
      } else if (!cachedPaymentsList) {
        setActivePayments([]);
      }
    } catch {
      if (!hasCachedSnapshot) {
        setFeedback(tr("Failed to load dashboard summary."));
        setActivePayments([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initData, tr, workspaceId, workspaceUnavailable]);

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

  const totalActiveCount = useMemo(() => {
    if (!dashboard) {
      return 0;
    }

    return dashboard.summary.paidThisCycleCount + dashboard.summary.unpaidThisCycleCount;
  }, [dashboard]);

  const monthlyTotals = useMemo(() => {
    const totalsByCurrency = new Map<string, number>();
    for (const payment of activePayments) {
      const monthlyAmount =
        payment.cadence === "weekly"
          ? payment.amount * WEEKLY_TO_MONTHLY_FACTOR
          : payment.amount;
      const current = totalsByCurrency.get(payment.currency) ?? 0;
      totalsByCurrency.set(payment.currency, current + monthlyAmount);
    }

    return Array.from(totalsByCurrency.entries())
      .map(([currency, total]) => ({ currency, total }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [activePayments]);

  const monthlyTotalLabel = useMemo(() => {
    if (monthlyTotals.length === 0) {
      return "0";
    }

    return monthlyTotals
      .map((item) => `${item.total.toFixed(2)} ${item.currency}`)
      .join(" | ");
  }, [monthlyTotals]);

  const allActiveDashboardItems = useMemo(() => {
    return activePayments
      .map((payment) => ({
        id: payment.id,
        title: payment.title,
        amount: payment.amount,
        currency: payment.currency,
        category: payment.category,
        dueDate: payment.currentCycle.dueDate,
        cycleState: payment.currentCycle.state,
      }))
      .sort(sortByDueDateThenTitle);
  }, [activePayments]);

  const compactFilteredItems = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    if (compactFilter === "all") {
      return allActiveDashboardItems;
    }

    if (compactFilter === "upcoming") {
      return dashboard.upcoming;
    }

    if (compactFilter === "overdue") {
      return dashboard.overdue;
    }

    return [];
  }, [allActiveDashboardItems, compactFilter, dashboard]);

  const compactFilterLabel = useMemo(() => {
    if (compactFilter === "all") {
      return tr("Total");
    }

    if (compactFilter === "upcoming") {
      return tr("Upcoming");
    }

    if (compactFilter === "overdue") {
      return tr("Overdue");
    }

    return "";
  }, [compactFilter, tr]);

  return (
    <section className="pc-surface pc-screen-stack">
      <div>
        <h2 className="pc-section-title">
          <AppIcon name={isCompact ? "home" : "payments"} className="h-4 w-4" />
          {isCompact ? tr("Payment snapshot") : tr("Dashboard")}
        </h2>
        <p className="pc-section-subtitle">
          {isCompact
            ? tr("Today snapshot")
            : tr("Recent payment load and due-state overview.")}
        </p>
      </div>

      {workspaceUnavailable ? (
        <p className="pc-empty-state text-sm">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          {isCompact ? (
            <>
              {dashboard && (
                <div className="pc-screen-stack">
                  <div className="pc-kpi-grid">
                  <button
                    type="button"
                    onClick={() =>
                      setCompactFilter((current) => (current === "all" ? "none" : "all"))
                    }
                    aria-pressed={compactFilter === "all"}
                    className="pc-kpi-card min-h-[64px] text-left"
                  >
                    <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                      <AppIcon name="payments" className="h-3.5 w-3.5" />
                    </p>
                    <p
                      className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${
                        compactFilter === "all" ? "text-app-accent-strong" : "text-app-text-muted"
                      }`}
                    >
                      {tr("Total")}
                    </p>
                    <p className="text-sm font-semibold">{totalActiveCount}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCompactFilter((current) =>
                        current === "upcoming" ? "none" : "upcoming",
                      )
                    }
                    aria-pressed={compactFilter === "upcoming"}
                    className="pc-kpi-card min-h-[64px] text-left"
                  >
                    <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                      <AppIcon name="clock" className="h-3.5 w-3.5" />
                    </p>
                    <p
                      className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${
                        compactFilter === "upcoming"
                          ? "text-app-accent-strong"
                          : "text-app-text-muted"
                      }`}
                    >
                      {tr("Upcoming")}
                    </p>
                    <p className="text-sm font-semibold">
                      {dashboard.summary.upcomingCount}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCompactFilter((current) =>
                        current === "overdue" ? "none" : "overdue",
                      )
                    }
                    aria-pressed={compactFilter === "overdue"}
                    className={`pc-kpi-card min-h-[64px] text-left ${
                      dashboard.summary.overdueCount > 0 && compactFilter !== "overdue"
                        ? "pc-kpi-card-alert"
                        : ""
                    }`}
                  >
                    <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                      <AppIcon name="alert" className="h-3.5 w-3.5" />
                    </p>
                    <p
                      className={`mt-0.5 inline-flex items-center gap-1 text-[11px] ${
                        compactFilter === "overdue"
                          ? "text-app-accent-strong"
                          : "text-app-text-muted"
                      }`}
                    >
                      {tr("Overdue")}
                    </p>
                    <p className="text-sm font-semibold">
                      {dashboard.summary.overdueCount}
                    </p>
                  </button>
                  <div className="pc-kpi-card cursor-default min-h-[64px]">
                    <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                      <AppIcon name="wallet" className="h-3.5 w-3.5" />
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-app-text-muted">
                      {tr("Monthly payment cost")}
                    </p>
                    <p className="text-sm font-semibold text-app-text">{monthlyTotalLabel}</p>
                  </div>
                </div>

                  <button
                    type="button"
                    onClick={openRemindersTab}
                    className="pc-btn-primary w-full"
                  >
                    <AppIcon name="reminders" className="h-3.5 w-3.5" />
                    {tr("Open Reminders for actions")}
                  </button>
                </div>
              )}

              {dashboard && !hasAnyActivePayments && (
                <div className="pc-empty-state mt-2">
                  <p className="text-sm font-semibold text-app-text">
                    {tr("No payments yet")}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr("Open Reminders and add your first recurring payment.")}
                  </p>
                </div>
              )}

              {dashboard && hasAnyActivePayments && compactFilter === "none" && (
                <p className="pc-state-inline mt-2">
                  <AppIcon name="check" className="h-3.5 w-3.5" />
                  {tr("Paid")} {dashboard.summary.paidThisCycleCount} | {tr("Unpaid")}{" "}
                  {dashboard.summary.unpaidThisCycleCount}
                  {isFamilyWorkspace
                    ? ` | ${tr("Mismatch")} ${dashboard.summary.paidByMismatchCount}`
                    : ""}
                </p>
              )}

              {hasAnyActivePayments && compactFilter !== "none" && (
                <div className="pc-detail-surface mt-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                    <AppIcon name="reminders" className="h-3.5 w-3.5" />
                    {tr("Filtered by")}: {compactFilterLabel}
                  </p>
                  {compactFilteredItems.length === 0 ? (
                    <p className="mt-2 text-xs text-app-text-muted">
                      {tr("No matching cards in this segment.")}
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {compactFilteredItems.map((item) => (
                        <li key={item.id} className="pc-state-card text-xs text-app-text">
                          <p className="font-medium">{item.title}</p>
                          <p className="inline-flex items-center gap-1 text-app-text-muted">
                            <AppIcon name="clock" className="h-3.5 w-3.5" />
                            {formatAmount(item)} - {tr("Due")} {formatDueDate(item.dueDate)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setCompactFilter("none")}
                      className="pc-btn-quiet"
                    >
                      <AppIcon name="refresh" className="h-3.5 w-3.5" />
                      {tr("Show all payments")}
                    </button>
                  </div>
                </div>
              )}

              {hasAnyActivePayments && compactFilter === "none" && (
                <details className="pc-detail-surface mt-2">
                  <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                    <AppIcon name="clock" className="h-3.5 w-3.5" />
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

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  className="pc-btn-secondary"
                >
                  <AppIcon name="refresh" className="h-3.5 w-3.5" />
                  {tr("Refresh snapshot")}
                </button>
                {isLoading && (
                  <p className="pc-state-inline">
                    <AppIcon name="refresh" className="h-3.5 w-3.5 pc-spin" />
                    {tr("Loading snapshot...")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="pc-detail-surface mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {isFamilyWorkspace
                    ? tr("Family workspace overview")
                    : tr("Personal workspace overview")}
                </p>
              </div>

              {dashboard && (
                <div
                  className={`pc-kpi-grid ${
                    isFamilyWorkspace ? "md:grid-cols-6" : "md:grid-cols-5"
                  }`}
                >
                  <div className="pc-kpi-card cursor-default p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Due today").toLowerCase()}`
                        : tr("Due today")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.dueTodayCount}
                    </p>
                  </div>
                  <div className="pc-kpi-card cursor-default p-2">
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
                  <div
                    className={`pc-kpi-card cursor-default p-2 ${
                      dashboard.summary.overdueCount > 0 ? "pc-kpi-card-alert" : ""
                    }`}
                  >
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Overdue").toLowerCase()}`
                        : tr("Overdue")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.overdueCount}
                    </p>
                  </div>
                  <div className="pc-kpi-card cursor-default p-2">
                    <p className="text-[11px] text-app-text-muted">
                      {isFamilyWorkspace
                        ? `${tr("Shared")} ${tr("Paid").toLowerCase()}`
                        : tr("Paid")}
                    </p>
                    <p className="text-base font-semibold text-app-text">
                      {dashboard.summary.paidThisCycleCount}
                    </p>
                  </div>
                  <div className="pc-kpi-card cursor-default p-2">
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
                    <div className="pc-kpi-card cursor-default p-2">
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
                <div className="pc-empty-state mt-2">
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

              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
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

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                  className="pc-btn-secondary"
                >
                  <AppIcon name="refresh" className="h-3.5 w-3.5" />
                  {isFamilyWorkspace ? tr("Refresh family section") : tr("Refresh dashboard")}
                </button>
                {isLoading && (
                  <p className="pc-state-inline">
                    <AppIcon name="refresh" className="h-3.5 w-3.5 pc-spin" />
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
        <p className="pc-feedback pc-feedback-error mt-2">
          <AppIcon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{feedback}</span>
        </p>
      )}
    </section>
  );
}


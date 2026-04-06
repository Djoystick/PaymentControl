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
import {
  APP_TAB_NAVIGATE_EVENT,
  type AppTabNavigationEventDetail,
} from "@/components/app/app-shell";
import type {
  DashboardPaymentItemPayload,
  PaymentsDashboardPayload,
  RecurringPaymentPayload,
} from "@/lib/payments/types";
import { AppIcon } from "@/components/app/app-icon";
import { ModalSheet } from "@/components/app/modal-sheet";

type PaymentsDashboardSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
  variant?: "full" | "compact";
};

const WEEKLY_TO_MONTHLY_FACTOR = 52 / 12;

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
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isViewOptionsModalOpen, setIsViewOptionsModalOpen] = useState(false);
  const isFamilyWorkspace = workspace?.kind === "family";
  const isCompact = variant === "compact";
  const workspaceId = workspace?.id ?? null;
  const navigationWorkspaceId = workspace?.id ?? null;

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

  const navigateToTab = useCallback((detail: AppTabNavigationEventDetail) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AppTabNavigationEventDetail>(APP_TAB_NAVIGATE_EVENT, {
        detail,
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

  const viewOptionsModal = (
    <ModalSheet
      open={isViewOptionsModalOpen}
      onClose={() => setIsViewOptionsModalOpen(false)}
      title={tr("View options")}
      titleIcon={<AppIcon name="workspace" className="h-3.5 w-3.5" />}
      description={tr("Quick navigation to secondary app areas.")}
      widthClassName="max-w-md"
      overlayClassName="z-[96]"
    >
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setIsViewOptionsModalOpen(false);
            navigateToTab({
              tab: "travel",
              sourceTab: "home",
              reason: "Open Travel workspace from Home.",
              workspaceId: navigationWorkspaceId,
            });
          }}
          className="pc-btn-secondary w-full"
        >
          <AppIcon name="travel" className="h-3.5 w-3.5" />
          {tr("Open Travel workspace")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsViewOptionsModalOpen(false);
            navigateToTab({
              tab: "history",
              intent: "history_recent_updates",
              sourceTab: "home",
              reason: "Review recent changes in History.",
              workspaceId: navigationWorkspaceId,
            });
          }}
          className="pc-btn-secondary w-full"
        >
          <AppIcon name="history" className="h-3.5 w-3.5" />
          {tr("Open History updates")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsViewOptionsModalOpen(false);
            navigateToTab({
              tab: "profile",
              sourceTab: "home",
              reason: "Open official cancellation guides from Home helper.",
              workspaceId: navigationWorkspaceId,
            });
          }}
          className="pc-btn-quiet sm:col-span-2"
        >
          <AppIcon name="help" className="h-3.5 w-3.5" />
          {tr("Open cancellation guides")}
        </button>
      </div>
    </ModalSheet>
  );

  return (
    <>
      <section className="pc-surface pc-screen-stack">
      <div>
        <h2 className="pc-section-title">
          <AppIcon name={isCompact ? "home" : "payments"} className="h-4 w-4" />
          {isCompact ? tr("Payment snapshot") : tr("Dashboard")}
        </h2>
        <p className="pc-section-subtitle">
          {isCompact
            ? tr("Snapshot and next step")
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
                        navigateToTab({
                          tab: "reminders",
                          intent: "reminders_all",
                          sourceTab: "home",
                          reason: "Open recurring expenses slice from Home snapshot.",
                          workspaceId: navigationWorkspaceId,
                        })
                      }
                      className="pc-kpi-card min-h-[64px] text-left"
                    >
                      <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                        <AppIcon name="payments" className="h-3.5 w-3.5" />
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-app-text-muted">
                        {tr("Total")}
                      </p>
                      <p className="text-sm font-semibold">{totalActiveCount}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigateToTab({
                          tab: "reminders",
                          intent: "reminders_upcoming",
                          sourceTab: "home",
                          reason: "Continue in Reminders: upcoming unpaid cards.",
                          workspaceId: navigationWorkspaceId,
                        })
                      }
                      className="pc-kpi-card min-h-[64px] text-left"
                    >
                      <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                        <AppIcon name="clock" className="h-3.5 w-3.5" />
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-app-text-muted">
                        {tr("Upcoming")}
                      </p>
                      <p className="text-sm font-semibold">{dashboard.summary.upcomingCount}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigateToTab({
                          tab: "reminders",
                          intent: "reminders_action_now",
                          sourceTab: "home",
                          reason: "Continue in Reminders: action-now cards.",
                          workspaceId: navigationWorkspaceId,
                        })
                      }
                      className={`pc-kpi-card min-h-[64px] text-left ${
                        dashboard.summary.overdueCount > 0 ? "pc-kpi-card-alert" : ""
                      }`}
                    >
                      <p className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-app-border/70 bg-app-surface-elevated text-app-text-muted">
                        <AppIcon name="alert" className="h-3.5 w-3.5" />
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-app-text-muted">
                        {tr("Overdue")}
                      </p>
                      <p className="text-sm font-semibold">{dashboard.summary.overdueCount}</p>
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

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigateToTab({
                          tab: "reminders",
                          intent:
                            dashboard.summary.overdueCount > 0 ||
                            dashboard.summary.dueTodayCount > 0
                              ? "reminders_action_now"
                              : "reminders_all",
                          sourceTab: "home",
                          reason:
                            dashboard.summary.overdueCount > 0 ||
                            dashboard.summary.dueTodayCount > 0
                              ? "Open Reminders with action-now focus."
                              : "Open Reminders for daily routine.",
                          workspaceId: navigationWorkspaceId,
                        })
                      }
                      className="pc-btn-primary w-full"
                    >
                      <AppIcon name="reminders" className="h-3.5 w-3.5" />
                      {dashboard.summary.overdueCount > 0 || dashboard.summary.dueTodayCount > 0
                        ? tr("Open action-now Recurring")
                        : tr("Open Recurring for actions")}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsViewOptionsModalOpen(true)}
                    className="pc-btn-secondary mt-2 w-full"
                  >
                    <AppIcon name="workspace" className="h-3.5 w-3.5" />
                    {tr("View options")}
                  </button>
                </div>
              )}

              {dashboard && !hasAnyActivePayments && (
                <div className="pc-empty-state mt-2">
                  <p className="text-sm font-semibold text-app-text">{tr("No payments yet")}</p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr("Open Reminders and add your first recurring payment.")}
                  </p>
                  <button
                    type="button"
                      onClick={() =>
                        navigateToTab({
                          tab: "reminders",
                          intent: "reminders_add_payment",
                          sourceTab: "home",
                        reason: "Start first recurring payment from Home empty state.",
                        workspaceId: navigationWorkspaceId,
                      })
                    }
                    className="pc-btn-primary mt-2"
                  >
                    <AppIcon name="add" className="h-3.5 w-3.5" />
                    {tr("Add first recurring payment")}
                  </button>
                </div>
              )}

              {dashboard && hasAnyActivePayments && (
                <p className="pc-state-inline mt-2">
                  <AppIcon name="check" className="h-3.5 w-3.5" />
                  {tr("Paid")} {dashboard.summary.paidThisCycleCount} | {tr("Unpaid")}{" "}
                  {dashboard.summary.unpaidThisCycleCount}
                  {isFamilyWorkspace
                    ? ` | ${tr("Mismatch")} ${dashboard.summary.paidByMismatchCount}`
                    : ""}
                </p>
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
      {viewOptionsModal}
    </>
  );
}


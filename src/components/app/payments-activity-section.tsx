"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  PAYMENTS_CHANGED_EVENT,
  listRecurringPayments,
} from "@/lib/payments/client";
import {
  readCachedPaymentsList,
  writeCachedPaymentsList,
} from "@/lib/payments/client-cache";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";
import {
  APP_TAB_NAVIGATE_EVENT,
  type AppTabNavigationEventDetail,
  clearAllTabNavigationContexts,
  consumeTabNavigationContext,
  type AppNavigationIntent,
} from "@/components/app/app-shell";
import type {
  RecurringPaymentPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";
import {
  clearHistoryContextSnapshot,
  rememberRuntimeSnapshot,
  readHistoryContextSnapshot,
  writeHistoryContextSnapshot,
} from "@/lib/app/context-memory";

type PaymentsActivitySectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
};

type ActivityItem = {
  id: string;
  paymentId: string;
  title: string;
  paymentScope: RecurringPaymentPayload["paymentScope"];
  responsibleProfileId: string | null;
  paidByProfileId: string | null;
  timestamp: string;
  kind: "created" | "updated" | "archived" | "paid_cycle";
  label: string;
};

type HistoryNavigationIntent = Extract<
  AppNavigationIntent,
  "history_recent_updates" | "history_recent_paid"
>;
type ActivityFocusFilter = "all" | "changes" | "paid";

const resolveActivityIcon = (
  kind: ActivityItem["kind"],
): "add" | "edit" | "archive" | "check" => {
  if (kind === "created") {
    return "add";
  }

  if (kind === "updated") {
    return "edit";
  }

  if (kind === "archived") {
    return "archive";
  }

  return "check";
};

const resolveActivityBadgeTone = (kind: ActivityItem["kind"]): string => {
  if (kind === "archived") {
    return "pc-status-pill pc-status-pill-warning";
  }

  if (kind === "paid_cycle") {
    return "pc-status-pill pc-status-pill-success";
  }

  return "pc-status-pill";
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const resolveResponsiblePayerDisplayName = (
  responsibleProfileId: string | null,
  responsiblePayerOptions: WorkspaceResponsiblePayerOptionPayload[],
  labels: { notAssigned: string; missingMember: string },
): string => {
  if (!responsibleProfileId) {
    return labels.notAssigned;
  }

  const responsible = responsiblePayerOptions.find(
    (option) => option.profileId === responsibleProfileId,
  );
  if (responsible) {
    return responsible.displayName;
  }

  return labels.missingMember;
};

const buildActivityItems = (
  payments: RecurringPaymentPayload[],
  isFamilyWorkspace: boolean,
): ActivityItem[] => {
  const scopedPayments = payments.filter((payment) =>
    isFamilyWorkspace ? payment.paymentScope === "shared" : true,
  );

  const items: ActivityItem[] = [];

  for (const payment of scopedPayments) {
    items.push({
      id: `${payment.id}-created`,
      paymentId: payment.id,
      title: payment.title,
      paymentScope: payment.paymentScope,
      responsibleProfileId: payment.responsibleProfileId,
      paidByProfileId: null,
      timestamp: payment.createdAt,
      kind: "created",
      label: "Created",
    });

    if (payment.updatedAt !== payment.createdAt) {
      const isArchived = payment.status === "archived";
      items.push({
        id: `${payment.id}-${isArchived ? "archived" : "updated"}-${payment.updatedAt}`,
        paymentId: payment.id,
        title: payment.title,
        paymentScope: payment.paymentScope,
        responsibleProfileId: payment.responsibleProfileId,
        paidByProfileId: null,
        timestamp: payment.updatedAt,
        kind: isArchived ? "archived" : "updated",
        label: isArchived ? "Archived" : "Updated",
      });
    }

    if (payment.currentCycle.paidAt) {
      items.push({
        id: `${payment.id}-paid-${payment.currentCycle.paidAt}`,
        paymentId: payment.id,
        title: payment.title,
        paymentScope: payment.paymentScope,
        responsibleProfileId: payment.responsibleProfileId,
        paidByProfileId: payment.currentCycle.paidByProfileId,
        timestamp: payment.currentCycle.paidAt,
        kind: "paid_cycle",
        label: "Marked paid",
      });
    }
  }

  return items
    .sort((a, b) => {
      const timeA = Date.parse(a.timestamp);
      const timeB = Date.parse(b.timestamp);

      if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }

      if (a.timestamp !== b.timestamp) {
        return b.timestamp.localeCompare(a.timestamp);
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 12);
};

export function PaymentsActivitySection({
  workspace,
  initData,
}: PaymentsActivitySectionProps) {
  const { tr } = useLocalization();
  const [payments, setPayments] = useState<RecurringPaymentPayload[]>([]);
  const [responsiblePayerOptions, setResponsiblePayerOptions] = useState<
    WorkspaceResponsiblePayerOptionPayload[]
  >([]);
  const [activityFocusFilter, setActivityFocusFilter] =
    useState<ActivityFocusFilter>("all");
  const [entryFlowContextReason, setEntryFlowContextReason] = useState<string | null>(
    null,
  );
  const [isRestoredContext, setIsRestoredContext] = useState(false);
  const [isContextHydrated, setIsContextHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isFamilyWorkspace = workspace?.kind === "family";
  const workspaceId = workspace?.id ?? null;

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return tr("Load current workspace first to view activity.");
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

  const activityItems = useMemo(
    () => buildActivityItems(payments, isFamilyWorkspace),
    [isFamilyWorkspace, payments],
  );
  const activityFocusCounts = useMemo(() => {
    const paid = activityItems.filter((item) => item.kind === "paid_cycle").length;
    const changes = activityItems.filter((item) => item.kind !== "paid_cycle").length;

    return {
      all: activityItems.length,
      changes,
      paid,
    };
  }, [activityItems]);

  const focusedActivityItems = useMemo(() => {
    if (activityFocusFilter === "all") {
      return activityItems;
    }

    if (activityFocusFilter === "paid") {
      return activityItems.filter((item) => item.kind === "paid_cycle");
    }

    return activityItems.filter((item) => item.kind !== "paid_cycle");
  }, [activityFocusFilter, activityItems]);

  const scopedPaymentsCount = useMemo(
    () =>
      payments.filter((payment) =>
        isFamilyWorkspace ? payment.paymentScope === "shared" : true,
      ).length,
    [isFamilyWorkspace, payments],
  );

  const sharedWhoPaysSummary = useMemo(() => {
    if (!isFamilyWorkspace) {
      return null;
    }

    const sharedPayments = payments.filter(
      (payment) => payment.paymentScope === "shared" && payment.status === "active",
    );
    const assignedCount = sharedPayments.filter(
      (payment) => Boolean(payment.responsibleProfileId),
    ).length;

    return {
      assignedCount,
      unassignedCount: sharedPayments.length - assignedCount,
    };
  }, [isFamilyWorkspace, payments]);

  const paidByMismatchCount = useMemo(() => {
    if (!isFamilyWorkspace) {
      return 0;
    }

    return payments.filter((payment) => {
      return (
        payment.paymentScope === "shared" &&
        payment.currentCycle.state === "paid" &&
        Boolean(payment.responsibleProfileId) &&
        Boolean(payment.currentCycle.paidByProfileId) &&
        payment.responsibleProfileId !== payment.currentCycle.paidByProfileId
      );
    }).length;
  }, [isFamilyWorkspace, payments]);

  const loadActivity = useCallback(async () => {
    if (workspaceUnavailable || !workspaceId) {
      setPayments([]);
      setResponsiblePayerOptions([]);
      setFeedback(null);
      setIsLoading(false);
      return;
    }

    const cachedPaymentsList = readCachedPaymentsList(workspaceId);
    const hasCachedSnapshot = Boolean(cachedPaymentsList);

    if (cachedPaymentsList) {
      setPayments(cachedPaymentsList.value.payments);
      setResponsiblePayerOptions(cachedPaymentsList.value.responsiblePayerOptions);
    }

    setIsLoading(!hasCachedSnapshot);
    setFeedback(null);
    try {
      const result = await listRecurringPayments(initData);
      if (!result.ok) {
        if (!hasCachedSnapshot) {
          setFeedback(result.error.message);
          setResponsiblePayerOptions([]);
        }
        return;
      }

      setPayments(result.payments);
      setResponsiblePayerOptions(result.responsiblePayerOptions);
      writeCachedPaymentsList(workspaceId, {
        payments: result.payments,
        responsiblePayerOptions: result.responsiblePayerOptions,
      });
    } catch {
      if (!hasCachedSnapshot) {
        setFeedback(tr("Failed to load recent activity."));
        setResponsiblePayerOptions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initData, tr, workspaceId, workspaceUnavailable]);

  const applyHistoryNavigationIntent = useCallback(
    (intent: HistoryNavigationIntent, reason?: string) => {
      if (intent === "history_recent_paid") {
        setActivityFocusFilter("paid");
        setEntryFlowContextReason(
          reason ?? "Continue from Home with paid-events focus.",
        );
        return;
      }

      setActivityFocusFilter("changes");
      setEntryFlowContextReason(reason ?? "Continue from Home with recent updates focus.");
    },
    [],
  );

  useEffect(() => {
    if (!workspaceId || workspaceUnavailable) {
      setIsContextHydrated(false);
      setIsRestoredContext(false);
      return;
    }

    const context = consumeTabNavigationContext("history");
    const navigationIntent: HistoryNavigationIntent | null =
      context?.intent === "history_recent_updates" ||
      context?.intent === "history_recent_paid"
        ? context.intent
        : null;
    const canApplyNavigationContext =
      context &&
      navigationIntent &&
      context.workspaceId === workspaceId;

    if (canApplyNavigationContext && context && navigationIntent) {
      applyHistoryNavigationIntent(navigationIntent, context.reason);
      setIsRestoredContext(false);
      setIsContextHydrated(true);
      return;
    }

    const restoredContext = readHistoryContextSnapshot(workspaceId);
    if (restoredContext) {
      setActivityFocusFilter(restoredContext.activityFocusFilter);
      setEntryFlowContextReason(
        restoredContext.entryFlowContextReason ?? "Restored your last History context.",
      );
      setIsRestoredContext(true);
    } else {
      setIsRestoredContext(false);
    }

    setIsContextHydrated(true);
  }, [
    applyHistoryNavigationIntent,
    workspaceId,
    workspaceUnavailable,
  ]);

  useEffect(() => {
    if (!workspaceId || workspaceUnavailable || !isContextHydrated) {
      return;
    }

    writeHistoryContextSnapshot(workspaceId, {
      activityFocusFilter,
      entryFlowContextReason,
    });

    const rememberedIntent: HistoryNavigationIntent =
      activityFocusFilter === "paid"
        ? "history_recent_paid"
        : "history_recent_updates";
    rememberRuntimeSnapshot({
      tab: "history",
      intent: rememberedIntent,
      reason: entryFlowContextReason ?? "Continue in History from your last session.",
      workspaceId,
    });
  }, [
    activityFocusFilter,
    entryFlowContextReason,
    isContextHydrated,
    workspaceId,
    workspaceUnavailable,
  ]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const refresh = () => {
      loadActivity();
    };

    window.addEventListener(PAYMENTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(PAYMENTS_CHANGED_EVENT, refresh);
    };
  }, [loadActivity]);

  const startCleanHistorySession = useCallback(() => {
    setActivityFocusFilter("all");
    setEntryFlowContextReason(null);
    setIsRestoredContext(false);
    setFeedback(null);
    if (workspaceId) {
      clearHistoryContextSnapshot(workspaceId);
    }
    clearAllTabNavigationContexts();
  }, [workspaceId]);

  const clearHistoryFocus = useCallback(() => {
    setActivityFocusFilter("all");
    setEntryFlowContextReason(null);
    setIsRestoredContext(false);
  }, []);

  const historyFocusLabel = useMemo(() => {
    if (activityFocusFilter === "changes") {
      return tr("Changes");
    }

    if (activityFocusFilter === "paid") {
      return tr("Paid events");
    }

    return tr("All events");
  }, [activityFocusFilter, tr]);

  const openRemindersAddPayment = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<AppTabNavigationEventDetail>(APP_TAB_NAVIGATE_EVENT, {
        detail: {
          tab: "reminders",
          intent: "reminders_add_payment",
          sourceTab: "history",
          reason: "Continue from History and add first payment.",
          workspaceId,
        },
      }),
    );
  }, [workspaceId]);

  return (
    <section className="pc-surface pc-screen-stack">
      <div>
        <h2 className="pc-section-title">
          <AppIcon name="history" className="h-4 w-4" />
          {tr("History")}
        </h2>
      <p className="pc-section-subtitle">
        {tr("Recent payment updates")}
      </p>
      </div>

      {workspaceUnavailable ? (
        <p className="pc-empty-state text-sm">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          {(entryFlowContextReason || activityFocusFilter !== "all") && (
            <div className="pc-context-row">
              <p className="pc-context-row-main">
                <AppIcon name="history" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {entryFlowContextReason
                    ? `${tr("Continue flow")}: ${tr(entryFlowContextReason)}`
                    : `${tr("Current focus")}: ${historyFocusLabel}`}
                </span>
                {isRestoredContext && (
                  <span className="pc-status-pill">{tr("Restored context")}</span>
                )}
              </p>
              <div className="pc-context-row-actions">
                <button
                  type="button"
                  onClick={clearHistoryFocus}
                  className="pc-btn-quiet min-h-8 px-2 py-1 text-[11px]"
                >
                  {tr("Clear focus")}
                </button>
                <button
                  type="button"
                  onClick={startCleanHistorySession}
                  className="pc-btn-quiet min-h-8 px-2 py-1 text-[11px]"
                >
                  {tr("Start clean")}
                </button>
              </div>
            </div>
          )}

          <div className="pc-detail-surface">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
              {tr("Recent events list")}
            </p>
            <p className="mt-1 text-[11px] text-app-text-muted">
              {tr("Showing {visible} of {total} events.", {
                visible: focusedActivityItems.length,
                total: activityItems.length,
              })}
            </p>
            <details className="pc-state-card mt-2 px-3 py-2">
              <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold text-app-text">
                <AppIcon name="template" className="h-3.5 w-3.5" />
                {tr("View options")}
              </summary>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="pc-state-card px-1.5 py-1.5">
                    <p className="text-[11px] text-app-text-muted">{tr("In scope")}</p>
                    <p className="text-sm font-semibold text-app-text">{scopedPaymentsCount}</p>
                  </div>
                  <div className="pc-state-card px-1.5 py-1.5">
                    <p className="text-[11px] text-app-text-muted">{tr("Recent events")}</p>
                    <p className="text-sm font-semibold text-app-text">{activityItems.length}</p>
                  </div>
                  {isFamilyWorkspace && sharedWhoPaysSummary && (
                    <div className="pc-state-card col-span-2 px-1.5 py-1.5">
                      <p className="text-[11px] text-app-text-muted">
                        {tr("Who pays assigned")}: {sharedWhoPaysSummary.assignedCount} ·{" "}
                        {tr("Missing")} {sharedWhoPaysSummary.unassignedCount} ·{" "}
                        {tr("Mismatch hints")} {paidByMismatchCount}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                    {tr("Focus")}
                  </p>
                  <div className="pc-segmented mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActivityFocusFilter("all");
                        setEntryFlowContextReason(null);
                        setIsRestoredContext(false);
                      }}
                      aria-pressed={activityFocusFilter === "all"}
                      className={`pc-segment-btn min-h-8 ${
                        activityFocusFilter === "all" ? "pc-segment-btn-active" : ""
                      }`}
                    >
                      {tr("All events")} ({activityFocusCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivityFocusFilter("changes");
                        setEntryFlowContextReason(null);
                        setIsRestoredContext(false);
                      }}
                      aria-pressed={activityFocusFilter === "changes"}
                      className={`pc-segment-btn min-h-8 ${
                        activityFocusFilter === "changes" ? "pc-segment-btn-active" : ""
                      }`}
                    >
                      {tr("Changes")} ({activityFocusCounts.changes})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivityFocusFilter("paid");
                        setEntryFlowContextReason(null);
                        setIsRestoredContext(false);
                      }}
                      aria-pressed={activityFocusFilter === "paid"}
                      className={`pc-segment-btn min-h-8 ${
                        activityFocusFilter === "paid" ? "pc-segment-btn-active" : ""
                      }`}
                    >
                      {tr("Paid events")} ({activityFocusCounts.paid})
                    </button>
                  </div>
                </div>
              </div>
            </details>

            {scopedPaymentsCount === 0 ? (
              <div className="pc-empty-state space-y-1">
                <p className="text-sm font-semibold text-app-text">{tr("History is empty")}</p>
                <p className="text-sm text-app-text-muted">
                  {isFamilyWorkspace
                    ? tr("Add first shared payment in Recurring.")
                    : tr("Add first payment in Recurring.")}
                </p>
                <button
                  type="button"
                  onClick={openRemindersAddPayment}
                  className="pc-btn-secondary mt-2"
                >
                  <AppIcon name="add" className="h-3.5 w-3.5" />
                  {tr("Open Recurring and add payment")}
                </button>
              </div>
            ) : activityItems.length === 0 ? (
              <div className="pc-empty-state space-y-1">
                <p className="text-sm font-semibold text-app-text">{tr("No recent updates yet")}</p>
                <p className="text-sm text-app-text-muted">
                  {tr("Mark paid or edit a payment in Recurring.")}
                </p>
                <button
                  type="button"
                  onClick={openRemindersAddPayment}
                  className="pc-btn-secondary mt-2"
                >
                  <AppIcon name="add" className="h-3.5 w-3.5" />
                  {tr("Open Recurring and add payment")}
                </button>
              </div>
            ) : focusedActivityItems.length === 0 ? (
              <div className="pc-empty-state space-y-1">
                <p className="text-sm font-semibold text-app-text">
                  {tr("No events in this focus yet.")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActivityFocusFilter("all");
                    setEntryFlowContextReason(null);
                    setIsRestoredContext(false);
                  }}
                  className="pc-btn-quiet mt-2"
                >
                  <AppIcon name="refresh" className="h-3.5 w-3.5" />
                  {tr("Show all events")}
                </button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {focusedActivityItems.map((item) => (
                  (() => {
                    const responsiblePayerName = isFamilyWorkspace
                      ? resolveResponsiblePayerDisplayName(
                          item.responsibleProfileId,
                          responsiblePayerOptions,
                          {
                            notAssigned: tr("Not assigned yet"),
                            missingMember: tr(
                              "Assigned member is no longer in this family workspace",
                            ),
                          },
                        )
                      : null;
                    const paidByName =
                      isFamilyWorkspace && item.paidByProfileId
                        ? resolveResponsiblePayerDisplayName(
                            item.paidByProfileId,
                            responsiblePayerOptions,
                            {
                              notAssigned: tr("Not assigned yet"),
                              missingMember: tr(
                                "Assigned member is no longer in this family workspace",
                              ),
                            },
                          )
                        : null;
                    const hasPaidMismatch =
                      isFamilyWorkspace &&
                      item.kind === "paid_cycle" &&
                      Boolean(item.responsibleProfileId) &&
                      Boolean(item.paidByProfileId) &&
                      item.responsibleProfileId !== item.paidByProfileId;

                    return (
                      <li
                        key={item.id}
                        className="pc-state-card px-1.5 py-1.5 text-xs text-app-text"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center ${resolveActivityBadgeTone(item.kind)}`}
                          >
                            <AppIcon
                              name={resolveActivityIcon(item.kind)}
                              className="h-3 w-3"
                            />
                            {tr(item.label)}
                          </span>
                          <span className="text-[11px] text-app-text-muted">
                            {formatDateTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="mt-0.5 font-medium text-app-text">{item.title}</p>
                        {isFamilyWorkspace && (
                          <p className="mt-0.5 text-app-text-muted">
                            {tr("Who pays")}: {responsiblePayerName}
                            {item.kind === "paid_cycle"
                              ? `. ${tr("Paid by")}: ${paidByName ?? tr("Not captured")}`
                              : "."}
                          </p>
                        )}
                        {hasPaidMismatch && (
                          <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                            {tr("Economics hint")}: {paidByName ?? tr("Another member")}{" "}
                            {tr("paid while responsibility is on")}{" "}
                            {responsiblePayerName ?? tr("another member")}.
                          </p>
                        )}
                      </li>
                    );
                  })()
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadActivity}
              disabled={isLoading}
              className="pc-btn-secondary"
            >
              <AppIcon name="refresh" className="h-3.5 w-3.5" />
              {isFamilyWorkspace ? tr("Refresh family section") : tr("Refresh activity")}
            </button>
            {isLoading && (
              <p className="pc-state-inline">
                <AppIcon name="refresh" className="h-3.5 w-3.5 pc-spin" />
                {isFamilyWorkspace
                  ? tr("Loading family activity...")
                  : tr("Loading activity...")}
              </p>
            )}
          </div>
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


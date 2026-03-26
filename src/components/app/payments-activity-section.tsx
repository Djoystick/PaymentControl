"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  PAYMENTS_CHANGED_EVENT,
  listRecurringPayments,
} from "@/lib/payments/client";
import type {
  RecurringPaymentPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";

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
): string => {
  if (!responsibleProfileId) {
    return "Not assigned yet";
  }

  const responsible = responsiblePayerOptions.find(
    (option) => option.profileId === responsibleProfileId,
  );
  if (responsible) {
    return responsible.displayName;
  }

  return "Assigned member is no longer in this family workspace";
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
  const [payments, setPayments] = useState<RecurringPaymentPayload[]>([]);
  const [responsiblePayerOptions, setResponsiblePayerOptions] = useState<
    WorkspaceResponsiblePayerOptionPayload[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isFamilyWorkspace = workspace?.kind === "family";

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return "Load current workspace first to view activity.";
    }

    if (
      workspace.kind === "personal" &&
      workspace.id.startsWith("virtual-personal-")
    ) {
      return "Workspace persistence is not initialized. Apply workspace migrations first.";
    }

    return null;
  }, [workspace]);

  const activityItems = useMemo(
    () => buildActivityItems(payments, isFamilyWorkspace),
    [isFamilyWorkspace, payments],
  );

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
    if (workspaceUnavailable) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await listRecurringPayments(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        setResponsiblePayerOptions([]);
        return;
      }

      setPayments(result.payments);
      setResponsiblePayerOptions(result.responsiblePayerOptions);
    } catch {
      setFeedback("Failed to load recent activity.");
      setResponsiblePayerOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [initData, workspaceUnavailable]);

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

  return (
    <section
      id="activity-section"
      className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-text">Activity</h2>
        <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
          Phase 8O
        </span>
      </div>

      {workspaceUnavailable ? (
        <p className="rounded-xl bg-app-surface-soft px-3 py-2 text-sm text-app-text-muted">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {isFamilyWorkspace
                ? "Family workspace activity (read-only)"
                : "Personal workspace activity (read-only)"}
            </p>
            <p className="mt-1 text-sm text-app-text-muted">
              {isFamilyWorkspace
                ? "Read-only recent activity for shared payments in the current family workspace."
                : "Recent payment activity for your personal workspace."}
            </p>
            <p className="mt-2 text-xs text-app-text-muted">
              Payments in scope: {scopedPaymentsCount} | Recent items shown:{" "}
              {activityItems.length}
            </p>
            {isFamilyWorkspace && sharedWhoPaysSummary && (
              <p className="mt-1 text-xs text-app-text-muted">
                Who pays assigned: {sharedWhoPaysSummary.assignedCount} | Not assigned:{" "}
                {sharedWhoPaysSummary.unassignedCount}
              </p>
            )}
            {isFamilyWorkspace && (
              <p className="mt-1 text-xs text-app-text-muted">
                Paid-cycle mismatch hints: {paidByMismatchCount}
              </p>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            {scopedPaymentsCount === 0 ? (
              <p className="text-sm text-app-text-muted">
                {isFamilyWorkspace
                  ? "No shared payments yet in this family workspace. Activity will appear after shared payments are added."
                  : "No payment activity yet in this personal workspace."}
              </p>
            ) : activityItems.length === 0 ? (
              <p className="text-sm text-app-text-muted">
                No recent activity items yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {activityItems.map((item) => (
                  (() => {
                    const responsiblePayerName = isFamilyWorkspace
                      ? resolveResponsiblePayerDisplayName(
                          item.responsibleProfileId,
                          responsiblePayerOptions,
                        )
                      : null;
                    const paidByName =
                      isFamilyWorkspace && item.paidByProfileId
                        ? resolveResponsiblePayerDisplayName(
                            item.paidByProfileId,
                            responsiblePayerOptions,
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
                        className="rounded-xl bg-app-surface px-2 py-1 text-xs text-app-text"
                      >
                        <span className="font-semibold">{item.label}</span>{" "}
                        <span className="font-medium">{item.title}</span>{" "}
                        <span className="text-app-text-muted">
                          | {formatDateTime(item.timestamp)}
                          {isFamilyWorkspace ? " | shared" : ""}
                          {isFamilyWorkspace ? ` | who pays ${responsiblePayerName}` : ""}
                          {isFamilyWorkspace && item.kind === "paid_cycle"
                            ? ` | paid by ${paidByName ?? "not captured"}`
                            : ""}
                        </span>
                        {hasPaidMismatch && (
                          <p className="mt-1 text-[11px] font-medium text-amber-700">
                            Economics hint: {paidByName ?? "Another member"} paid, while
                            responsibility is on {responsiblePayerName ?? "another member"}.
                          </p>
                        )}
                      </li>
                    );
                  })()
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={loadActivity}
              disabled={isLoading}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              {isFamilyWorkspace ? "Refresh family activity" : "Refresh activity"}
            </button>
            {isLoading && (
              <p className="text-xs text-app-text-muted">
                {isFamilyWorkspace
                  ? "Loading family activity..."
                  : "Loading activity..."}
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

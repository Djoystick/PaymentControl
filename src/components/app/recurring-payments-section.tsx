"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FamilyWorkspaceInvitePayload,
  FamilyWorkspaceInviteStatus,
  WorkspaceSummaryPayload,
} from "@/lib/auth/types";
import {
  archiveRecurringPayment,
  createRecurringPayment,
  emitPaymentsChanged,
  listRecurringPayments,
  markCurrentCyclePaid,
  markCurrentCycleUnpaid,
  pauseSubscriptionPayment,
  replacePaymentInList,
  resumeSubscriptionPayment,
  updateRecurringPayment,
} from "@/lib/payments/client";
import {
  starterPaymentTemplates,
  type StarterPaymentTemplate,
} from "@/lib/payments/starter-templates";
import type {
  RecurringPaymentPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";

type RecurringPaymentsSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
  currentFamilyInvite: FamilyWorkspaceInvitePayload | null;
};

type PaymentFormState = {
  responsibleProfileId: string;
  title: string;
  amount: string;
  currency: string;
  category: string;
  cadence: "weekly" | "monthly";
  dueDay: string;
  isRequired: boolean;
  isSubscription: boolean;
  remindersEnabled: boolean;
  remindDaysBefore: "0" | "1" | "3";
  remindOnDueDay: boolean;
  remindOnOverdue: boolean;
  notes: string;
};

const createDefaultForm = (): PaymentFormState => {
  return {
    responsibleProfileId: "",
    title: "",
    amount: "",
    currency: "USD",
    category: "General",
    cadence: "monthly",
    dueDay: "1",
    isRequired: true,
    isSubscription: false,
    remindersEnabled: true,
    remindDaysBefore: "1",
    remindOnDueDay: true,
    remindOnOverdue: true,
    notes: "",
  };
};

const formFromTemplate = (
  template: StarterPaymentTemplate,
): PaymentFormState => {
  return {
    responsibleProfileId: "",
    title: template.title,
    amount: "",
    currency: template.currency,
    category: template.category,
    cadence: template.cadence,
    dueDay: String(template.dueDay),
    isRequired: template.isRequired,
    isSubscription: template.isSubscription,
    remindersEnabled: template.remindersEnabled,
    remindDaysBefore: String(template.remindDaysBefore) as "0" | "1" | "3",
    remindOnDueDay: template.remindOnDueDay,
    remindOnOverdue: template.remindOnOverdue,
    notes: template.notes,
  };
};

const validateForm = (form: PaymentFormState): string | null => {
  if (!form.title.trim()) {
    return "Title is required.";
  }

  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be a positive number.";
  }

  if (!form.category.trim()) {
    return "Category is required.";
  }

  const dueDay = Number(form.dueDay);
  if (!Number.isInteger(dueDay)) {
    return "Due day must be an integer.";
  }

  if (form.cadence === "weekly" && (dueDay < 1 || dueDay > 7)) {
    return "Weekly due day must be from 1 to 7.";
  }

  if (form.cadence === "monthly" && (dueDay < 1 || dueDay > 31)) {
    return "Monthly due day must be from 1 to 31.";
  }

  if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
    return "Currency must be a 3-letter code.";
  }

  if (!["0", "1", "3"].includes(form.remindDaysBefore)) {
    return "Remind days before must be 0, 1, or 3.";
  }

  return null;
};

const formatAmount = (payment: RecurringPaymentPayload): string => {
  return `${payment.amount.toFixed(2)} ${payment.currency}`;
};

const formatDueDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
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

const isCycleToggleDisabled = (
  payment: RecurringPaymentPayload,
  isFamilyWorkspace: boolean,
  isSaving: boolean,
): boolean => {
  if (isSaving || payment.status === "archived") {
    return true;
  }

  if (isFamilyWorkspace) {
    return payment.paymentScope !== "shared";
  }

  return payment.isSubscription && payment.isPaused;
};

const WEEKLY_TO_MONTHLY_FACTOR = 52 / 12;
const SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS = 7;

const toUtcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addUtcDays = (date: Date, days: number): Date => {
  const value = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  value.setUTCDate(value.getUTCDate() + days);
  return value;
};

const aggregateTotalsByCurrency = (
  payments: RecurringPaymentPayload[],
): Array<{ currency: string; total: number }> => {
  const totalsByCurrency = new Map<string, number>();
  for (const payment of payments) {
    const current = totalsByCurrency.get(payment.currency) ?? 0;
    totalsByCurrency.set(payment.currency, current + payment.amount);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
};

const formatCurrencyTotals = (
  totals: Array<{ currency: string; total: number }>,
): string => {
  if (totals.length === 0) {
    return "0";
  }

  return totals
    .map((item) => `${item.total.toFixed(2)} ${item.currency}`)
    .join(" | ");
};

const familyInviteStatusLabels: Record<FamilyWorkspaceInviteStatus, string> = {
  active: "Active invite",
  accepted: "Invite already used",
  expired: "Invite expired",
  revoked: "Invite revoked",
};

export function RecurringPaymentsSection({
  workspace,
  initData,
  currentFamilyInvite,
}: RecurringPaymentsSectionProps) {
  const [payments, setPayments] = useState<RecurringPaymentPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [showSubscriptionsOnly, setShowSubscriptionsOnly] = useState(false);
  const [showPausedSubscriptionsOnly, setShowPausedSubscriptionsOnly] = useState(false);
  const [responsiblePayerOptions, setResponsiblePayerOptions] = useState<
    WorkspaceResponsiblePayerOptionPayload[]
  >([]);
  const [form, setForm] = useState<PaymentFormState>(createDefaultForm);

  const subscriptionSummary = useMemo(() => {
    const activeSubscriptions = payments.filter(
      (payment) =>
        payment.status === "active" && payment.isSubscription && !payment.isPaused,
    );
    const unpaidSubscriptionsCount = activeSubscriptions.filter(
      (payment) => payment.currentCycle.state === "unpaid",
    ).length;

    const totalsByCurrency = new Map<string, number>();
    for (const payment of activeSubscriptions) {
      const monthlyAmount =
        payment.cadence === "weekly"
          ? payment.amount * WEEKLY_TO_MONTHLY_FACTOR
          : payment.amount;
      const current = totalsByCurrency.get(payment.currency) ?? 0;
      totalsByCurrency.set(payment.currency, current + monthlyAmount);
    }

    return {
      activeSubscriptionsCount: activeSubscriptions.length,
      unpaidSubscriptionsCount,
      monthlyTotalsByCurrency: Array.from(totalsByCurrency.entries())
        .map(([currency, total]) => ({ currency, total }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
    };
  }, [payments]);

  const subscriptionRenewals = useMemo(() => {
    const now = new Date();
    const todayKey = toUtcDateKey(now);
    const upcomingEndKey = toUtcDateKey(
      addUtcDays(now, SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS),
    );
    const dueToday: RecurringPaymentPayload[] = [];
    const upcoming: RecurringPaymentPayload[] = [];
    const overdue: RecurringPaymentPayload[] = [];

    for (const payment of payments) {
      if (
        payment.status !== "active" ||
        !payment.isSubscription ||
        payment.isPaused
      ) {
        continue;
      }

      if (payment.currentCycle.state !== "unpaid") {
        continue;
      }

      const dueDate = payment.currentCycle.dueDate;
      if (dueDate < todayKey) {
        overdue.push(payment);
      } else if (dueDate === todayKey) {
        dueToday.push(payment);
      } else if (dueDate <= upcomingEndKey) {
        upcoming.push(payment);
      }
    }

    const sortByDueDateThenTitle = (
      a: RecurringPaymentPayload,
      b: RecurringPaymentPayload,
    ) => {
      if (a.currentCycle.dueDate !== b.currentCycle.dueDate) {
        return a.currentCycle.dueDate.localeCompare(b.currentCycle.dueDate);
      }

      return a.title.localeCompare(b.title);
    };

    dueToday.sort(sortByDueDateThenTitle);
    upcoming.sort(sortByDueDateThenTitle);
    overdue.sort(sortByDueDateThenTitle);

    return {
      dueToday,
      upcoming,
      overdue,
    };
  }, [payments]);

  const subscriptionCostPressure = useMemo(() => {
    return {
      dueTodayTotals: aggregateTotalsByCurrency(subscriptionRenewals.dueToday),
      upcomingTotals: aggregateTotalsByCurrency(subscriptionRenewals.upcoming),
      overdueTotals: aggregateTotalsByCurrency(subscriptionRenewals.overdue),
    };
  }, [subscriptionRenewals]);

  const pausedSubscriptions = useMemo(() => {
    return payments
      .filter(
        (payment) =>
          payment.status === "active" && payment.isSubscription && payment.isPaused,
      )
      .sort((a, b) => {
        if (a.updatedAt !== b.updatedAt) {
          return b.updatedAt.localeCompare(a.updatedAt);
        }

        return a.title.localeCompare(b.title);
      });
  }, [payments]);

  const pausedSubscriptionSavings = useMemo(() => {
    const totalsByCurrency = new Map<string, number>();
    for (const payment of pausedSubscriptions) {
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
  }, [pausedSubscriptions]);

  const subscriptionHealth = useMemo(() => {
    const actionableActiveSubscriptions = payments.filter(
      (payment) =>
        payment.status === "active" && payment.isSubscription && !payment.isPaused,
    );

    const remindersOffSubscriptions = actionableActiveSubscriptions.filter(
      (payment) => !payment.remindersEnabled,
    );

    const attentionItems: Array<{ id: string; label: string }> = [];
    for (const payment of subscriptionRenewals.overdue.slice(0, 3)) {
      attentionItems.push({
        id: `overdue-${payment.id}`,
        label: `${payment.title} - overdue`,
      });
    }

    if (attentionItems.length < 3) {
      for (const payment of remindersOffSubscriptions) {
        if (attentionItems.length >= 3) {
          break;
        }

        if (attentionItems.some((item) => item.id.endsWith(payment.id))) {
          continue;
        }

        attentionItems.push({
          id: `reminders-off-${payment.id}`,
          label: `${payment.title} - reminders off`,
        });
      }
    }

    return {
      overdueCount: subscriptionRenewals.overdue.length,
      unpaidCurrentCycleCount: subscriptionSummary.unpaidSubscriptionsCount,
      pausedCount: pausedSubscriptions.length,
      remindersOffCount: remindersOffSubscriptions.length,
      attentionItems,
    };
  }, [payments, pausedSubscriptions, subscriptionRenewals, subscriptionSummary]);

  const familyReadinessSummary = useMemo(() => {
    const activeSharedPayments = payments.filter(
      (payment) => payment.paymentScope === "shared" && payment.status === "active",
    );
    const unassignedResponsibleCount = activeSharedPayments.filter(
      (payment) => !payment.responsibleProfileId,
    ).length;

    return {
      householdMembersCount: workspace?.memberCount ?? 0,
      sharedRecurringPaymentsCount: activeSharedPayments.length,
      unassignedResponsibleCount,
      inviteStatus: currentFamilyInvite
        ? familyInviteStatusLabels[currentFamilyInvite.inviteStatus]
        : "No current invite",
      hasCurrentInvite: Boolean(currentFamilyInvite),
    };
  }, [currentFamilyInvite, payments, workspace?.memberCount]);

  const visiblePayments = useMemo(() => {
    if (showPausedSubscriptionsOnly) {
      return payments.filter(
        (payment) =>
          payment.status === "active" && payment.isSubscription && payment.isPaused,
      );
    }

    if (showSubscriptionsOnly) {
      return payments.filter((payment) => payment.isSubscription);
    }

    return payments;
  }, [payments, showPausedSubscriptionsOnly, showSubscriptionsOnly]);

  const isFamilyWorkspace = workspace?.kind === "family";
  const activeWorkspaceId = workspace?.id ?? null;

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return "Load current workspace first to manage recurring payments.";
    }

    if (
      workspace.kind === "personal" &&
      workspace.id.startsWith("virtual-personal-")
    ) {
      return "Workspace persistence is not initialized. Apply workspace migrations first.";
    }

    return null;
  }, [workspace]);

  const loadPayments = useCallback(async () => {
    if (workspaceUnavailable || !activeWorkspaceId) {
      setPayments([]);
      setResponsiblePayerOptions([]);
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
      setFeedback("Failed to load recurring payments.");
      setResponsiblePayerOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, initData, workspaceUnavailable]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const resetForm = () => {
    setForm(createDefaultForm());
    setEditingPaymentId(null);
  };

  const startEdit = (payment: RecurringPaymentPayload) => {
    setEditingPaymentId(payment.id);
    setForm({
      responsibleProfileId: payment.responsibleProfileId ?? "",
      title: payment.title,
      amount: String(payment.amount),
      currency: payment.currency,
      category: payment.category,
      cadence: payment.cadence,
      dueDay: String(payment.dueDay),
      isRequired: payment.isRequired,
      isSubscription: payment.isSubscription,
      remindersEnabled: payment.remindersEnabled,
      remindDaysBefore: String(payment.remindDaysBefore) as "0" | "1" | "3",
      remindOnDueDay: payment.remindOnDueDay,
      remindOnOverdue: payment.remindOnOverdue,
      notes: payment.notes ?? "",
    });
    setFeedback(null);
  };

  const applyTemplate = (template: StarterPaymentTemplate) => {
    setEditingPaymentId(null);
    setForm(formFromTemplate(template));
    setFeedback(`Template "${template.label}" applied. Review and add payment.`);
  };

  const submitForm = async () => {
    if (workspaceUnavailable) {
      setFeedback(workspaceUnavailable);
      return;
    }

    const validationError = validateForm(form);
    if (validationError) {
      setFeedback(validationError);
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    const payload = {
      initData,
      responsibleProfileId: form.responsibleProfileId.trim() || null,
      title: form.title.trim(),
      amount: Number(form.amount),
      currency: form.currency.trim().toUpperCase(),
      category: form.category.trim(),
      cadence: form.cadence,
      dueDay: Number(form.dueDay),
      isRequired: form.isRequired,
      isSubscription: form.isSubscription,
      remindersEnabled: form.remindersEnabled,
      remindDaysBefore: Number(form.remindDaysBefore) as 0 | 1 | 3,
      remindOnDueDay: form.remindOnDueDay,
      remindOnOverdue: form.remindOnOverdue,
      notes: form.notes.trim() || null,
    } as const;

    try {
      const result = editingPaymentId
        ? await updateRecurringPayment({ ...payload, paymentId: editingPaymentId })
        : await createRecurringPayment(payload);

      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setPayments((current) => replacePaymentInList(current, result.payment));
      setFeedback(editingPaymentId ? "Payment updated." : "Payment created.");
      emitPaymentsChanged();
      resetForm();
    } catch {
      setFeedback("Failed to save recurring payment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (paymentId: string) => {
    if (workspaceUnavailable) {
      setFeedback(workspaceUnavailable);
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await archiveRecurringPayment(initData, paymentId);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setPayments((current) => replacePaymentInList(current, result.payment));
      setFeedback("Payment archived.");
      emitPaymentsChanged();
    } catch {
      setFeedback("Failed to archive recurring payment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (workspaceUnavailable) {
      setFeedback(workspaceUnavailable);
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await markCurrentCyclePaid(initData, paymentId);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setPayments((current) => replacePaymentInList(current, result.payment));
      setFeedback("Current cycle marked as paid.");
      emitPaymentsChanged();
      void loadPayments();
    } catch {
      setFeedback("Failed to mark current cycle as paid.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkUnpaid = async (paymentId: string) => {
    if (workspaceUnavailable) {
      setFeedback(workspaceUnavailable);
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await markCurrentCycleUnpaid(initData, paymentId);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setPayments((current) => replacePaymentInList(current, result.payment));
      setFeedback("Current cycle marked as unpaid.");
      emitPaymentsChanged();
      void loadPayments();
    } catch {
      setFeedback("Failed to mark current cycle as unpaid.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseResume = async (
    paymentId: string,
    nextPausedState: boolean,
  ) => {
    if (workspaceUnavailable) {
      setFeedback(workspaceUnavailable);
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = nextPausedState
        ? await pauseSubscriptionPayment(initData, paymentId)
        : await resumeSubscriptionPayment(initData, paymentId);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setPayments((current) => replacePaymentInList(current, result.payment));
      setFeedback(nextPausedState ? "Subscription paused." : "Subscription resumed.");
      emitPaymentsChanged();
    } catch {
      setFeedback(
        nextPausedState
          ? "Failed to pause subscription."
          : "Failed to resume subscription.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-text">Recurring Payments</h2>
        <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
          Phase 10C
        </span>
      </div>
      {workspace && (
        <p className="mb-3 text-xs text-app-text-muted">
          Current workspace: {workspace.title} ({workspace.kind})
        </p>
      )}

      {workspaceUnavailable ? (
        <p className="rounded-xl bg-app-surface-soft px-3 py-2 text-sm text-app-text-muted">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          {isFamilyWorkspace && (
            <details className="mb-2 rounded-xl border border-app-border bg-app-surface-soft px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Family shared payment help
              </summary>
              <p className="mt-1 text-xs text-app-text-muted">
                Shared cards use Who pays for responsibility and Paid by for who marked
                the cycle paid.
              </p>
            </details>
          )}
          {isFamilyWorkspace && (
            <div className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Family readiness snapshot
              </p>
              <p className="mt-1 text-xs text-app-text-muted">
                Quick readiness view for this household.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">Members</p>
                  <p className="text-sm font-semibold text-app-text">
                    {familyReadinessSummary.householdMembersCount}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">Invite</p>
                  <p className="text-sm font-semibold text-app-text">
                    {familyReadinessSummary.inviteStatus}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">Shared payments</p>
                  <p className="text-sm font-semibold text-app-text">
                    {isLoading
                      ? "Loading..."
                      : familyReadinessSummary.sharedRecurringPaymentsCount}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">Who pays not assigned</p>
                  <p className="text-sm font-semibold text-app-text">
                    {isLoading
                      ? "Loading..."
                      : familyReadinessSummary.unassignedResponsibleCount}
                  </p>
                </div>
              </div>
            </div>
          )}
          {isFamilyWorkspace && (
            <div className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Household members for who pays
              </p>
              <p className="mt-1 text-sm text-app-text">
                Members in this family workspace:{" "}
                <span className="font-semibold">{workspace?.memberCount ?? 0}</span>
              </p>
              <p className="mt-1 text-xs text-app-text-muted">
                Shared payments belong to this household. Who pays can be selected only
                from members listed here.
              </p>
              {responsiblePayerOptions.length === 0 ? (
                <p className="mt-2 text-xs text-app-text-muted">
                  {(workspace?.memberCount ?? 0) > 0
                    ? "Member list is temporarily unavailable. Try Refresh."
                    : "No members are visible yet."}
                </p>
              ) : (
                <>
                  <ul className="mt-2 space-y-1">
                    {responsiblePayerOptions.map((option) => (
                      <li
                        key={option.profileId}
                        className="flex items-center justify-between rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text"
                      >
                        <span>{option.displayName}</span>
                        <span className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                          {option.memberRole === "owner" ? "Owner" : "Member"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {responsiblePayerOptions.length === 1 &&
                    responsiblePayerOptions[0]?.memberRole === "owner" && (
                      <p className="mt-2 text-xs text-app-text-muted">
                        This household currently has only the owner.
                      </p>
                    )}
                </>
              )}
            </div>
          )}
          {isFamilyWorkspace &&
            !isLoading &&
            familyReadinessSummary.sharedRecurringPaymentsCount === 0 && (
              <div className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  Start with first shared payment
                </p>
                <p className="mt-1 text-sm text-app-text">
                  This family workspace does not have shared recurring payments yet.
                </p>
                <p className="mt-1 text-xs text-app-text-muted">
                  {familyReadinessSummary.hasCurrentInvite
                    ? "Invite is ready. Next step: add your first shared recurring payment below."
                    : "You can add your first shared recurring payment now, then invite members when needed."}
                </p>
                <p className="mt-1 text-xs text-app-text-muted">
                  Quick Add templates and the create form below already work for this.
                </p>
              </div>
            )}

          <div className="rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {isFamilyWorkspace
                ? "Quick Add shared payment templates"
                : "Quick Add templates"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {starterPaymentTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  disabled={isSaving}
                  className="rounded-full border border-app-border bg-white px-3 py-1 text-xs font-medium text-app-text disabled:opacity-60"
                >
                  {template.label}
                  {template.isSubscription ? " - Sub" : ""}
                </button>
              ))}
            </div>
          </div>

          <details className="mt-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Subscription insights - active {subscriptionSummary.activeSubscriptionsCount}, unpaid {subscriptionSummary.unpaidSubscriptionsCount}
            </summary>

            <div className="mt-2 space-y-2">
          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Subscriptions Summary
            </p>
              <p className="mt-1 text-sm text-app-text">
                Active: <span className="font-semibold">{subscriptionSummary.activeSubscriptionsCount}</span>
              {" - "}
              Unpaid this cycle:{" "}
              <span className="font-semibold">{subscriptionSummary.unpaidSubscriptionsCount}</span>
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              Monthly total (weekly cadence uses 52/12 monthly equivalent):
            </p>
            {subscriptionSummary.monthlyTotalsByCurrency.length === 0 ? (
              <p className="mt-1 text-xs text-app-text-muted">
                No active subscriptions yet.
              </p>
            ) : (
              <p className="mt-1 text-sm text-app-text">
                {subscriptionSummary.monthlyTotalsByCurrency
                  .map((item) => `${item.total.toFixed(2)} ${item.currency}`)
                  .join(" | ")}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Subscription Health
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">Overdue</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.overdueCount}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">Unpaid cycle</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.unpaidCurrentCycleCount}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">Paused</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.pausedCount}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">Reminders off</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.remindersOffCount}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-app-text-muted">Needs attention:</p>
              {subscriptionHealth.attentionItems.length === 0 ? (
                <p className="mt-1 text-xs text-app-text-muted">
                  No immediate subscription issues detected.
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {subscriptionHealth.attentionItems.map((item) => (
                    <li key={item.id} className="text-xs text-app-text">
                      {item.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Subscription Renewals
              </p>
              <button
                type="button"
                onClick={() => setShowSubscriptionsOnly(true)}
                className="rounded-lg border border-app-border bg-white px-2 py-1 text-[11px] font-semibold text-app-text"
              >
                Focus subscriptions
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">Due today</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionRenewals.dueToday.length}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">
                  Upcoming ({SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS}d)
                </p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionRenewals.upcoming.length}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">Overdue</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionRenewals.overdue.length}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <article className="rounded-xl border border-app-border bg-white p-2">
                <p className="text-xs font-semibold text-app-text">Due today</p>
                {subscriptionRenewals.dueToday.length === 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    No due-today subscription renewals.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {subscriptionRenewals.dueToday.slice(0, 3).map((payment) => (
                      <li key={`due-today-${payment.id}`} className="text-xs text-app-text">
                        {payment.title} - {formatAmount(payment)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="rounded-xl border border-app-border bg-white p-2">
                <p className="text-xs font-semibold text-app-text">
                  Upcoming ({SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS}d)
                </p>
                {subscriptionRenewals.upcoming.length === 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    No upcoming subscription renewals.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {subscriptionRenewals.upcoming.slice(0, 3).map((payment) => (
                      <li key={`upcoming-${payment.id}`} className="text-xs text-app-text">
                        {payment.title} - due {formatDueDate(payment.currentCycle.dueDate)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="rounded-xl border border-app-border bg-white p-2">
                <p className="text-xs font-semibold text-app-text">Overdue</p>
                {subscriptionRenewals.overdue.length === 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    No overdue subscription renewals.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {subscriptionRenewals.overdue.slice(0, 3).map((payment) => (
                      <li key={`overdue-${payment.id}`} className="text-xs text-app-text">
                        {payment.title} - due {formatDueDate(payment.currentCycle.dueDate)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Subscription Cost Pressure
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              Active unpaid subscription renewals, grouped by currency (no FX conversion).
            </p>
            <div className="mt-2 space-y-1 text-sm text-app-text">
              <p>
                Due today:{" "}
                <span className="font-semibold">
                  {formatCurrencyTotals(subscriptionCostPressure.dueTodayTotals)}
                </span>
              </p>
              <p>
                Upcoming ({SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS}d):{" "}
                <span className="font-semibold">
                  {formatCurrencyTotals(subscriptionCostPressure.upcomingTotals)}
                </span>
              </p>
              <p>
                Overdue:{" "}
                <span className="font-semibold">
                  {formatCurrencyTotals(subscriptionCostPressure.overdueTotals)}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Paused Subscriptions
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowPausedSubscriptionsOnly((current) => !current);
                  setShowSubscriptionsOnly(false);
                }}
                className="rounded-lg border border-app-border bg-white px-2 py-1 text-[11px] font-semibold text-app-text"
              >
                {showPausedSubscriptionsOnly
                  ? "Show all payments"
                  : "Show paused subscriptions"}
              </button>
            </div>
            <p className="mt-1 text-sm text-app-text">
              Paused now:{" "}
              <span className="font-semibold">{pausedSubscriptions.length}</span>
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              Monthly savings/load relief (weekly uses 52/12 monthly equivalent, grouped by
              currency):
            </p>
            <p className="mt-1 text-sm text-app-text">
              <span className="font-semibold">
                {formatCurrencyTotals(pausedSubscriptionSavings)}
              </span>
            </p>
            <div className="mt-2">
              {pausedSubscriptions.length === 0 ? (
                <p className="text-xs text-app-text-muted">
                  No paused subscriptions right now.
                </p>
              ) : (
                <ul className="space-y-1">
                  {pausedSubscriptions.slice(0, 5).map((payment) => (
                    <li
                      key={`paused-${payment.id}`}
                      className="text-xs text-app-text"
                    >
                      {payment.title} - {formatAmount(payment)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
            </div>
          </details>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Payment title"
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            <input
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              placeholder="Amount"
              type="number"
              step="0.01"
              min="0"
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            <input
              value={form.currency}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, currency: event.target.value }))
              }
              placeholder="Currency (USD)"
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            <input
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Category"
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            {isFamilyWorkspace && (
              <label className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
                <span className="block text-xs font-semibold text-app-text-muted">
                  Who pays (responsible payer)
                </span>
                <select
                  value={form.responsibleProfileId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      responsibleProfileId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-2 py-2 text-sm text-app-text outline-none"
                >
                  <option value="">Not assigned yet</option>
                  {responsiblePayerOptions.map((option) => (
                    <option key={option.profileId} value={option.profileId}>
                      {option.displayName}
                      {option.memberRole === "owner" ? " (owner)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <select
              value={form.cadence}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  cadence: event.target.value as "weekly" | "monthly",
                  dueDay: event.target.value === "weekly" ? "1" : prev.dueDay,
                }))
              }
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
            <input
              value={form.dueDay}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dueDay: event.target.value }))
              }
              placeholder={form.cadence === "weekly" ? "Due weekday (1-7)" : "Due day (1-31)"}
              type="number"
              min="1"
              max={form.cadence === "weekly" ? "7" : "31"}
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            <label className="flex items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isRequired: event.target.checked }))
                }
              />
              Required payment
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={form.isSubscription}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isSubscription: event.target.checked,
                  }))
                }
              />
              Mark as subscription
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={form.remindersEnabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    remindersEnabled: event.target.checked,
                  }))
                }
              />
              Reminders enabled
            </label>

            <select
              value={form.remindDaysBefore}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  remindDaysBefore: event.target.value as "0" | "1" | "3",
                }))
              }
              disabled={!form.remindersEnabled}
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none disabled:bg-app-surface-soft disabled:text-app-text-muted"
            >
              <option value="0">Remind 0 days before</option>
              <option value="1">Remind 1 day before</option>
              <option value="3">Remind 3 days before</option>
            </select>

            <label className="flex items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={form.remindOnDueDay}
                disabled={!form.remindersEnabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    remindOnDueDay: event.target.checked,
                  }))
                }
              />
              Remind on due day
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={form.remindOnOverdue}
                disabled={!form.remindersEnabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    remindOnOverdue: event.target.checked,
                  }))
                }
              />
              Remind if overdue
            </label>
          </div>

          <textarea
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Notes (optional)"
            className="mt-2 h-20 w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
          />

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={submitForm}
              disabled={isSaving}
              className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {editingPaymentId ? "Save changes" : "Add payment"}
            </button>
            {editingPaymentId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text"
              >
                Cancel edit
              </button>
            )}
              <button
                type="button"
                onClick={loadPayments}
                disabled={isLoading}
                className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text"
              >
              Refresh section
              </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-70"
            >
              Clear form
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSubscriptionsOnly((current) => !current);
                setShowPausedSubscriptionsOnly(false);
              }}
              className="rounded-xl border border-app-border px-3 py-1 text-xs font-semibold text-app-text"
            >
              {showSubscriptionsOnly ? "Show all payments" : "Show subscriptions only"}
            </button>
            <p className="text-xs text-app-text-muted">
              Visible: {visiblePayments.length} / Total: {payments.length}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {isLoading && (
              <p className="text-sm text-app-text-muted">Loading payments...</p>
            )}
            {!isLoading && payments.length === 0 && (
              <p className="text-sm text-app-text-muted">
                No recurring payments yet. Create your first one.
              </p>
            )}
            {!isLoading && payments.length > 0 && visiblePayments.length === 0 && (
              <p className="text-sm text-app-text-muted">
                {showPausedSubscriptionsOnly
                  ? "No paused subscriptions found for the current filter."
                  : "No subscription payments found for the current filter."}
              </p>
            )}
            {visiblePayments.map((payment) => (
              (() => {
                const responsiblePayerName =
                  payment.paymentScope === "shared"
                    ? resolveResponsiblePayerDisplayName(
                        payment.responsibleProfileId,
                        responsiblePayerOptions,
                      )
                    : null;
                const paidByName =
                  payment.paymentScope === "shared" &&
                  payment.currentCycle.paidByProfileId
                    ? resolveResponsiblePayerDisplayName(
                        payment.currentCycle.paidByProfileId,
                        responsiblePayerOptions,
                      )
                    : null;
                const hasEconomicsMismatch =
                  payment.paymentScope === "shared" &&
                  payment.currentCycle.state === "paid" &&
                  Boolean(payment.responsibleProfileId) &&
                  Boolean(payment.currentCycle.paidByProfileId) &&
                  payment.responsibleProfileId !== payment.currentCycle.paidByProfileId;

                return (
                  <article
                    key={payment.id}
                    className="rounded-2xl border border-app-border bg-app-surface-soft p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-app-text">{payment.title}</p>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] font-semibold text-app-text">
                            {payment.paymentScope === "shared" ? "Family shared" : "Personal"}
                          </span>
                          {payment.isSubscription && (
                            <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] font-semibold text-app-text">
                              Subscription
                            </span>
                          )}
                          {payment.isSubscription && payment.isPaused && (
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-app-text-muted">
                          {formatAmount(payment)} - {payment.category}
                        </p>
                        <p className="text-sm text-app-text-muted">
                          {payment.cadence === "weekly"
                            ? `Weekly, weekday ${payment.dueDay}`
                            : `Monthly, day ${payment.dueDay}`}
                          . {payment.isRequired ? "Required" : "Optional"}. Status: {payment.status}.
                        </p>
                        {payment.paymentScope === "shared" ? (
                          <p className="text-sm text-app-text-muted">
                            Who pays: {responsiblePayerName}
                          </p>
                        ) : (
                          <p className="text-sm text-app-text-muted">Personal payment</p>
                        )}
                        <p className="text-sm text-app-text-muted">
                          Current cycle: {payment.currentCycle.state}. Due{" "}
                          {formatDueDate(payment.currentCycle.dueDate)}
                          {payment.currentCycle.paidAt ? ". Paid this cycle." : "."}
                        </p>
                        {payment.paymentScope === "shared" &&
                          payment.currentCycle.state === "paid" && (
                            <p className="text-sm text-app-text-muted">
                              Paid by: {paidByName ?? "Not captured"}
                            </p>
                          )}
                        {payment.paymentScope === "shared" &&
                          payment.currentCycle.state === "paid" &&
                          hasEconomicsMismatch && (
                            <p className="text-xs font-medium text-amber-700">
                              Economics hint: {paidByName ?? "Another member"} covered this
                              cycle, while responsibility is on{" "}
                              {responsiblePayerName ?? "another member"}.
                            </p>
                          )}
                        {payment.paymentScope === "shared" &&
                          payment.currentCycle.state === "paid" &&
                          !hasEconomicsMismatch &&
                          payment.responsibleProfileId &&
                          payment.currentCycle.paidByProfileId &&
                          payment.responsibleProfileId ===
                            payment.currentCycle.paidByProfileId && (
                            <p className="text-xs font-medium text-emerald-700">
                              Economics: aligned (responsible payer paid this cycle).
                            </p>
                          )}
                        <p className="text-xs text-app-text-muted">
                          Reminders:{" "}
                          {payment.remindersEnabled
                            ? `on (before ${payment.remindDaysBefore}d, due day ${payment.remindOnDueDay ? "yes" : "no"}, overdue ${payment.remindOnOverdue ? "yes" : "no"})`
                            : "off"}
                        </p>
                        {payment.notes && (
                          <p className="mt-1 text-xs text-app-text-muted">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(payment)}
                          disabled={isSaving || payment.status === "archived"}
                          className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(payment.id)}
                          disabled={
                            isSaving || payment.status === "archived" || isFamilyWorkspace
                          }
                          className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            payment.currentCycle.state === "paid"
                              ? handleMarkUnpaid(payment.id)
                              : handleMarkPaid(payment.id)
                          }
                          disabled={isCycleToggleDisabled(
                            payment,
                            isFamilyWorkspace,
                            isSaving,
                          )}
                          className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                        >
                          {payment.currentCycle.state === "paid" ? "Undo paid" : "Mark paid"}
                        </button>
                        {payment.isSubscription && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePauseResume(payment.id, !payment.isPaused)
                            }
                            disabled={
                              isSaving || payment.status === "archived" || isFamilyWorkspace
                            }
                            className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                          >
                            {payment.isPaused ? "Resume" : "Pause"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })()
            ))}
          </div>
        </>
      )}

      {feedback && (
        <p className="mt-3 text-xs font-medium text-app-text">{feedback}</p>
      )}
    </section>
  );
}


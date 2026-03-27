"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
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
  familyStarterPaymentTemplates,
  personalStarterPaymentTemplates,
  type StarterPaymentTemplate,
} from "@/lib/payments/starter-templates";
import { useLocalization } from "@/lib/i18n/localization";
import type {
  RecurringPaymentPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";
import { ReminderCandidatesSection } from "@/components/app/reminder-candidates-section";
import { HelpPopover } from "@/components/app/help-popover";
import { AppIcon } from "@/components/app/app-icon";

type RecurringPaymentsSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
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

type TemplateScenario = "personal" | "family";
type PaymentListView = "payments" | "subscriptions";

type CustomTemplateStorageShape = Record<TemplateScenario, StarterPaymentTemplate[]>;

const CUSTOM_TEMPLATES_STORAGE_KEY = "payment-control-custom-templates-v1";

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

const templateFromForm = (
  form: PaymentFormState,
  scenario: TemplateScenario,
  label: string,
): StarterPaymentTemplate => {
  const templateIdBase =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 10000)}`;

  return {
    id: `custom-${templateIdBase}`,
    label: label.trim(),
    scenario,
    title: form.title.trim(),
    category: form.category.trim(),
    cadence: form.cadence,
    currency: form.currency.trim().toUpperCase(),
    dueDay: Number(form.dueDay),
    isRequired: form.isRequired,
    isSubscription: form.isSubscription,
    remindersEnabled: form.remindersEnabled,
    remindDaysBefore: Number(form.remindDaysBefore) as 0 | 1 | 3,
    remindOnDueDay: form.remindOnDueDay,
    remindOnOverdue: form.remindOnOverdue,
    notes: form.notes.trim(),
  };
};

const readCustomTemplatesFromStorage = (): CustomTemplateStorageShape => {
  if (typeof window === "undefined") {
    return { personal: [], family: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!rawValue) {
      return { personal: [], family: [] };
    }

    const parsed = JSON.parse(rawValue) as Partial<CustomTemplateStorageShape>;
    const personal = Array.isArray(parsed.personal) ? parsed.personal : [];
    const family = Array.isArray(parsed.family) ? parsed.family : [];
    return { personal, family };
  } catch {
    return { personal: [], family: [] };
  }
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

export function RecurringPaymentsSection({
  workspace,
  initData,
}: RecurringPaymentsSectionProps) {
  const { tr } = useLocalization();
  const [payments, setPayments] = useState<RecurringPaymentPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentListView, setPaymentListView] = useState<PaymentListView>("payments");
  const [showPausedSubscriptionsOnly, setShowPausedSubscriptionsOnly] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isAdvancedFormExpanded, setIsAdvancedFormExpanded] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [customTemplatesByScenario, setCustomTemplatesByScenario] =
    useState<CustomTemplateStorageShape>(() => ({ personal: [], family: [] }));
  const [responsiblePayerOptions, setResponsiblePayerOptions] = useState<
    WorkspaceResponsiblePayerOptionPayload[]
  >([]);
  const [form, setForm] = useState<PaymentFormState>(createDefaultForm);
  const composerRef = useRef<HTMLDetailsElement | null>(null);

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

    const attentionItems: Array<{
      id: string;
      title: string;
      reason: "overdue" | "reminders_off";
    }> = [];
    for (const payment of subscriptionRenewals.overdue.slice(0, 3)) {
      attentionItems.push({
        id: `overdue-${payment.id}`,
        title: payment.title,
        reason: "overdue",
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
          title: payment.title,
          reason: "reminders_off",
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
    };
  }, [payments, workspace?.memberCount]);

  const isFamilyWorkspace = workspace?.kind === "family";
  const activeTemplateScenario: TemplateScenario = isFamilyWorkspace
    ? "family"
    : "personal";

  const starterTemplatesForScenario = useMemo(
    () =>
      activeTemplateScenario === "family"
        ? familyStarterPaymentTemplates
        : personalStarterPaymentTemplates,
    [activeTemplateScenario],
  );

  const templatesForScenario = useMemo(() => {
    const customTemplates = customTemplatesByScenario[activeTemplateScenario] ?? [];
    return [...customTemplates, ...starterTemplatesForScenario];
  }, [activeTemplateScenario, customTemplatesByScenario, starterTemplatesForScenario]);

  const paymentTemplates = useMemo(
    () => templatesForScenario.filter((template) => !template.isSubscription),
    [templatesForScenario],
  );

  const subscriptionTemplates = useMemo(
    () => templatesForScenario.filter((template) => template.isSubscription),
    [templatesForScenario],
  );

  const visiblePayments = useMemo(() => {
    if (paymentListView === "subscriptions" && showPausedSubscriptionsOnly) {
      return payments.filter(
        (payment) =>
          payment.status === "active" && payment.isSubscription && payment.isPaused,
      );
    }

    if (paymentListView === "subscriptions") {
      return payments.filter((payment) => payment.isSubscription);
    }

    return payments.filter((payment) => !payment.isSubscription);
  }, [paymentListView, payments, showPausedSubscriptionsOnly]);

  const paymentsCount = useMemo(
    () => payments.filter((payment) => !payment.isSubscription).length,
    [payments],
  );
  const subscriptionsCount = useMemo(
    () => payments.filter((payment) => payment.isSubscription).length,
    [payments],
  );

  const activeWorkspaceId = workspace?.id ?? null;

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return tr("Load current workspace first to manage recurring payments.");
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
      setFeedback(tr("Failed to load recurring payments."));
      setResponsiblePayerOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, initData, tr, workspaceUnavailable]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    if (payments.length === 0) {
      setIsComposerExpanded(true);
    }
  }, [payments.length]);

  useEffect(() => {
    setCustomTemplatesByScenario(readCustomTemplatesFromStorage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        CUSTOM_TEMPLATES_STORAGE_KEY,
        JSON.stringify(customTemplatesByScenario),
      );
    } catch {
      // Ignore storage write failures and keep in-memory templates.
    }
  }, [customTemplatesByScenario]);

  useEffect(() => {
    setShowPausedSubscriptionsOnly(false);
  }, [paymentListView]);

  const resetForm = () => {
    setForm(createDefaultForm());
    setEditingPaymentId(null);
    setIsComposerExpanded(payments.length === 0);
    setIsAdvancedFormExpanded(false);
  };

  const startEdit = (payment: RecurringPaymentPayload) => {
    setEditingPaymentId(payment.id);
    setIsComposerExpanded(true);
    setIsAdvancedFormExpanded(true);
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
    setIsComposerExpanded(true);
    setIsAdvancedFormExpanded(false);
    setForm(formFromTemplate(template));
    setFeedback(
      tr('Template "{template}" applied. Review and add payment.', {
        template: tr(template.label),
      }),
    );
  };

  const saveCurrentFormAsTemplate = () => {
    const templateLabel = templateNameInput.trim() || form.title.trim();
    const validationError = validateForm(form);
    if (validationError) {
      setFeedback(tr(validationError));
      return;
    }

    if (!templateLabel) {
      setFeedback(tr("Template name is required."));
      return;
    }

    const nextTemplate = templateFromForm(form, activeTemplateScenario, templateLabel);
    setCustomTemplatesByScenario((current) => ({
      ...current,
      [activeTemplateScenario]: [nextTemplate, ...(current[activeTemplateScenario] ?? [])],
    }));
    setTemplateNameInput("");
    setFeedback(
      tr('Template "{template}" saved.', {
        template: templateLabel,
      }),
    );
  };

  const savePaymentAsTemplate = (payment: RecurringPaymentPayload) => {
    const formDraft: PaymentFormState = {
      responsibleProfileId: "",
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
    };

    const nextTemplate = templateFromForm(
      formDraft,
      activeTemplateScenario,
      payment.title,
    );
    setCustomTemplatesByScenario((current) => ({
      ...current,
      [activeTemplateScenario]: [nextTemplate, ...(current[activeTemplateScenario] ?? [])],
    }));
    setFeedback(
      tr('Payment "{payment}" saved as template.', {
        payment: payment.title,
      }),
    );
  };

  const deleteCustomTemplate = (templateId: string) => {
    setCustomTemplatesByScenario((current) => ({
      ...current,
      [activeTemplateScenario]: (current[activeTemplateScenario] ?? []).filter(
        (template) => template.id !== templateId,
      ),
    }));
    setFeedback(tr("Template deleted."));
  };

  const submitForm = async () => {
    if (workspaceUnavailable) {
      setFeedback(workspaceUnavailable);
      return;
    }

    const validationError = validateForm(form);
    if (validationError) {
      setFeedback(tr(validationError));
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
      setFeedback(tr(editingPaymentId ? "Payment updated." : "Payment created."));
      emitPaymentsChanged();
      resetForm();
    } catch {
      setFeedback(tr("Failed to save recurring payment."));
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
      setFeedback(tr("Payment archived."));
      emitPaymentsChanged();
    } catch {
      setFeedback(tr("Failed to archive recurring payment."));
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
      setFeedback(tr("Current cycle marked as paid."));
      emitPaymentsChanged();
      void loadPayments();
    } catch {
      setFeedback(tr("Failed to mark current cycle as paid."));
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
      setFeedback(tr("Current cycle marked as unpaid."));
      emitPaymentsChanged();
      void loadPayments();
    } catch {
      setFeedback(tr("Failed to mark current cycle as unpaid."));
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
      setFeedback(
        tr(nextPausedState ? "Subscription paused." : "Subscription resumed."),
      );
      emitPaymentsChanged();
    } catch {
      setFeedback(
        nextPausedState
          ? tr("Failed to pause subscription.")
          : tr("Failed to resume subscription."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openComposer = () => {
    setIsComposerExpanded(true);
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-app-text">
          <AppIcon name="reminders" className="h-4 w-4" />
          {tr("Recurring Payments")}
        </h2>
        <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
          {tr("Phase 16A")}
        </span>
      </div>
      {workspace && (
        <div className="mb-3 flex items-center gap-2 text-xs text-app-text-muted">
          <p className="inline-flex items-center gap-1">
            <AppIcon name="workspace" className="h-3.5 w-3.5" />
            {tr("Workspace")}: {workspace.title} ({tr(workspace.kind)})
          </p>
          <HelpPopover
            buttonLabel={tr("Open scenario help")}
            title={
              isFamilyWorkspace ? tr("Family scenario help") : tr("Personal scenario help")
            }
          >
            <p>
              {isFamilyWorkspace
                ? tr(
                    "Shared cards use Who pays for responsibility and Paid by for who marked the cycle paid.",
                  )
                : tr(
                    "Personal mode tracks your own recurring payments and subscriptions with simple mark paid flow.",
                  )}
            </p>
          </HelpPopover>
        </div>
      )}

      {workspaceUnavailable ? (
        <p className="rounded-xl bg-app-surface-soft px-3 py-2 text-sm text-app-text-muted">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          <div className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {tr("Main action")}
                </p>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Add or edit recurring payments in one compact form.")}
                </p>
              </div>
              <button
                type="button"
                onClick={openComposer}
                className="rounded-xl bg-app-accent px-3 py-1.5 text-xs font-semibold text-white"
              >
                {editingPaymentId ? tr("Continue editing") : tr("Open payment form")}
              </button>
            </div>
          </div>

          {!isLoading && payments.length === 0 && (
            <div className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <p className="text-sm font-semibold text-app-text">
                {isFamilyWorkspace
                  ? tr("No shared recurring payments yet")
                  : tr("No recurring payments yet")}
              </p>
              <p className="mt-1 text-xs text-app-text-muted">
                {isFamilyWorkspace
                  ? tr(
                      "Add your first shared payment below. Invite members from Profile when needed.",
                    )
                  : tr(
                      "Add your first payment below. Reminders and History will update after that.",
                    )}
              </p>
              <button
                type="button"
                onClick={openComposer}
                className="mt-2 rounded-xl border border-app-border bg-white px-3 py-1.5 text-xs font-semibold text-app-text"
              >
                {tr("Open add payment form")}
              </button>
            </div>
          )}
          {isFamilyWorkspace ? (
            <details className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Family controls")}
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Members")}</p>
                  <p className="text-sm font-semibold text-app-text">
                    {familyReadinessSummary.householdMembersCount}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Shared payments")}</p>
                  <p className="text-sm font-semibold text-app-text">
                    {isLoading
                      ? tr("Loading...")
                      : familyReadinessSummary.sharedRecurringPaymentsCount}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Who pays not assigned")}</p>
                  <p className="text-sm font-semibold text-app-text">
                    {isLoading
                      ? tr("Loading...")
                      : familyReadinessSummary.unassignedResponsibleCount}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-app-text-muted">
                {tr("Use this member list to keep Who pays assigned on shared cards.")}
              </p>
              {responsiblePayerOptions.length === 0 ? (
                <p className="mt-1 text-xs text-app-text-muted">
                  {(workspace?.memberCount ?? 0) > 0
                    ? tr("Member list is temporarily unavailable. Try Refresh.")
                    : tr("No members are visible yet.")}
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {responsiblePayerOptions.map((option) => (
                    <li
                      key={option.profileId}
                      className="flex items-center justify-between rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text"
                    >
                      <span>{option.displayName}</span>
                      <span className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                        {option.memberRole === "owner" ? tr("Owner") : tr("Member")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <details className="mt-2 rounded-xl border border-app-border bg-white px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {tr("Reminder operations and visibility")}
                </summary>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr(
                    "Open this block for delivery readiness, diagnostics, and reminder candidates.",
                  )}
                </p>
                <div className="mt-2">
                  <ReminderCandidatesSection workspace={workspace} initData={initData} />
                </div>
              </details>
            </details>
          ) : (
            <details className="mb-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Reminder operations and visibility")}
              </summary>
              <p className="mt-1 text-xs text-app-text-muted">
                {tr("Open this block for delivery readiness, diagnostics, and reminder candidates.")}
              </p>
              <div className="mt-2">
                <ReminderCandidatesSection workspace={workspace} initData={initData} />
              </div>
            </details>
          )}

          <details className="rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {activeTemplateScenario === "family"
                ? tr("Family templates")
                : tr("Personal templates")}
            </summary>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Templates are scenario-specific and can be edited here.")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={templateNameInput}
                onChange={(event) => setTemplateNameInput(event.target.value)}
                placeholder={tr("Template name (optional)")}
                className="min-w-[170px] flex-1 rounded-xl border border-app-border bg-white px-3 py-1.5 text-xs text-app-text outline-none"
              />
              <button
                type="button"
                onClick={saveCurrentFormAsTemplate}
                disabled={isSaving}
                className="rounded-xl border border-app-border bg-white px-3 py-1.5 text-xs font-semibold text-app-text disabled:opacity-60"
              >
                {tr("Save current form as template")}
              </button>
            </div>

            <div className="mt-2 space-y-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {tr("Payment templates")}
                </p>
                <div className="mt-1 space-y-1">
                  {paymentTemplates.length === 0 ? (
                    <p className="text-xs text-app-text-muted">{tr("No templates yet.")}</p>
                  ) : (
                    paymentTemplates.map((template) => {
                      const isCustomTemplate = template.id.startsWith("custom-");

                      return (
                        <div
                          key={template.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-app-border bg-white px-3 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => applyTemplate(template)}
                            disabled={isSaving}
                            className="text-left text-xs font-medium text-app-text disabled:opacity-60"
                          >
                            {tr(template.label)}
                          </button>
                          {isCustomTemplate && (
                            <button
                              type="button"
                              onClick={() => deleteCustomTemplate(template.id)}
                              className="rounded-lg border border-app-border px-2 py-0.5 text-[11px] font-semibold text-app-text-muted"
                            >
                              {tr("Delete")}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {tr("Subscription templates")}
                </p>
                <div className="mt-1 space-y-1">
                  {subscriptionTemplates.length === 0 ? (
                    <p className="text-xs text-app-text-muted">{tr("No templates yet.")}</p>
                  ) : (
                    subscriptionTemplates.map((template) => {
                      const isCustomTemplate = template.id.startsWith("custom-");

                      return (
                        <div
                          key={template.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-app-border bg-white px-3 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => applyTemplate(template)}
                            disabled={isSaving}
                            className="text-left text-xs font-medium text-app-text disabled:opacity-60"
                          >
                            {tr(template.label)}
                          </button>
                          {isCustomTemplate && (
                            <button
                              type="button"
                              onClick={() => deleteCustomTemplate(template.id)}
                              className="rounded-lg border border-app-border px-2 py-0.5 text-[11px] font-semibold text-app-text-muted"
                            >
                              {tr("Delete")}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </details>

          {payments.length > 0 && paymentListView === "subscriptions" && (
            <details className="mt-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Subscription insights - active {active}, unpaid {unpaid}", {
                  active: subscriptionSummary.activeSubscriptionsCount,
                  unpaid: subscriptionSummary.unpaidSubscriptionsCount,
                })}
              </summary>

              <div className="mt-2 space-y-2">
          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Subscriptions Summary")}
            </p>
              <p className="mt-1 text-sm text-app-text">
                {tr("Active")}: <span className="font-semibold">{subscriptionSummary.activeSubscriptionsCount}</span>
              {" - "}
              {tr("Unpaid this cycle")}:{" "}
              <span className="font-semibold">{subscriptionSummary.unpaidSubscriptionsCount}</span>
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Monthly total (weekly cadence uses 52/12 monthly equivalent):")}
            </p>
            {subscriptionSummary.monthlyTotalsByCurrency.length === 0 ? (
              <p className="mt-1 text-xs text-app-text-muted">
                {tr("No active subscriptions yet.")}
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
              {tr("Subscription Health")}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">{tr("Overdue")}</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.overdueCount}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">{tr("Unpaid cycle")}</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.unpaidCurrentCycleCount}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">{tr("Paused")}</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.pausedCount}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">{tr("Reminders off")}</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionHealth.remindersOffCount}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-app-text-muted">{tr("Needs attention")}:</p>
              {subscriptionHealth.attentionItems.length === 0 ? (
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("No immediate subscription issues detected.")}
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {subscriptionHealth.attentionItems.map((item) => (
                    <li key={item.id} className="text-xs text-app-text">
                      {item.title} -{" "}
                      {item.reason === "overdue"
                        ? tr("overdue")
                        : tr("reminders off")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Subscription Renewals")}
              </p>
              <button
                type="button"
                onClick={() => setPaymentListView("subscriptions")}
                className="rounded-lg border border-app-border bg-white px-2 py-1 text-[11px] font-semibold text-app-text"
              >
                {tr("Focus subscriptions")}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">{tr("Due today")}</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionRenewals.dueToday.length}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">
                  {tr("Upcoming")} ({SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS}d)
                </p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionRenewals.upcoming.length}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-[11px] text-app-text-muted">{tr("Overdue")}</p>
                <p className="text-sm font-semibold text-app-text">
                  {subscriptionRenewals.overdue.length}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <article className="rounded-xl border border-app-border bg-white p-2">
                <p className="text-xs font-semibold text-app-text">{tr("Due today")}</p>
                {subscriptionRenewals.dueToday.length === 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr("No due-today subscription renewals.")}
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
                  {tr("Upcoming")} ({SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS}d)
                </p>
                {subscriptionRenewals.upcoming.length === 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr("No upcoming subscription renewals.")}
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {subscriptionRenewals.upcoming.slice(0, 3).map((payment) => (
                      <li key={`upcoming-${payment.id}`} className="text-xs text-app-text">
                        {payment.title} - {tr("due")} {formatDueDate(payment.currentCycle.dueDate)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="rounded-xl border border-app-border bg-white p-2">
                <p className="text-xs font-semibold text-app-text">{tr("Overdue")}</p>
                {subscriptionRenewals.overdue.length === 0 ? (
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr("No overdue subscription renewals.")}
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {subscriptionRenewals.overdue.slice(0, 3).map((payment) => (
                      <li key={`overdue-${payment.id}`} className="text-xs text-app-text">
                        {payment.title} - {tr("due")} {formatDueDate(payment.currentCycle.dueDate)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Subscription Cost Pressure")}
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Active unpaid subscription renewals, grouped by currency (no FX conversion).")}
            </p>
            <div className="mt-2 space-y-1 text-sm text-app-text">
              <p>
                {tr("Due today")}:{" "}
                <span className="font-semibold">
                  {formatCurrencyTotals(subscriptionCostPressure.dueTodayTotals)}
                </span>
              </p>
              <p>
                {tr("Upcoming")} ({SUBSCRIPTIONS_UPCOMING_WINDOW_DAYS}d):{" "}
                <span className="font-semibold">
                  {formatCurrencyTotals(subscriptionCostPressure.upcomingTotals)}
                </span>
              </p>
              <p>
                {tr("Overdue")}:{" "}
                <span className="font-semibold">
                  {formatCurrencyTotals(subscriptionCostPressure.overdueTotals)}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Paused Subscriptions")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowPausedSubscriptionsOnly((current) => !current);
                  setPaymentListView("subscriptions");
                }}
                className="rounded-lg border border-app-border bg-white px-2 py-1 text-[11px] font-semibold text-app-text"
              >
                {showPausedSubscriptionsOnly
                  ? tr("Show all payments")
                  : tr("Show paused subscriptions")}
              </button>
            </div>
            <p className="mt-1 text-sm text-app-text">
              {tr("Paused now")}:{" "}
              <span className="font-semibold">{pausedSubscriptions.length}</span>
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr(
                "Monthly savings/load relief (weekly uses 52/12 monthly equivalent, grouped by currency):",
              )}
            </p>
            <p className="mt-1 text-sm text-app-text">
              <span className="font-semibold">
                {formatCurrencyTotals(pausedSubscriptionSavings)}
              </span>
            </p>
            <div className="mt-2">
              {pausedSubscriptions.length === 0 ? (
                <p className="text-xs text-app-text-muted">
                  {tr("No paused subscriptions right now.")}
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
          )}

          <details
            ref={composerRef}
            className="mt-2 rounded-2xl border border-app-border bg-app-surface-soft p-3"
            open={isComposerExpanded || editingPaymentId !== null}
            onToggle={(event) => {
              if (editingPaymentId !== null) {
                return;
              }

              setIsComposerExpanded(event.currentTarget.open);
            }}
          >
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {editingPaymentId ? tr("Edit payment") : tr("Add payment")}
            </summary>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Core fields first. Open advanced options only when needed.")}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder={tr("Payment title")}
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            <input
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              placeholder={tr("Amount")}
              type="number"
              step="0.01"
              min="0"
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
            {isFamilyWorkspace && (
              <label className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text">
                <span className="block text-xs font-semibold text-app-text-muted">
                  {tr("Who pays (responsible payer)")}
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
                  <option value="">{tr("Not assigned yet")}</option>
                  {responsiblePayerOptions.map((option) => (
                    <option key={option.profileId} value={option.profileId}>
                      {option.displayName}
                      {option.memberRole === "owner" ? ` (${tr("owner")})` : ""}
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
              <option value="monthly">{tr("Monthly")}</option>
              <option value="weekly">{tr("Weekly")}</option>
            </select>
            <input
              value={form.dueDay}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dueDay: event.target.value }))
              }
              placeholder={
                form.cadence === "weekly"
                  ? tr("Due weekday (1-7)")
                  : tr("Due day (1-31)")
              }
              type="number"
              min="1"
              max={form.cadence === "weekly" ? "7" : "31"}
              className="rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
            />
          </div>
          <details
            className="mt-2 rounded-xl border border-app-border bg-white px-3 py-2"
            open={isAdvancedFormExpanded}
            onToggle={(event) => setIsAdvancedFormExpanded(event.currentTarget.open)}
          >
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Advanced options")}
            </summary>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Reminder timing, category, currency, and notes")}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={form.currency}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currency: event.target.value }))
                }
                placeholder={tr("Currency (USD)")}
                className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
              />
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder={tr("Category")}
                className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
              />
              <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isRequired: event.target.checked }))
                  }
                />
                {tr("Required payment")}
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
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
                {tr("Mark as subscription")}
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text sm:col-span-2">
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
                {tr("Reminders enabled")}
              </label>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={form.remindDaysBefore}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    remindDaysBefore: event.target.value as "0" | "1" | "3",
                  }))
                }
                disabled={!form.remindersEnabled}
                className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none disabled:bg-app-surface-soft disabled:text-app-text-muted"
              >
                <option value="0">{tr("Remind 0 days before")}</option>
                <option value="1">{tr("Remind 1 day before")}</option>
                <option value="3">{tr("Remind 3 days before")}</option>
              </select>

              <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
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
                {tr("Remind on due day")}
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text sm:col-span-2">
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
                {tr("Remind if overdue")}
              </label>
            </div>

            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder={tr("Notes (optional)")}
              className="mt-2 h-20 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
            />
          </details>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitForm}
              disabled={isSaving}
              className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {editingPaymentId ? tr("Save changes") : tr("Add payment")}
            </button>
            <button
              type="button"
              onClick={saveCurrentFormAsTemplate}
              disabled={isSaving}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-70"
            >
              {tr("Save as template")}
            </button>
            {editingPaymentId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text"
              >
                {tr("Cancel edit")}
                </button>
              )}
            <button
                type="button"
                onClick={loadPayments}
                disabled={isLoading}
                className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text"
              >
                {tr("Refresh section")}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-70"
              >
                {tr("Clear form")}
              </button>
            </div>
          </details>

          {payments.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPaymentListView("payments")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold ${
                  paymentListView === "payments"
                    ? "border-app-accent bg-app-accent text-white"
                    : "border-app-border bg-white text-app-text"
                }`}
              >
                <AppIcon name="payments" className="h-3.5 w-3.5" />
                {tr("Payments")} ({paymentsCount})
              </button>
              <button
                type="button"
                onClick={() => setPaymentListView("subscriptions")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold ${
                  paymentListView === "subscriptions"
                    ? "border-app-accent bg-app-accent text-white"
                    : "border-app-border bg-white text-app-text"
                }`}
              >
                <AppIcon name="subscriptions" className="h-3.5 w-3.5" />
                {tr("Subscriptions")} ({subscriptionsCount})
              </button>
              <p className="text-xs text-app-text-muted">
                {tr("Visible")}: {visiblePayments.length} / {tr("Total")}: {payments.length}
              </p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {isLoading && (
              <p className="text-sm text-app-text-muted">{tr("Loading payments...")}</p>
            )}
            {!isLoading && payments.length === 0 && (
              <p className="text-sm text-app-text-muted">
                {tr("Payments list is empty for now.")}
              </p>
            )}
            {!isLoading && payments.length > 0 && visiblePayments.length === 0 && (
              <p className="text-sm text-app-text-muted">
                {showPausedSubscriptionsOnly
                  ? tr("No paused subscriptions found for the current filter.")
                  : paymentListView === "subscriptions"
                    ? tr("No subscription payments found for the current filter.")
                    : tr("No regular payments found for the current filter.")}
              </p>
            )}
            {visiblePayments.map((payment) => (
              (() => {
                const responsiblePayerName =
                  payment.paymentScope === "shared"
                    ? resolveResponsiblePayerDisplayName(
                        payment.responsibleProfileId,
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
                  payment.paymentScope === "shared" &&
                  payment.currentCycle.paidByProfileId
                    ? resolveResponsiblePayerDisplayName(
                        payment.currentCycle.paidByProfileId,
                        responsiblePayerOptions,
                        {
                          notAssigned: tr("Not assigned yet"),
                          missingMember: tr(
                            "Assigned member is no longer in this family workspace",
                          ),
                        },
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-app-text">{payment.title}</p>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] font-semibold text-app-text">
                            {payment.paymentScope === "shared"
                              ? tr("Family shared")
                              : tr("Personal")}
                          </span>
                          {payment.isSubscription && (
                            <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] font-semibold text-app-text">
                              {tr("Subscription")}
                            </span>
                          )}
                          {payment.isSubscription && payment.isPaused && (
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                              {tr("Paused")}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] font-medium text-app-text">
                            {formatAmount(payment)}
                          </span>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] text-app-text-muted">
                            {payment.category}
                          </span>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] text-app-text-muted">
                            {payment.cadence === "weekly"
                              ? `${tr("Weekly")} • ${tr("weekday")} ${payment.dueDay}`
                              : `${tr("Monthly")} • ${tr("day")} ${payment.dueDay}`}
                          </span>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] text-app-text-muted">
                            {payment.isRequired ? tr("Required") : tr("Optional")}
                          </span>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] text-app-text-muted">
                            {tr("Status")}: {tr(payment.status)}
                          </span>
                        </div>
                        {payment.paymentScope === "shared" ? (
                          <p className="text-sm text-app-text-muted">
                            {tr("Who pays")}: {responsiblePayerName}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm text-app-text-muted">
                          {tr("Current cycle")}: {tr(payment.currentCycle.state)}. {tr("Due")}{" "}
                          {formatDueDate(payment.currentCycle.dueDate)}
                          {payment.currentCycle.paidAt ? `. ${tr("Paid this cycle.")}` : "."}
                        </p>
                        {payment.paymentScope === "shared" &&
                          payment.currentCycle.state === "paid" && (
                            <p className="text-sm text-app-text-muted">
                              {tr("Paid by")}: {paidByName ?? tr("Not captured")}
                            </p>
                          )}
                        {payment.paymentScope === "shared" &&
                          payment.currentCycle.state === "paid" &&
                          hasEconomicsMismatch && (
                            <p className="text-xs font-medium text-amber-700">
                              {tr("Economics hint")}: {paidByName ?? tr("Another member")}{" "}
                              {tr("covered this cycle, while responsibility is on")}{" "}
                              {responsiblePayerName ?? tr("another member")}.
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
                              {tr("Economics: aligned (responsible payer paid this cycle).")}
                            </p>
                          )}
                        <details className="mt-1 rounded-xl border border-app-border bg-white px-2 py-1.5 text-xs text-app-text-muted">
                          <summary className="cursor-pointer font-semibold text-app-text">
                            {tr("Reminder settings")}
                          </summary>
                          <p className="mt-1">
                            {payment.remindersEnabled
                              ? `${tr("On")} (${tr("before")} ${payment.remindDaysBefore}d, ${tr("due day")} ${payment.remindOnDueDay ? tr("yes") : tr("no")}, ${tr("overdue")} ${payment.remindOnOverdue ? tr("yes") : tr("no")})`
                              : tr("Off")}
                          </p>
                          {payment.notes && <p className="mt-1">{payment.notes}</p>}
                        </details>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(payment)}
                          disabled={isSaving || payment.status === "archived"}
                          className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                        >
                          {tr("Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => savePaymentAsTemplate(payment)}
                          disabled={isSaving || payment.status === "archived"}
                          className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                        >
                          {tr("Save as template")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(payment.id)}
                          disabled={
                            isSaving || payment.status === "archived" || isFamilyWorkspace
                          }
                          className="rounded-lg border border-app-border px-2 py-1 text-xs text-app-text disabled:opacity-60"
                        >
                          {tr("Archive")}
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
                          {payment.currentCycle.state === "paid"
                            ? tr("Undo paid")
                            : tr("Mark paid")}
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
                            {payment.isPaused ? tr("Resume") : tr("Pause")}
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



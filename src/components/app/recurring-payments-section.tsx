"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  readCachedPaymentsList,
  writeCachedPaymentsList,
} from "@/lib/payments/client-cache";
import {
  familyStarterPaymentTemplates,
  personalStarterPaymentTemplates,
  type StarterPaymentTemplate,
} from "@/lib/payments/starter-templates";
import { resolveNextCycleDueDate } from "@/lib/payments/cycle";
import { useLocalization } from "@/lib/i18n/localization";
import type {
  RecurringPaymentPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";
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
type ReminderFocusFilter = "all" | "action_now" | "upcoming" | "paid";
type FeedbackTone = "info" | "success" | "error";

type PreparedVisiblePayment = {
  payment: RecurringPaymentPayload;
  responsiblePayerName: string | null;
  paidByName: string | null;
  hasEconomicsMismatch: boolean;
  nextCycleDueDate: string;
  isPaidCurrentCycle: boolean;
  isDueTodayNow: boolean;
  isOverdueNow: boolean;
  isUpcomingNow: boolean;
  urgencyRank: number;
};

type CustomTemplateStorageShape = Record<TemplateScenario, StarterPaymentTemplate[]>;

const CUSTOM_TEMPLATES_STORAGE_KEY = "payment-control-custom-templates-v1";

const createDefaultForm = (): PaymentFormState => {
  return {
    responsibleProfileId: "",
    title: "",
    amount: "",
    currency: "RUB",
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

const areFormStatesEqual = (
  left: PaymentFormState,
  right: PaymentFormState,
): boolean => {
  return JSON.stringify(left) === JSON.stringify(right);
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

const isCustomTemplate = (template: StarterPaymentTemplate): boolean => {
  return template.id.startsWith("custom-");
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

const toUtcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pendingDeletePaymentId, setPendingDeletePaymentId] = useState<string | null>(null);
  const [paymentListView, setPaymentListView] = useState<PaymentListView>("payments");
  const [reminderFocusFilter, setReminderFocusFilter] =
    useState<ReminderFocusFilter>("all");
  const [showPausedSubscriptionsOnly, setShowPausedSubscriptionsOnly] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isAdvancedFormExpanded, setIsAdvancedFormExpanded] = useState(false);
  const [isTemplateSuggestionsOpen, setIsTemplateSuggestionsOpen] = useState(true);
  const [isTemplateQuickLaneDismissed, setIsTemplateQuickLaneDismissed] = useState(false);
  const [formBaseline, setFormBaseline] = useState<PaymentFormState>(createDefaultForm);
  const [baselineEditingPaymentId, setBaselineEditingPaymentId] = useState<string | null>(null);
  const [customTemplatesByScenario, setCustomTemplatesByScenario] =
    useState<CustomTemplateStorageShape>(() => ({ personal: [], family: [] }));
  const [responsiblePayerOptions, setResponsiblePayerOptions] = useState<
    WorkspaceResponsiblePayerOptionPayload[]
  >([]);
  const [form, setForm] = useState<PaymentFormState>(createDefaultForm);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

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

  const templateSuggestions = useMemo(() => {
    if (!isTemplateSuggestionsOpen) {
      return [];
    }

    if (editingPaymentId !== null) {
      return [];
    }

    const query = form.title.trim().toLocaleLowerCase();
    if (!query) {
      return [];
    }

    return templatesForScenario
      .filter((template) => {
        const templateName = isCustomTemplate(template)
          ? template.label.trim() || template.title.trim()
          : tr(template.label).trim();
        return templateName.toLocaleLowerCase().startsWith(query);
      })
      .slice(0, 5);
  }, [editingPaymentId, form.title, isTemplateSuggestionsOpen, templatesForScenario, tr]);

  const quickTemplateOptions = useMemo(() => {
    if (editingPaymentId !== null) {
      return [];
    }

    if (isTemplateQuickLaneDismissed) {
      return [];
    }

    if (form.title.trim().length > 0) {
      return [];
    }

    return templatesForScenario.slice(0, 4).map((template) => {
      const label = isCustomTemplate(template)
        ? template.label.trim() || template.title.trim()
        : tr(template.label).trim();

      return {
        template,
        label,
      };
    });
  }, [
    editingPaymentId,
    form.title,
    isTemplateQuickLaneDismissed,
    templatesForScenario,
    tr,
  ]);

  const activePayments = useMemo(
    () => payments.filter((payment) => payment.status === "active"),
    [payments],
  );

  const visiblePayments = useMemo(() => {
    if (paymentListView === "subscriptions" && showPausedSubscriptionsOnly) {
      return activePayments.filter(
        (payment) => payment.isSubscription && payment.isPaused,
      );
    }

    if (paymentListView === "subscriptions") {
      return activePayments.filter((payment) => payment.isSubscription);
    }

    return activePayments.filter((payment) => !payment.isSubscription);
  }, [activePayments, paymentListView, showPausedSubscriptionsOnly]);

  const todayDateKey = toUtcDateKey(new Date());

  const preparedVisiblePayments = useMemo<PreparedVisiblePayment[]>(() => {
    return visiblePayments.map((payment) => {
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
        payment.paymentScope === "shared" && payment.currentCycle.paidByProfileId
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

      const nextCycleDueDate = resolveNextCycleDueDate(
        payment.cadence,
        payment.dueDay,
        payment.currentCycle.dueDate,
      );

      const isPaidCurrentCycle = payment.currentCycle.state === "paid";
      const isDueTodayNow =
        !isPaidCurrentCycle && payment.currentCycle.dueDate === todayDateKey;
      const isOverdueNow =
        !isPaidCurrentCycle && payment.currentCycle.dueDate < todayDateKey;
      const isUpcomingNow =
        !isPaidCurrentCycle && payment.currentCycle.dueDate > todayDateKey;

      const urgencyRank = isOverdueNow
        ? 0
        : isDueTodayNow
          ? 1
          : isUpcomingNow
            ? 2
            : 3;

      return {
        payment,
        responsiblePayerName,
        paidByName,
        hasEconomicsMismatch,
        nextCycleDueDate,
        isPaidCurrentCycle,
        isDueTodayNow,
        isOverdueNow,
        isUpcomingNow,
        urgencyRank,
      };
    });
  }, [responsiblePayerOptions, todayDateKey, tr, visiblePayments]);

  const sortedVisiblePayments = useMemo(() => {
    const next = [...preparedVisiblePayments];
    next.sort((left, right) => {
      if (left.urgencyRank !== right.urgencyRank) {
        return left.urgencyRank - right.urgencyRank;
      }

      if (left.payment.currentCycle.dueDate !== right.payment.currentCycle.dueDate) {
        return left.payment.currentCycle.dueDate.localeCompare(
          right.payment.currentCycle.dueDate,
        );
      }

      return left.payment.title.localeCompare(right.payment.title);
    });
    return next;
  }, [preparedVisiblePayments]);

  const focusFilterCounts = useMemo(() => {
    const actionNow = sortedVisiblePayments.filter(
      (entry) => entry.isOverdueNow || entry.isDueTodayNow,
    ).length;
    const upcoming = sortedVisiblePayments.filter(
      (entry) => entry.isUpcomingNow,
    ).length;
    const paid = sortedVisiblePayments.filter(
      (entry) => entry.isPaidCurrentCycle,
    ).length;

    return {
      all: sortedVisiblePayments.length,
      actionNow,
      upcoming,
      paid,
    };
  }, [sortedVisiblePayments]);

  const focusedVisiblePayments = useMemo(() => {
    if (reminderFocusFilter === "all") {
      return sortedVisiblePayments;
    }

    if (reminderFocusFilter === "action_now") {
      return sortedVisiblePayments.filter(
        (entry) => entry.isOverdueNow || entry.isDueTodayNow,
      );
    }

    if (reminderFocusFilter === "upcoming") {
      return sortedVisiblePayments.filter((entry) => entry.isUpcomingNow);
    }

    return sortedVisiblePayments.filter((entry) => entry.isPaidCurrentCycle);
  }, [reminderFocusFilter, sortedVisiblePayments]);

  const paymentsCount = useMemo(
    () => activePayments.filter((payment) => !payment.isSubscription).length,
    [activePayments],
  );
  const subscriptionsCount = useMemo(
    () => activePayments.filter((payment) => payment.isSubscription).length,
    [activePayments],
  );
  const remindersActSummary = useMemo(() => {
    const actionable = payments.filter((payment) => payment.status === "active");
    const dueTodayCount = actionable.filter(
      (payment) =>
        payment.currentCycle.state === "unpaid" &&
        payment.currentCycle.dueDate === todayDateKey,
    ).length;
    const overdueCount = actionable.filter(
      (payment) =>
        payment.currentCycle.state === "unpaid" &&
        payment.currentCycle.dueDate < todayDateKey,
    ).length;

    return {
      activeCount: actionable.length,
      dueTodayCount,
      overdueCount,
    };
  }, [payments, todayDateKey]);
  const actionNowCount =
    remindersActSummary.dueTodayCount + remindersActSummary.overdueCount;

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    setFeedbackTone("info");
  }, []);

  const showFeedback = useCallback((message: string, tone: FeedbackTone = "info") => {
    setFeedback(message);
    setFeedbackTone(tone);
  }, []);

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
      clearFeedback();
      setIsLoading(false);
      return;
    }

    const cachedPaymentsList = readCachedPaymentsList(activeWorkspaceId);
    const hasCachedSnapshot = Boolean(cachedPaymentsList);

    if (cachedPaymentsList) {
      setPayments(cachedPaymentsList.value.payments);
      setResponsiblePayerOptions(cachedPaymentsList.value.responsiblePayerOptions);
    }

    setIsLoading(!hasCachedSnapshot);
    clearFeedback();
    try {
      const result = await listRecurringPayments(initData);
      if (!result.ok) {
        if (!hasCachedSnapshot) {
          showFeedback(result.error.message, "error");
          setResponsiblePayerOptions([]);
        }
        return;
      }

      setPayments(result.payments);
      setResponsiblePayerOptions(result.responsiblePayerOptions);
      writeCachedPaymentsList(activeWorkspaceId, {
        payments: result.payments,
        responsiblePayerOptions: result.responsiblePayerOptions,
      });
    } catch {
      if (!hasCachedSnapshot) {
        showFeedback(tr("Failed to load recurring payments."), "error");
        setResponsiblePayerOptions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, clearFeedback, initData, showFeedback, tr, workspaceUnavailable]);

  const replacePaymentInStateAndCache = useCallback(
    (payment: RecurringPaymentPayload) => {
      setPayments((current) => {
        const next = replacePaymentInList(current, payment);
        if (activeWorkspaceId) {
          writeCachedPaymentsList(activeWorkspaceId, {
            payments: next,
            responsiblePayerOptions,
          });
        }
        return next;
      });
    },
    [activeWorkspaceId, responsiblePayerOptions],
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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

  useEffect(() => {
    setReminderFocusFilter("all");
  }, [paymentListView, showPausedSubscriptionsOnly]);

  const resetFormDraft = useCallback(() => {
    const defaultForm = createDefaultForm();
    setForm(defaultForm);
    setFormBaseline(defaultForm);
    setEditingPaymentId(null);
    setBaselineEditingPaymentId(null);
    setIsAdvancedFormExpanded(false);
    setIsTemplateSuggestionsOpen(true);
    setIsTemplateQuickLaneDismissed(false);
  }, []);

  const closeComposerImmediately = useCallback(() => {
    resetFormDraft();
    setPendingDeletePaymentId(null);
    setIsDiscardConfirmOpen(false);
    setIsComposerExpanded(false);
  }, [resetFormDraft]);

  const startEdit = (payment: RecurringPaymentPayload) => {
    const editForm: PaymentFormState = {
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
    };
    setPendingDeletePaymentId(null);
    setEditingPaymentId(payment.id);
    setBaselineEditingPaymentId(payment.id);
    setIsComposerExpanded(true);
    setIsAdvancedFormExpanded(false);
    setIsTemplateSuggestionsOpen(false);
    setIsTemplateQuickLaneDismissed(true);
    setIsDiscardConfirmOpen(false);
    setForm(editForm);
    setFormBaseline(editForm);
    clearFeedback();
  };

  const localizeSystemTemplate = (
    template: StarterPaymentTemplate,
  ): StarterPaymentTemplate => {
    if (isCustomTemplate(template)) {
      return template;
    }

    return {
      ...template,
      title: tr(template.title),
      category: tr(template.category),
      notes: template.notes ? tr(template.notes) : "",
    };
  };

  const resolveTemplateLabel = (template: StarterPaymentTemplate): string => {
    if (isCustomTemplate(template)) {
      return template.label;
    }

    return tr(template.label);
  };

  const applyTemplate = (template: StarterPaymentTemplate) => {
    const localizedTemplate = localizeSystemTemplate(template);
    setEditingPaymentId(null);
    setIsComposerExpanded(true);
    setIsAdvancedFormExpanded(false);
    setIsTemplateSuggestionsOpen(false);
    setIsTemplateQuickLaneDismissed(false);
    setForm(formFromTemplate(localizedTemplate));
    showFeedback(
      tr('Template "{template}" applied. Review and add payment.', {
        template: resolveTemplateLabel(template),
      }),
      "info",
    );
  };

  const saveCurrentFormAsTemplate = () => {
    const templateLabel = form.title.trim();
    const validationError = validateForm(form);
    if (validationError) {
      showFeedback(tr(validationError), "error");
      return;
    }

    if (!templateLabel) {
      showFeedback(tr("Template name is required."), "error");
      return;
    }

    const nextTemplate = templateFromForm(form, activeTemplateScenario, templateLabel);
    setCustomTemplatesByScenario((current) => ({
      ...current,
      [activeTemplateScenario]: [nextTemplate, ...(current[activeTemplateScenario] ?? [])],
    }));
    showFeedback(
      tr('Template "{template}" saved.', {
        template: templateLabel,
      }),
      "success",
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
    showFeedback(
      tr('Payment "{payment}" saved as template.', {
        payment: payment.title,
      }),
      "success",
    );
  };

  const submitForm = async () => {
    if (workspaceUnavailable) {
      showFeedback(workspaceUnavailable, "error");
      return;
    }

    const validationError = validateForm(form);
    if (validationError) {
      showFeedback(tr(validationError), "error");
      return;
    }

    setIsSaving(true);
    clearFeedback();
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
        showFeedback(result.error.message, "error");
        return;
      }

      replacePaymentInStateAndCache(result.payment);
      showFeedback(
        tr(editingPaymentId ? "Payment updated." : "Payment created."),
        "success",
      );
      emitPaymentsChanged();
      closeComposerImmediately();
    } catch {
      showFeedback(tr("Failed to save recurring payment."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (workspaceUnavailable) {
      showFeedback(workspaceUnavailable, "error");
      return;
    }

    setIsSaving(true);
    clearFeedback();
    try {
      const result = await archiveRecurringPayment(initData, paymentId);
      if (!result.ok) {
        showFeedback(result.error.message, "error");
        return;
      }

      replacePaymentInStateAndCache(result.payment);
      if (editingPaymentId === paymentId) {
        closeComposerImmediately();
      }
      setPendingDeletePaymentId(null);
      showFeedback(tr("Payment removed from active list."), "success");
      emitPaymentsChanged();
    } catch {
      showFeedback(tr("Failed to remove recurring payment."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (workspaceUnavailable) {
      showFeedback(workspaceUnavailable, "error");
      return;
    }

    setIsSaving(true);
    clearFeedback();
    try {
      const result = await markCurrentCyclePaid(initData, paymentId);
      if (!result.ok) {
        showFeedback(result.error.message, "error");
        return;
      }

      replacePaymentInStateAndCache(result.payment);
      showFeedback(tr("Current cycle marked as paid."), "success");
      emitPaymentsChanged();
      void loadPayments();
    } catch {
      showFeedback(tr("Failed to mark current cycle as paid."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkUnpaid = async (paymentId: string) => {
    if (workspaceUnavailable) {
      showFeedback(workspaceUnavailable, "error");
      return;
    }

    setIsSaving(true);
    clearFeedback();
    try {
      const result = await markCurrentCycleUnpaid(initData, paymentId);
      if (!result.ok) {
        showFeedback(result.error.message, "error");
        return;
      }

      replacePaymentInStateAndCache(result.payment);
      showFeedback(tr("Current cycle marked as unpaid."), "success");
      emitPaymentsChanged();
      void loadPayments();
    } catch {
      showFeedback(tr("Failed to mark current cycle as unpaid."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseResume = async (
    paymentId: string,
    nextPausedState: boolean,
  ) => {
    if (workspaceUnavailable) {
      showFeedback(workspaceUnavailable, "error");
      return;
    }

    setIsSaving(true);
    clearFeedback();
    try {
      const result = nextPausedState
        ? await pauseSubscriptionPayment(initData, paymentId)
        : await resumeSubscriptionPayment(initData, paymentId);
      if (!result.ok) {
        showFeedback(result.error.message, "error");
        return;
      }

      replacePaymentInStateAndCache(result.payment);
      showFeedback(
        tr(nextPausedState ? "Subscription paused." : "Subscription resumed."),
        "success",
      );
      emitPaymentsChanged();
    } catch {
      showFeedback(
        nextPausedState
          ? tr("Failed to pause subscription.")
          : tr("Failed to resume subscription."),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openComposer = () => {
    const defaultForm = createDefaultForm();
    setForm(defaultForm);
    setFormBaseline(defaultForm);
    setEditingPaymentId(null);
    setBaselineEditingPaymentId(null);
    setIsAdvancedFormExpanded(false);
    setPendingDeletePaymentId(null);
    setIsDiscardConfirmOpen(false);
    setIsTemplateQuickLaneDismissed(false);
    setIsComposerExpanded(true);
    setIsTemplateSuggestionsOpen(true);
    clearFeedback();
  };

  const continueManualEntry = useCallback(() => {
    setIsTemplateQuickLaneDismissed(true);
    setIsTemplateSuggestionsOpen(false);
    titleInputRef.current?.focus();
  }, []);

  const hasUnsavedComposerChanges = useMemo(() => {
    if (!isComposerExpanded) {
      return false;
    }

    if (editingPaymentId !== baselineEditingPaymentId) {
      return true;
    }

    return !areFormStatesEqual(form, formBaseline);
  }, [baselineEditingPaymentId, editingPaymentId, form, formBaseline, isComposerExpanded]);

  const requestCloseComposer = useCallback(() => {
    if (isSaving) {
      return;
    }

    if (hasUnsavedComposerChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    closeComposerImmediately();
  }, [closeComposerImmediately, hasUnsavedComposerChanges, isSaving]);

  const keepComposerEditing = useCallback(() => {
    setIsDiscardConfirmOpen(false);
  }, []);

  const discardComposerChanges = useCallback(() => {
    closeComposerImmediately();
  }, [closeComposerImmediately]);

  useEffect(() => {
    if (!isComposerExpanded) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isComposerExpanded]);

  useEffect(() => {
    if (!isComposerExpanded) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const input = titleInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      if (editingPaymentId) {
        const nextCursorPosition = input.value.length;
        input.setSelectionRange(nextCursorPosition, nextCursorPosition);
      }
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
    };
  }, [editingPaymentId, isComposerExpanded]);

  useEffect(() => {
    if (!isComposerExpanded) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      if (isDiscardConfirmOpen) {
        setIsDiscardConfirmOpen(false);
        return;
      }
      requestCloseComposer();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isComposerExpanded, isDiscardConfirmOpen, requestCloseComposer]);

  const composerModal =
    typeof document !== "undefined" && isComposerExpanded
      ? createPortal(
          <div
            className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 px-3 sm:items-center [padding-top:max(0.75rem,env(safe-area-inset-top))] [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={() => requestCloseComposer()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={editingPaymentId ? tr("Edit payment") : tr("Add payment")}
              className="pc-surface w-full max-w-lg rounded-3xl p-3 sm:p-3.5"
              style={{
                maxHeight:
                  "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-app-border bg-app-surface px-2 py-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pc-kicker">
                      <AppIcon name="payments" className="h-3.5 w-3.5" />
                      {tr("Payment form")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {editingPaymentId ? tr("Edit payment") : tr("Add payment")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestCloseComposer}
                    disabled={isSaving}
                    aria-label={tr("Close form")}
                    className="pc-icon-btn disabled:opacity-60"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d="M6 6l12 12" />
                      <path d="M18 6l-12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-app-text-muted">
                  <HelpPopover
                    buttonLabel={tr("Open payment form help")}
                    title={tr("Payment form help")}
                  >
                    <p>{tr("Core fields first. Open advanced options only when needed.")}</p>
                  </HelpPopover>
                  <span className="pc-state-inline">{tr("Core fields first")}</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative sm:col-span-2">
                  <input
                    ref={titleInputRef}
                    value={form.title}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, title: event.target.value }));
                      setIsTemplateSuggestionsOpen(true);
                    }}
                    placeholder={tr("Payment title")}
                    enterKeyHint="next"
                    className="pc-input"
                  />
                  {editingPaymentId === null &&
                    form.title.trim().length > 0 &&
                    isTemplateSuggestionsOpen && (
                      <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-app-border bg-white p-2 shadow-lg">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-app-text-muted">
                          <span className="font-semibold uppercase tracking-[0.12em]">
                            {tr("Matching templates")}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>
                              {activeTemplateScenario === "family"
                                ? tr("Family templates")
                                : tr("Personal templates")}
                            </span>
                            <button
                              type="button"
                              onClick={continueManualEntry}
                              className="pc-btn-quiet min-h-7 px-2 py-0.5 text-[11px]"
                            >
                              {tr("Continue manually")}
                            </button>
                          </div>
                        </div>
                        {templateSuggestions.length === 0 ? (
                          <p className="mt-1 text-xs text-app-text-muted">
                            {tr("No matching templates. Continue typing to create manually.")}
                          </p>
                        ) : (
                          <div className="mt-1 max-h-56 space-y-1 overflow-y-auto">
                            {templateSuggestions.map((template) => {
                              const localizedTemplate = localizeSystemTemplate(template);

                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => applyTemplate(template)}
                                  disabled={isSaving}
                                  className="pc-action-card flex min-h-11 w-full touch-manipulation items-center justify-between gap-2 px-3 py-2 text-left disabled:opacity-60"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-app-text">
                                      {resolveTemplateLabel(template)}
                                    </p>
                                    <p className="truncate text-[11px] text-app-text-muted">
                                      {localizedTemplate.title}
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                                    {template.isSubscription
                                      ? tr("Subscription")
                                      : tr("Payment")}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                </div>
                {quickTemplateOptions.length > 0 && (
                  <div className="pc-state-card sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                        {tr("Quick templates")}
                      </p>
                      <button
                        type="button"
                        onClick={continueManualEntry}
                        className="pc-btn-quiet min-h-7 px-2 py-0.5 text-[11px]"
                      >
                        {tr("Continue manually")}
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-app-text-muted">
                      {tr("Choose a template or continue manually.")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {quickTemplateOptions.map((option) => (
                        <button
                          key={`quick-template-${option.template.id}`}
                          type="button"
                          onClick={() => applyTemplate(option.template)}
                          disabled={isSaving}
                          className="pc-btn-quiet min-h-8 max-w-full px-2 py-1 text-xs disabled:opacity-60"
                        >
                          <AppIcon
                            name={option.template.isSubscription ? "subscriptions" : "payments"}
                            className="h-3.5 w-3.5"
                          />
                          <span className="max-w-[9.5rem] truncate">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-app-text-muted">
                    {tr("Amount")}
                  </span>
                  <input
                    value={form.amount}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    placeholder={tr("Amount")}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    enterKeyHint="next"
                    className="pc-input"
                  />
                </label>
                {isFamilyWorkspace && (
                  <label className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
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
                      className="pc-select mt-1"
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
                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-app-text-muted">
                    {tr("Cadence")}
                  </span>
                  <select
                    value={form.cadence}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        cadence: event.target.value as "weekly" | "monthly",
                        dueDay: event.target.value === "weekly" ? "1" : prev.dueDay,
                      }))
                    }
                    className="pc-select"
                  >
                    <option value="monthly">{tr("Monthly")}</option>
                    <option value="weekly">{tr("Weekly")}</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-app-text-muted">
                    {tr("Due day")}
                  </span>
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
                    inputMode="numeric"
                    min="1"
                    max={form.cadence === "weekly" ? "7" : "31"}
                    enterKeyHint="next"
                    className="pc-input"
                  />
                </label>
              </div>
              <details
                className="pc-detail-surface mt-2"
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
                    placeholder={tr("Currency (RUB)")}
                    className="pc-input"
                  />
                  <input
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder={tr("Category")}
                    className="pc-input"
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
                    className="pc-select disabled:bg-app-surface-soft disabled:text-app-text-muted"
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
                  className="pc-textarea mt-2 h-20 resize-y"
                />
              </details>

              <div className="sticky bottom-0 z-20 -mx-1 mt-2 rounded-2xl border border-app-border bg-app-surface px-2 py-2 shadow-[0_-10px_18px_var(--app-frame-shadow)]">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={submitForm}
                    disabled={isSaving}
                    className="pc-btn-primary grow"
                  >
                    {editingPaymentId ? tr("Save changes") : tr("Add payment")}
                  </button>
                  <button
                    type="button"
                    onClick={requestCloseComposer}
                    disabled={isSaving}
                    className="pc-btn-secondary"
                  >
                    {editingPaymentId ? tr("Cancel edit") : tr("Close form")}
                  </button>
                  <button
                    type="button"
                    onClick={saveCurrentFormAsTemplate}
                    disabled={isSaving}
                    className="pc-btn-secondary"
                  >
                    {tr("Save as template")}
                  </button>
                  {!editingPaymentId && (
                    <button
                      type="button"
                      onClick={resetFormDraft}
                      disabled={isSaving}
                      className="pc-btn-secondary"
                    >
                      {tr("Clear form")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const discardConfirmModal =
    typeof document !== "undefined" && isComposerExpanded && isDiscardConfirmOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 px-3 sm:items-center [padding-top:max(0.75rem,env(safe-area-inset-top))] [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={keepComposerEditing}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr("Unsaved changes")}
              className="pc-surface w-full max-w-sm rounded-2xl p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="pc-kicker">
                <AppIcon name="alert" className="h-3.5 w-3.5" />
                {tr("Unsaved changes")}
              </p>
              <p className="mt-1 text-sm font-semibold text-app-text">
                {tr("Discard unsaved payment form changes?")}
              </p>
              <p className="mt-1 text-xs text-app-text-muted">
                {tr("Your latest edits in this form are not saved yet.")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={keepComposerEditing}
                  className="pc-btn-secondary"
                >
                  {tr("Keep editing")}
                </button>
                <button
                  type="button"
                  onClick={discardComposerChanges}
                  className="pc-btn-danger"
                >
                  {tr("Discard changes")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section className="pc-surface">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-app-text">
          <AppIcon name="reminders" className="h-4 w-4" />
          {tr("Recurring Payments")}
        </h2>
      </div>
      {workspace && (
        <div className="pc-state-card mb-2 flex items-center justify-between gap-2 text-xs text-app-text-muted">
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
        <p className="pc-empty-state text-sm">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          <div className="pc-detail-surface mb-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {tr("Main action")}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-app-text-muted">
                  <AppIcon name="reminders" className="h-3.5 w-3.5" />
                  {tr("Create and manage payments in one place.")}
                </p>
              </div>
              <HelpPopover
                buttonLabel={tr("Open quick actions help")}
                title={tr("Quick actions help")}
              >
                <p>{tr("Open payment form for new entries.")}</p>
                <p>{tr("Edit or delete directly from each payment card.")}</p>
              </HelpPopover>
            </div>

            <p className="mt-1 text-[11px] text-app-text-muted">
              {tr("Due today")}:{" "}
              <span className="font-semibold text-app-text">
                {remindersActSummary.dueTodayCount}
              </span>
              {" • "}
              {tr("Overdue")}:{" "}
              <span className="font-semibold text-app-text">
                {remindersActSummary.overdueCount}
              </span>
              {" • "}
              {tr("Active")}:{" "}
              <span className="font-semibold text-app-text">
                {remindersActSummary.activeCount}
              </span>
              {" • "}
              {tr("Action now")}:{" "}
              <span className="font-semibold text-app-text">{actionNowCount}</span>
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openComposer}
                className="pc-btn-primary grow"
              >
                <AppIcon name="add" className="h-3.5 w-3.5" />
                {editingPaymentId ? tr("Continue editing") : tr("Add payment")}
              </button>
              <button
                type="button"
                onClick={() => void loadPayments()}
                disabled={isLoading || isSaving}
                className="pc-btn-secondary"
              >
                <AppIcon name="refresh" className="h-3.5 w-3.5" />
                {tr("Refresh section")}
              </button>
            </div>
          </div>

          {!isLoading && activePayments.length === 0 && (
            <div className="pc-empty-state mb-2">
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
                className="pc-btn-secondary mt-2"
              >
                <AppIcon name="add" className="h-3.5 w-3.5" />
                {tr("Open add payment form")}
              </button>
            </div>
          )}

          {activePayments.length > 0 && paymentListView === "subscriptions" && (
            <details className="pc-detail-surface mt-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Subscription insights - active {active}, unpaid {unpaid}", {
                  active: subscriptionSummary.activeSubscriptionsCount,
                  unpaid: subscriptionSummary.unpaidSubscriptionsCount,
                })}
              </summary>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Active")}</p>
                    <p className="text-sm font-semibold text-app-text">
                      {subscriptionSummary.activeSubscriptionsCount}
                    </p>
                  </div>
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Unpaid this cycle")}</p>
                    <p className="text-sm font-semibold text-app-text">
                      {subscriptionSummary.unpaidSubscriptionsCount}
                    </p>
                  </div>
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Paused now")}</p>
                    <p className="text-sm font-semibold text-app-text">
                      {pausedSubscriptions.length}
                    </p>
                  </div>
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] text-app-text-muted">{tr("Monthly payment cost")}</p>
                    <p className="text-sm font-semibold text-app-text">
                      {formatCurrencyTotals(subscriptionSummary.monthlyTotalsByCurrency)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPausedSubscriptionsOnly((current) => !current)}
                    className="pc-btn-secondary min-h-9 py-1 text-xs"
                  >
                    <AppIcon name="subscriptions" className="h-3.5 w-3.5" />
                    {showPausedSubscriptionsOnly
                      ? tr("Show all payments")
                      : tr("Show paused subscriptions")}
                  </button>
                  {pausedSubscriptions.length > 0 && (
                    <p className="text-xs text-app-text-muted">
                      {tr("Monthly savings/load relief (weekly uses 52/12 monthly equivalent, grouped by currency):")}{" "}
                      <span className="font-semibold text-app-text">
                        {formatCurrencyTotals(pausedSubscriptionSavings)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
          </details>
          )}

          {activePayments.length > 0 && (
            <div className="pc-detail-surface mt-2">
              <div className="pc-segmented">
                <button
                  type="button"
                  onClick={() => setPaymentListView("payments")}
                  className={`pc-segment-btn min-h-9 ${
                    paymentListView === "payments"
                      ? "pc-segment-btn-active"
                      : ""
                  }`}
                >
                  <AppIcon name="payments" className="h-3.5 w-3.5" />
                  {tr("Payments")} ({paymentsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentListView("subscriptions")}
                  className={`pc-segment-btn min-h-9 ${
                    paymentListView === "subscriptions"
                      ? "pc-segment-btn-active"
                      : ""
                  }`}
                >
                  <AppIcon name="subscriptions" className="h-3.5 w-3.5" />
                  {tr("Subscriptions")} ({subscriptionsCount})
                </button>
              </div>
              <p className="mt-1 text-[11px] text-app-text-muted">
                {tr("Visible")}: {focusedVisiblePayments.length} / {tr("In list")}:{" "}
                {visiblePayments.length} / {tr("Total")}: {activePayments.length}
              </p>
              <div className="mt-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                  {tr("Focus")}
                </p>
                <div className="pc-segmented mt-1">
                  <button
                    type="button"
                    onClick={() => setReminderFocusFilter("all")}
                    aria-pressed={reminderFocusFilter === "all"}
                    className="pc-segment-btn min-h-9"
                  >
                    {tr("All")} ({focusFilterCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderFocusFilter("action_now")}
                    aria-pressed={reminderFocusFilter === "action_now"}
                    className="pc-segment-btn min-h-9"
                  >
                    {tr("Action now")} ({focusFilterCounts.actionNow})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderFocusFilter("upcoming")}
                    aria-pressed={reminderFocusFilter === "upcoming"}
                    className="pc-segment-btn min-h-9"
                  >
                    {tr("Upcoming")} ({focusFilterCounts.upcoming})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderFocusFilter("paid")}
                    aria-pressed={reminderFocusFilter === "paid"}
                    className="pc-segment-btn min-h-9"
                  >
                    {tr("Paid")} ({focusFilterCounts.paid})
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 space-y-2">
            {isLoading && (
              <p className="pc-empty-state text-sm">{tr("Loading payments...")}</p>
            )}
            {!isLoading && activePayments.length === 0 && (
              <p className="pc-empty-state text-sm">
                {tr("Payments list is empty for now.")}
              </p>
            )}
            {!isLoading && activePayments.length > 0 && visiblePayments.length === 0 && (
              <p className="pc-empty-state text-sm">
                {showPausedSubscriptionsOnly
                  ? tr("No paused subscriptions found for the current filter.")
                  : paymentListView === "subscriptions"
                    ? tr("No subscription payments found for the current filter.")
                    : tr("No regular payments found for the current filter.")}
              </p>
            )}
            {!isLoading && visiblePayments.length > 0 && focusedVisiblePayments.length === 0 && (
              <p className="pc-empty-state text-sm">
                {tr("No cards in this focus yet.")}
              </p>
            )}
            {focusedVisiblePayments.map((entry) => (
              (() => {
                const {
                  payment,
                  responsiblePayerName,
                  paidByName,
                  hasEconomicsMismatch,
                  nextCycleDueDate,
                  isPaidCurrentCycle,
                  isDueTodayNow,
                  isOverdueNow,
                  isUpcomingNow,
                } = entry;

                return (
                  <article
                    key={payment.id}
                    className={`pc-payment-card ${
                      isOverdueNow
                        ? "pc-payment-card-overdue"
                        : isDueTodayNow
                          ? "pc-payment-card-due-today"
                          : "pc-payment-card-default"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-app-text">{payment.title}</p>
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-app-text-muted">
                              <AppIcon
                                name={payment.isSubscription ? "subscriptions" : "payments"}
                                className="h-3.5 w-3.5"
                              />
                              {payment.isSubscription ? tr("Subscription") : tr("Payment")}
                            </p>
                          </div>
                          <span className="rounded-full border border-app-border bg-white px-2 py-0.5 text-xs font-bold text-app-text">
                            {formatAmount(payment)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`pc-status-pill ${
                              isPaidCurrentCycle
                                ? "pc-status-pill-success"
                                : "pc-status-pill-warning"
                            }`}
                          >
                            <AppIcon
                              name={isPaidCurrentCycle ? "check" : "clock"}
                              className="h-3 w-3"
                            />
                            {isPaidCurrentCycle ? tr("Paid") : tr("Unpaid")}
                          </span>
                          {isOverdueNow && (
                            <span
                              className="pc-status-pill pc-status-pill-error"
                            >
                              <AppIcon name="alert" className="h-3 w-3" />
                              {tr("Overdue (unpaid)")}
                            </span>
                          )}
                          {isDueTodayNow && (
                            <span className="pc-status-pill pc-status-pill-warning">
                              <AppIcon name="clock" className="h-3 w-3" />
                              {tr("Due today (unpaid)")}
                            </span>
                          )}
                          {isUpcomingNow && (
                            <span className="pc-status-pill">
                              <AppIcon name="clock" className="h-3 w-3" />
                              {tr("Upcoming (unpaid)")}
                            </span>
                          )}
                          {payment.isSubscription && payment.isPaused && (
                            <span className="pc-status-pill">
                              <AppIcon name="subscriptions" className="h-3 w-3" />
                              {tr("Paused")}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          <div className="pc-state-card bg-white px-2 py-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-text-muted">
                              {isPaidCurrentCycle ? tr("Next payment date") : tr("Due")}
                            </p>
                            <p
                              className={`mt-0.5 text-xs font-semibold ${
                                isOverdueNow
                                  ? "text-amber-700"
                                  : isDueTodayNow
                                    ? "text-app-accent-strong"
                                    : "text-app-text"
                              }`}
                            >
                              {formatDueDate(
                                isPaidCurrentCycle
                                  ? nextCycleDueDate
                                  : payment.currentCycle.dueDate,
                              )}
                            </p>
                          </div>
                          <div className="pc-state-card bg-white px-2 py-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-app-text-muted">
                              {tr("Cadence")}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-app-text">
                              {payment.cadence === "weekly"
                                ? `${tr("Weekly")} • ${tr("weekday")} ${payment.dueDay}`
                                : `${tr("Monthly")} • ${tr("day")} ${payment.dueDay}`}
                            </p>
                          </div>
                        </div>

                        {payment.paymentScope === "shared" ? (
                          <p className="mt-1 text-xs text-app-text-muted">
                            {tr("Who pays")}: {responsiblePayerName}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-app-text-muted">
                          {tr("Current cycle")}: {tr(payment.currentCycle.state)}
                          {payment.currentCycle.paidAt ? ` • ${tr("Paid this cycle.")}` : ""}
                        </p>
                        {isPaidCurrentCycle && payment.paymentScope === "shared" && (
                          <p className="mt-0.5 text-xs text-app-text-muted">
                            {tr("Paid by")}: {paidByName ?? tr("Not captured")}
                          </p>
                        )}
                        {payment.paymentScope === "shared" &&
                          isPaidCurrentCycle &&
                          hasEconomicsMismatch && (
                            <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                              {tr("Economics hint")}: {paidByName ?? tr("Another member")}{" "}
                              {tr("covered this cycle, while responsibility is on")}{" "}
                              {responsiblePayerName ?? tr("another member")}.
                            </p>
                          )}
                        {payment.paymentScope === "shared" &&
                          isPaidCurrentCycle &&
                          !hasEconomicsMismatch &&
                          payment.responsibleProfileId &&
                          payment.currentCycle.paidByProfileId &&
                          payment.responsibleProfileId ===
                            payment.currentCycle.paidByProfileId && (
                            <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                              {tr("Economics: aligned (responsible payer paid this cycle).")}
                            </p>
                          )}
                        <details className="pc-state-card mt-1.5 bg-white px-1.5 py-1 text-xs text-app-text-muted">
                          <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold text-app-text">
                            <AppIcon name="template" className="h-3.5 w-3.5 text-app-text-muted" />
                            {tr("Details and actions")}
                          </summary>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px]">
                              {payment.paymentScope === "shared"
                                ? tr("Family shared")
                                : tr("Personal")}
                            </span>
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px]">
                              {payment.isSubscription ? tr("Subscription") : tr("Payment")}
                            </span>
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px]">
                              {payment.category}
                            </span>
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px]">
                              {payment.isRequired ? tr("Required") : tr("Optional")}
                            </span>
                            <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px]">
                              {tr("Status")}: {tr(payment.status)}
                            </span>
                          </div>
                          <p className="mt-1">
                            {payment.remindersEnabled
                              ? `${tr("On")} (${tr("before")} ${payment.remindDaysBefore}d, ${tr("due day")} ${payment.remindOnDueDay ? tr("yes") : tr("no")}, ${tr("overdue")} ${payment.remindOnOverdue ? tr("yes") : tr("no")})`
                              : tr("Off")}
                          </p>
                          {payment.notes && <p className="mt-1">{payment.notes}</p>}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => savePaymentAsTemplate(payment)}
                              disabled={isSaving || payment.status === "archived"}
                              className="pc-btn-quiet disabled:opacity-60"
                            >
                              <AppIcon name="template" className="h-3.5 w-3.5" />
                              {tr("Save as template")}
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
                                className="pc-btn-quiet disabled:opacity-60"
                              >
                                <AppIcon name="subscriptions" className="h-3.5 w-3.5" />
                                {payment.isPaused ? tr("Resume") : tr("Pause")}
                              </button>
                            )}
                          </div>
                        </details>
                      </div>
                      <div className="mt-0.5 flex w-full flex-col gap-1.5 sm:mt-0 sm:w-44 sm:shrink-0">
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
                          className={`inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-60 ${
                            isOverdueNow
                              ? "bg-amber-600 shadow-[0_8px_18px_rgba(194,120,16,0.3)]"
                              : "bg-app-accent shadow-[0_8px_18px_rgba(31,122,67,0.28)]"
                          }`}
                        >
                          <AppIcon
                            name={isPaidCurrentCycle ? "undo" : "check"}
                            className="h-3.5 w-3.5"
                          />
                          {isPaidCurrentCycle
                            ? tr("Undo paid")
                            : tr("Mark paid")}
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(payment)}
                            disabled={isSaving || payment.status === "archived"}
                            className="pc-btn-secondary min-h-9 px-2 py-1 text-xs text-app-text-muted disabled:opacity-60"
                          >
                            <AppIcon name="edit" className="h-3.5 w-3.5" />
                            {tr("Edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeletePaymentId(payment.id)}
                            disabled={isSaving || payment.status === "archived"}
                            className="pc-btn-danger min-h-9 px-2 py-1 text-xs disabled:opacity-60"
                          >
                            <AppIcon name="archive" className="h-3.5 w-3.5" />
                            {tr("Delete")}
                          </button>
                        </div>
                      </div>
                      {pendingDeletePaymentId === payment.id && (
                        <div className="mt-1.5 rounded-xl border border-red-200 bg-red-50/70 px-2 py-2 text-xs text-red-900">
                          <p className="font-semibold">
                            {tr("Delete this payment from active reminders?")}
                          </p>
                          <p className="mt-0.5 text-[11px] text-red-800">
                            {tr("This requires confirmation and can be recreated later if needed.")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDeletePayment(payment.id)}
                              disabled={isSaving}
                              className="pc-btn-danger"
                            >
                              <AppIcon name="archive" className="h-3.5 w-3.5" />
                              {tr("Confirm delete")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeletePaymentId(null)}
                              disabled={isSaving}
                              className="pc-btn-secondary"
                            >
                              {tr("Cancel delete")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })()
            ))}
          </div>
        </>
      )}

      {feedback && (
        <p
          className={`pc-feedback mt-2 ${
            feedbackTone === "success"
              ? "pc-feedback-success"
              : feedbackTone === "error"
                ? "pc-feedback-error"
                : ""
          }`}
        >
          <AppIcon
            name={
              feedbackTone === "success"
                ? "check"
                : feedbackTone === "error"
                  ? "alert"
                  : "refresh"
            }
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          <span>{feedback}</span>
        </p>
      )}
      </section>
      {composerModal}
      {discardConfirmModal}
    </>
  );
}



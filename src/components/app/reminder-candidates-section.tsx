"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import { clientEnv } from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";
import {
  PAYMENTS_CHANGED_EVENT,
  dispatchReminderCandidates,
  listRecurringPayments,
  readReminderCandidates,
  readReminderDeliveryReadiness,
  runReminderTestSend,
  verifyReminderRecipientBinding,
} from "@/lib/payments/client";
import type {
  RecurringPaymentPayload,
  ReminderCandidatePayload,
  ReminderDeliveryReadinessPayload,
  ReminderDispatchAttemptPayload,
  ReminderDispatchSummaryPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";

type ReminderCandidatesSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
};

const reasonLabel: Record<ReminderDispatchAttemptPayload["reminderReason"], string> = {
  due_today: "Due today",
  advance: "Advance",
  overdue: "Overdue",
  test_send: "Test send",
};
const triggerSourceLabel: Record<ReminderDispatchAttemptPayload["triggerSource"], string> =
  {
    manual_dispatch: "Manual dispatch",
    manual_test_send: "Manual test send",
    scheduled_dispatch: "Scheduled dispatch",
  };

const toUtcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDueDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
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

const dispatchStatusMeta: Record<
  ReminderDispatchAttemptPayload["dispatchStatus"],
  {
    label: string;
    className: string;
  }
> = {
  sent: { label: "SENT", className: "text-emerald-700" },
  skipped: { label: "SKIPPED", className: "text-amber-700" },
  failed: { label: "FAILED", className: "text-rose-700" },
};

export function ReminderCandidatesSection({
  workspace,
  initData,
}: ReminderCandidatesSectionProps) {
  const { tr } = useLocalization();
  const isFamilyWorkspace = workspace?.kind === "family";
  const isPersonalWorkspace = workspace?.kind === "personal";
  const [candidates, setCandidates] = useState<ReminderCandidatePayload[]>([]);
  const [familyPayments, setFamilyPayments] = useState<RecurringPaymentPayload[]>([]);
  const [responsiblePayerOptions, setResponsiblePayerOptions] = useState<
    WorkspaceResponsiblePayerOptionPayload[]
  >([]);
  const [today, setToday] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [isVerifyingBinding, setIsVerifyingBinding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bindingChatIdInput, setBindingChatIdInput] = useState("");
  const [lastDispatchSummary, setLastDispatchSummary] =
    useState<ReminderDispatchSummaryPayload | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<ReminderDispatchAttemptPayload[]>(
    [],
  );
  const [readiness, setReadiness] =
    useState<ReminderDeliveryReadinessPayload | null>(null);
  const [lastTestStatus, setLastTestStatus] = useState<{
    status: "sent" | "skipped" | "failed";
    errorCode: string | null;
    errorMessage: string | null;
    diagnosticCode: string | null;
    diagnosticMessage: string | null;
    diagnosticIsInference: boolean;
  } | null>(null);
  const [lastBindingVerifyStatus, setLastBindingVerifyStatus] = useState<{
    status: "sent" | "skipped" | "failed";
    errorCode: string | null;
    errorMessage: string | null;
    diagnosticCode: string | null;
    diagnosticMessage: string | null;
    diagnosticIsInference: boolean;
  } | null>(null);

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return tr("Load current workspace first to view reminder candidates.");
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

  const summary = useMemo(() => {
    return {
      dueToday: candidates.filter((candidate) => candidate.reason === "due_today")
        .length,
      advance: candidates.filter((candidate) => candidate.reason === "advance").length,
      overdue: candidates.filter((candidate) => candidate.reason === "overdue").length,
    };
  }, [candidates]);

  const familyVisibilitySummary = useMemo(() => {
    const todayKey = toUtcDateKey(new Date());
    const sharedActivePayments = familyPayments.filter(
      (payment) =>
        payment.paymentScope === "shared" && payment.status === "active",
    );
    const remindersEnabledCount = sharedActivePayments.filter(
      (payment) => payment.remindersEnabled,
    ).length;
    const whoPaysAssignedCount = sharedActivePayments.filter(
      (payment) => Boolean(payment.responsibleProfileId),
    ).length;
    const remindersOffCount = sharedActivePayments.length - remindersEnabledCount;
    const paidByMismatchCount = sharedActivePayments.filter(
      (payment) =>
        payment.currentCycle.state === "paid" &&
        Boolean(payment.responsibleProfileId) &&
        Boolean(payment.currentCycle.paidByProfileId) &&
        payment.responsibleProfileId !== payment.currentCycle.paidByProfileId,
    ).length;
    const dueTodayUnpaidCount = sharedActivePayments.filter(
      (payment) =>
        payment.currentCycle.state === "unpaid" &&
        payment.currentCycle.dueDate === todayKey,
    ).length;
    const overdueUnpaidCount = sharedActivePayments.filter(
      (payment) =>
        payment.currentCycle.state === "unpaid" &&
        payment.currentCycle.dueDate < todayKey,
    ).length;
    const attentionItems = sharedActivePayments
      .filter(
        (payment) =>
          payment.currentCycle.state === "unpaid" &&
          (payment.currentCycle.dueDate === todayKey ||
            payment.currentCycle.dueDate < todayKey),
      )
      .sort((a, b) => {
        if (a.currentCycle.dueDate !== b.currentCycle.dueDate) {
          return a.currentCycle.dueDate.localeCompare(b.currentCycle.dueDate);
        }

        return a.title.localeCompare(b.title);
      })
      .slice(0, 5);

    return {
      sharedActivePaymentsCount: sharedActivePayments.length,
      remindersEnabledCount,
      remindersOffCount,
      paidByMismatchCount,
      whoPaysAssignedCount,
      whoPaysUnassignedCount: sharedActivePayments.length - whoPaysAssignedCount,
      dueTodayUnpaidCount,
      overdueUnpaidCount,
      attentionItems,
    };
  }, [familyPayments]);
  const scheduledDispatchObservation = useMemo(() => {
    const scheduledAttempts = recentAttempts.filter(
      (attempt) => attempt.triggerSource === "scheduled_dispatch",
    );
    const latestScheduledAttempt = scheduledAttempts[0] ?? null;
    return {
      latestScheduledAttempt,
      scheduledAttemptsCountInSnapshot: scheduledAttempts.length,
      snapshotSize: recentAttempts.length,
    };
  }, [recentAttempts]);

  const loadCandidates = useCallback(async () => {
    if (workspaceUnavailable || !isPersonalWorkspace) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await readReminderCandidates(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setToday(result.today);
      setCandidates(result.candidates);
    } catch {
      setFeedback(tr("Failed to load reminder candidates."));
    } finally {
      setIsLoading(false);
    }
  }, [initData, isPersonalWorkspace, tr, workspaceUnavailable]);

  const loadReadiness = useCallback(async () => {
    if (workspaceUnavailable || !isPersonalWorkspace) {
      return;
    }

    setIsLoadingReadiness(true);
    try {
      const result = await readReminderDeliveryReadiness(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setReadiness(result.readiness);
      setRecentAttempts(result.recentAttempts);
    } catch {
      setFeedback(tr("Failed to load delivery readiness."));
    } finally {
      setIsLoadingReadiness(false);
    }
  }, [initData, isPersonalWorkspace, tr, workspaceUnavailable]);

  const loadFamilyVisibility = useCallback(async () => {
    if (workspaceUnavailable || !isFamilyWorkspace) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await listRecurringPayments(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setToday(toUtcDateKey(new Date()));
      setFamilyPayments(result.payments);
      setResponsiblePayerOptions(result.responsiblePayerOptions);
    } catch {
      setFeedback(tr("Failed to load family reminder visibility."));
      setResponsiblePayerOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [initData, isFamilyWorkspace, tr, workspaceUnavailable]);

  const runDispatch = useCallback(async () => {
    if (workspaceUnavailable || !isPersonalWorkspace) {
      return;
    }

    setIsDispatching(true);
    setFeedback(null);
    try {
      const result = await dispatchReminderCandidates(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setLastDispatchSummary(result.summary);
      setRecentAttempts(result.recentAttempts);
      setFeedback(tr("Controlled reminder dispatch completed."));
      await loadCandidates();
      await loadReadiness();
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    } catch {
      setFeedback(tr("Failed to run controlled reminder dispatch."));
    } finally {
      setIsDispatching(false);
    }
  }, [
    initData,
    isPersonalWorkspace,
    loadCandidates,
    loadReadiness,
    tr,
    workspaceUnavailable,
  ]);

  const runTestSend = useCallback(async () => {
    if (workspaceUnavailable || !isPersonalWorkspace) {
      return;
    }

    setIsTestSending(true);
    setFeedback(null);
    try {
      const result = await runReminderTestSend(initData);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setReadiness(result.readiness);
      setLastTestStatus(result.result);
      setRecentAttempts(result.recentAttempts);
      setFeedback(tr("Manual test send finished."));
      await loadCandidates();
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    } catch {
      setFeedback(tr("Failed to run manual test send."));
    } finally {
      setIsTestSending(false);
    }
  }, [initData, isPersonalWorkspace, loadCandidates, tr, workspaceUnavailable]);

  const runBindingVerify = useCallback(async () => {
    if (workspaceUnavailable || !isPersonalWorkspace) {
      return;
    }

    setIsVerifyingBinding(true);
    setFeedback(null);
    try {
      const result = await verifyReminderRecipientBinding(
        initData,
        bindingChatIdInput.trim() || undefined,
      );
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }

      setReadiness(result.readiness);
      setLastBindingVerifyStatus(result.result);
      setFeedback(tr("Binding verification finished."));
      await loadReadiness();
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    } catch {
      setFeedback(tr("Failed to verify Telegram recipient binding."));
    } finally {
      setIsVerifyingBinding(false);
    }
  }, [
    bindingChatIdInput,
    initData,
    isPersonalWorkspace,
    loadReadiness,
    tr,
    workspaceUnavailable,
  ]);

  useEffect(() => {
    if (isFamilyWorkspace) {
      loadFamilyVisibility();
      return;
    }

    loadCandidates();
    loadReadiness();
  }, [
    isFamilyWorkspace,
    loadCandidates,
    loadFamilyVisibility,
    loadReadiness,
  ]);

  useEffect(() => {
    const refresh = () => {
      if (isFamilyWorkspace) {
        loadFamilyVisibility();
        return;
      }

      loadCandidates();
      loadReadiness();
    };

    window.addEventListener(PAYMENTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(PAYMENTS_CHANGED_EVENT, refresh);
    };
  }, [isFamilyWorkspace, loadCandidates, loadFamilyVisibility, loadReadiness]);

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-text">
          {isFamilyWorkspace ? tr("Reminder Visibility") : tr("Reminder Candidates")}
        </h2>
      </div>

      {workspaceUnavailable ? (
        <p className="rounded-xl bg-app-surface-soft px-3 py-2 text-sm text-app-text-muted">
          {workspaceUnavailable}
        </p>
      ) : (
        <>
          {isFamilyWorkspace ? (
            <>
              <div className="rounded-2xl border border-app-border bg-app-surface-soft p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  {tr("Family reminder visibility")}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Shared payments")}</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.sharedActivePaymentsCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Reminders on")}</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.remindersEnabledCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Reminders off")}</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.remindersOffCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Who pays missing")}</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.whoPaysUnassignedCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Due today (unpaid)")}</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.dueTodayUnpaidCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">{tr("Overdue (unpaid)")}</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.overdueUnpaidCount}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-app-text-muted">
                {tr("Mismatch hints")}: {familyVisibilitySummary.paidByMismatchCount}.
              </p>

              <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                <p className="text-xs text-app-text-muted">
                  {tr("Visibility date")}: {today || tr("not loaded")}.
                </p>
                {familyVisibilitySummary.sharedActivePaymentsCount === 0 ? (
                  <p className="mt-2 text-sm text-app-text-muted">
                    {tr(
                      "No shared payments yet in this family workspace. Add your first shared payment in the recurring section below.",
                    )}
                  </p>
                ) : familyVisibilitySummary.remindersEnabledCount === 0 ? (
                  <p className="mt-2 text-sm text-app-text-muted">
                    {tr("Shared payments exist, but reminders are turned off for all of them.")}
                  </p>
                ) : (
                  <>
                    {familyVisibilitySummary.attentionItems.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {familyVisibilitySummary.attentionItems.map((payment) => (
                          <li
                            key={`family-reminder-${payment.id}`}
                            className="rounded-xl bg-app-surface px-2 py-1.5 text-xs text-app-text"
                          >
                            <p className="font-medium">{payment.title}</p>
                            <p className="text-app-text-muted">
                              {tr("Due")} {formatDueDate(payment.currentCycle.dueDate)}.
                              {" "}
                              {tr("Reminders")} {payment.remindersEnabled ? tr("On") : tr("Off")}.
                              {" "}
                              {tr("Who pays")}{" "}
                              {resolveResponsiblePayerDisplayName(
                                payment.responsibleProfileId,
                                responsiblePayerOptions,
                                {
                                  notAssigned: tr("Not assigned yet"),
                                  missingMember: tr(
                                    "Assigned member is no longer in this family workspace",
                                  ),
                                },
                              )}
                              .
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-app-text-muted">
                        {tr("No due-today or overdue unpaid shared payments right now.")}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadFamilyVisibility}
                  disabled={isLoading}
                  className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
                >
                  {tr("Refresh family section")}
                </button>
                {isLoading && (
                  <p className="text-xs text-app-text-muted">
                    {tr("Loading family reminders...")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-app-surface-soft p-2">
              <p className="text-[11px] text-app-text-muted">{tr("Due today")}</p>
              <p className="text-base font-semibold text-app-text">{summary.dueToday}</p>
            </div>
            <div className="rounded-xl bg-app-surface-soft p-2">
              <p className="text-[11px] text-app-text-muted">{tr("Advance")}</p>
              <p className="text-base font-semibold text-app-text">{summary.advance}</p>
            </div>
            <div className="rounded-xl bg-app-surface-soft p-2">
              <p className="text-[11px] text-app-text-muted">{tr("Overdue")}</p>
              <p className="text-base font-semibold text-app-text">{summary.overdue}</p>
            </div>
          </div>
          {summary.dueToday + summary.advance + summary.overdue === 0 && (
            <div className="mt-2 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <p className="text-sm font-semibold text-app-text">{tr("No reminders yet")}</p>
              <p className="mt-1 text-xs text-app-text-muted">
                {tr(
                  "Add your first recurring payment above. Reminders will appear here when due.",
                )}
              </p>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Delivery Readiness")}
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Bot configured")}: {readiness?.botConfigured ? tr("yes") : tr("no")}.{" "}
              {tr("Recipient resolved")}: {readiness?.recipientResolved ? tr("yes") : tr("no")}.{" "}
              {tr("Delivery ready")}: {readiness?.deliveryReady ? tr("yes") : tr("no")}.
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("Status")}: {readiness?.code ?? tr("unknown")}
              {readiness?.message ? `. ${readiness.message}` : ""}
            </p>
            {readiness?.deliveryReady && !readiness.lastErrorCode && (
              <p className="mt-1 text-xs text-emerald-700">
                {tr("Delivery path is healthy for the current recipient.")}
              </p>
            )}
            <details className="mt-2 rounded-xl border border-app-border bg-app-surface px-2 py-2 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                {tr("Diagnostics and dispatch observation")}
              </summary>
              <p className="mt-2">
                {tr("Source")}: {readiness?.recipientSource ?? tr("unknown")}. {tr("Binding")}:{" "}
                {readiness?.bindingStatus ?? tr("unknown")}
                {readiness?.bindingVerifiedAt
                  ? `. ${tr("Verified at")} ${new Date(readiness.bindingVerifiedAt).toLocaleString()}`
                  : ""}
                .
              </p>
              <p className="mt-1">
                {tr("Diagnostic source")}: {readiness?.recipientDiagnosticSource ?? tr("unknown")}.
                {" "}{tr("Type")}: {readiness?.recipientType ?? tr("unknown")}. {tr("Preview")}:{" "}
                {readiness?.recipientPreview ?? tr("none")}.
              </p>
              <p className="mt-1">
                {tr("Binding diagnostic status")}: {readiness?.bindingDiagnosticStatus ?? tr("unknown")}.
              </p>
              <p className="mt-1">
                {tr("Active recipient source")}:{" "}
                {readiness?.bindingStatus === "verified" &&
                readiness?.recipientSource === "stored_chat_id"
                  ? tr("verified stored chat id (authoritative)")
                  : readiness?.recipientSource ?? tr("unknown")}
                .
              </p>
              {readiness?.bindingReason && (
                <p className="mt-1">
                  {tr("Binding reason")}: {readiness.bindingReason}
                  {readiness.bindingReasonIsInference ? ` (${tr("inference")})` : ""}
                </p>
              )}
              {readiness?.lastErrorCode && (
                <p className="mt-1">
                  {tr("Last error")}: {readiness.lastErrorCode}
                  {readiness.lastErrorMessage ? `. ${readiness.lastErrorMessage}` : ""}
                </p>
              )}
              <p className="mt-2 font-semibold text-app-text">
                {tr("Scheduled dispatch observation")}
              </p>
              {scheduledDispatchObservation.latestScheduledAttempt ? (
                <p className="mt-1">
                  {tr("Last scheduled attempt")}:{" "}
                  {formatDateTime(
                    scheduledDispatchObservation.latestScheduledAttempt.createdAt,
                  )}{" "}
                  (
                  {
                    dispatchStatusMeta[
                      scheduledDispatchObservation.latestScheduledAttempt.dispatchStatus
                    ].label
                  }
                  ).
                </p>
              ) : (
                <p className="mt-1">{tr("No scheduled attempts in current snapshot.")}</p>
              )}
              <p className="mt-1">
                {tr("Snapshot")}: {scheduledDispatchObservation.scheduledAttemptsCountInSnapshot}{" "}
                {tr("scheduled rows out of")} {scheduledDispatchObservation.snapshotSize}{" "}
                {tr("recent attempts rows")}.
              </p>
              <p className="mt-1">
                {tr(
                  "This is an operational snapshot only. Long-horizon cron health still requires repeated production checks over time.",
                )}
              </p>
            </details>
          </div>

          <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Telegram onboarding help")}
            </summary>
            <p className="mt-2 text-xs text-app-text-muted">
              {tr("To receive reminders, open the bot in Telegram and press Start.")}
            </p>
            {clientEnv.telegramBotUsername ? (
              <>
                <p className="mt-2 text-xs text-app-text-muted">
                  {tr("Bot username")}: @{clientEnv.telegramBotUsername}
                </p>
                <a
                  href={`https://t.me/${clientEnv.telegramBotUsername}?start=reminders`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-xl border border-app-border px-3 py-1 text-xs font-semibold text-app-text"
                >
                  {tr("Open Telegram bot")}
                </a>
              </>
            ) : (
              <p className="mt-1 text-xs text-app-text-muted">
                {tr(
                  "Bot username is not configured in public env. Set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` and restart dev server.",
                )}
                </p>
              )}
          </details>

          <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Recipient binding verification")}
            </summary>
            <p className="mt-2 text-xs text-app-text-muted">
              {tr(
                "Optional: enter numeric private chat id to override recipient binding and verify delivery path.",
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={bindingChatIdInput}
                onChange={(event) => setBindingChatIdInput(event.target.value)}
                placeholder={tr("Telegram private chat id")}
                className="min-w-[220px] flex-1 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
              />
              <button
                type="button"
                onClick={runBindingVerify}
                disabled={
                  isLoading ||
                  isLoadingReadiness ||
                  isDispatching ||
                  isTestSending ||
                  isVerifyingBinding
                }
                className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
              >
                {tr("Verify binding")}
              </button>
            </div>
          </details>

          <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs text-app-text-muted">
              {tr("Evaluation date")}: {today || tr("not loaded")}
            </p>
            {candidates.length === 0 ? (
              <p className="mt-2 text-sm text-app-text-muted">
                {tr("No reminder candidates right now.")}
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {candidates.map((candidate) => (
                  <li key={`${candidate.paymentId}-${candidate.reason}`} className="text-sm">
                    <span className="font-medium text-app-text">{candidate.title}</span>{" "}
                    <span className="text-app-text-muted">
                      - {tr(reasonLabel[candidate.reason])}, {tr("due")}{" "}
                      {formatDueDate(candidate.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadCandidates}
              disabled={isLoading || isDispatching || isTestSending || isVerifyingBinding}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              {tr("Refresh candidates")}
            </button>
            <button
              type="button"
              onClick={loadReadiness}
              disabled={
                isLoadingReadiness || isDispatching || isTestSending || isVerifyingBinding
              }
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              {tr("Refresh delivery status")}
            </button>
            <button
              type="button"
              onClick={runDispatch}
              disabled={isLoading || isDispatching || isTestSending || isVerifyingBinding}
              className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {tr("Run dispatch")}
            </button>
            <button
              type="button"
              onClick={runTestSend}
              disabled={isLoading || isDispatching || isTestSending || isVerifyingBinding}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              {tr("Send test message")}
            </button>
            {isLoading && (
              <p className="text-xs text-app-text-muted">{tr("Loading reminders...")}</p>
            )}
            {isLoadingReadiness && (
              <p className="text-xs text-app-text-muted">{tr("Loading readiness...")}</p>
            )}
            {isDispatching && (
              <p className="text-xs text-app-text-muted">{tr("Dispatching reminders...")}</p>
            )}
            {isTestSending && (
              <p className="text-xs text-app-text-muted">{tr("Sending test message...")}</p>
            )}
            {isVerifyingBinding && (
              <p className="text-xs text-app-text-muted">{tr("Verifying binding...")}</p>
            )}
          </div>

          {lastDispatchSummary && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                {tr("Last dispatch result")}
              </summary>
              <p
                className={`mt-2 ${
                  lastDispatchSummary.failedCount === 0 &&
                  lastDispatchSummary.sentCount > 0
                    ? "font-semibold text-emerald-700"
                    : "font-semibold text-app-text"
                }`}
              >
                {tr("Dispatch result")}:{" "}
                {lastDispatchSummary.failedCount === 0 &&
                lastDispatchSummary.sentCount > 0
                  ? tr("success")
                  : lastDispatchSummary.failedCount > 0
                    ? tr("completed with failures")
                    : tr("completed")}
              </p>
              <p className="mt-1">
                {tr("Last dispatch")} ({lastDispatchSummary.evaluationDate}): {tr("seen")}{" "}
                {lastDispatchSummary.totalCandidatesSeen}, {tr("new")}{" "}
                {lastDispatchSummary.newAttemptsCreated}, {tr("duplicates")}{" "}
                {lastDispatchSummary.duplicatesSkipped}, {tr("sent")}{" "}
                {lastDispatchSummary.sentCount}, {tr("skipped")}{" "}
                {lastDispatchSummary.skippedCount}, {tr("failed")}{" "}
                {lastDispatchSummary.failedCount}.
              </p>
            </details>
          )}

          {lastTestStatus && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                {tr("Last test send")}
              </summary>
              <p
                className={`mt-2 ${
                  lastTestStatus.status === "sent"
                    ? "font-semibold text-emerald-700"
                    : lastTestStatus.status === "failed"
                      ? "font-semibold text-rose-700"
                      : "font-semibold text-amber-700"
                }`}
              >
                {tr("Last test send")}: {tr(lastTestStatus.status.toUpperCase())}
              </p>
              <p className="mt-1">
                {lastTestStatus.errorCode ? ` | ${lastTestStatus.errorCode}` : ""}
                {lastTestStatus.errorMessage ? ` | ${lastTestStatus.errorMessage}` : ""}
                {lastTestStatus.diagnosticCode
                  ? ` | ${lastTestStatus.diagnosticCode}`
                  : ""}
                {lastTestStatus.diagnosticMessage
                  ? ` | ${lastTestStatus.diagnosticMessage}`
                  : ""}
                {lastTestStatus.diagnosticIsInference ? ` (${tr("inference")})` : ""}
              </p>
            </details>
          )}

          {lastBindingVerifyStatus && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                {tr("Last binding verify")}
              </summary>
              <p className="mt-2">
                {tr("Last binding verify")}: {tr(lastBindingVerifyStatus.status)}
                {lastBindingVerifyStatus.errorCode
                  ? ` | ${lastBindingVerifyStatus.errorCode}`
                  : ""}
                {lastBindingVerifyStatus.errorMessage
                  ? ` | ${lastBindingVerifyStatus.errorMessage}`
                  : ""}
                {lastBindingVerifyStatus.diagnosticCode
                  ? ` | ${lastBindingVerifyStatus.diagnosticCode}`
                  : ""}
                {lastBindingVerifyStatus.diagnosticMessage
                  ? ` | ${lastBindingVerifyStatus.diagnosticMessage}`
                  : ""}
                {lastBindingVerifyStatus.diagnosticIsInference ? ` (${tr("inference")})` : ""}
              </p>
            </details>
          )}

          {recentAttempts.length > 0 && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                {tr("Recent attempts")} ({recentAttempts.length})
              </summary>
              <p className="mt-2 text-xs text-app-text-muted">
                {tr("Auto-refreshed by `Refresh delivery status`.")}
              </p>
              <ul className="mt-2 space-y-1">
                {recentAttempts.map((attempt) => {
                  const statusMeta = dispatchStatusMeta[attempt.dispatchStatus];
                  return (
                    <li
                      key={attempt.id}
                      className="rounded-xl bg-app-surface px-2 py-1.5 text-xs text-app-text"
                    >
                      <p>
                        <span className={`font-semibold ${statusMeta.className}`}>
                          {tr(statusMeta.label)}
                        </span>{" "}
                        {tr(reasonLabel[attempt.reminderReason])}
                      </p>
                      <p className="text-app-text-muted">
                        {tr("Due")} {formatDueDate(attempt.cycleDueDate)}.{" "}
                        {formatDateTime(attempt.createdAt)}.
                      </p>
                      <p className="text-app-text-muted">
                        {tr("Source")}: {tr(triggerSourceLabel[attempt.triggerSource])}.
                      </p>
                      <p className="text-app-text-muted">
                        {attempt.errorCode
                          ? `${attempt.errorCode}${attempt.errorMessage ? `. ${attempt.errorMessage}` : ""}`
                          : tr("ok")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
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


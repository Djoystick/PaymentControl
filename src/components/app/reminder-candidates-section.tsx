"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import { clientEnv } from "@/lib/config/client-env";
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
      return "Load current workspace first to view reminder candidates.";
    }

    if (
      workspace.kind === "personal" &&
      workspace.id.startsWith("virtual-personal-")
    ) {
      return "Workspace persistence is not initialized. Apply workspace migrations first.";
    }

    return null;
  }, [workspace]);

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
      setFeedback("Failed to load reminder candidates.");
    } finally {
      setIsLoading(false);
    }
  }, [initData, isPersonalWorkspace, workspaceUnavailable]);

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
      setFeedback("Failed to load delivery readiness.");
    } finally {
      setIsLoadingReadiness(false);
    }
  }, [initData, isPersonalWorkspace, workspaceUnavailable]);

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
      setFeedback("Failed to load family reminder visibility.");
      setResponsiblePayerOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [initData, isFamilyWorkspace, workspaceUnavailable]);

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
      setFeedback("Controlled reminder dispatch completed.");
      await loadCandidates();
      await loadReadiness();
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    } catch {
      setFeedback("Failed to run controlled reminder dispatch.");
    } finally {
      setIsDispatching(false);
    }
  }, [
    initData,
    isPersonalWorkspace,
    loadCandidates,
    loadReadiness,
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
      setFeedback("Manual test send finished.");
      await loadCandidates();
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    } catch {
      setFeedback("Failed to run manual test send.");
    } finally {
      setIsTestSending(false);
    }
  }, [initData, isPersonalWorkspace, loadCandidates, workspaceUnavailable]);

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
      setFeedback("Binding verification finished.");
      await loadReadiness();
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    } catch {
      setFeedback("Failed to verify Telegram recipient binding.");
    } finally {
      setIsVerifyingBinding(false);
    }
  }, [
    bindingChatIdInput,
    initData,
    isPersonalWorkspace,
    loadReadiness,
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
          {isFamilyWorkspace ? "Reminder Visibility" : "Reminder Candidates"}
        </h2>
        <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
          Phase 11C
        </span>
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
                  Family reminder visibility
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">Shared payments</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.sharedActivePaymentsCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">Reminders on</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.remindersEnabledCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">Reminders off</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.remindersOffCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">Who pays missing</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.whoPaysUnassignedCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">Due today (unpaid)</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.dueTodayUnpaidCount}
                  </p>
                </div>
                <div className="rounded-xl bg-app-surface-soft p-2">
                  <p className="text-[11px] text-app-text-muted">Overdue (unpaid)</p>
                  <p className="text-base font-semibold text-app-text">
                    {familyVisibilitySummary.overdueUnpaidCount}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-app-text-muted">
                Mismatch hints: {familyVisibilitySummary.paidByMismatchCount}.
              </p>

              <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
                <p className="text-xs text-app-text-muted">
                  Visibility date: {today || "not loaded"}.
                </p>
                {familyVisibilitySummary.sharedActivePaymentsCount === 0 ? (
                  <p className="mt-2 text-sm text-app-text-muted">
                    No shared payments yet in this family workspace. Add your first
                    shared payment in the recurring section below.
                  </p>
                ) : familyVisibilitySummary.remindersEnabledCount === 0 ? (
                  <p className="mt-2 text-sm text-app-text-muted">
                    Shared payments exist, but reminders are turned off for all of
                    them.
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
                              Due {formatDueDate(payment.currentCycle.dueDate)}.
                              Reminders {payment.remindersEnabled ? "on" : "off"}.
                              Who pays{" "}
                              {resolveResponsiblePayerDisplayName(
                                payment.responsibleProfileId,
                                responsiblePayerOptions,
                              )}
                              .
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-app-text-muted">
                        No due-today or overdue unpaid shared payments right now.
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
                  Refresh family section
                </button>
                {isLoading && (
                  <p className="text-xs text-app-text-muted">
                    Loading family reminders...
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-app-surface-soft p-2">
              <p className="text-[11px] text-app-text-muted">Due today</p>
              <p className="text-base font-semibold text-app-text">{summary.dueToday}</p>
            </div>
            <div className="rounded-xl bg-app-surface-soft p-2">
              <p className="text-[11px] text-app-text-muted">Advance</p>
              <p className="text-base font-semibold text-app-text">{summary.advance}</p>
            </div>
            <div className="rounded-xl bg-app-surface-soft p-2">
              <p className="text-[11px] text-app-text-muted">Overdue</p>
              <p className="text-base font-semibold text-app-text">{summary.overdue}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Delivery Readiness
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              Bot configured: {readiness?.botConfigured ? "yes" : "no"}. Recipient
              resolved: {readiness?.recipientResolved ? "yes" : "no"}. Delivery ready:{" "}
              {readiness?.deliveryReady ? "yes" : "no"}.
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              Status: {readiness?.code ?? "unknown"}
              {readiness?.message ? `. ${readiness.message}` : ""}
            </p>
            {readiness?.deliveryReady && !readiness.lastErrorCode && (
              <p className="mt-1 text-xs text-emerald-700">
                Delivery path is healthy for the current recipient.
              </p>
            )}
            <details className="mt-2 rounded-xl border border-app-border bg-app-surface px-2 py-2 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                Diagnostics and dispatch observation
              </summary>
              <p className="mt-2">
                Source: {readiness?.recipientSource ?? "unknown"}. Binding:{" "}
                {readiness?.bindingStatus ?? "unknown"}
                {readiness?.bindingVerifiedAt
                  ? `. Verified at ${new Date(readiness.bindingVerifiedAt).toLocaleString()}`
                  : ""}
                .
              </p>
              <p className="mt-1">
                Diagnostic source: {readiness?.recipientDiagnosticSource ?? "unknown"}.
                Type: {readiness?.recipientType ?? "unknown"}. Preview:{" "}
                {readiness?.recipientPreview ?? "none"}.
              </p>
              <p className="mt-1">
                Binding diagnostic status: {readiness?.bindingDiagnosticStatus ?? "unknown"}.
              </p>
              <p className="mt-1">
                Active recipient source:{" "}
                {readiness?.bindingStatus === "verified" &&
                readiness?.recipientSource === "stored_chat_id"
                  ? "verified stored chat id (authoritative)"
                  : readiness?.recipientSource ?? "unknown"}
                .
              </p>
              {readiness?.bindingReason && (
                <p className="mt-1">
                  Binding reason: {readiness.bindingReason}
                  {readiness.bindingReasonIsInference ? " (inference)" : ""}
                </p>
              )}
              {readiness?.lastErrorCode && (
                <p className="mt-1">
                  Last error: {readiness.lastErrorCode}
                  {readiness.lastErrorMessage ? `. ${readiness.lastErrorMessage}` : ""}
                </p>
              )}
              <p className="mt-2 font-semibold text-app-text">Scheduled dispatch observation</p>
              {scheduledDispatchObservation.latestScheduledAttempt ? (
                <p className="mt-1">
                  Last scheduled attempt:{" "}
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
                <p className="mt-1">No scheduled attempts in current snapshot.</p>
              )}
              <p className="mt-1">
                Snapshot: {scheduledDispatchObservation.scheduledAttemptsCountInSnapshot}{" "}
                scheduled rows out of {scheduledDispatchObservation.snapshotSize} recent attempts.
              </p>
              <p className="mt-1">
                This is an operational snapshot only. Long-horizon cron health still requires
                repeated production checks over time.
              </p>
            </details>
          </div>

          <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Telegram onboarding help
            </summary>
            <p className="mt-2 text-xs text-app-text-muted">
              To receive reminders, open the bot in Telegram and press Start.
            </p>
            {clientEnv.telegramBotUsername ? (
              <>
                <p className="mt-2 text-xs text-app-text-muted">
                  Bot username: @{clientEnv.telegramBotUsername}
                </p>
                <a
                  href={`https://t.me/${clientEnv.telegramBotUsername}?start=reminders`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-xl border border-app-border px-3 py-1 text-xs font-semibold text-app-text"
                >
                  Open Telegram bot
                </a>
              </>
            ) : (
              <p className="mt-1 text-xs text-app-text-muted">
                Bot username is not configured in public env. Set
                ` NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ` and restart dev server.
                </p>
              )}
          </details>

          <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Recipient binding verification
            </summary>
            <p className="mt-2 text-xs text-app-text-muted">
              Optional: enter numeric private chat id to override recipient binding and verify delivery path.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={bindingChatIdInput}
                onChange={(event) => setBindingChatIdInput(event.target.value)}
                placeholder="Telegram private chat id"
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
                Verify binding
              </button>
            </div>
          </details>

          <div className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs text-app-text-muted">
              Evaluation date: {today || "not loaded"}
            </p>
            {candidates.length === 0 ? (
              <p className="mt-2 text-sm text-app-text-muted">
                No reminder candidates in current pass.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {candidates.map((candidate) => (
                  <li key={`${candidate.paymentId}-${candidate.reason}`} className="text-sm">
                    <span className="font-medium text-app-text">{candidate.title}</span>{" "}
                    <span className="text-app-text-muted">
                      - {reasonLabel[candidate.reason]}, due{" "}
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
              Refresh candidates
            </button>
            <button
              type="button"
              onClick={loadReadiness}
              disabled={
                isLoadingReadiness || isDispatching || isTestSending || isVerifyingBinding
              }
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              Refresh delivery status
            </button>
            <button
              type="button"
              onClick={runDispatch}
              disabled={isLoading || isDispatching || isTestSending || isVerifyingBinding}
              className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Run dispatch
            </button>
            <button
              type="button"
              onClick={runTestSend}
              disabled={isLoading || isDispatching || isTestSending || isVerifyingBinding}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-text disabled:opacity-60"
            >
              Send test message
            </button>
            {isLoading && (
              <p className="text-xs text-app-text-muted">Loading reminders...</p>
            )}
            {isLoadingReadiness && (
              <p className="text-xs text-app-text-muted">Loading readiness...</p>
            )}
            {isDispatching && (
              <p className="text-xs text-app-text-muted">Dispatching reminders...</p>
            )}
            {isTestSending && (
              <p className="text-xs text-app-text-muted">Sending test message...</p>
            )}
            {isVerifyingBinding && (
              <p className="text-xs text-app-text-muted">Verifying binding...</p>
            )}
          </div>

          {lastDispatchSummary && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                Last dispatch result
              </summary>
              <p
                className={`mt-2 ${
                  lastDispatchSummary.failedCount === 0 &&
                  lastDispatchSummary.sentCount > 0
                    ? "font-semibold text-emerald-700"
                    : "font-semibold text-app-text"
                }`}
              >
                Dispatch result:{" "}
                {lastDispatchSummary.failedCount === 0 &&
                lastDispatchSummary.sentCount > 0
                  ? "success"
                  : lastDispatchSummary.failedCount > 0
                    ? "completed with failures"
                    : "completed"}
              </p>
              <p className="mt-1">
                Last dispatch ({lastDispatchSummary.evaluationDate}): seen{" "}
                {lastDispatchSummary.totalCandidatesSeen}, new{" "}
                {lastDispatchSummary.newAttemptsCreated}, duplicates{" "}
                {lastDispatchSummary.duplicatesSkipped}, sent{" "}
                {lastDispatchSummary.sentCount}, skipped{" "}
                {lastDispatchSummary.skippedCount}, failed{" "}
                {lastDispatchSummary.failedCount}.
              </p>
            </details>
          )}

          {lastTestStatus && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                Last test send
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
                Last test send: {lastTestStatus.status.toUpperCase()}
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
                {lastTestStatus.diagnosticIsInference ? " (inference)" : ""}
              </p>
            </details>
          )}

          {lastBindingVerifyStatus && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3 text-xs text-app-text-muted">
              <summary className="cursor-pointer font-semibold text-app-text">
                Last binding verify
              </summary>
              <p className="mt-2">
                Last binding verify: {lastBindingVerifyStatus.status}
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
                {lastBindingVerifyStatus.diagnosticIsInference ? " (inference)" : ""}
              </p>
            </details>
          )}

          {recentAttempts.length > 0 && (
            <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Recent attempts ({recentAttempts.length})
              </summary>
              <p className="mt-2 text-xs text-app-text-muted">
                Auto-refreshed by `Refresh delivery status`.
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
                          {statusMeta.label}
                        </span>{" "}
                        {reasonLabel[attempt.reminderReason]}
                      </p>
                      <p className="text-app-text-muted">
                        Due {formatDueDate(attempt.cycleDueDate)}.{" "}
                        {formatDateTime(attempt.createdAt)}.
                      </p>
                      <p className="text-app-text-muted">
                        Source: {triggerSourceLabel[attempt.triggerSource]}.
                      </p>
                      <p className="text-app-text-muted">
                        {attempt.errorCode
                          ? `${attempt.errorCode}${attempt.errorMessage ? `. ${attempt.errorMessage}` : ""}`
                          : "ok"}
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

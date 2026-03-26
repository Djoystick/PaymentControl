import "server-only";
import type {
  ReminderCandidatePayload,
  ReminderDeliveryReadinessCode,
  TelegramBindingStatus,
  TelegramRecipientSource,
  ReminderDispatchTriggerSource,
  ScheduledDispatchRunSummaryPayload,
  ReminderDispatchSummaryPayload,
  ReminderDispatchAttemptPayload,
  ReminderDispatchStatus,
} from "@/lib/payments/types";
import {
  createReminderDispatchAttempt,
  hasReminderDispatchAttempt,
  listPersonalWorkspaceDispatchTargets,
  listRecurringPaymentsByWorkspace,
  readRecentReminderDispatchAttemptsByWorkspace,
  readReminderCandidatesByWorkspace,
} from "@/lib/payments/repository";
import {
  evaluateTelegramDeliveryReadiness,
  sendTelegramMessageWithPreflight,
} from "@/lib/payments/telegram-delivery";
import {
  resolveTelegramRecipientBinding,
  upsertTelegramRecipientBindingObservation,
} from "@/lib/payments/recipient-binding";

type DispatchReminderCandidatesInput = {
  workspaceId: string;
  profileId: string;
  profileTelegramUserId: string | number | null;
  triggeredByProfileId: string | null;
  recipientTelegramUserId: string | null;
  recipientSource: TelegramRecipientSource;
  triggerSource?: ReminderDispatchTriggerSource;
};

type DispatchReminderCandidatesResult = {
  summary: ReminderDispatchSummaryPayload;
  recentAttempts: ReminderDispatchAttemptPayload[];
};

export type ManualReminderTestSendResult = {
  status: ReminderDispatchStatus;
  errorCode: string | null;
  errorMessage: string | null;
  diagnosticCode: ReminderDeliveryReadinessCode | null;
  diagnosticMessage: string | null;
  diagnosticIsInference: boolean;
  recentAttempts: ReminderDispatchAttemptPayload[];
};

const toDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const reasonLabel: Record<ReminderCandidatePayload["reason"], string> = {
  due_today: "Due today",
  advance: "Advance reminder",
  overdue: "Overdue reminder",
};

const buildReminderMessagePreview = (candidate: ReminderCandidatePayload): string => {
  return `Reminder: ${candidate.title} (${reasonLabel[candidate.reason]}), due ${candidate.dueDate}.`;
};

const incrementSummary = (
  summary: ReminderDispatchSummaryPayload,
  dispatchStatus: ReminderDispatchStatus,
) => {
  if (dispatchStatus === "sent") {
    summary.sentCount += 1;
  } else if (dispatchStatus === "skipped") {
    summary.skippedCount += 1;
  } else {
    summary.failedCount += 1;
  }
};

const deriveBindingObservation = (
  dispatchStatus: ReminderDispatchStatus,
  errorCode: string | null,
  diagnosticCode: string | null,
  diagnosticMessage: string | null,
  diagnosticIsInference: boolean,
): {
  bindingStatus: TelegramBindingStatus;
  bindingReason: string | null;
  bindingReasonIsInference: boolean;
} => {
  if (dispatchStatus === "sent") {
    return {
      bindingStatus: "verified",
      bindingReason: "Delivery succeeded and binding is verified.",
      bindingReasonIsInference: false,
    };
  }

  if (errorCode === "RECIPIENT_NOT_RESOLVED") {
    return {
      bindingStatus: "missing",
      bindingReason: "Recipient is missing for current context.",
      bindingReasonIsInference: false,
    };
  }

  if (errorCode === "RECIPIENT_FORMAT_INVALID") {
    return {
      bindingStatus: "invalid",
      bindingReason: "Recipient format is invalid.",
      bindingReasonIsInference: false,
    };
  }

  if (
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_BINDING_MISMATCH_INFERENCE" ||
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE" ||
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE" ||
    diagnosticCode === "BINDING_MISMATCH_INFERENCE"
  ) {
    return {
      bindingStatus: "invalid",
      bindingReason:
        diagnosticMessage ??
        "Likely recipient binding mismatch or stale recipient value (inference).",
      bindingReasonIsInference: true,
    };
  }

  if (
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE" ||
    diagnosticCode === "BOT_NOT_STARTED_INFERENCE"
  ) {
    return {
      bindingStatus: "unverified",
      bindingReason:
        diagnosticMessage ??
        "Likely user has not started bot chat yet (inference).",
      bindingReasonIsInference: true,
    };
  }

  if (errorCode === "TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE") {
    return {
      bindingStatus: "unverified",
      bindingReason:
        diagnosticMessage ??
        "Unknown Telegram chat binding failure requires manual verification (inference).",
      bindingReasonIsInference: true,
    };
  }

  return {
    bindingStatus: "unverified",
    bindingReason: diagnosticMessage,
    bindingReasonIsInference: diagnosticIsInference,
  };
};

export const dispatchReminderCandidatesForWorkspace = async ({
  workspaceId,
  profileId,
  profileTelegramUserId,
  triggeredByProfileId,
  recipientTelegramUserId,
  recipientSource,
  triggerSource = "manual_dispatch",
}: DispatchReminderCandidatesInput): Promise<DispatchReminderCandidatesResult | null> => {
  const now = new Date();
  const evaluationDate = toDateOnly(now);
  const candidates = await readReminderCandidatesByWorkspace(workspaceId, now);
  if (!candidates) {
    return null;
  }

  const summary: ReminderDispatchSummaryPayload = {
    evaluationDate,
    totalCandidatesSeen: candidates.length,
    newAttemptsCreated: 0,
    duplicatesSkipped: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };

  for (const candidate of candidates) {
    const duplicateCheck = await hasReminderDispatchAttempt(
      workspaceId,
      candidate.paymentId,
      candidate.reason,
      candidate.dueDate,
      evaluationDate,
    );
    if (duplicateCheck === null) {
      return null;
    }

    if (duplicateCheck) {
      summary.duplicatesSkipped += 1;
      continue;
    }

    const messagePreview = buildReminderMessagePreview(candidate);
    const sendResult = await sendTelegramMessageWithPreflight({
      recipientTelegramUserId,
      recipientSource,
      text: messagePreview,
    });

    const bindingObservation = deriveBindingObservation(
      sendResult.status,
      sendResult.errorCode,
      sendResult.diagnosticCode,
      sendResult.diagnosticMessage,
      sendResult.diagnosticIsInference,
    );

    const createdAttempt = await createReminderDispatchAttempt({
      workspaceId,
      paymentId: candidate.paymentId,
      reminderReason: candidate.reason,
      cycleDueDate: candidate.dueDate,
      evaluationDate,
      dispatchStatus: sendResult.status,
      triggerSource,
      triggeredByProfileId,
      recipientTelegramUserId,
      messagePreview,
      payloadSnapshot: {
        title: candidate.title,
        reason: candidate.reason,
        dueDate: candidate.dueDate,
        remindDaysBefore: candidate.remindDaysBefore,
      },
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
    });

    if (!createdAttempt.ok) {
      return null;
    }

    const bindingUpdated = await upsertTelegramRecipientBindingObservation({
      workspaceId,
      profileId,
      profileTelegramUserId,
      recipientSource,
      recipientTelegramUserId,
      bindingStatus: bindingObservation.bindingStatus,
      bindingReason: bindingObservation.bindingReason,
      bindingReasonIsInference: bindingObservation.bindingReasonIsInference,
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
    });
    if (!bindingUpdated) {
      return null;
    }

    if (!createdAttempt.created) {
      summary.duplicatesSkipped += 1;
      continue;
    }

    summary.newAttemptsCreated += 1;
    incrementSummary(summary, sendResult.status);
  }

  const recentAttempts = await readRecentReminderDispatchAttemptsByWorkspace(
    workspaceId,
    10,
  );
  if (!recentAttempts) {
    return null;
  }

  return {
    summary,
    recentAttempts,
  };
};

export const runManualReminderTestSend = async ({
  workspaceId,
  profileId,
  profileTelegramUserId,
  triggeredByProfileId,
  recipientTelegramUserId,
  recipientSource,
}: DispatchReminderCandidatesInput): Promise<ManualReminderTestSendResult | null> => {
  const now = new Date();
  const evaluationDate = toDateOnly(now);
  const testMessage = `Test reminder delivery check (${evaluationDate}).`;

  const payments = await listRecurringPaymentsByWorkspace(workspaceId);
  if (!payments) {
    return null;
  }

  const anchorPayment = payments.find((payment) => payment.status === "active");
  if (!anchorPayment) {
    const recentAttempts = await readRecentReminderDispatchAttemptsByWorkspace(
      workspaceId,
      10,
    );
    if (!recentAttempts) {
      return null;
    }

    return {
      status: "skipped",
      errorCode: "NO_ACTIVE_PAYMENT_FOR_TEST",
      errorMessage: "No active payment found to attach test send attempt.",
      diagnosticCode: null,
      diagnosticMessage: null,
      diagnosticIsInference: false,
      recentAttempts,
    };
  }

  const duplicateCheck = await hasReminderDispatchAttempt(
    workspaceId,
    anchorPayment.id,
    "test_send",
    evaluationDate,
    evaluationDate,
  );
  if (duplicateCheck === null) {
    return null;
  }

  if (duplicateCheck) {
    const recentAttempts = await readRecentReminderDispatchAttemptsByWorkspace(
      workspaceId,
      10,
    );
    if (!recentAttempts) {
      return null;
    }

    return {
      status: "skipped",
      errorCode: "DUPLICATE_TEST_SEND_SKIPPED",
      errorMessage:
        "Test send attempt for this evaluation date already exists and was skipped.",
      diagnosticCode: null,
      diagnosticMessage: null,
      diagnosticIsInference: false,
      recentAttempts,
    };
  }

  const sendResult = await sendTelegramMessageWithPreflight({
    recipientTelegramUserId,
    recipientSource,
    text: testMessage,
  });

  const bindingObservation = deriveBindingObservation(
    sendResult.status,
    sendResult.errorCode,
    sendResult.diagnosticCode,
    sendResult.diagnosticMessage,
    sendResult.diagnosticIsInference,
  );

  const bindingUpdated = await upsertTelegramRecipientBindingObservation({
    workspaceId,
    profileId,
    profileTelegramUserId,
    recipientSource,
    recipientTelegramUserId,
    bindingStatus: bindingObservation.bindingStatus,
    bindingReason: bindingObservation.bindingReason,
    bindingReasonIsInference: bindingObservation.bindingReasonIsInference,
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  if (!bindingUpdated) {
    return null;
  }

  const createResult = await createReminderDispatchAttempt({
    workspaceId,
    paymentId: anchorPayment.id,
    reminderReason: "test_send",
    cycleDueDate: evaluationDate,
    evaluationDate,
    dispatchStatus: sendResult.status,
    triggerSource: "manual_test_send",
    triggeredByProfileId,
    recipientTelegramUserId,
    messagePreview: testMessage,
    payloadSnapshot: {
      kind: "manual_test_send",
      evaluationDate,
    },
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });

  if (!createResult.ok) {
    return null;
  }

  if (!createResult.created) {
    const recentAttempts = await readRecentReminderDispatchAttemptsByWorkspace(
      workspaceId,
      10,
    );
    if (!recentAttempts) {
      return null;
    }

    return {
      status: "skipped",
      errorCode: "DUPLICATE_TEST_SEND_SKIPPED",
      errorMessage:
        "Test send attempt for this evaluation date already exists and was skipped.",
      diagnosticCode: null,
      diagnosticMessage: null,
      diagnosticIsInference: false,
      recentAttempts,
    };
  }

  const recentAttempts = await readRecentReminderDispatchAttemptsByWorkspace(
    workspaceId,
    10,
  );
  if (!recentAttempts) {
    return null;
  }

  return {
    status: sendResult.status,
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
    diagnosticCode: sendResult.diagnosticCode,
    diagnosticMessage: sendResult.diagnosticMessage,
    diagnosticIsInference: sendResult.diagnosticIsInference,
    recentAttempts,
  };
};

export const runScheduledReminderDispatch = async (): Promise<ScheduledDispatchRunSummaryPayload | null> => {
  const targets = await listPersonalWorkspaceDispatchTargets();
  if (!targets) {
    return null;
  }

  const now = new Date();
  const evaluationDate = toDateOnly(now);
  const summary: ScheduledDispatchRunSummaryPayload = {
    evaluationDate,
    workspacesSeen: targets.length,
    workspacesEligible: 0,
    candidatesSeen: 0,
    attemptsCreated: 0,
    duplicatesSkipped: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const target of targets) {
    const binding = await resolveTelegramRecipientBinding({
      workspaceId: target.workspaceId,
      profileId: target.profileId,
      profileTelegramUserId: target.profileTelegramUserId,
      mode: "delivery",
    });

    const readiness = evaluateTelegramDeliveryReadiness(
      binding.recipientTelegramUserId,
      binding.recipientSource,
      binding.bindingStatus,
      binding.bindingReason,
      binding.bindingReasonIsInference,
      binding.bindingVerifiedAt,
      binding.lastErrorCode,
      binding.lastErrorMessage,
    );

    if (!readiness.deliveryReady || binding.bindingStatus !== "verified") {
      continue;
    }

    summary.workspacesEligible += 1;

    const dispatchResult = await dispatchReminderCandidatesForWorkspace({
      workspaceId: target.workspaceId,
      profileId: target.profileId,
      profileTelegramUserId: target.profileTelegramUserId,
      triggeredByProfileId: null,
      recipientTelegramUserId: binding.recipientTelegramUserId,
      recipientSource: binding.recipientSource,
      triggerSource: "scheduled_dispatch",
    });

    if (!dispatchResult) {
      return null;
    }

    summary.candidatesSeen += dispatchResult.summary.totalCandidatesSeen;
    summary.attemptsCreated += dispatchResult.summary.newAttemptsCreated;
    summary.duplicatesSkipped += dispatchResult.summary.duplicatesSkipped;
    summary.sent += dispatchResult.summary.sentCount;
    summary.skipped += dispatchResult.summary.skippedCount;
    summary.failed += dispatchResult.summary.failedCount;
  }

  return summary;
};

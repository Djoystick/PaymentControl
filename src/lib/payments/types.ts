import type { CurrentAppContextErrorCode, WorkspaceSummaryPayload } from "@/lib/auth/types";

export type RecurringPaymentCadence = "weekly" | "monthly";
export type RecurringPaymentStatus = "active" | "archived";
export type RecurringPaymentScope = "personal" | "shared";
export type RecurringPaymentCycleState = "paid" | "unpaid";
export type RemindDaysBefore = 0 | 1 | 3;
export type ReminderCandidateReason = "due_today" | "advance" | "overdue";
export type ReminderDispatchReason = ReminderCandidateReason | "test_send";
export type TelegramRecipientSource = "profile_telegram_user_id" | "stored_chat_id";
export type TelegramBindingStatus =
  | "missing"
  | "unverified"
  | "verified"
  | "invalid";
export type TelegramRecipientDiagnosticSource =
  | "profile_field"
  | "workspace_field"
  | "derived_binding"
  | "stored_binding"
  | "unknown";
export type TelegramRecipientType =
  | "telegram_private_chat_id"
  | "telegram_user_id_only"
  | "username"
  | "profile_field"
  | "workspace_field"
  | "derived_binding"
  | "unknown";
export type TelegramBindingDiagnosticStatus =
  | "valid"
  | "invalid"
  | "missing"
  | "stale"
  | "unverified";

export type PaymentCurrentCyclePayload = {
  cycleKey: string;
  dueDate: string;
  state: RecurringPaymentCycleState;
  paidAt: string | null;
};

export type DashboardPaymentItemPayload = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  dueDate: string;
  cycleState: RecurringPaymentCycleState;
};

export type PaymentsDashboardSummaryPayload = {
  dueTodayCount: number;
  upcomingCount: number;
  overdueCount: number;
  paidThisCycleCount: number;
  unpaidThisCycleCount: number;
  upcomingWindowDays: number;
};

export type PaymentsDashboardPayload = {
  summary: PaymentsDashboardSummaryPayload;
  dueToday: DashboardPaymentItemPayload[];
  upcoming: DashboardPaymentItemPayload[];
  overdue: DashboardPaymentItemPayload[];
};

export type ReminderCandidatePayload = {
  paymentId: string;
  title: string;
  dueDate: string;
  reason: ReminderCandidateReason;
  remindDaysBefore: RemindDaysBefore;
};

export type ReminderDispatchStatus = "sent" | "skipped" | "failed";
export type ReminderDispatchTriggerSource =
  | "manual_dispatch"
  | "manual_test_send"
  | "scheduled_dispatch";
export type ReminderDeliveryReadinessCode =
  | "READY"
  | "BOT_TOKEN_NOT_CONFIGURED"
  | "BOT_API_BASE_INVALID"
  | "RECIPIENT_NOT_RESOLVED"
  | "RECIPIENT_FORMAT_INVALID"
  | "RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE"
  | "BOT_NOT_STARTED_INFERENCE"
  | "BINDING_MISMATCH_INFERENCE"
  | "CHAT_BINDING_FAILURE_INFERENCE";

export type ReminderDispatchAttemptPayload = {
  id: string;
  workspaceId: string;
  paymentId: string;
  reminderReason: ReminderDispatchReason;
  cycleDueDate: string;
  evaluationDate: string;
  dispatchStatus: ReminderDispatchStatus;
  triggerSource: ReminderDispatchTriggerSource;
  triggeredByProfileId: string | null;
  recipientTelegramUserId: string | null;
  messagePreview: string | null;
  payloadSnapshot: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type ReminderDeliveryReadinessPayload = {
  code: ReminderDeliveryReadinessCode;
  message: string;
  botConfigured: boolean;
  recipientSource: TelegramRecipientSource;
  recipientDiagnosticSource: TelegramRecipientDiagnosticSource;
  recipientType: TelegramRecipientType;
  recipientPreview: string | null;
  bindingStatus: TelegramBindingStatus;
  bindingDiagnosticStatus: TelegramBindingDiagnosticStatus;
  bindingReason: string | null;
  bindingReasonIsInference: boolean;
  bindingVerifiedAt: string | null;
  recipientResolved: boolean;
  recipientFormatValid: boolean;
  deliveryReady: boolean;
  botApiBaseUrl: string | null;
  recipientTelegramUserId: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

export type RecurringPaymentPayload = {
  id: string;
  workspaceId: string;
  paymentScope: RecurringPaymentScope;
  responsibleProfileId: string | null;
  title: string;
  amount: number;
  currency: string;
  category: string;
  cadence: RecurringPaymentCadence;
  dueDay: number;
  status: RecurringPaymentStatus;
  isRequired: boolean;
  isSubscription: boolean;
  isPaused: boolean;
  remindersEnabled: boolean;
  remindDaysBefore: RemindDaysBefore;
  remindOnDueDay: boolean;
  remindOnOverdue: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentCycle: PaymentCurrentCyclePayload;
};

export type CreateRecurringPaymentInput = {
  responsibleProfileId: string | null;
  title: string;
  amount: number;
  currency: string;
  category: string;
  cadence: RecurringPaymentCadence;
  dueDay: number;
  isRequired: boolean;
  isSubscription: boolean;
  remindersEnabled: boolean;
  remindDaysBefore: RemindDaysBefore;
  remindOnDueDay: boolean;
  remindOnOverdue: boolean;
  notes: string | null;
};

export type UpdateRecurringPaymentInput = Partial<CreateRecurringPaymentInput>;

export type WorkspaceResponsiblePayerOptionPayload = {
  profileId: string;
  memberRole: WorkspaceSummaryPayload["memberRole"];
  firstName: string;
  lastName: string | null;
  username: string | null;
  displayName: string;
};

export type PaymentsScopeResolutionSuccess = {
  ok: true;
  workspace: WorkspaceSummaryPayload;
};

export type PaymentsScopeResolutionErrorCode =
  | CurrentAppContextErrorCode
  | "WORKSPACE_KIND_NOT_SUPPORTED"
  | "WORKSPACE_UNAVAILABLE";

export type PaymentsScopeResolutionError = {
  ok: false;
  error: {
    code: PaymentsScopeResolutionErrorCode;
    message: string;
  };
};

export type PaymentsScopeResolutionResult =
  | PaymentsScopeResolutionSuccess
  | PaymentsScopeResolutionError;

export type PaymentApiErrorCode =
  | PaymentsScopeResolutionErrorCode
  | "PAYMENT_VALIDATION_FAILED"
  | "PAYMENT_LIST_FAILED"
  | "PAYMENT_CREATE_FAILED"
  | "PAYMENT_UPDATE_FAILED"
  | "PAYMENT_ARCHIVE_FAILED"
  | "PAYMENT_NOT_FOUND";

export type PaymentApiError = {
  ok: false;
  error: {
    code: PaymentApiErrorCode;
    message: string;
  };
};

export type PaymentsListResponse =
  | {
      ok: true;
      payments: RecurringPaymentPayload[];
      workspace: WorkspaceSummaryPayload;
      responsiblePayerOptions: WorkspaceResponsiblePayerOptionPayload[];
    }
  | PaymentApiError;

export type PaymentMutateResponse =
  | {
      ok: true;
      payment: RecurringPaymentPayload;
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type PaymentsDashboardResponse =
  | {
      ok: true;
      dashboard: PaymentsDashboardPayload;
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type ReminderCandidatesResponse =
  | {
      ok: true;
      today: string;
      candidates: ReminderCandidatePayload[];
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type ReminderDispatchSummaryPayload = {
  evaluationDate: string;
  totalCandidatesSeen: number;
  newAttemptsCreated: number;
  duplicatesSkipped: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
};

export type ReminderDispatchResponse =
  | {
      ok: true;
      summary: ReminderDispatchSummaryPayload;
      recentAttempts: ReminderDispatchAttemptPayload[];
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type ReminderDeliveryReadinessResponse =
  | {
      ok: true;
      readiness: ReminderDeliveryReadinessPayload;
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type ReminderTestSendResponse =
  | {
      ok: true;
      readiness: ReminderDeliveryReadinessPayload;
      result: {
        status: ReminderDispatchStatus;
        errorCode: string | null;
        errorMessage: string | null;
        diagnosticCode: ReminderDeliveryReadinessCode | null;
        diagnosticMessage: string | null;
        diagnosticIsInference: boolean;
      };
      recentAttempts: ReminderDispatchAttemptPayload[];
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type ReminderBindingVerifyResponse =
  | {
      ok: true;
      readiness: ReminderDeliveryReadinessPayload;
      result: {
        status: "sent" | "skipped" | "failed";
        errorCode: string | null;
        errorMessage: string | null;
        diagnosticCode: ReminderDeliveryReadinessCode | null;
        diagnosticMessage: string | null;
        diagnosticIsInference: boolean;
      };
      workspace: WorkspaceSummaryPayload;
    }
  | PaymentApiError;

export type ScheduledDispatchRunSummaryPayload = {
  evaluationDate: string;
  workspacesSeen: number;
  workspacesEligible: number;
  candidatesSeen: number;
  attemptsCreated: number;
  duplicatesSkipped: number;
  sent: number;
  skipped: number;
  failed: number;
};

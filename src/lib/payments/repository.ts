import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPaymentsDashboard } from "@/lib/payments/dashboard";
import { resolveCurrentCycleForPayment } from "@/lib/payments/cycle";
import type {
  CreateRecurringPaymentInput,
  ReminderCandidatePayload,
  ReminderDispatchAttemptPayload,
  ReminderDispatchReason,
  ReminderDispatchStatus,
  ReminderDispatchTriggerSource,
  PaymentsDashboardPayload,
  RecurringPaymentCycleState,
  RecurringPaymentPayload,
  ReminderCandidateReason,
  RecurringPaymentScope,
  UpdateRecurringPaymentInput,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";

type RecurringPaymentRow = {
  id: string;
  workspace_id: string;
  title: string;
  amount: number | string;
  currency: string;
  category: string;
  cadence: "weekly" | "monthly";
  due_day: number;
  status: "active" | "archived";
  responsible_profile_id: string | null;
  is_required: boolean;
  is_subscription: boolean;
  is_paused: boolean;
  reminders_enabled: boolean;
  remind_days_before: 0 | 1 | 3;
  remind_on_due_day: boolean;
  remind_on_overdue: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RecurringPaymentCycleRow = {
  recurring_payment_id: string;
  cycle_key: string;
  due_date: string;
  payment_state: RecurringPaymentCycleState;
  paid_at: string | null;
  paid_by_profile_id: string | null;
};

type ReminderDispatchAttemptRow = {
  id: string;
  workspace_id: string;
  payment_id: string;
  reminder_reason: ReminderDispatchReason;
  cycle_due_date: string;
  evaluation_date: string;
  dispatch_status: ReminderDispatchStatus;
  trigger_source: ReminderDispatchTriggerSource;
  triggered_by_profile_id: string | null;
  recipient_telegram_user_id: string | null;
  message_preview: string | null;
  payload_snapshot: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

type PersonalWorkspaceDispatchTargetWorkspaceRow = {
  id: string;
  owner_profile_id: string;
};

type PersonalWorkspaceDispatchTargetProfileRow = {
  id: string;
  telegram_user_id: string | number | null;
};

type WorkspaceMemberRow = {
  profile_id: string;
  member_role: "owner" | "member";
};

type ProfileMemberRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
};

export type PersonalWorkspaceDispatchTarget = {
  workspaceId: string;
  profileId: string;
  profileTelegramUserId: string | number | null;
};

export type CreateReminderDispatchAttemptInput = {
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
};

export type CreateReminderDispatchAttemptResult =
  | {
      ok: true;
      created: true;
      attempt: ReminderDispatchAttemptPayload;
    }
  | {
      ok: true;
      created: false;
    }
  | {
      ok: false;
    };

export type SetCurrentCycleStateResult =
  | {
      ok: true;
      payment: RecurringPaymentPayload;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "PAYMENT_ARCHIVED" | "UNKNOWN";
    };

export type SetSubscriptionPausedStateResult =
  | {
      ok: true;
      payment: RecurringPaymentPayload;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "NOT_SUBSCRIPTION" | "PAYMENT_ARCHIVED" | "UNKNOWN";
    };

const reminderDispatchSelection =
  "id, workspace_id, payment_id, reminder_reason, cycle_due_date, evaluation_date, dispatch_status, trigger_source, triggered_by_profile_id, recipient_telegram_user_id, message_preview, payload_snapshot, error_code, error_message, created_at";

const toReminderDispatchAttemptPayload = (
  row: ReminderDispatchAttemptRow,
): ReminderDispatchAttemptPayload => {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    paymentId: row.payment_id,
    reminderReason: row.reminder_reason,
    cycleDueDate: row.cycle_due_date,
    evaluationDate: row.evaluation_date,
    dispatchStatus: row.dispatch_status,
    triggerSource: row.trigger_source,
    triggeredByProfileId: row.triggered_by_profile_id,
    recipientTelegramUserId: row.recipient_telegram_user_id,
    messagePreview: row.message_preview,
    payloadSnapshot: row.payload_snapshot,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
};

const toPaymentPayload = (
  row: RecurringPaymentRow,
  paymentScope: RecurringPaymentScope = "personal",
): RecurringPaymentPayload => {
  const cycle = resolveCurrentCycleForPayment({
    cadence: row.cadence,
    dueDay: row.due_day,
  });

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    paymentScope,
    responsibleProfileId: row.responsible_profile_id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    cadence: row.cadence,
    dueDay: row.due_day,
    status: row.status,
    isRequired: row.is_required,
    isSubscription: row.is_subscription,
    isPaused: row.is_paused,
    remindersEnabled: row.reminders_enabled,
    remindDaysBefore: row.remind_days_before,
    remindOnDueDay: row.remind_on_due_day,
    remindOnOverdue: row.remind_on_overdue,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentCycle: {
      cycleKey: cycle.cycleKey,
      dueDate: cycle.dueDate,
      state: "unpaid",
      paidAt: null,
      paidByProfileId: null,
    },
  };
};

const selection =
  "id, workspace_id, title, amount, currency, category, cadence, due_day, status, responsible_profile_id, is_required, is_subscription, is_paused, reminders_enabled, remind_days_before, remind_on_due_day, remind_on_overdue, notes, created_at, updated_at";
const cycleSelection =
  "recurring_payment_id, cycle_key, due_date, payment_state, paid_at, paid_by_profile_id";

const makeCycleMapKey = (paymentId: string, cycleKey: string): string =>
  `${paymentId}:${cycleKey}`;

const applyCurrentCycleRows = (
  payments: RecurringPaymentPayload[],
  rows: RecurringPaymentCycleRow[],
): RecurringPaymentPayload[] => {
  const cycleMap = new Map<string, RecurringPaymentCycleRow>();
  for (const row of rows) {
    cycleMap.set(makeCycleMapKey(row.recurring_payment_id, row.cycle_key), row);
  }

  return payments.map((payment) => {
    const row = cycleMap.get(
      makeCycleMapKey(payment.id, payment.currentCycle.cycleKey),
    );
    if (!row) {
      return payment;
    }

    return {
      ...payment,
      currentCycle: {
        cycleKey: row.cycle_key,
        dueDate: row.due_date,
        state: row.payment_state,
        paidAt: row.paid_at,
        paidByProfileId: row.paid_by_profile_id,
      },
    };
  });
};

const readCurrentCycleRows = async (
  paymentIds: string[],
  cycleKeys: string[],
): Promise<RecurringPaymentCycleRow[] | null> => {
  if (paymentIds.length === 0 || cycleKeys.length === 0) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("recurring_payment_cycles")
    .select(cycleSelection)
    .in("recurring_payment_id", paymentIds)
    .in("cycle_key", [...new Set(cycleKeys)])
    .returns<RecurringPaymentCycleRow[]>();

  if (error || !data) {
    return null;
  }

  return data;
};

const attachCurrentCycleState = async (
  payments: RecurringPaymentPayload[],
): Promise<RecurringPaymentPayload[] | null> => {
  if (payments.length === 0) {
    return [];
  }

  const rows = await readCurrentCycleRows(
    payments.map((payment) => payment.id),
    payments.map((payment) => payment.currentCycle.cycleKey),
  );
  if (!rows) {
    return payments;
  }

  return applyCurrentCycleRows(payments, rows);
};

const attachSingleCurrentCycleState = async (
  payment: RecurringPaymentPayload,
): Promise<RecurringPaymentPayload | null> => {
  const enriched = await attachCurrentCycleState([payment]);
  if (!enriched || enriched.length === 0) {
    return null;
  }

  return enriched[0];
};

export const listRecurringPaymentsByWorkspace = async (
  workspaceId: string,
  paymentScope: RecurringPaymentScope = "personal",
): Promise<RecurringPaymentPayload[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("recurring_payments")
    .select(selection)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .returns<RecurringPaymentRow[]>();

  if (error || !data) {
    return null;
  }

  const payments = data.map((row) => toPaymentPayload(row, paymentScope));
  return attachCurrentCycleState(payments);
};

export const createRecurringPaymentForWorkspace = async (
  workspaceId: string,
  input: CreateRecurringPaymentInput,
  paymentScope: RecurringPaymentScope = "personal",
): Promise<RecurringPaymentPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("recurring_payments")
    .insert({
      workspace_id: workspaceId,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      cadence: input.cadence,
      due_day: input.dueDay,
      status: "active",
      responsible_profile_id: input.responsibleProfileId,
      is_required: input.isRequired,
      is_subscription: input.isSubscription,
      is_paused: false,
      reminders_enabled: input.remindersEnabled,
      remind_days_before: input.remindDaysBefore,
      remind_on_due_day: input.remindOnDueDay,
      remind_on_overdue: input.remindOnOverdue,
      notes: input.notes,
      updated_at: now,
    })
    .select(selection)
    .single<RecurringPaymentRow>();

  if (error || !data) {
    return null;
  }

  return attachSingleCurrentCycleState(toPaymentPayload(data, paymentScope));
};

export const updateRecurringPaymentForWorkspace = async (
  workspaceId: string,
  paymentId: string,
  input: UpdateRecurringPaymentInput,
  paymentScope: RecurringPaymentScope = "personal",
): Promise<RecurringPaymentPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("recurring_payments")
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.cadence !== undefined ? { cadence: input.cadence } : {}),
      ...(input.dueDay !== undefined ? { due_day: input.dueDay } : {}),
      ...(input.responsibleProfileId !== undefined
        ? { responsible_profile_id: input.responsibleProfileId }
        : {}),
      ...(input.isRequired !== undefined
        ? { is_required: input.isRequired }
        : {}),
      ...(input.isSubscription !== undefined
        ? { is_subscription: input.isSubscription }
        : {}),
      ...(input.remindersEnabled !== undefined
        ? { reminders_enabled: input.remindersEnabled }
        : {}),
      ...(input.remindDaysBefore !== undefined
        ? { remind_days_before: input.remindDaysBefore }
        : {}),
      ...(input.remindOnDueDay !== undefined
        ? { remind_on_due_day: input.remindOnDueDay }
        : {}),
      ...(input.remindOnOverdue !== undefined
        ? { remind_on_overdue: input.remindOnOverdue }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .select(selection)
    .maybeSingle<RecurringPaymentRow>();

  if (error || !data) {
    return null;
  }

  return attachSingleCurrentCycleState(toPaymentPayload(data, paymentScope));
};

export const archiveRecurringPaymentForWorkspace = async (
  workspaceId: string,
  paymentId: string,
): Promise<RecurringPaymentPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("recurring_payments")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .select(selection)
    .maybeSingle<RecurringPaymentRow>();

  if (error || !data) {
    return null;
  }

  return attachSingleCurrentCycleState(toPaymentPayload(data));
};

const getRecurringPaymentByWorkspaceAndId = async (
  workspaceId: string,
  paymentId: string,
  paymentScope: RecurringPaymentScope = "personal",
): Promise<RecurringPaymentPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("recurring_payments")
    .select(selection)
    .eq("id", paymentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<RecurringPaymentRow>();

  if (error || !data) {
    return null;
  }

  return attachSingleCurrentCycleState(toPaymentPayload(data, paymentScope));
};

export const setCurrentCycleStateForPayment = async (
  workspaceId: string,
  paymentId: string,
  nextState: RecurringPaymentCycleState,
  paymentScope: RecurringPaymentScope = "personal",
  paidByProfileId: string | null = null,
): Promise<SetCurrentCycleStateResult> => {
  const payment = await getRecurringPaymentByWorkspaceAndId(
    workspaceId,
    paymentId,
    paymentScope,
  );
  if (!payment) {
    return {
      ok: false,
      reason: "NOT_FOUND",
    };
  }

  if (payment.status === "archived") {
    return {
      ok: false,
      reason: "PAYMENT_ARCHIVED",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "UNKNOWN",
    };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("recurring_payment_cycles").upsert(
    {
      recurring_payment_id: payment.id,
      cycle_key: payment.currentCycle.cycleKey,
      due_date: payment.currentCycle.dueDate,
      payment_state: nextState,
      paid_at: nextState === "paid" ? now : null,
      paid_by_profile_id: nextState === "paid" ? paidByProfileId : null,
      updated_at: now,
    },
    {
      onConflict: "recurring_payment_id,cycle_key",
    },
  );
  if (error) {
    return {
      ok: false,
      reason: "UNKNOWN",
    };
  }

  const refreshed = await getRecurringPaymentByWorkspaceAndId(
    workspaceId,
    paymentId,
    paymentScope,
  );
  if (!refreshed) {
    return {
      ok: false,
      reason: "UNKNOWN",
    };
  }

  return {
    ok: true,
    payment: refreshed,
  };
};

export const setSubscriptionPausedStateForPayment = async (
  workspaceId: string,
  paymentId: string,
  nextPausedState: boolean,
): Promise<SetSubscriptionPausedStateResult> => {
  const payment = await getRecurringPaymentByWorkspaceAndId(workspaceId, paymentId);
  if (!payment) {
    return {
      ok: false,
      reason: "NOT_FOUND",
    };
  }

  if (payment.status === "archived") {
    return {
      ok: false,
      reason: "PAYMENT_ARCHIVED",
    };
  }

  if (!payment.isSubscription) {
    return {
      ok: false,
      reason: "NOT_SUBSCRIPTION",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "UNKNOWN",
    };
  }

  const { data, error } = await supabase
    .from("recurring_payments")
    .update({
      is_paused: nextPausedState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .select(selection)
    .maybeSingle<RecurringPaymentRow>();

  if (error || !data) {
    return {
      ok: false,
      reason: "UNKNOWN",
    };
  }

  const refreshed = await attachSingleCurrentCycleState(toPaymentPayload(data));
  if (!refreshed) {
    return {
      ok: false,
      reason: "UNKNOWN",
    };
  }

  return {
    ok: true,
    payment: refreshed,
  };
};

export const readPaymentsDashboardByWorkspace = async (
  workspaceId: string,
  paymentScope: RecurringPaymentScope = "personal",
): Promise<PaymentsDashboardPayload | null> => {
  const payments = await listRecurringPaymentsByWorkspace(workspaceId, paymentScope);
  if (!payments) {
    return null;
  }

  return buildPaymentsDashboard(payments);
};

const toDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + days);
  return base;
};

const pushUniqueCandidate = (
  candidatesMap: Map<string, ReminderCandidatePayload>,
  candidate: ReminderCandidatePayload,
) => {
  const key = `${candidate.paymentId}:${candidate.reason}`;
  if (!candidatesMap.has(key)) {
    candidatesMap.set(key, candidate);
  }
};

const makeCandidate = (
  payment: RecurringPaymentPayload,
  reason: ReminderCandidateReason,
): ReminderCandidatePayload => {
  return {
    paymentId: payment.id,
    title: payment.title,
    dueDate: payment.currentCycle.dueDate,
    reason,
    remindDaysBefore: payment.remindDaysBefore,
  };
};

export const readReminderCandidatesByWorkspace = async (
  workspaceId: string,
  now: Date = new Date(),
): Promise<ReminderCandidatePayload[] | null> => {
  const payments = await listRecurringPaymentsByWorkspace(workspaceId);
  if (!payments) {
    return null;
  }

  const todayKey = toDateOnly(now);
  const candidatesMap = new Map<string, ReminderCandidatePayload>();

  for (const payment of payments) {
    if (payment.status !== "active") {
      continue;
    }

    if (payment.isSubscription && payment.isPaused) {
      continue;
    }

    if (payment.currentCycle.state !== "unpaid") {
      continue;
    }

    if (!payment.remindersEnabled) {
      continue;
    }

    const dueDate = payment.currentCycle.dueDate;

    if (payment.remindOnDueDay && dueDate === todayKey) {
      pushUniqueCandidate(candidatesMap, makeCandidate(payment, "due_today"));
    }

    if (
      payment.remindDaysBefore > 0 &&
      dueDate === toDateOnly(addDays(now, payment.remindDaysBefore))
    ) {
      pushUniqueCandidate(candidatesMap, makeCandidate(payment, "advance"));
    }

    if (payment.remindOnOverdue && dueDate < todayKey) {
      pushUniqueCandidate(candidatesMap, makeCandidate(payment, "overdue"));
    }
  }

  return Array.from(candidatesMap.values()).sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }

    return a.title.localeCompare(b.title);
  });
};

export const createReminderDispatchAttempt = async (
  input: CreateReminderDispatchAttemptInput,
): Promise<CreateReminderDispatchAttemptResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false };
  }

  const { data, error } = await supabase
    .from("reminder_dispatch_attempts")
    .insert({
      workspace_id: input.workspaceId,
      payment_id: input.paymentId,
      reminder_reason: input.reminderReason,
      cycle_due_date: input.cycleDueDate,
      evaluation_date: input.evaluationDate,
      dispatch_status: input.dispatchStatus,
      trigger_source: input.triggerSource,
      triggered_by_profile_id: input.triggeredByProfileId,
      recipient_telegram_user_id: input.recipientTelegramUserId,
      message_preview: input.messagePreview,
      payload_snapshot: input.payloadSnapshot,
      error_code: input.errorCode,
      error_message: input.errorMessage,
    })
    .select(reminderDispatchSelection)
    .single<ReminderDispatchAttemptRow>();

  if (error?.code === "23505") {
    return {
      ok: true,
      created: false,
    };
  }

  if (error || !data) {
    return { ok: false };
  }

  return {
    ok: true,
    created: true,
    attempt: toReminderDispatchAttemptPayload(data),
  };
};

export const hasReminderDispatchAttempt = async (
  workspaceId: string,
  paymentId: string,
  reminderReason: ReminderDispatchReason,
  cycleDueDate: string,
  evaluationDate: string,
): Promise<boolean | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("reminder_dispatch_attempts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("payment_id", paymentId)
    .eq("reminder_reason", reminderReason)
    .eq("cycle_due_date", cycleDueDate)
    .eq("evaluation_date", evaluationDate)
    .maybeSingle<{ id: string }>();

  if (error) {
    return null;
  }

  return Boolean(data?.id);
};

export const readRecentReminderDispatchAttemptsByWorkspace = async (
  workspaceId: string,
  limit: number = 10,
): Promise<ReminderDispatchAttemptPayload[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("reminder_dispatch_attempts")
    .select(reminderDispatchSelection)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ReminderDispatchAttemptRow[]>();

  if (error || !data) {
    return null;
  }

  return data.map(toReminderDispatchAttemptPayload);
};

export const listPersonalWorkspaceDispatchTargets = async (): Promise<
  PersonalWorkspaceDispatchTarget[] | null
> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: workspaces, error: workspacesError } = await supabase
    .from("workspaces")
    .select("id, owner_profile_id")
    .eq("kind", "personal")
    .returns<PersonalWorkspaceDispatchTargetWorkspaceRow[]>();

  if (workspacesError || !workspaces) {
    return null;
  }

  if (workspaces.length === 0) {
    return [];
  }

  const ownerProfileIds = [...new Set(workspaces.map((workspace) => workspace.owner_profile_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, telegram_user_id")
    .in("id", ownerProfileIds)
    .returns<PersonalWorkspaceDispatchTargetProfileRow[]>();

  if (profilesError || !profiles) {
    return null;
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile.telegram_user_id ?? null]),
  );

  return workspaces.map((workspace) => ({
    workspaceId: workspace.id,
    profileId: workspace.owner_profile_id,
    profileTelegramUserId: profileMap.get(workspace.owner_profile_id) ?? null,
  }));
};

const toWorkspaceMemberDisplayName = (
  profile: Pick<ProfileMemberRow, "first_name" | "last_name" | "username" | "id">,
): string => {
  const fullName = [profile.first_name, profile.last_name ?? ""].join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (profile.username) {
    return `@${profile.username}`;
  }

  return profile.id.slice(0, 8);
};

export const listWorkspaceResponsiblePayerOptions = async (
  workspaceId: string,
): Promise<WorkspaceResponsiblePayerOptionPayload[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("profile_id, member_role")
    .eq("workspace_id", workspaceId)
    .returns<WorkspaceMemberRow[]>();

  if (membersError || !members) {
    return null;
  }

  if (members.length === 0) {
    return [];
  }

  const profileIds = [...new Set(members.map((member) => member.profile_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username")
    .in("id", profileIds)
    .returns<ProfileMemberRow[]>();

  if (profilesError || !profiles) {
    return null;
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return members
    .map((member) => {
      const profile = profileMap.get(member.profile_id);
      if (!profile) {
        return null;
      }

      return {
        profileId: member.profile_id,
        memberRole: member.member_role,
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
        displayName: toWorkspaceMemberDisplayName(profile),
      } satisfies WorkspaceResponsiblePayerOptionPayload;
    })
    .filter(
      (option): option is WorkspaceResponsiblePayerOptionPayload => option !== null,
    )
    .sort((a, b) => {
      if (a.memberRole !== b.memberRole) {
        return a.memberRole === "owner" ? -1 : 1;
      }

      return a.displayName.localeCompare(b.displayName);
    });
};

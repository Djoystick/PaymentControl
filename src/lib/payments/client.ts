"use client";

import type {
  PaymentsDashboardResponse,
  PaymentMutateResponse,
  ReminderBindingVerifyResponse,
  ReminderDeliveryReadinessResponse,
  ReminderDispatchResponse,
  ReminderTestSendResponse,
  ReminderCandidatesResponse,
  PaymentsListResponse,
  RecurringPaymentPayload,
} from "@/lib/payments/types";

type JsonRecord = Record<string, unknown>;
export const PAYMENTS_CHANGED_EVENT = "payments-changed";

const requestJson = async <T>(
  url: string,
  method: "POST" | "PATCH",
  body: JsonRecord,
): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
};

export const listRecurringPayments = async (
  initData: string,
): Promise<PaymentsListResponse> => {
  return requestJson<PaymentsListResponse>("/api/payments/recurring/list", "POST", {
    initData,
  });
};

export const readPaymentsDashboard = async (
  initData: string,
): Promise<PaymentsDashboardResponse> => {
  return requestJson<PaymentsDashboardResponse>("/api/payments/dashboard", "POST", {
    initData,
  });
};

export const readReminderCandidates = async (
  initData: string,
): Promise<ReminderCandidatesResponse> => {
  return requestJson<ReminderCandidatesResponse>(
    "/api/payments/reminders/candidates",
    "POST",
    {
      initData,
    },
  );
};

export const dispatchReminderCandidates = async (
  initData: string,
): Promise<ReminderDispatchResponse> => {
  return requestJson<ReminderDispatchResponse>(
    "/api/payments/reminders/dispatch",
    "POST",
    {
      initData,
    },
  );
};

export const readReminderDeliveryReadiness = async (
  initData: string,
): Promise<ReminderDeliveryReadinessResponse> => {
  return requestJson<ReminderDeliveryReadinessResponse>(
    "/api/payments/reminders/readiness",
    "POST",
    {
      initData,
    },
  );
};

export const runReminderTestSend = async (
  initData: string,
): Promise<ReminderTestSendResponse> => {
  return requestJson<ReminderTestSendResponse>(
    "/api/payments/reminders/test-send",
    "POST",
    {
      initData,
    },
  );
};

export const verifyReminderRecipientBinding = async (
  initData: string,
  recipientChatId?: string,
): Promise<ReminderBindingVerifyResponse> => {
  return requestJson<ReminderBindingVerifyResponse>(
    "/api/payments/reminders/binding/verify",
    "POST",
    {
      initData,
      ...(recipientChatId ? { recipientChatId } : {}),
    },
  );
};

export type CreatePaymentRequest = {
  initData: string;
  responsibleProfileId: string | null;
  title: string;
  amount: number;
  currency: string;
  category: string;
  cadence: "weekly" | "monthly";
  dueDay: number;
  isRequired: boolean;
  isSubscription: boolean;
  remindersEnabled: boolean;
  remindDaysBefore: 0 | 1 | 3;
  remindOnDueDay: boolean;
  remindOnOverdue: boolean;
  notes: string | null;
};

export const createRecurringPayment = async (
  payload: CreatePaymentRequest,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>("/api/payments/recurring", "POST", payload);
};

export type UpdatePaymentRequest = {
  initData: string;
  paymentId: string;
  responsibleProfileId: string | null;
  title: string;
  amount: number;
  currency: string;
  category: string;
  cadence: "weekly" | "monthly";
  dueDay: number;
  isRequired: boolean;
  isSubscription: boolean;
  remindersEnabled: boolean;
  remindDaysBefore: 0 | 1 | 3;
  remindOnDueDay: boolean;
  remindOnOverdue: boolean;
  notes: string | null;
};

export const updateRecurringPayment = async (
  payload: UpdatePaymentRequest,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>(
    `/api/payments/recurring/${payload.paymentId}`,
    "PATCH",
    payload,
  );
};

export const archiveRecurringPayment = async (
  initData: string,
  paymentId: string,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>(
    `/api/payments/recurring/${paymentId}/archive`,
    "POST",
    { initData },
  );
};

export const markCurrentCyclePaid = async (
  initData: string,
  paymentId: string,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>(
    `/api/payments/recurring/${paymentId}/cycle/paid`,
    "POST",
    { initData },
  );
};

export const markCurrentCycleUnpaid = async (
  initData: string,
  paymentId: string,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>(
    `/api/payments/recurring/${paymentId}/cycle/unpaid`,
    "POST",
    { initData },
  );
};

export const pauseSubscriptionPayment = async (
  initData: string,
  paymentId: string,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>(
    `/api/payments/recurring/${paymentId}/pause`,
    "POST",
    { initData },
  );
};

export const resumeSubscriptionPayment = async (
  initData: string,
  paymentId: string,
): Promise<PaymentMutateResponse> => {
  return requestJson<PaymentMutateResponse>(
    `/api/payments/recurring/${paymentId}/resume`,
    "POST",
    { initData },
  );
};

export const replacePaymentInList = (
  payments: RecurringPaymentPayload[],
  payment: RecurringPaymentPayload,
): RecurringPaymentPayload[] => {
  const existingIndex = payments.findIndex((item) => item.id === payment.id);
  if (existingIndex === -1) {
    return [payment, ...payments];
  }

  const clone = [...payments];
  clone[existingIndex] = payment;
  return clone;
};

export const emitPaymentsChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
  }
};

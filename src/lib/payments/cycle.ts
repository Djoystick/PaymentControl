import type { RecurringPaymentCadence, RecurringPaymentPayload } from "@/lib/payments/types";

export type CurrentPaymentCycleSnapshot = {
  cycleKey: string;
  dueDate: string;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toUtcDateOnly = (date: Date): string => {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const getIsoWeekInfo = (date: Date): { isoYear: number; isoWeek: number } => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return { isoYear, isoWeek };
};

const getCurrentWeekdayDate = (date: Date, weekday: number): Date => {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const currentWeekday = current.getUTCDay() || 7;
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - (currentWeekday - 1));
  const due = new Date(monday);
  due.setUTCDate(monday.getUTCDate() + (weekday - 1));
  return due;
};

const resolveMonthlyCycle = (dueDay: number, now: Date): CurrentPaymentCycleSnapshot => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(dueDay, 1), daysInMonth);

  return {
    cycleKey: `monthly:${year}-${pad2(month)}`,
    dueDate: `${year}-${pad2(month)}-${pad2(day)}`,
  };
};

const resolveWeeklyCycle = (dueDay: number, now: Date): CurrentPaymentCycleSnapshot => {
  const normalizedDueDay = Math.min(Math.max(dueDay, 1), 7);
  const dueDate = getCurrentWeekdayDate(now, normalizedDueDay);
  const { isoYear, isoWeek } = getIsoWeekInfo(now);

  return {
    cycleKey: `weekly:${isoYear}-W${pad2(isoWeek)}`,
    dueDate: toUtcDateOnly(dueDate),
  };
};

export const resolveCurrentCycle = (
  cadence: RecurringPaymentCadence,
  dueDay: number,
  now: Date = new Date(),
): CurrentPaymentCycleSnapshot => {
  if (cadence === "weekly") {
    return resolveWeeklyCycle(dueDay, now);
  }

  return resolveMonthlyCycle(dueDay, now);
};

export const resolveCurrentCycleForPayment = (
  payment: Pick<RecurringPaymentPayload, "cadence" | "dueDay">,
  now?: Date,
): CurrentPaymentCycleSnapshot => {
  return resolveCurrentCycle(payment.cadence, payment.dueDay, now);
};


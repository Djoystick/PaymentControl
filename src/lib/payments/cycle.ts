import type { RecurringPaymentCadence, RecurringPaymentPayload } from "@/lib/payments/types";

export type CurrentPaymentCycleSnapshot = {
  cycleKey: string;
  dueDate: string;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toUtcDateOnly = (date: Date): string => {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const parseUtcDateOnly = (value: string): Date | null => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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

const resolveMonthlyCycleByYearMonth = (
  dueDay: number,
  year: number,
  month: number,
): CurrentPaymentCycleSnapshot => {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(dueDay, 1), daysInMonth);

  return {
    cycleKey: `monthly:${year}-${pad2(month)}`,
    dueDate: `${year}-${pad2(month)}-${pad2(day)}`,
  };
};

const resolveMonthlyCycle = (dueDay: number, now: Date): CurrentPaymentCycleSnapshot => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return resolveMonthlyCycleByYearMonth(dueDay, year, month);
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
  payment: Pick<RecurringPaymentPayload, "cadence" | "dueDay"> & {
    createdAt?: string;
  },
  now?: Date,
): CurrentPaymentCycleSnapshot => {
  const evaluationDate = now ?? new Date();
  const currentCycle = resolveCurrentCycle(payment.cadence, payment.dueDay, evaluationDate);
  if (!payment.createdAt) {
    return currentCycle;
  }

  const createdAt = new Date(payment.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return currentCycle;
  }

  const createdDateKey = toUtcDateOnly(createdAt);
  if (payment.cadence === "monthly") {
    const createdInCurrentMonth =
      createdAt.getUTCFullYear() === evaluationDate.getUTCFullYear() &&
      createdAt.getUTCMonth() === evaluationDate.getUTCMonth();
    if (createdInCurrentMonth && currentCycle.dueDate < createdDateKey) {
      const nextMonthDate = new Date(
        Date.UTC(
          evaluationDate.getUTCFullYear(),
          evaluationDate.getUTCMonth() + 1,
          1,
        ),
      );
      return resolveMonthlyCycle(payment.dueDay, nextMonthDate);
    }

    return currentCycle;
  }

  const createdWeekCycle = resolveWeeklyCycle(payment.dueDay, createdAt);
  if (
    createdWeekCycle.cycleKey === currentCycle.cycleKey &&
    currentCycle.dueDate < createdDateKey
  ) {
    const nextWeekDate = new Date(
      Date.UTC(
        evaluationDate.getUTCFullYear(),
        evaluationDate.getUTCMonth(),
        evaluationDate.getUTCDate() + 7,
      ),
    );
    return resolveWeeklyCycle(payment.dueDay, nextWeekDate);
  }

  return currentCycle;
};

export const resolveNextCycleDueDate = (
  cadence: RecurringPaymentCadence,
  dueDay: number,
  currentCycleDueDate: string,
): string => {
  const currentDueDate = parseUtcDateOnly(currentCycleDueDate);
  if (!currentDueDate) {
    return currentCycleDueDate;
  }

  if (cadence === "weekly") {
    const nextDueDate = new Date(currentDueDate);
    nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 7);
    return toUtcDateOnly(nextDueDate);
  }

  let nextMonth = currentDueDate.getUTCMonth() + 2;
  let nextYear = currentDueDate.getUTCFullYear();
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return resolveMonthlyCycleByYearMonth(dueDay, nextYear, nextMonth).dueDate;
};

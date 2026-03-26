import type {
  DashboardPaymentItemPayload,
  PaymentsDashboardPayload,
  RecurringPaymentPayload,
} from "@/lib/payments/types";

export const DASHBOARD_UPCOMING_WINDOW_DAYS = 7;

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

const toDashboardItem = (
  payment: RecurringPaymentPayload,
): DashboardPaymentItemPayload => {
  return {
    id: payment.id,
    title: payment.title,
    amount: payment.amount,
    currency: payment.currency,
    category: payment.category,
    dueDate: payment.currentCycle.dueDate,
    cycleState: payment.currentCycle.state,
  };
};

const sortByDueDateThenTitle = (
  a: DashboardPaymentItemPayload,
  b: DashboardPaymentItemPayload,
): number => {
  if (a.dueDate !== b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }

  return a.title.localeCompare(b.title);
};

export const buildPaymentsDashboard = (
  payments: RecurringPaymentPayload[],
  now: Date = new Date(),
): PaymentsDashboardPayload => {
  const todayKey = toUtcDateKey(now);
  const upcomingEndKey = toUtcDateKey(
    addUtcDays(now, DASHBOARD_UPCOMING_WINDOW_DAYS),
  );
  const active = payments.filter((payment) => payment.status === "active");

  const dueToday: DashboardPaymentItemPayload[] = [];
  const upcoming: DashboardPaymentItemPayload[] = [];
  const overdue: DashboardPaymentItemPayload[] = [];

  let paidThisCycleCount = 0;
  let unpaidThisCycleCount = 0;
  let paidByMismatchCount = 0;

  for (const payment of active) {
    if (payment.currentCycle.state === "paid") {
      paidThisCycleCount += 1;
      if (
        payment.paymentScope === "shared" &&
        payment.responsibleProfileId &&
        payment.currentCycle.paidByProfileId &&
        payment.responsibleProfileId !== payment.currentCycle.paidByProfileId
      ) {
        paidByMismatchCount += 1;
      }
    } else {
      unpaidThisCycleCount += 1;

      const dueDate = payment.currentCycle.dueDate;
      const item = toDashboardItem(payment);

      if (dueDate < todayKey) {
        overdue.push(item);
      } else if (dueDate === todayKey) {
        dueToday.push(item);
      } else if (dueDate <= upcomingEndKey) {
        upcoming.push(item);
      }
    }
  }

  dueToday.sort(sortByDueDateThenTitle);
  upcoming.sort(sortByDueDateThenTitle);
  overdue.sort(sortByDueDateThenTitle);

  return {
    summary: {
      dueTodayCount: dueToday.length,
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      paidThisCycleCount,
      unpaidThisCycleCount,
      paidByMismatchCount,
      upcomingWindowDays: DASHBOARD_UPCOMING_WINDOW_DAYS,
    },
    dueToday,
    upcoming,
    overdue,
  };
};

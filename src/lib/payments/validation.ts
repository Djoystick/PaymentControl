import type {
  CreateRecurringPaymentInput,
  RemindDaysBefore,
  RecurringPaymentCadence,
  UpdateRecurringPaymentInput,
} from "@/lib/payments/types";

export type PaymentValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

const normalizeCadence = (value: unknown): RecurringPaymentCadence | null => {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return null;
};

const parseAmount = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
};

const parseDueDayStrict = (
  value: unknown,
  cadence: RecurringPaymentCadence,
): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (cadence === "weekly") {
    return parsed >= 1 && parsed <= 7 ? parsed : null;
  }

  return parsed >= 1 && parsed <= 31 ? parsed : null;
};

const parseDueDayLoose = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    return null;
  }

  return parsed;
};

const parseCurrency = (value: unknown): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const parseTitle = (value: unknown): string | null => {
  const title = String(value ?? "").trim();
  if (!title) {
    return null;
  }

  return title.slice(0, 120);
};

const parseCategory = (value: unknown): string | null => {
  const category = String(value ?? "").trim();
  if (!category) {
    return null;
  }

  return category.slice(0, 60);
};

const parseNotes = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const notes = String(value).trim();
  if (!notes) {
    return null;
  }

  return notes.slice(0, 500);
};

const parseIsRequired = (value: unknown): boolean => {
  return Boolean(value);
};

const parseIsSubscription = (value: unknown): boolean => {
  return Boolean(value);
};

const parseRemindersEnabled = (value: unknown): boolean => {
  return Boolean(value);
};

const parseRemindDaysBefore = (value: unknown): RemindDaysBefore | null => {
  const parsed = Number(value);
  if (parsed === 0 || parsed === 1 || parsed === 3) {
    return parsed;
  }

  return null;
};

const parseReminderToggle = (value: unknown): boolean => {
  return Boolean(value);
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseResponsibleProfileId = (
  value: unknown,
): string | null | "INVALID" => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  if (!UUID_PATTERN.test(normalized)) {
    return "INVALID";
  }

  return normalized;
};

export const validateCreateRecurringPaymentInput = (
  raw: Record<string, unknown>,
): PaymentValidationResult<CreateRecurringPaymentInput> => {
  const title = parseTitle(raw.title);
  if (!title) {
    return { ok: false, message: "Title is required." };
  }

  const amount = parseAmount(raw.amount);
  if (amount === null) {
    return { ok: false, message: "Amount must be a positive number." };
  }

  const category = parseCategory(raw.category);
  if (!category) {
    return { ok: false, message: "Category is required." };
  }

  const cadence = normalizeCadence(raw.cadence);
  if (!cadence) {
    return { ok: false, message: "Cadence must be weekly or monthly." };
  }

  const dueDay = parseDueDayStrict(raw.dueDay, cadence);
  if (dueDay === null) {
    return {
      ok: false,
      message:
        cadence === "weekly"
          ? "Due day for weekly cadence must be between 1 and 7."
          : "Due day for monthly cadence must be between 1 and 31.",
    };
  }

  const currency = parseCurrency(raw.currency ?? "USD");
  if (!currency) {
    return { ok: false, message: "Currency must be a 3-letter code." };
  }

  const remindDaysBefore = parseRemindDaysBefore(raw.remindDaysBefore ?? 1);
  if (remindDaysBefore === null) {
    return { ok: false, message: "Remind days before must be 0, 1, or 3." };
  }

  const responsibleProfileId = parseResponsibleProfileId(raw.responsibleProfileId);
  if (responsibleProfileId === "INVALID") {
    return { ok: false, message: "Responsible payer id is invalid." };
  }

  return {
    ok: true,
    data: {
      responsibleProfileId,
      title,
      amount,
      currency,
      category,
      cadence,
      dueDay,
      isRequired: parseIsRequired(raw.isRequired ?? true),
      isSubscription: parseIsSubscription(raw.isSubscription ?? false),
      remindersEnabled: parseRemindersEnabled(raw.remindersEnabled ?? true),
      remindDaysBefore,
      remindOnDueDay: parseReminderToggle(raw.remindOnDueDay ?? true),
      remindOnOverdue: parseReminderToggle(raw.remindOnOverdue ?? true),
      notes: parseNotes(raw.notes),
    },
  };
};

export const validateUpdateRecurringPaymentInput = (
  raw: Record<string, unknown>,
): PaymentValidationResult<UpdateRecurringPaymentInput> => {
  const result: UpdateRecurringPaymentInput = {};

  if ("title" in raw) {
    const title = parseTitle(raw.title);
    if (!title) {
      return { ok: false, message: "Title cannot be empty." };
    }

    result.title = title;
  }

  if ("amount" in raw) {
    const amount = parseAmount(raw.amount);
    if (amount === null) {
      return { ok: false, message: "Amount must be a positive number." };
    }

    result.amount = amount;
  }

  if ("category" in raw) {
    const category = parseCategory(raw.category);
    if (!category) {
      return { ok: false, message: "Category cannot be empty." };
    }

    result.category = category;
  }

  if ("currency" in raw) {
    const currency = parseCurrency(raw.currency);
    if (!currency) {
      return { ok: false, message: "Currency must be a 3-letter code." };
    }

    result.currency = currency;
  }

  const cadence = "cadence" in raw ? normalizeCadence(raw.cadence) : undefined;
  if ("cadence" in raw && !cadence) {
    return { ok: false, message: "Cadence must be weekly or monthly." };
  }

  if (cadence) {
    result.cadence = cadence;
  }

  if ("dueDay" in raw || cadence) {
    const dueDayRaw = raw.dueDay;
    const parsedDueDay = cadence
      ? parseDueDayStrict(dueDayRaw, cadence)
      : parseDueDayLoose(dueDayRaw);
    if (parsedDueDay === null) {
      return {
        ok: false,
        message:
          cadence === "weekly"
            ? "Due day for weekly cadence must be between 1 and 7."
            : "Due day for monthly cadence must be between 1 and 31.",
      };
    }

    result.dueDay = parsedDueDay;
  }

  if ("isRequired" in raw) {
    result.isRequired = parseIsRequired(raw.isRequired);
  }

  if ("isSubscription" in raw) {
    result.isSubscription = parseIsSubscription(raw.isSubscription);
  }

  if ("remindersEnabled" in raw) {
    result.remindersEnabled = parseRemindersEnabled(raw.remindersEnabled);
  }

  if ("remindDaysBefore" in raw) {
    const remindDaysBefore = parseRemindDaysBefore(raw.remindDaysBefore);
    if (remindDaysBefore === null) {
      return { ok: false, message: "Remind days before must be 0, 1, or 3." };
    }

    result.remindDaysBefore = remindDaysBefore;
  }

  if ("remindOnDueDay" in raw) {
    result.remindOnDueDay = parseReminderToggle(raw.remindOnDueDay);
  }

  if ("remindOnOverdue" in raw) {
    result.remindOnOverdue = parseReminderToggle(raw.remindOnOverdue);
  }

  if ("notes" in raw) {
    result.notes = parseNotes(raw.notes);
  }

  if ("responsibleProfileId" in raw) {
    const responsibleProfileId = parseResponsibleProfileId(raw.responsibleProfileId);
    if (responsibleProfileId === "INVALID") {
      return { ok: false, message: "Responsible payer id is invalid." };
    }

    result.responsibleProfileId = responsibleProfileId;
  }

  if (Object.keys(result).length === 0) {
    return { ok: false, message: "No fields provided for update." };
  }

  return { ok: true, data: result };
};

export type NormalizeTravelExpenseAmountInput = {
  sourceAmount: number;
  sourceCurrency: string;
  tripCurrency: string;
  conversionRate: number | null;
};

export type NormalizedTravelExpenseAmount = {
  sourceAmount: number;
  sourceCurrency: string;
  tripAmount: number;
  tripCurrency: string;
  conversionRate: number;
  converted: boolean;
};

const currencyCodePattern = /^[A-Z]{3}$/;

const roundMoney = (value: number): number => {
  return Number(value.toFixed(2));
};

const roundRate = (value: number): number => {
  return Number(value.toFixed(6));
};

export const normalizeTravelExpenseAmount = (
  input: NormalizeTravelExpenseAmountInput,
):
  | { ok: true; data: NormalizedTravelExpenseAmount }
  | { ok: false; message: string } => {
  if (!Number.isFinite(input.sourceAmount) || input.sourceAmount <= 0) {
    return {
      ok: false,
      message: "Expense amount must be a positive number.",
    };
  }

  const sourceCurrency = input.sourceCurrency.trim().toUpperCase();
  if (!currencyCodePattern.test(sourceCurrency)) {
    return {
      ok: false,
      message: "Expense currency must be a 3-letter code.",
    };
  }

  const tripCurrency = input.tripCurrency.trim().toUpperCase();
  if (!currencyCodePattern.test(tripCurrency)) {
    return {
      ok: false,
      message: "Trip base currency must be a 3-letter code.",
    };
  }

  const sourceAmount = roundMoney(input.sourceAmount);
  if (sourceAmount <= 0) {
    return {
      ok: false,
      message: "Expense amount must be a positive number.",
    };
  }

  if (sourceCurrency === tripCurrency) {
    return {
      ok: true,
      data: {
        sourceAmount,
        sourceCurrency,
        tripAmount: sourceAmount,
        tripCurrency,
        conversionRate: 1,
        converted: false,
      },
    };
  }

  if (input.conversionRate === null || input.conversionRate === undefined) {
    return {
      ok: false,
      message: "Conversion rate is required when expense currency differs from trip currency.",
    };
  }

  if (!Number.isFinite(input.conversionRate) || input.conversionRate <= 0) {
    return {
      ok: false,
      message: "Conversion rate must be a positive number.",
    };
  }

  const conversionRate = roundRate(input.conversionRate);
  if (conversionRate <= 0) {
    return {
      ok: false,
      message: "Conversion rate must be a positive number.",
    };
  }

  const tripAmount = roundMoney(sourceAmount * conversionRate);
  if (!Number.isFinite(tripAmount) || tripAmount <= 0) {
    return {
      ok: false,
      message: "Converted amount in trip currency must stay positive.",
    };
  }

  return {
    ok: true,
    data: {
      sourceAmount,
      sourceCurrency,
      tripAmount,
      tripCurrency,
      conversionRate,
      converted: true,
    },
  };
};


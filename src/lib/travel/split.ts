import type {
  TravelMemberBalancePayload,
  TravelSettlementTransferPayload,
  TravelSplitMode,
} from "@/lib/travel/types";

export type TravelSplitEngineMember = {
  id: string;
  displayName: string;
};

export type TravelSplitEngineManualInput = {
  memberId: string;
  amount: number;
};

export type TravelSplitEngineRequest = {
  totalAmount: number;
  splitMode: TravelSplitMode;
  members: TravelSplitEngineMember[];
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: TravelSplitEngineManualInput[];
};

export type TravelResolvedSplit = {
  memberId: string;
  shareAmount: number;
};

export type TravelSplitEngineResult =
  | {
      ok: true;
      splits: TravelResolvedSplit[];
    }
  | {
      ok: false;
      message: string;
    };

export type TravelBalanceInputExpense = {
  id: string;
  amount: number;
  paidByMemberId: string;
  splits: Array<{
    memberId: string;
    shareAmount: number;
  }>;
};

export type TravelCalculatedTripSummary = {
  totalExpensesCount: number;
  totalSpent: number;
  balances: TravelMemberBalancePayload[];
  settlements: TravelSettlementTransferPayload[];
  settlementPlanStats: {
    baselineTransferCount: number;
    optimizedTransferCount: number;
    reducedTransferCount: number;
  };
};

const normalizeMemberIds = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawId of ids) {
    const id = rawId.trim();
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalized.push(id);
  }

  return normalized;
};

const toCents = (value: number): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }

  const cents = Math.round((value + Number.EPSILON) * 100);
  if (cents <= 0) {
    return null;
  }

  return cents;
};

const centsToAmount = (value: number): number => {
  return Number((value / 100).toFixed(2));
};

type TravelSettlementCentsTransfer = {
  fromMemberId: string;
  fromMemberDisplayName: string;
  toMemberId: string;
  toMemberDisplayName: string;
  cents: number;
};

const splitEvenly = (
  totalCents: number,
  memberIds: string[],
): TravelResolvedSplit[] => {
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents % memberIds.length;

  return memberIds.map((memberId, index) => ({
    memberId,
    shareAmount: centsToAmount(base + (index < remainder ? 1 : 0)),
  }));
};

const resolveManualSplits = (
  totalCents: number,
  memberIds: Set<string>,
  manualSplits: TravelSplitEngineManualInput[],
): TravelSplitEngineResult => {
  if (manualSplits.length === 0) {
    return {
      ok: false,
      message: "Manual split requires at least one member amount.",
    };
  }

  const seenMembers = new Set<string>();
  const resolvedSplits: TravelResolvedSplit[] = [];
  let sumCents = 0;

  for (const manualSplit of manualSplits) {
    const memberId = manualSplit.memberId.trim();
    if (!memberId || !memberIds.has(memberId)) {
      return {
        ok: false,
        message: "Manual split contains an unknown member.",
      };
    }

    if (seenMembers.has(memberId)) {
      return {
        ok: false,
        message: "Manual split contains duplicate member rows.",
      };
    }

    const splitCents = toCents(manualSplit.amount);
    if (!splitCents) {
      return {
        ok: false,
        message: "Manual split amounts must be positive numbers.",
      };
    }

    seenMembers.add(memberId);
    sumCents += splitCents;
    resolvedSplits.push({
      memberId,
      shareAmount: centsToAmount(splitCents),
    });
  }

  if (sumCents !== totalCents) {
    return {
      ok: false,
      message: "Manual split amounts must equal expense total.",
    };
  }

  return {
    ok: true,
    splits: resolvedSplits,
  };
};

export const resolveTravelExpenseSplits = (
  input: TravelSplitEngineRequest,
): TravelSplitEngineResult => {
  const totalCents = toCents(input.totalAmount);
  if (!totalCents) {
    return {
      ok: false,
      message: "Expense amount must be a positive number.",
    };
  }

  const members = input.members.map((member) => ({
    id: member.id.trim(),
    displayName: member.displayName,
  }));
  const memberIds = members
    .map((member) => member.id)
    .filter((memberId) => memberId.length > 0);
  if (memberIds.length === 0) {
    return {
      ok: false,
      message: "Trip members are missing.",
    };
  }

  const memberIdSet = new Set(memberIds);

  if (input.splitMode === "equal_all") {
    return {
      ok: true,
      splits: splitEvenly(totalCents, memberIds),
    };
  }

  if (input.splitMode === "equal_selected") {
    const selected = normalizeMemberIds(input.selectedMemberIds).filter((memberId) =>
      memberIdSet.has(memberId),
    );
    if (selected.length === 0) {
      return {
        ok: false,
        message: "Choose at least one participant for selected split.",
      };
    }

    return {
      ok: true,
      splits: splitEvenly(totalCents, selected),
    };
  }

  if (input.splitMode === "full_one") {
    const memberId = input.fullAmountMemberId?.trim() ?? "";
    if (!memberId || !memberIdSet.has(memberId)) {
      return {
        ok: false,
        message: "Choose one participant for full amount split.",
      };
    }

    return {
      ok: true,
      splits: [{ memberId, shareAmount: centsToAmount(totalCents) }],
    };
  }

  return resolveManualSplits(totalCents, memberIdSet, input.manualSplits);
};

const toTransferPayload = (
  transfer: TravelSettlementCentsTransfer,
): TravelSettlementTransferPayload => {
  return {
    fromMemberId: transfer.fromMemberId,
    fromMemberDisplayName: transfer.fromMemberDisplayName,
    toMemberId: transfer.toMemberId,
    toMemberDisplayName: transfer.toMemberDisplayName,
    amount: centsToAmount(transfer.cents),
  };
};

const sortSettlementTransfers = (
  settlements: TravelSettlementTransferPayload[],
): TravelSettlementTransferPayload[] => {
  return [...settlements].sort((left, right) => {
    if (right.amount !== left.amount) {
      return right.amount - left.amount;
    }

    const fromCompare = left.fromMemberDisplayName.localeCompare(
      right.fromMemberDisplayName,
    );
    if (fromCompare !== 0) {
      return fromCompare;
    }

    const toCompare = left.toMemberDisplayName.localeCompare(
      right.toMemberDisplayName,
    );
    if (toCompare !== 0) {
      return toCompare;
    }

    const fromIdCompare = left.fromMemberId.localeCompare(right.fromMemberId);
    if (fromIdCompare !== 0) {
      return fromIdCompare;
    }

    return left.toMemberId.localeCompare(right.toMemberId);
  });
};

const settlementPlanKey = (
  debtorsCents: number[],
  creditorsCents: number[],
): string => {
  return `${debtorsCents.join(",")}|${creditorsCents.join(",")}`;
};

const settlementPlanSignature = (
  settlements: TravelSettlementTransferPayload[],
): string => {
  return settlements
    .map(
      (settlement) =>
        `${settlement.amount.toFixed(2)}:${settlement.fromMemberId}->${settlement.toMemberId}`,
    )
    .join("|");
};

const compareSettlementPlans = (
  left: TravelSettlementTransferPayload[],
  right: TravelSettlementTransferPayload[],
): number => {
  if (left.length !== right.length) {
    return left.length - right.length;
  }

  return settlementPlanSignature(left).localeCompare(settlementPlanSignature(right));
};

const buildGreedySettlements = (
  balances: TravelMemberBalancePayload[],
): TravelSettlementTransferPayload[] => {
  const creditors = balances
    .map((balance) => ({
      memberId: balance.memberId,
      displayName: balance.memberDisplayName,
      cents: toCents(Math.max(balance.netAmount, 0)) ?? 0,
    }))
    .filter((balance) => balance.cents > 0)
    .sort((left, right) => right.cents - left.cents);

  const debtors = balances
    .map((balance) => ({
      memberId: balance.memberId,
      displayName: balance.memberDisplayName,
      cents: toCents(Math.max(-balance.netAmount, 0)) ?? 0,
    }))
    .filter((balance) => balance.cents > 0)
    .sort((left, right) => right.cents - left.cents);

  const settlements: TravelSettlementTransferPayload[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const transferCents = Math.min(creditor.cents, debtor.cents);
    if (transferCents > 0) {
      settlements.push({
        fromMemberId: debtor.memberId,
        fromMemberDisplayName: debtor.displayName,
        toMemberId: creditor.memberId,
        toMemberDisplayName: creditor.displayName,
        amount: centsToAmount(transferCents),
      });
    }

    creditor.cents -= transferCents;
    debtor.cents -= transferCents;

    if (creditor.cents === 0) {
      creditorIndex += 1;
    }

    if (debtor.cents === 0) {
      debtorIndex += 1;
    }
  }

  return sortSettlementTransfers(settlements);
};

const MAX_ADVANCED_SETTLEMENT_PARTICIPANTS = 12;

const buildOptimizedSettlements = (
  balances: TravelMemberBalancePayload[],
): TravelSettlementTransferPayload[] | null => {
  const creditors = balances
    .map((balance) => ({
      memberId: balance.memberId,
      displayName: balance.memberDisplayName,
      cents: toCents(Math.max(balance.netAmount, 0)) ?? 0,
    }))
    .filter((balance) => balance.cents > 0)
    .sort((left, right) => {
      const displayCompare = left.displayName.localeCompare(right.displayName);
      if (displayCompare !== 0) {
        return displayCompare;
      }

      return left.memberId.localeCompare(right.memberId);
    });

  const debtors = balances
    .map((balance) => ({
      memberId: balance.memberId,
      displayName: balance.memberDisplayName,
      cents: toCents(Math.max(-balance.netAmount, 0)) ?? 0,
    }))
    .filter((balance) => balance.cents > 0)
    .sort((left, right) => {
      const displayCompare = left.displayName.localeCompare(right.displayName);
      if (displayCompare !== 0) {
        return displayCompare;
      }

      return left.memberId.localeCompare(right.memberId);
    });

  if (creditors.length === 0 || debtors.length === 0) {
    return [];
  }

  if (
    creditors.length + debtors.length >
    MAX_ADVANCED_SETTLEMENT_PARTICIPANTS
  ) {
    return null;
  }

  const memo = new Map<string, TravelSettlementTransferPayload[]>();

  const solve = (
    debtorsCents: number[],
    creditorsCents: number[],
  ): TravelSettlementTransferPayload[] => {
    const debtorIndex = debtorsCents.findIndex((cents) => cents > 0);
    if (debtorIndex < 0) {
      return [];
    }

    const stateKey = settlementPlanKey(debtorsCents, creditorsCents);
    const cached = memo.get(stateKey);
    if (cached) {
      return cached;
    }

    let bestPlan: TravelSettlementTransferPayload[] | null = null;

    for (let creditorIndex = 0; creditorIndex < creditorsCents.length; creditorIndex += 1) {
      const creditorCents = creditorsCents[creditorIndex];
      if (creditorCents <= 0) {
        continue;
      }

      const transferCents = Math.min(
        debtorsCents[debtorIndex] ?? 0,
        creditorCents,
      );
      if (transferCents <= 0) {
        continue;
      }

      const nextDebtors = [...debtorsCents];
      const nextCreditors = [...creditorsCents];
      nextDebtors[debtorIndex] -= transferCents;
      nextCreditors[creditorIndex] -= transferCents;

      const nextPlan = solve(nextDebtors, nextCreditors);
      const currentTransfer = toTransferPayload({
        fromMemberId: debtors[debtorIndex].memberId,
        fromMemberDisplayName: debtors[debtorIndex].displayName,
        toMemberId: creditors[creditorIndex].memberId,
        toMemberDisplayName: creditors[creditorIndex].displayName,
        cents: transferCents,
      });
      const candidatePlan = sortSettlementTransfers([currentTransfer, ...nextPlan]);
      if (!bestPlan || compareSettlementPlans(candidatePlan, bestPlan) < 0) {
        bestPlan = candidatePlan;
      }
    }

    const resolvedPlan = bestPlan ?? [];
    memo.set(stateKey, resolvedPlan);
    return resolvedPlan;
  };

  const optimizedPlan = solve(
    debtors.map((item) => item.cents),
    creditors.map((item) => item.cents),
  );

  return sortSettlementTransfers(optimizedPlan);
};

const pickSettlementPlan = (params: {
  baseline: TravelSettlementTransferPayload[];
  optimized: TravelSettlementTransferPayload[] | null;
}): TravelSettlementTransferPayload[] => {
  if (!params.optimized) {
    return params.baseline;
  }

  if (params.optimized.length < params.baseline.length) {
    return params.optimized;
  }

  if (params.optimized.length > params.baseline.length) {
    return params.baseline;
  }

  const optimizedSignature = settlementPlanSignature(params.optimized);
  const baselineSignature = settlementPlanSignature(params.baseline);
  if (optimizedSignature <= baselineSignature) {
    return params.optimized;
  }

  return params.baseline;
};

export const buildTravelSettlementPlan = (
  balances: TravelMemberBalancePayload[],
): {
  settlements: TravelSettlementTransferPayload[];
  stats: {
    baselineTransferCount: number;
    optimizedTransferCount: number;
    reducedTransferCount: number;
  };
} => {
  const baseline = buildGreedySettlements(balances);
  const optimized = buildOptimizedSettlements(balances);
  const selected = pickSettlementPlan({
    baseline,
    optimized,
  });

  const optimizedTransferCount = selected.length;
  const baselineTransferCount = baseline.length;

  return {
    settlements: selected,
    stats: {
      baselineTransferCount,
      optimizedTransferCount,
      reducedTransferCount: Math.max(
        baselineTransferCount - optimizedTransferCount,
        0,
      ),
    },
  };
};

export const buildTravelTripSummary = (params: {
  members: TravelSplitEngineMember[];
  expenses: TravelBalanceInputExpense[];
}): TravelCalculatedTripSummary => {
  const memberMap = new Map(
    params.members.map((member) => [
      member.id,
      {
        memberId: member.id,
        memberDisplayName: member.displayName,
        paidCents: 0,
        owedCents: 0,
      },
    ]),
  );

  let totalSpentCents = 0;

  for (const expense of params.expenses) {
    const expenseCents = toCents(expense.amount);
    if (!expenseCents) {
      continue;
    }

    totalSpentCents += expenseCents;

    const payer = memberMap.get(expense.paidByMemberId);
    if (payer) {
      payer.paidCents += expenseCents;
    }

    for (const split of expense.splits) {
      const splitCents = toCents(split.shareAmount);
      if (!splitCents) {
        continue;
      }

      const target = memberMap.get(split.memberId);
      if (!target) {
        continue;
      }

      target.owedCents += splitCents;
    }
  }

  const balances: TravelMemberBalancePayload[] = [...memberMap.values()]
    .map((value) => ({
      memberId: value.memberId,
      memberDisplayName: value.memberDisplayName,
      paidAmount: centsToAmount(value.paidCents),
      owedAmount: centsToAmount(value.owedCents),
      netAmount: centsToAmount(value.paidCents - value.owedCents),
    }))
    .sort((left, right) => {
      if (left.netAmount !== right.netAmount) {
        return right.netAmount - left.netAmount;
      }

      return left.memberDisplayName.localeCompare(right.memberDisplayName);
    });

  const settlementPlan = buildTravelSettlementPlan(balances);

  return {
    totalExpensesCount: params.expenses.length,
    totalSpent: centsToAmount(totalSpentCents),
    balances,
    settlements: settlementPlan.settlements,
    settlementPlanStats: settlementPlan.stats,
  };
};


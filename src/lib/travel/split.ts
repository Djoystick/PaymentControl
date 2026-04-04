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

const buildSettlements = (
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

  return settlements;
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

  return {
    totalExpensesCount: params.expenses.length,
    totalSpent: centsToAmount(totalSpentCents),
    balances,
    settlements: buildSettlements(balances),
  };
};


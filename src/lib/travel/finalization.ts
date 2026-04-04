import type {
  TravelSettlementTransferPayload,
  TravelTripSettlementItemPayload,
  TravelTripStatus,
} from "@/lib/travel/types";

type TravelSettlementOverview = {
  unsettledSettlements: TravelSettlementTransferPayload[];
  settledSettlements: TravelSettlementTransferPayload[];
  unsettledCount: number;
  settledCount: number;
  unsettledTotal: number;
  settledTotal: number;
  readyForClosure: boolean;
};

const toAmount = (value: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Number(numeric.toFixed(2));
};

const toTransfer = (item: TravelTripSettlementItemPayload): TravelSettlementTransferPayload => {
  return {
    fromMemberId: item.fromMemberId,
    fromMemberDisplayName: item.fromMemberDisplayName,
    toMemberId: item.toMemberId,
    toMemberDisplayName: item.toMemberDisplayName,
    amount: toAmount(item.amount),
  };
};

const summarizeTotals = (
  settlements: TravelSettlementTransferPayload[],
): { count: number; total: number } => {
  const total = settlements.reduce((acc, item) => acc + toAmount(item.amount), 0);
  return {
    count: settlements.length,
    total: toAmount(total),
  };
};

export const buildTravelSettlementOverview = (params: {
  tripStatus: TravelTripStatus;
  recommendedSettlements: TravelSettlementTransferPayload[];
  settlementItems: TravelTripSettlementItemPayload[];
}): TravelSettlementOverview => {
  if (params.tripStatus === "active") {
    const unsettled = params.recommendedSettlements.map((item) => ({
      ...item,
      amount: toAmount(item.amount),
    }));
    const unsettledSummary = summarizeTotals(unsettled);
    return {
      unsettledSettlements: unsettled,
      settledSettlements: [],
      unsettledCount: unsettledSummary.count,
      settledCount: 0,
      unsettledTotal: unsettledSummary.total,
      settledTotal: 0,
      readyForClosure: unsettledSummary.count === 0,
    };
  }

  const settledItems = params.settlementItems
    .filter((item) => item.status === "settled")
    .map(toTransfer);
  const openItems = params.settlementItems
    .filter((item) => item.status === "open")
    .map(toTransfer);

  if (
    params.settlementItems.length === 0 &&
    params.recommendedSettlements.length > 0
  ) {
    const fallbackOpen = params.recommendedSettlements.map((item) => ({
      ...item,
      amount: toAmount(item.amount),
    }));
    const fallbackOpenSummary = summarizeTotals(fallbackOpen);
    return {
      unsettledSettlements: fallbackOpen,
      settledSettlements: [],
      unsettledCount: fallbackOpenSummary.count,
      settledCount: 0,
      unsettledTotal: fallbackOpenSummary.total,
      settledTotal: 0,
      readyForClosure: fallbackOpenSummary.count === 0,
    };
  }

  const openSummary = summarizeTotals(openItems);
  const settledSummary = summarizeTotals(settledItems);
  return {
    unsettledSettlements: openItems,
    settledSettlements: settledItems,
    unsettledCount: openSummary.count,
    settledCount: settledSummary.count,
    unsettledTotal: openSummary.total,
    settledTotal: settledSummary.total,
    readyForClosure: openSummary.count === 0,
  };
};

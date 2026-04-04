"use client";

import type {
  TravelExpenseDeleteResponse,
  TravelExpenseMutateResponse,
  TravelSettlementMutateResponse,
  TravelTripClosureMutateResponse,
  TravelTripDetailResponse,
  TravelTripMutateResponse,
  TravelTripsListResponse,
} from "@/lib/travel/types";

type RequestBody = Record<string, unknown>;

const postJson = async <T>(
  url: string,
  body: RequestBody,
): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
};

export const listTravelTrips = async (
  initData: string,
): Promise<TravelTripsListResponse> => {
  return postJson<TravelTripsListResponse>("/api/travel/trips/list", {
    initData,
  });
};

export const createTravelTrip = async (params: {
  initData: string;
  title: string;
  baseCurrency: string;
  description?: string;
  memberNames: string[];
}): Promise<TravelTripMutateResponse> => {
  return postJson<TravelTripMutateResponse>("/api/travel/trips", {
    initData: params.initData,
    title: params.title,
    baseCurrency: params.baseCurrency,
    description: params.description ?? "",
    memberNames: params.memberNames,
  });
};

export const readTravelTripDetail = async (params: {
  initData: string;
  tripId: string;
}): Promise<TravelTripDetailResponse> => {
  return postJson<TravelTripDetailResponse>(`/api/travel/trips/${params.tripId}`, {
    initData: params.initData,
  });
};

export const createTravelExpense = async (params: {
  initData: string;
  tripId: string;
  amount: number;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: "equal_all" | "equal_selected" | "full_one" | "manual_amounts";
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: Array<{ memberId: string; amount: number }>;
  spentAt?: string | null;
}): Promise<TravelExpenseMutateResponse> => {
  return postJson<TravelExpenseMutateResponse>(
    `/api/travel/trips/${params.tripId}/expenses`,
    {
      initData: params.initData,
      amount: params.amount,
      paidByMemberId: params.paidByMemberId,
      description: params.description,
      category: params.category,
      splitMode: params.splitMode,
      selectedMemberIds: params.selectedMemberIds,
      fullAmountMemberId: params.fullAmountMemberId,
      manualSplits: params.manualSplits,
      spentAt: params.spentAt ?? null,
    },
  );
};

export const updateTravelExpense = async (params: {
  initData: string;
  tripId: string;
  expenseId: string;
  amount: number;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: "equal_all" | "equal_selected" | "full_one" | "manual_amounts";
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: Array<{ memberId: string; amount: number }>;
  spentAt?: string | null;
}): Promise<TravelExpenseMutateResponse> => {
  const response = await fetch(
    `/api/travel/trips/${params.tripId}/expenses/${params.expenseId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: params.initData,
        amount: params.amount,
        paidByMemberId: params.paidByMemberId,
        description: params.description,
        category: params.category,
        splitMode: params.splitMode,
        selectedMemberIds: params.selectedMemberIds,
        fullAmountMemberId: params.fullAmountMemberId,
        manualSplits: params.manualSplits,
        spentAt: params.spentAt ?? null,
      }),
    },
  );

  return (await response.json()) as TravelExpenseMutateResponse;
};

export const deleteTravelExpense = async (params: {
  initData: string;
  tripId: string;
  expenseId: string;
}): Promise<TravelExpenseDeleteResponse> => {
  const response = await fetch(
    `/api/travel/trips/${params.tripId}/expenses/${params.expenseId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: params.initData,
      }),
    },
  );

  return (await response.json()) as TravelExpenseDeleteResponse;
};

export const mutateTravelTripClosure = async (params: {
  initData: string;
  tripId: string;
  action: "start" | "close" | "reopen";
  allowUnsettled?: boolean;
}): Promise<TravelTripClosureMutateResponse> => {
  return postJson<TravelTripClosureMutateResponse>(
    `/api/travel/trips/${params.tripId}/closure`,
    {
      initData: params.initData,
      action: params.action,
      allowUnsettled: params.allowUnsettled ?? false,
    },
  );
};

export const updateTravelSettlementItemStatus = async (params: {
  initData: string;
  tripId: string;
  settlementItemId: string;
  markSettled: boolean;
}): Promise<TravelSettlementMutateResponse> => {
  const response = await fetch(
    `/api/travel/trips/${params.tripId}/settlements/${params.settlementItemId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: params.initData,
        markSettled: params.markSettled,
      }),
    },
  );

  return (await response.json()) as TravelSettlementMutateResponse;
};

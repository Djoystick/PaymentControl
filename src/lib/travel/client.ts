"use client";

import type {
  TravelApiError,
  TravelReceiptDraftDeleteResponse,
  TravelReceiptDraftMutateResponse,
  TravelExpenseDeleteResponse,
  TravelExpenseMutateResponse,
  TravelTripInviteJoinResponse,
  TravelTripInviteMutateResponse,
  TravelTripInviteReadResponse,
  TravelSettlementMutateResponse,
  TravelTripMemberMutateResponse,
  TravelTripClosureMutateResponse,
  TravelTripDetailResponse,
  TravelTripMutateResponse,
  TravelTripsListResponse,
} from "@/lib/travel/types";

type RequestBody = Record<string, unknown>;

const isJsonResponse = (response: Response): boolean => {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes("application/json");
};

const toTravelTransportError = (
  code: TravelApiError["error"]["code"],
  message: string,
): TravelApiError => {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
};

const readTravelResponse = async <T extends { ok: boolean }>(params: {
  response: Response;
  fallbackCode: TravelApiError["error"]["code"];
  fallbackMessage: string;
  statusMessageMap?: Partial<Record<number, string>>;
}): Promise<T> => {
  const statusMessage =
    params.statusMessageMap?.[params.response.status] ?? params.fallbackMessage;

  if (isJsonResponse(params.response)) {
    try {
      return (await params.response.json()) as T;
    } catch {
      return toTravelTransportError(
        params.fallbackCode,
        statusMessage,
      ) as unknown as T;
    }
  }

  if (!params.response.ok) {
    if (params.response.status >= 500) {
      return toTravelTransportError(
        params.fallbackCode,
        "Travel request failed on server. Try again in a moment.",
      ) as unknown as T;
    }

    return toTravelTransportError(
      params.fallbackCode,
      statusMessage,
    ) as unknown as T;
  }

  return toTravelTransportError(
    params.fallbackCode,
    params.fallbackMessage,
  ) as unknown as T;
};

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
  expenseCurrency: string;
  conversionRate: number | null;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: "equal_all" | "equal_selected" | "full_one" | "manual_amounts";
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: Array<{ memberId: string; amount: number }>;
  spentAt?: string | null;
  receiptDraftId?: string | null;
}): Promise<TravelExpenseMutateResponse> => {
  return postJson<TravelExpenseMutateResponse>(
    `/api/travel/trips/${params.tripId}/expenses`,
    {
      initData: params.initData,
      amount: params.amount,
      expenseCurrency: params.expenseCurrency,
      conversionRate: params.conversionRate,
      paidByMemberId: params.paidByMemberId,
      description: params.description,
      category: params.category,
      splitMode: params.splitMode,
      selectedMemberIds: params.selectedMemberIds,
      fullAmountMemberId: params.fullAmountMemberId,
      manualSplits: params.manualSplits,
      spentAt: params.spentAt ?? null,
      receiptDraftId: params.receiptDraftId ?? null,
    },
  );
};

export const updateTravelExpense = async (params: {
  initData: string;
  tripId: string;
  expenseId: string;
  amount: number;
  expenseCurrency: string;
  conversionRate: number | null;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: "equal_all" | "equal_selected" | "full_one" | "manual_amounts";
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: Array<{ memberId: string; amount: number }>;
  spentAt?: string | null;
  receiptDraftId?: string | null;
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
        expenseCurrency: params.expenseCurrency,
        conversionRate: params.conversionRate,
        paidByMemberId: params.paidByMemberId,
        description: params.description,
        category: params.category,
        splitMode: params.splitMode,
        selectedMemberIds: params.selectedMemberIds,
        fullAmountMemberId: params.fullAmountMemberId,
        manualSplits: params.manualSplits,
        spentAt: params.spentAt ?? null,
        receiptDraftId: params.receiptDraftId ?? null,
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
  action: "start" | "close" | "reopen" | "archive" | "unarchive";
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

export const createTravelTripMember = async (params: {
  initData: string;
  tripId: string;
  displayName: string;
  role?: "organizer" | "participant";
  status?: "active" | "inactive";
  linkToCurrentProfile?: boolean;
}): Promise<TravelTripMemberMutateResponse> => {
  return postJson<TravelTripMemberMutateResponse>(
    `/api/travel/trips/${params.tripId}/members`,
    {
      initData: params.initData,
      displayName: params.displayName,
      role: params.role ?? "participant",
      status: params.status ?? "active",
      linkToCurrentProfile: params.linkToCurrentProfile ?? false,
    },
  );
};

export const updateTravelTripMember = async (params: {
  initData: string;
  tripId: string;
  memberId: string;
  displayName?: string;
  role?: "organizer" | "participant";
  status?: "active" | "inactive";
}): Promise<TravelTripMemberMutateResponse> => {
  const response = await fetch(
    `/api/travel/trips/${params.tripId}/members/${params.memberId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: params.initData,
        displayName: params.displayName,
        role: params.role,
        status: params.status,
      }),
    },
  );

  return (await response.json()) as TravelTripMemberMutateResponse;
};

export const createTravelTripInvite = async (params: {
  initData: string;
  tripId: string;
}): Promise<TravelTripInviteMutateResponse> => {
  return postJson<TravelTripInviteMutateResponse>(
    `/api/travel/trips/${params.tripId}/invites/create`,
    {
      initData: params.initData,
    },
  );
};

export const readTravelTripInvite = async (params: {
  initData: string;
  tripId: string;
}): Promise<TravelTripInviteReadResponse> => {
  return postJson<TravelTripInviteReadResponse>(
    `/api/travel/trips/${params.tripId}/invites/current`,
    {
      initData: params.initData,
    },
  );
};

export const joinTravelTripByInvite = async (params: {
  initData: string;
  inviteToken: string;
}): Promise<TravelTripInviteJoinResponse> => {
  return postJson<TravelTripInviteJoinResponse>("/api/travel/trips/invites/join", {
    initData: params.initData,
    inviteToken: params.inviteToken,
  });
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

export const createTravelReceiptDraft = async (params: {
  initData: string;
  tripId: string;
  receiptImage: File;
}): Promise<TravelReceiptDraftMutateResponse> => {
  const formData = new FormData();
  formData.set("initData", params.initData);
  formData.set("receiptImage", params.receiptImage);

  const response = await fetch(`/api/travel/trips/${params.tripId}/receipts`, {
    method: "POST",
    body: formData,
  });

  return readTravelResponse<TravelReceiptDraftMutateResponse>({
    response,
    fallbackCode: "TRAVEL_RECEIPT_CREATE_FAILED",
    fallbackMessage: "Failed to save receipt draft.",
    statusMessageMap: {
      413: "Receipt image is too large for upload. Use image up to 4 MB.",
      415: "Receipt image type must be image/*.",
    },
  });
};

export const parseTravelReceiptDraft = async (params: {
  initData: string;
  tripId: string;
  receiptDraftId: string;
  action?: "parse" | "reset";
}): Promise<TravelReceiptDraftMutateResponse> => {
  const response = await fetch(
    `/api/travel/trips/${params.tripId}/receipts/${params.receiptDraftId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: params.initData,
        action: params.action ?? "parse",
      }),
    },
  );

  return readTravelResponse<TravelReceiptDraftMutateResponse>({
    response,
    fallbackCode: "TRAVEL_RECEIPT_PARSE_FAILED",
    fallbackMessage: "Failed to parse receipt draft.",
  });
};

export const replaceTravelReceiptDraftImage = async (params: {
  initData: string;
  tripId: string;
  receiptDraftId: string;
  receiptImage: File;
}): Promise<TravelReceiptDraftMutateResponse> => {
  const formData = new FormData();
  formData.set("initData", params.initData);
  formData.set("receiptImage", params.receiptImage);

  const response = await fetch(
    `/api/travel/trips/${params.tripId}/receipts/${params.receiptDraftId}`,
    {
      method: "PUT",
      body: formData,
    },
  );

  return readTravelResponse<TravelReceiptDraftMutateResponse>({
    response,
    fallbackCode: "TRAVEL_RECEIPT_REPLACE_FAILED",
    fallbackMessage: "Failed to replace receipt draft photo.",
    statusMessageMap: {
      413: "Receipt image is too large for upload. Use image up to 4 MB.",
      415: "Receipt image type must be image/*.",
    },
  });
};

export const deleteTravelReceiptDraft = async (params: {
  initData: string;
  tripId: string;
  receiptDraftId: string;
}): Promise<TravelReceiptDraftDeleteResponse> => {
  const response = await fetch(
    `/api/travel/trips/${params.tripId}/receipts/${params.receiptDraftId}`,
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

  return readTravelResponse<TravelReceiptDraftDeleteResponse>({
    response,
    fallbackCode: "TRAVEL_RECEIPT_DELETE_FAILED",
    fallbackMessage: "Failed to delete receipt draft.",
  });
};

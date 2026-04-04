import type {
  CurrentAppContextErrorCode,
  WorkspaceSummaryPayload,
} from "@/lib/auth/types";

export type TravelSplitMode =
  | "equal_all"
  | "equal_selected"
  | "full_one"
  | "manual_amounts";

export type TravelTripStatus = "active" | "closing" | "closed";

export type TravelSettlementItemStatus = "open" | "settled";

export type TravelTripMemberPayload = {
  id: string;
  tripId: string;
  profileId: string | null;
  telegramUserId: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type TravelExpenseSplitPayload = {
  memberId: string;
  memberDisplayName: string;
  shareAmount: number;
};

export type TravelTripExpensePayload = {
  id: string;
  tripId: string;
  paidByMemberId: string;
  paidByMemberDisplayName: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  splitMode: TravelSplitMode;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
  splits: TravelExpenseSplitPayload[];
};

export type TravelMemberBalancePayload = {
  memberId: string;
  memberDisplayName: string;
  paidAmount: number;
  owedAmount: number;
  netAmount: number;
};

export type TravelSettlementTransferPayload = {
  fromMemberId: string;
  fromMemberDisplayName: string;
  toMemberId: string;
  toMemberDisplayName: string;
  amount: number;
};

export type TravelTripSettlementItemPayload = {
  id: string;
  tripId: string;
  fromMemberId: string;
  fromMemberDisplayName: string;
  toMemberId: string;
  toMemberDisplayName: string;
  amount: number;
  status: TravelSettlementItemStatus;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TravelTripSummaryPayload = {
  totalExpensesCount: number;
  totalSpent: number;
  balances: TravelMemberBalancePayload[];
  settlements: TravelSettlementTransferPayload[];
  recommendedSettlements: TravelSettlementTransferPayload[];
  settledSettlements: TravelSettlementTransferPayload[];
  unsettledSettlementCount: number;
  settledSettlementCount: number;
  unsettledSettlementTotal: number;
  settledSettlementTotal: number;
  readyForClosure: boolean;
  settlementItems: TravelTripSettlementItemPayload[];
};

export type TravelTripPayload = {
  id: string;
  workspaceId: string;
  title: string;
  baseCurrency: string;
  description: string | null;
  createdByProfileId: string | null;
  status: TravelTripStatus;
  closedAt: string | null;
  closureUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  members: TravelTripMemberPayload[];
  recentExpenses: TravelTripExpensePayload[];
  summary: TravelTripSummaryPayload;
};

export type TravelTripListItemPayload = {
  id: string;
  title: string;
  baseCurrency: string;
  description: string | null;
  memberCount: number;
  totalExpensesCount: number;
  totalSpent: number;
  status: TravelTripStatus;
  closedAt: string | null;
  updatedAt: string;
};

export type TravelCreateTripInput = {
  title: string;
  baseCurrency: string;
  description: string | null;
  memberNames: string[];
};

export type TravelManualSplitInput = {
  memberId: string;
  amount: number;
};

export type TravelCreateExpenseInput = {
  amount: number;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: TravelSplitMode;
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: TravelManualSplitInput[];
  spentAt: string | null;
};

export type TravelTripClosureAction = "start" | "close" | "reopen";

export type TravelScopeResolutionSuccess = {
  ok: true;
  workspace: WorkspaceSummaryPayload;
  profileId: string;
};

export type TravelScopeResolutionErrorCode =
  | CurrentAppContextErrorCode
  | "WORKSPACE_UNAVAILABLE";

export type TravelScopeResolutionError = {
  ok: false;
  error: {
    code: TravelScopeResolutionErrorCode;
    message: string;
  };
};

export type TravelScopeResolutionResult =
  | TravelScopeResolutionSuccess
  | TravelScopeResolutionError;

export type TravelApiErrorCode =
  | TravelScopeResolutionErrorCode
  | "TRAVEL_TRIP_VALIDATION_FAILED"
  | "TRAVEL_TRIP_LIST_FAILED"
  | "TRAVEL_TRIP_CREATE_FAILED"
  | "TRAVEL_TRIP_NOT_FOUND"
  | "TRAVEL_TRIP_EDIT_LOCKED"
  | "TRAVEL_TRIP_CLOSURE_INVALID_STATE"
  | "TRAVEL_TRIP_CLOSURE_BLOCKED"
  | "TRAVEL_TRIP_CLOSURE_FAILED"
  | "TRAVEL_EXPENSE_VALIDATION_FAILED"
  | "TRAVEL_EXPENSE_CREATE_FAILED"
  | "TRAVEL_EXPENSE_UPDATE_FAILED"
  | "TRAVEL_EXPENSE_DELETE_FAILED"
  | "TRAVEL_SETTLEMENT_NOT_FOUND"
  | "TRAVEL_SETTLEMENT_UPDATE_FAILED";

export type TravelApiError = {
  ok: false;
  error: {
    code: TravelApiErrorCode;
    message: string;
  };
};

export type TravelTripsListResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trips: TravelTripListItemPayload[];
    }
  | TravelApiError;

export type TravelTripMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
    }
  | TravelApiError;

export type TravelTripDetailResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
    }
  | TravelApiError;

export type TravelExpenseMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      expense: TravelTripExpensePayload;
    }
  | TravelApiError;

export type TravelExpenseDeleteResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      deletedExpenseId: string;
    }
  | TravelApiError;

export type TravelTripClosureMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      action: TravelTripClosureAction;
    }
  | TravelApiError;

export type TravelSettlementMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      settlementItemId: string;
      status: TravelSettlementItemStatus;
    }
  | TravelApiError;

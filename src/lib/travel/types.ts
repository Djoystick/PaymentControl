import type {
  CurrentAppContextErrorCode,
  WorkspaceSummaryPayload,
} from "@/lib/auth/types";

export type TravelSplitMode =
  | "equal_all"
  | "equal_selected"
  | "full_one"
  | "manual_amounts";

export type TravelTripStatus = "active" | "closing" | "closed" | "archived";
export type TravelTripMemberRole = "organizer" | "participant";
export type TravelTripMemberStatus = "active" | "inactive";
export type TravelTripInviteStatus =
  | "active"
  | "accepted"
  | "expired"
  | "revoked";

export type TravelSettlementItemStatus = "open" | "settled";
export type TravelReceiptDraftStatus =
  | "draft"
  | "parsed"
  | "ocr_failed"
  | "finalized";

export type TravelReceiptOcrFieldKey =
  | "sourceAmount"
  | "sourceCurrency"
  | "spentAt"
  | "merchant"
  | "description"
  | "category"
  | "conversionRate";

export type TravelReceiptOcrFieldQuality = "high" | "medium" | "low" | "missing";

export type TravelReceiptOcrFieldQualityMap = Record<
  TravelReceiptOcrFieldKey,
  TravelReceiptOcrFieldQuality
>;

export type TravelReceiptClientSuggestionPayload = {
  source: "client_paddle_ocr";
  sourceAmount: number | null;
  sourceCurrency: string | null;
  spentAt: string | null;
  merchant: string | null;
  description: string | null;
  category: string | null;
  conversionRate: number | null;
  rawText: string | null;
  fieldQuality: TravelReceiptOcrFieldQualityMap;
};

export type TravelTripMemberPayload = {
  id: string;
  tripId: string;
  profileId: string | null;
  telegramUserId: string | null;
  displayName: string;
  role: TravelTripMemberRole;
  status: TravelTripMemberStatus;
  inactiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TravelTripInvitePayload = {
  id: string;
  tripId: string;
  workspaceId: string;
  inviteToken: string;
  createdByProfileId: string | null;
  inviteStatus: TravelTripInviteStatus;
  expiresAt: string | null;
  acceptedByProfileId: string | null;
  acceptedMemberId: string | null;
  acceptedAt: string | null;
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
  sourceAmount: number;
  sourceCurrency: string;
  conversionRate: number;
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

export type TravelReceiptDraftPayload = {
  id: string;
  tripId: string;
  workspaceId: string;
  createdByProfileId: string | null;
  status: TravelReceiptDraftStatus;
  imageDataUrl: string;
  imageMimeType: string;
  imageFileName: string | null;
  ocrRawText: string | null;
  ocrSuggestedAmount: number | null;
  ocrSuggestedCurrency: string | null;
  ocrSuggestedSpentAt: string | null;
  ocrSuggestedMerchant: string | null;
  ocrSuggestedDescription: string | null;
  ocrSuggestedCategory: string | null;
  ocrSuggestedConversionRate: number | null;
  ocrFieldQuality: TravelReceiptOcrFieldQualityMap;
  ocrLastError: string | null;
  parsedAt: string | null;
  ocrParseAttempts: number;
  ocrLastAttemptAt: string | null;
  sourceImageUpdatedAt: string;
  finalizedAt: string | null;
  finalizedExpenseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TravelTripSummaryPayload = {
  totalExpensesCount: number;
  totalSpent: number;
  activeMemberCount: number;
  inactiveMemberCount: number;
  balances: TravelMemberBalancePayload[];
  settlements: TravelSettlementTransferPayload[];
  recommendedSettlements: TravelSettlementTransferPayload[];
  settlementBaselineTransferCount: number;
  settlementOptimizedTransferCount: number;
  settlementReducedTransferCount: number;
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
  archivedAt: string | null;
  closureUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  members: TravelTripMemberPayload[];
  recentExpenses: TravelTripExpensePayload[];
  receiptDrafts: TravelReceiptDraftPayload[];
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
  archivedAt: string | null;
  updatedAt: string;
};

export type TravelCreateTripInput = {
  title: string;
  baseCurrency: string;
  description: string | null;
  memberNames: string[];
};

export type TravelCreateTripMemberInput = {
  displayName: string;
  role: TravelTripMemberRole;
  status: TravelTripMemberStatus;
  linkToCurrentProfile: boolean;
};

export type TravelJoinTripByInviteInput = {
  inviteToken: string;
};

export type TravelUpdateTripMemberInput = {
  displayName: string | null;
  role: TravelTripMemberRole | null;
  status: TravelTripMemberStatus | null;
};

export type TravelManualSplitInput = {
  memberId: string;
  amount: number;
};

export type TravelCreateExpenseInput = {
  amount: number;
  expenseCurrency: string;
  conversionRate: number | null;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: TravelSplitMode;
  selectedMemberIds: string[];
  fullAmountMemberId: string | null;
  manualSplits: TravelManualSplitInput[];
  spentAt: string | null;
  receiptDraftId: string | null;
};

export type TravelCreateReceiptDraftInput = {
  imageDataUrl: string;
  imageMimeType: string;
  imageFileName: string | null;
};

export type TravelReplaceReceiptDraftImageInput = TravelCreateReceiptDraftInput;

export type TravelTripClosureAction =
  | "start"
  | "close"
  | "reopen"
  | "archive"
  | "unarchive";

export type TravelScopeResolutionSuccess = {
  ok: true;
  workspace: WorkspaceSummaryPayload;
  profileId: string;
  profile: {
    id: string;
    telegramUserId: string;
    username: string | null;
    firstName: string;
  };
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
  | "TRAVEL_MEMBER_VALIDATION_FAILED"
  | "TRAVEL_MEMBER_NOT_FOUND"
  | "TRAVEL_MEMBER_CREATE_FAILED"
  | "TRAVEL_MEMBER_UPDATE_FAILED"
  | "TRAVEL_INVITE_VALIDATION_FAILED"
  | "TRAVEL_INVITE_FORBIDDEN"
  | "TRAVEL_INVITE_NOT_FOUND"
  | "TRAVEL_INVITE_EXPIRED"
  | "TRAVEL_INVITE_ALREADY_USED"
  | "TRAVEL_INVITE_WORKSPACE_MISMATCH"
  | "TRAVEL_INVITE_CREATE_FAILED"
  | "TRAVEL_INVITE_READ_FAILED"
  | "TRAVEL_INVITE_JOIN_FAILED"
  | "TRAVEL_RECEIPT_VALIDATION_FAILED"
  | "TRAVEL_RECEIPT_CREATE_FAILED"
  | "TRAVEL_RECEIPT_NOT_FOUND"
  | "TRAVEL_RECEIPT_PARSE_FAILED"
  | "TRAVEL_RECEIPT_RESET_FAILED"
  | "TRAVEL_RECEIPT_REPLACE_FAILED"
  | "TRAVEL_RECEIPT_DELETE_FAILED"
  | "TRAVEL_OCR_UNAVAILABLE"
  | "TRAVEL_OCR_INVALID_API_KEY"
  | "TRAVEL_OCR_MODEL_ACCESS_DENIED"
  | "TRAVEL_OCR_QUOTA_EXCEEDED"
  | "TRAVEL_OCR_RATE_LIMITED"
  | "TRAVEL_OCR_PROVIDER_REQUEST_FAILED"
  | "TRAVEL_OCR_PROVIDER_MALFORMED_RESPONSE"
  | "TRAVEL_OCR_INTERNAL_ERROR"
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

export type TravelReceiptDraftMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      receiptDraft: TravelReceiptDraftPayload;
    }
  | TravelApiError;

export type TravelReceiptDraftDeleteResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      deletedReceiptDraftId: string;
    }
  | TravelApiError;

export type TravelTripMemberMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      member: TravelTripMemberPayload;
    }
  | TravelApiError;

export type TravelTripInviteMutateResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      invite: TravelTripInvitePayload;
    }
  | TravelApiError;

export type TravelTripInviteReadResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      invite: TravelTripInvitePayload | null;
    }
  | TravelApiError;

export type TravelTripInviteJoinResponse =
  | {
      ok: true;
      workspace: WorkspaceSummaryPayload;
      trip: TravelTripPayload;
      invite: TravelTripInvitePayload;
      member: TravelTripMemberPayload;
    }
  | TravelApiError;

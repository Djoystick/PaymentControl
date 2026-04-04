import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeTravelExpenseAmount } from "@/lib/travel/currency";
import { buildTravelSettlementOverview } from "@/lib/travel/finalization";
import { runTravelReceiptOcr } from "@/lib/travel/receipt-ocr";
import {
  buildTravelTripSummary,
  resolveTravelExpenseSplits,
  type TravelSplitEngineMember,
} from "@/lib/travel/split";
import type {
  TravelCreateReceiptDraftInput,
  TravelCreateExpenseInput,
  TravelReceiptDraftPayload,
  TravelReceiptDraftStatus,
  TravelCreateTripInput,
  TravelSettlementItemStatus,
  TravelTripExpensePayload,
  TravelTripClosureAction,
  TravelTripListItemPayload,
  TravelTripMemberPayload,
  TravelTripPayload,
  TravelTripSettlementItemPayload,
  TravelTripStatus,
} from "@/lib/travel/types";

type TravelTripRow = {
  id: string;
  workspace_id: string;
  title: string;
  base_currency: string;
  description: string | null;
  created_by_profile_id: string | null;
  status: TravelTripStatus;
  closed_at: string | null;
  closure_updated_at: string;
  created_at: string;
  updated_at: string;
};

type TravelReceiptDraftRow = {
  id: string;
  trip_id: string;
  workspace_id: string;
  created_by_profile_id: string | null;
  status: TravelReceiptDraftStatus;
  image_data_url: string;
  image_mime_type: string;
  image_file_name: string | null;
  ocr_raw_text: string | null;
  ocr_suggested_amount: number | string | null;
  ocr_suggested_currency: string | null;
  ocr_suggested_spent_at: string | null;
  ocr_suggested_merchant: string | null;
  ocr_suggested_description: string | null;
  ocr_suggested_category: string | null;
  ocr_suggested_conversion_rate: number | string | null;
  ocr_last_error: string | null;
  parsed_at: string | null;
  finalized_at: string | null;
  finalized_expense_id: string | null;
  created_at: string;
  updated_at: string;
};

type TravelTripMemberRow = {
  id: string;
  trip_id: string;
  profile_id: string | null;
  telegram_user_id: string | number | null;
  display_name: string;
  created_at: string;
  updated_at: string;
};

type TravelTripExpenseRow = {
  id: string;
  trip_id: string;
  paid_by_member_id: string;
  source_amount: number | string | null;
  source_currency: string | null;
  conversion_rate: number | string | null;
  amount: number | string;
  currency: string;
  description: string;
  category: string;
  split_mode: "equal_all" | "equal_selected" | "full_one" | "manual_amounts";
  spent_at: string;
  created_at: string;
  updated_at: string;
};

type TravelExpenseSplitRow = {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number | string;
  created_at: string;
  updated_at: string;
};

type TravelTripSettlementItemRow = {
  id: string;
  trip_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number | string;
  status: TravelSettlementItemStatus;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};

type TravelTripMemberCountRow = {
  trip_id: string;
};

type TravelTripExpenseTotalRow = {
  trip_id: string;
  amount: number | string;
};

const tripSelection =
  "id, workspace_id, title, base_currency, description, created_by_profile_id, status, closed_at, closure_updated_at, created_at, updated_at";
const memberSelection =
  "id, trip_id, profile_id, telegram_user_id, display_name, created_at, updated_at";
const expenseSelection =
  "id, trip_id, paid_by_member_id, source_amount, source_currency, conversion_rate, amount, currency, description, category, split_mode, spent_at, created_at, updated_at";
const splitSelection =
  "id, expense_id, member_id, share_amount, created_at, updated_at";
const settlementSelection =
  "id, trip_id, from_member_id, to_member_id, amount, status, settled_at, created_at, updated_at";
const receiptSelection =
  "id, trip_id, workspace_id, created_by_profile_id, status, image_data_url, image_mime_type, image_file_name, ocr_raw_text, ocr_suggested_amount, ocr_suggested_currency, ocr_suggested_spent_at, ocr_suggested_merchant, ocr_suggested_description, ocr_suggested_category, ocr_suggested_conversion_rate, ocr_last_error, parsed_at, finalized_at, finalized_expense_id, created_at, updated_at";

const toAmount = (value: number | string): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Number(numeric.toFixed(2));
};

const normalizeTelegramUserId = (value: string | number | null): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized;
};

const toTripMemberPayload = (
  row: TravelTripMemberRow,
): TravelTripMemberPayload => {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    telegramUserId: normalizeTelegramUserId(row.telegram_user_id),
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toExpensePayload = (params: {
  row: TravelTripExpenseRow;
  memberNameById: Map<string, string>;
  splits: TravelExpenseSplitRow[];
}): TravelTripExpensePayload => {
  const splits = params.splits
    .map((split) => ({
      memberId: split.member_id,
      memberDisplayName:
        params.memberNameById.get(split.member_id) ?? "Unknown member",
      shareAmount: toAmount(split.share_amount),
    }))
    .sort((left, right) =>
      left.memberDisplayName.localeCompare(right.memberDisplayName),
    );

  const parsedConversionRate =
    params.row.conversion_rate === null
      ? null
      : Number(params.row.conversion_rate);

  return {
    id: params.row.id,
    tripId: params.row.trip_id,
    paidByMemberId: params.row.paid_by_member_id,
    paidByMemberDisplayName:
      params.memberNameById.get(params.row.paid_by_member_id) ?? "Unknown member",
    sourceAmount:
      params.row.source_amount === null
        ? toAmount(params.row.amount)
        : toAmount(params.row.source_amount),
    sourceCurrency: params.row.source_currency ?? params.row.currency,
    conversionRate:
      parsedConversionRate !== null &&
      Number.isFinite(parsedConversionRate) &&
      parsedConversionRate > 0
        ? Number(parsedConversionRate.toFixed(6))
        : 1,
    amount: toAmount(params.row.amount),
    currency: params.row.currency,
    description: params.row.description,
    category: params.row.category,
    splitMode: params.row.split_mode,
    spentAt: params.row.spent_at,
    createdAt: params.row.created_at,
    updatedAt: params.row.updated_at,
    splits,
  };
};

const toSettlementItemPayload = (params: {
  row: TravelTripSettlementItemRow;
  memberNameById: Map<string, string>;
}): TravelTripSettlementItemPayload => {
  return {
    id: params.row.id,
    tripId: params.row.trip_id,
    fromMemberId: params.row.from_member_id,
    fromMemberDisplayName:
      params.memberNameById.get(params.row.from_member_id) ?? "Unknown member",
    toMemberId: params.row.to_member_id,
    toMemberDisplayName:
      params.memberNameById.get(params.row.to_member_id) ?? "Unknown member",
    amount: toAmount(params.row.amount),
    status: params.row.status,
    settledAt: params.row.settled_at,
    createdAt: params.row.created_at,
    updatedAt: params.row.updated_at,
  };
};

const toReceiptDraftPayload = (
  row: TravelReceiptDraftRow,
): TravelReceiptDraftPayload => {
  const parsedRate =
    row.ocr_suggested_conversion_rate === null
      ? null
      : Number(row.ocr_suggested_conversion_rate);

  return {
    id: row.id,
    tripId: row.trip_id,
    workspaceId: row.workspace_id,
    createdByProfileId: row.created_by_profile_id,
    status: row.status,
    imageDataUrl: row.image_data_url,
    imageMimeType: row.image_mime_type,
    imageFileName: row.image_file_name,
    ocrRawText: row.ocr_raw_text,
    ocrSuggestedAmount:
      row.ocr_suggested_amount === null ? null : toAmount(row.ocr_suggested_amount),
    ocrSuggestedCurrency: row.ocr_suggested_currency,
    ocrSuggestedSpentAt: row.ocr_suggested_spent_at,
    ocrSuggestedMerchant: row.ocr_suggested_merchant,
    ocrSuggestedDescription: row.ocr_suggested_description,
    ocrSuggestedCategory: row.ocr_suggested_category,
    ocrSuggestedConversionRate:
      parsedRate !== null && Number.isFinite(parsedRate) && parsedRate > 0
        ? Number(parsedRate.toFixed(6))
        : null,
    ocrLastError: row.ocr_last_error,
    parsedAt: row.parsed_at,
    finalizedAt: row.finalized_at,
    finalizedExpenseId: row.finalized_expense_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const readTripMembers = async (
  tripId: string,
): Promise<TravelTripMemberRow[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_trip_members")
    .select(memberSelection)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true })
    .returns<TravelTripMemberRow[]>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readTripExpenses = async (
  tripId: string,
): Promise<TravelTripExpenseRow[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_trip_expenses")
    .select(expenseSelection)
    .eq("trip_id", tripId)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<TravelTripExpenseRow[]>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readExpenseRowByTripAndId = async (
  tripId: string,
  expenseId: string,
): Promise<TravelTripExpenseRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_trip_expenses")
    .select(expenseSelection)
    .eq("trip_id", tripId)
    .eq("id", expenseId)
    .maybeSingle<TravelTripExpenseRow>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readExpenseSplits = async (
  expenseIds: string[],
): Promise<TravelExpenseSplitRow[] | null> => {
  if (expenseIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_expense_splits")
    .select(splitSelection)
    .in("expense_id", expenseIds)
    .returns<TravelExpenseSplitRow[]>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readTripSettlementItems = async (
  tripId: string,
): Promise<TravelTripSettlementItemRow[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_trip_settlement_items")
    .select(settlementSelection)
    .eq("trip_id", tripId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<TravelTripSettlementItemRow[]>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readTripSettlementItemById = async (params: {
  tripId: string;
  settlementItemId: string;
}): Promise<TravelTripSettlementItemRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_trip_settlement_items")
    .select(settlementSelection)
    .eq("trip_id", params.tripId)
    .eq("id", params.settlementItemId)
    .maybeSingle<TravelTripSettlementItemRow>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readTripReceiptDrafts = async (
  tripId: string,
): Promise<TravelReceiptDraftRow[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_receipt_drafts")
    .select(receiptSelection)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false })
    .returns<TravelReceiptDraftRow[]>();

  if (error || !data) {
    return null;
  }

  return data;
};

const readTripReceiptDraftById = async (params: {
  tripId: string;
  receiptDraftId: string;
}): Promise<TravelReceiptDraftRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_receipt_drafts")
    .select(receiptSelection)
    .eq("trip_id", params.tripId)
    .eq("id", params.receiptDraftId)
    .maybeSingle<TravelReceiptDraftRow>();

  if (error || !data) {
    return null;
  }

  return data;
};

const buildTripPayload = async (
  tripRow: TravelTripRow,
): Promise<TravelTripPayload | null> => {
  const members = await readTripMembers(tripRow.id);
  if (!members) {
    return null;
  }

  const expenses = await readTripExpenses(tripRow.id);
  if (!expenses) {
    return null;
  }

  const splits = await readExpenseSplits(expenses.map((expense) => expense.id));
  if (!splits) {
    return null;
  }

  const settlementRows = await readTripSettlementItems(tripRow.id);
  if (!settlementRows) {
    return null;
  }

  const receiptRows = await readTripReceiptDrafts(tripRow.id);
  if (!receiptRows) {
    return null;
  }

  const memberPayloads = members.map(toTripMemberPayload);
  const memberNameById = new Map(
    memberPayloads.map((member) => [member.id, member.displayName]),
  );

  const splitsByExpenseId = new Map<string, TravelExpenseSplitRow[]>();
  for (const split of splits) {
    const bucket = splitsByExpenseId.get(split.expense_id) ?? [];
    bucket.push(split);
    splitsByExpenseId.set(split.expense_id, bucket);
  }

  const expensePayloads = expenses.map((expense) =>
    toExpensePayload({
      row: expense,
      memberNameById,
      splits: splitsByExpenseId.get(expense.id) ?? [],
    }),
  );

  const calculatedSummary = buildTravelTripSummary({
    members: memberPayloads.map((member) => ({
      id: member.id,
      displayName: member.displayName,
    })),
    expenses: expensePayloads.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      paidByMemberId: expense.paidByMemberId,
      splits: expense.splits.map((split) => ({
        memberId: split.memberId,
        shareAmount: split.shareAmount,
      })),
    })),
  });

  const settlementItems = settlementRows.map((row) =>
    toSettlementItemPayload({
      row,
      memberNameById,
    }),
  );

  const settlementOverview = buildTravelSettlementOverview({
    tripStatus: tripRow.status,
    recommendedSettlements: calculatedSummary.settlements,
    settlementItems,
  });

  const receiptDrafts = receiptRows.map(toReceiptDraftPayload);

  return {
    id: tripRow.id,
    workspaceId: tripRow.workspace_id,
    title: tripRow.title,
    baseCurrency: tripRow.base_currency,
    description: tripRow.description,
    createdByProfileId: tripRow.created_by_profile_id,
    status: tripRow.status,
    closedAt: tripRow.closed_at,
    closureUpdatedAt: tripRow.closure_updated_at,
    createdAt: tripRow.created_at,
    updatedAt: tripRow.updated_at,
    members: memberPayloads,
    recentExpenses: expensePayloads,
    receiptDrafts,
    summary: {
      totalExpensesCount: calculatedSummary.totalExpensesCount,
      totalSpent: calculatedSummary.totalSpent,
      balances: calculatedSummary.balances,
      settlements: settlementOverview.unsettledSettlements,
      recommendedSettlements: calculatedSummary.settlements,
      settledSettlements: settlementOverview.settledSettlements,
      unsettledSettlementCount: settlementOverview.unsettledCount,
      settledSettlementCount: settlementOverview.settledCount,
      unsettledSettlementTotal: settlementOverview.unsettledTotal,
      settledSettlementTotal: settlementOverview.settledTotal,
      readyForClosure: settlementOverview.readyForClosure,
      settlementItems,
    },
  };
};

const readTripRowByWorkspaceAndId = async (
  workspaceId: string,
  tripId: string,
): Promise<TravelTripRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("travel_trips")
    .select(tripSelection)
    .eq("workspace_id", workspaceId)
    .eq("id", tripId)
    .maybeSingle<TravelTripRow>();

  if (error || !data) {
    return null;
  }

  return data;
};

const touchTripUpdatedAt = async (
  tripId: string,
  options?: { touchClosureUpdatedAt?: boolean },
): Promise<void> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();
  const patch: Record<string, string> = {
    updated_at: now,
  };
  if (options?.touchClosureUpdatedAt) {
    patch.closure_updated_at = now;
  }

  await supabase
    .from("travel_trips")
    .update(patch)
    .eq("id", tripId);
};

export const listTravelTripsByWorkspace = async (
  workspaceId: string,
): Promise<TravelTripListItemPayload[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: trips, error: tripsError } = await supabase
    .from("travel_trips")
    .select(tripSelection)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .returns<TravelTripRow[]>();

  if (tripsError || !trips) {
    return null;
  }

  if (trips.length === 0) {
    return [];
  }

  const tripIds = trips.map((trip) => trip.id);

  const { data: memberRows, error: memberRowsError } = await supabase
    .from("travel_trip_members")
    .select("trip_id")
    .in("trip_id", tripIds)
    .returns<TravelTripMemberCountRow[]>();

  if (memberRowsError || !memberRows) {
    return null;
  }

  const { data: expenseRows, error: expenseRowsError } = await supabase
    .from("travel_trip_expenses")
    .select("trip_id, amount")
    .in("trip_id", tripIds)
    .returns<TravelTripExpenseTotalRow[]>();

  if (expenseRowsError || !expenseRows) {
    return null;
  }

  const memberCountByTripId = new Map<string, number>();
  for (const row of memberRows) {
    memberCountByTripId.set(row.trip_id, (memberCountByTripId.get(row.trip_id) ?? 0) + 1);
  }

  const expenseCountByTripId = new Map<string, number>();
  const expenseTotalByTripId = new Map<string, number>();
  for (const row of expenseRows) {
    expenseCountByTripId.set(row.trip_id, (expenseCountByTripId.get(row.trip_id) ?? 0) + 1);
    expenseTotalByTripId.set(
      row.trip_id,
      (expenseTotalByTripId.get(row.trip_id) ?? 0) + toAmount(row.amount),
    );
  }

  return trips.map((trip) => ({
    id: trip.id,
    title: trip.title,
    baseCurrency: trip.base_currency,
    description: trip.description,
    memberCount: memberCountByTripId.get(trip.id) ?? 0,
    totalExpensesCount: expenseCountByTripId.get(trip.id) ?? 0,
    totalSpent: Number((expenseTotalByTripId.get(trip.id) ?? 0).toFixed(2)),
    status: trip.status,
    closedAt: trip.closed_at,
    updatedAt: trip.updated_at,
  }));
};

export const getTravelTripByWorkspaceAndId = async (
  workspaceId: string,
  tripId: string,
): Promise<TravelTripPayload | null> => {
  const tripRow = await readTripRowByWorkspaceAndId(workspaceId, tripId);
  if (!tripRow) {
    return null;
  }

  return buildTripPayload(tripRow);
};

export const createTravelTripForWorkspace = async (params: {
  workspaceId: string;
  profileId: string;
  input: TravelCreateTripInput;
}): Promise<TravelTripPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const now = new Date().toISOString();

  const { data: createdTrip, error: createdTripError } = await supabase
    .from("travel_trips")
    .insert({
      workspace_id: params.workspaceId,
      title: params.input.title,
      base_currency: params.input.baseCurrency,
      description: params.input.description,
      created_by_profile_id: params.profileId,
      updated_at: now,
    })
    .select(tripSelection)
    .single<TravelTripRow>();

  if (createdTripError || !createdTrip) {
    return null;
  }

  const memberRows = params.input.memberNames.map((displayName) => ({
    trip_id: createdTrip.id,
    display_name: displayName,
    updated_at: now,
  }));

  const { error: membersInsertError } = await supabase
    .from("travel_trip_members")
    .insert(memberRows);

  if (membersInsertError) {
    await supabase.from("travel_trips").delete().eq("id", createdTrip.id);
    return null;
  }

  return getTravelTripByWorkspaceAndId(params.workspaceId, createdTrip.id);
};

export type TravelReceiptDraftCreateResult =
  | {
      ok: true;
      receiptDraft: TravelReceiptDraftPayload;
      trip: TravelTripPayload;
    }
  | {
      ok: false;
      reason: "TRIP_NOT_FOUND" | "TRIP_NOT_ACTIVE" | "VALIDATION_FAILED" | "CREATE_FAILED";
      message: string;
    };

export type TravelReceiptDraftParseResult =
  | {
      ok: true;
      receiptDraft: TravelReceiptDraftPayload;
      trip: TravelTripPayload;
    }
  | {
      ok: false;
      reason:
        | "TRIP_NOT_FOUND"
        | "RECEIPT_NOT_FOUND"
        | "VALIDATION_FAILED"
        | "OCR_UNAVAILABLE"
        | "PARSE_FAILED";
      message: string;
    };

export type TravelReceiptDraftDeleteResult =
  | {
      ok: true;
      trip: TravelTripPayload;
      deletedReceiptDraftId: string;
    }
  | {
      ok: false;
      reason: "TRIP_NOT_FOUND" | "TRIP_NOT_ACTIVE" | "RECEIPT_NOT_FOUND" | "DELETE_FAILED";
      message: string;
    };

export type CreateTravelExpenseResult =
  | {
      ok: true;
      expense: TravelTripExpensePayload;
      trip: TravelTripPayload;
    }
  | {
      ok: false;
      reason:
        | "TRIP_NOT_FOUND"
        | "TRIP_NOT_ACTIVE"
        | "VALIDATION_FAILED"
        | "CREATE_FAILED";
      message: string;
    };

export type UpdateTravelExpenseResult =
  | {
      ok: true;
      expense: TravelTripExpensePayload;
      trip: TravelTripPayload;
    }
  | {
      ok: false;
      reason:
        | "TRIP_NOT_FOUND"
        | "TRIP_NOT_ACTIVE"
        | "EXPENSE_NOT_FOUND"
        | "VALIDATION_FAILED"
        | "CREATE_FAILED";
      message: string;
    };

export type DeleteTravelExpenseResult =
  | {
      ok: true;
      trip: TravelTripPayload;
      deletedExpenseId: string;
    }
  | {
      ok: false;
      reason:
        | "TRIP_NOT_FOUND"
        | "TRIP_NOT_ACTIVE"
        | "EXPENSE_NOT_FOUND"
        | "CREATE_FAILED";
      message: string;
    };

export type TravelTripClosureResult =
  | {
      ok: true;
      action: TravelTripClosureAction;
      trip: TravelTripPayload;
    }
  | {
      ok: false;
      reason: "TRIP_NOT_FOUND" | "INVALID_STATE" | "BLOCKED" | "FAILED";
      message: string;
    };

export type TravelSettlementItemStatusResult =
  | {
      ok: true;
      trip: TravelTripPayload;
      settlementItemId: string;
      status: TravelSettlementItemStatus;
    }
  | {
      ok: false;
      reason: "TRIP_NOT_FOUND" | "INVALID_STATE" | "SETTLEMENT_NOT_FOUND" | "FAILED";
      message: string;
    };

const finalizeTravelReceiptDraftForTripExpense = async (params: {
  tripId: string;
  receiptDraftId: string;
  expenseId: string;
}): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("travel_receipt_drafts")
    .update({
      status: "finalized" satisfies TravelReceiptDraftStatus,
      finalized_expense_id: params.expenseId,
      finalized_at: now,
      updated_at: now,
    })
    .eq("trip_id", params.tripId)
    .eq("id", params.receiptDraftId)
    .neq("status", "finalized");

  return !error;
};

export const createTravelReceiptDraftForTrip = async (params: {
  workspaceId: string;
  profileId: string;
  tripId: string;
  input: TravelCreateReceiptDraftInput;
}): Promise<TravelReceiptDraftCreateResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  if (tripRow.status !== "active") {
    return {
      ok: false,
      reason: "TRIP_NOT_ACTIVE",
      message: "Trip is not active. Reopen trip editing to add new receipt drafts.",
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("travel_receipt_drafts")
    .insert({
      trip_id: params.tripId,
      workspace_id: params.workspaceId,
      created_by_profile_id: params.profileId,
      status: "draft" satisfies TravelReceiptDraftStatus,
      image_data_url: params.input.imageDataUrl,
      image_mime_type: params.input.imageMimeType,
      image_file_name: params.input.imageFileName,
      updated_at: now,
    })
    .select(receiptSelection)
    .single<TravelReceiptDraftRow>();

  if (error || !data) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to save receipt draft.",
    };
  }

  await touchTripUpdatedAt(params.tripId);

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Receipt draft saved but failed to refresh trip snapshot.",
    };
  }

  return {
    ok: true,
    receiptDraft: toReceiptDraftPayload(data),
    trip,
  };
};

export const parseTravelReceiptDraftForTrip = async (params: {
  workspaceId: string;
  tripId: string;
  receiptDraftId: string;
}): Promise<TravelReceiptDraftParseResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "PARSE_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  const receiptRow = await readTripReceiptDraftById({
    tripId: params.tripId,
    receiptDraftId: params.receiptDraftId,
  });

  if (!receiptRow) {
    return {
      ok: false,
      reason: "RECEIPT_NOT_FOUND",
      message: "Receipt draft was not found.",
    };
  }

  if (receiptRow.status === "finalized") {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: "Receipt draft is already finalized and linked to saved expense.",
    };
  }

  const ocrResult = await runTravelReceiptOcr({
    imageDataUrl: receiptRow.image_data_url,
    tripCurrency: tripRow.base_currency,
  });

  if (!ocrResult.ok) {
    if (!ocrResult.unavailable) {
      const now = new Date().toISOString();
      await supabase
        .from("travel_receipt_drafts")
        .update({
          status: "ocr_failed" satisfies TravelReceiptDraftStatus,
          ocr_last_error: ocrResult.message,
          parsed_at: now,
          updated_at: now,
        })
        .eq("trip_id", params.tripId)
        .eq("id", params.receiptDraftId);
    }

    return {
      ok: false,
      reason: ocrResult.unavailable ? "OCR_UNAVAILABLE" : "PARSE_FAILED",
      message: ocrResult.message,
    };
  }

  const now = new Date().toISOString();
  const descriptionFromOcr =
    ocrResult.data.description ?? ocrResult.data.merchant ?? null;
  const { data, error } = await supabase
    .from("travel_receipt_drafts")
    .update({
      status: "parsed" satisfies TravelReceiptDraftStatus,
      ocr_raw_text: ocrResult.data.rawText,
      ocr_suggested_amount: ocrResult.data.sourceAmount,
      ocr_suggested_currency: ocrResult.data.sourceCurrency,
      ocr_suggested_spent_at: ocrResult.data.spentAt,
      ocr_suggested_merchant: ocrResult.data.merchant,
      ocr_suggested_description: descriptionFromOcr,
      ocr_suggested_category: ocrResult.data.category,
      ocr_suggested_conversion_rate: ocrResult.data.conversionRate,
      ocr_last_error: null,
      parsed_at: now,
      updated_at: now,
    })
    .eq("trip_id", params.tripId)
    .eq("id", params.receiptDraftId)
    .select(receiptSelection)
    .single<TravelReceiptDraftRow>();

  if (error || !data) {
    return {
      ok: false,
      reason: "PARSE_FAILED",
      message: "OCR result was created but failed to update receipt draft.",
    };
  }

  await touchTripUpdatedAt(params.tripId);

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "PARSE_FAILED",
      message: "Receipt draft parsed but failed to refresh trip snapshot.",
    };
  }

  return {
    ok: true,
    receiptDraft: toReceiptDraftPayload(data),
    trip,
  };
};

export const deleteTravelReceiptDraftForTrip = async (params: {
  workspaceId: string;
  tripId: string;
  receiptDraftId: string;
}): Promise<TravelReceiptDraftDeleteResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "DELETE_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  if (tripRow.status !== "active") {
    return {
      ok: false,
      reason: "TRIP_NOT_ACTIVE",
      message: "Trip is not active. Reopen trip editing to manage receipt drafts.",
    };
  }

  const receiptRow = await readTripReceiptDraftById({
    tripId: params.tripId,
    receiptDraftId: params.receiptDraftId,
  });

  if (!receiptRow) {
    return {
      ok: false,
      reason: "RECEIPT_NOT_FOUND",
      message: "Receipt draft was not found.",
    };
  }

  if (receiptRow.status === "finalized") {
    return {
      ok: false,
      reason: "TRIP_NOT_ACTIVE",
      message: "Finalized receipt draft is linked to saved expense and cannot be deleted.",
    };
  }

  const { error } = await supabase
    .from("travel_receipt_drafts")
    .delete()
    .eq("trip_id", params.tripId)
    .eq("id", params.receiptDraftId);

  if (error) {
    return {
      ok: false,
      reason: "DELETE_FAILED",
      message: "Failed to delete receipt draft.",
    };
  }

  await touchTripUpdatedAt(params.tripId);

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "DELETE_FAILED",
      message: "Receipt draft deleted but failed to refresh trip snapshot.",
    };
  }

  return {
    ok: true,
    trip,
    deletedReceiptDraftId: params.receiptDraftId,
  };
};

export const createTravelExpenseForTrip = async (params: {
  workspaceId: string;
  profileId: string;
  tripId: string;
  input: TravelCreateExpenseInput;
}): Promise<CreateTravelExpenseResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  if (tripRow.status !== "active") {
    return {
      ok: false,
      reason: "TRIP_NOT_ACTIVE",
      message: "Trip is not active. Reopen trip editing to add or update expenses.",
    };
  }

  const members = await readTripMembers(params.tripId);
  if (!members || members.length === 0) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: "Trip members are missing.",
    };
  }

  const memberPayloads = members.map(toTripMemberPayload);
  const memberNameById = new Map(
    memberPayloads.map((member) => [member.id, member.displayName]),
  );
  if (!memberNameById.has(params.input.paidByMemberId)) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: "Expense payer must be a trip member.",
    };
  }

  let receiptDraftRow: TravelReceiptDraftRow | null = null;
  if (params.input.receiptDraftId) {
    receiptDraftRow = await readTripReceiptDraftById({
      tripId: params.tripId,
      receiptDraftId: params.input.receiptDraftId,
    });

    if (!receiptDraftRow) {
      return {
        ok: false,
        reason: "VALIDATION_FAILED",
        message: "Receipt draft was not found.",
      };
    }

    if (receiptDraftRow.workspace_id !== params.workspaceId) {
      return {
        ok: false,
        reason: "VALIDATION_FAILED",
        message: "Receipt draft does not belong to current workspace.",
      };
    }

    if (receiptDraftRow.status === "finalized") {
      return {
        ok: false,
        reason: "VALIDATION_FAILED",
        message: "Receipt draft is already finalized and linked to saved expense.",
      };
    }
  }

  const normalizedAmount = normalizeTravelExpenseAmount({
    sourceAmount: params.input.amount,
    sourceCurrency: params.input.expenseCurrency,
    tripCurrency: tripRow.base_currency,
    conversionRate: params.input.conversionRate,
  });
  if (!normalizedAmount.ok) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: normalizedAmount.message,
    };
  }

  const splitResult = resolveTravelExpenseSplits({
    totalAmount: normalizedAmount.data.tripAmount,
    splitMode: params.input.splitMode,
    members: memberPayloads.map((member): TravelSplitEngineMember => ({
      id: member.id,
      displayName: member.displayName,
    })),
    selectedMemberIds: params.input.selectedMemberIds,
    fullAmountMemberId: params.input.fullAmountMemberId,
    manualSplits: params.input.manualSplits,
  });

  if (!splitResult.ok) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: splitResult.message,
    };
  }

  const now = new Date().toISOString();
  const spentAt = params.input.spentAt ?? now;

  const { data: createdExpense, error: createdExpenseError } = await supabase
    .from("travel_trip_expenses")
    .insert({
      trip_id: params.tripId,
      paid_by_member_id: params.input.paidByMemberId,
      source_amount: normalizedAmount.data.sourceAmount,
      source_currency: normalizedAmount.data.sourceCurrency,
      conversion_rate: normalizedAmount.data.conversionRate,
      amount: normalizedAmount.data.tripAmount,
      currency: tripRow.base_currency,
      description: params.input.description,
      category: params.input.category,
      split_mode: params.input.splitMode,
      spent_at: spentAt,
      created_by_profile_id: params.profileId,
      updated_at: now,
    })
    .select(expenseSelection)
    .single<TravelTripExpenseRow>();

  if (createdExpenseError || !createdExpense) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to create trip expense.",
    };
  }

  const splitInsertRows = splitResult.splits.map((split) => ({
    expense_id: createdExpense.id,
    trip_id: params.tripId,
    member_id: split.memberId,
    share_amount: split.shareAmount,
    updated_at: now,
  }));

  const { error: splitsInsertError } = await supabase
    .from("travel_expense_splits")
    .insert(splitInsertRows);

  if (splitsInsertError) {
    await supabase.from("travel_trip_expenses").delete().eq("id", createdExpense.id);
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to save expense split rows.",
    };
  }

  if (receiptDraftRow && params.input.receiptDraftId) {
    const finalizeOk = await finalizeTravelReceiptDraftForTripExpense({
      tripId: params.tripId,
      receiptDraftId: params.input.receiptDraftId,
      expenseId: createdExpense.id,
    });

    if (!finalizeOk) {
      await supabase.from("travel_trip_expenses").delete().eq("id", createdExpense.id);
      return {
        ok: false,
        reason: "CREATE_FAILED",
        message: "Failed to finalize receipt draft linkage for created expense.",
      };
    }
  }

  await touchTripUpdatedAt(params.tripId);

  const expensePayload = toExpensePayload({
    row: createdExpense,
    memberNameById,
    splits: splitInsertRows.map((split, index) => ({
      id: `${createdExpense.id}-${index}`,
      expense_id: createdExpense.id,
      member_id: split.member_id,
      share_amount: split.share_amount,
      created_at: now,
      updated_at: now,
    })),
  });

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Expense was created but failed to refresh trip snapshot.",
    };
  }

  return {
    ok: true,
    expense: expensePayload,
    trip,
  };
};

export const updateTravelExpenseForTrip = async (params: {
  workspaceId: string;
  tripId: string;
  expenseId: string;
  input: TravelCreateExpenseInput;
}): Promise<UpdateTravelExpenseResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  if (tripRow.status !== "active") {
    return {
      ok: false,
      reason: "TRIP_NOT_ACTIVE",
      message: "Trip is not active. Reopen trip editing to add or update expenses.",
    };
  }

  const existingExpense = await readExpenseRowByTripAndId(
    params.tripId,
    params.expenseId,
  );
  if (!existingExpense) {
    return {
      ok: false,
      reason: "EXPENSE_NOT_FOUND",
      message: "Trip expense was not found.",
    };
  }

  const members = await readTripMembers(params.tripId);
  if (!members || members.length === 0) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: "Trip members are missing.",
    };
  }

  const memberPayloads = members.map(toTripMemberPayload);
  const memberNameById = new Map(
    memberPayloads.map((member) => [member.id, member.displayName]),
  );
  if (!memberNameById.has(params.input.paidByMemberId)) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: "Expense payer must be a trip member.",
    };
  }

  const normalizedAmount = normalizeTravelExpenseAmount({
    sourceAmount: params.input.amount,
    sourceCurrency: params.input.expenseCurrency,
    tripCurrency: tripRow.base_currency,
    conversionRate: params.input.conversionRate,
  });
  if (!normalizedAmount.ok) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: normalizedAmount.message,
    };
  }

  const splitResult = resolveTravelExpenseSplits({
    totalAmount: normalizedAmount.data.tripAmount,
    splitMode: params.input.splitMode,
    members: memberPayloads.map((member): TravelSplitEngineMember => ({
      id: member.id,
      displayName: member.displayName,
    })),
    selectedMemberIds: params.input.selectedMemberIds,
    fullAmountMemberId: params.input.fullAmountMemberId,
    manualSplits: params.input.manualSplits,
  });

  if (!splitResult.ok) {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      message: splitResult.message,
    };
  }

  const now = new Date().toISOString();
  const spentAt = params.input.spentAt ?? now;

  const existingSplits = await readExpenseSplits([params.expenseId]);
  if (!existingSplits) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to read existing expense split rows.",
    };
  }

  const { data: updatedExpense, error: updateExpenseError } = await supabase
    .from("travel_trip_expenses")
    .update({
      paid_by_member_id: params.input.paidByMemberId,
      source_amount: normalizedAmount.data.sourceAmount,
      source_currency: normalizedAmount.data.sourceCurrency,
      conversion_rate: normalizedAmount.data.conversionRate,
      amount: normalizedAmount.data.tripAmount,
      currency: tripRow.base_currency,
      description: params.input.description,
      category: params.input.category,
      split_mode: params.input.splitMode,
      spent_at: spentAt,
      updated_at: now,
    })
    .eq("id", params.expenseId)
    .eq("trip_id", params.tripId)
    .select(expenseSelection)
    .single<TravelTripExpenseRow>();

  if (updateExpenseError || !updatedExpense) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to update trip expense.",
    };
  }

  const { error: deleteOldSplitsError } = await supabase
    .from("travel_expense_splits")
    .delete()
    .eq("expense_id", params.expenseId);

  if (deleteOldSplitsError) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to refresh expense split rows.",
    };
  }

  const splitInsertRows = splitResult.splits.map((split) => ({
    expense_id: params.expenseId,
    trip_id: params.tripId,
    member_id: split.memberId,
    share_amount: split.shareAmount,
    updated_at: now,
  }));

  const { error: insertNewSplitsError } = await supabase
    .from("travel_expense_splits")
    .insert(splitInsertRows);

  if (insertNewSplitsError) {
    if (existingSplits.length > 0) {
      await supabase.from("travel_expense_splits").insert(
        existingSplits.map((split) => ({
          expense_id: split.expense_id,
          trip_id: params.tripId,
          member_id: split.member_id,
          share_amount: toAmount(split.share_amount),
          updated_at: split.updated_at,
        })),
      );
    }

    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to save expense split rows.",
    };
  }

  await touchTripUpdatedAt(params.tripId);

  const expensePayload = toExpensePayload({
    row: updatedExpense,
    memberNameById,
    splits: splitInsertRows.map((split, index) => ({
      id: `${updatedExpense.id}-updated-${index}`,
      expense_id: updatedExpense.id,
      member_id: split.member_id,
      share_amount: split.share_amount,
      created_at: now,
      updated_at: now,
    })),
  });

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Expense was updated but failed to refresh trip snapshot.",
    };
  }

  return {
    ok: true,
    expense: expensePayload,
    trip,
  };
};

export const deleteTravelExpenseForTrip = async (params: {
  workspaceId: string;
  tripId: string;
  expenseId: string;
}): Promise<DeleteTravelExpenseResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  if (tripRow.status !== "active") {
    return {
      ok: false,
      reason: "TRIP_NOT_ACTIVE",
      message: "Trip is not active. Reopen trip editing to add or update expenses.",
    };
  }

  const existingExpense = await readExpenseRowByTripAndId(
    params.tripId,
    params.expenseId,
  );
  if (!existingExpense) {
    return {
      ok: false,
      reason: "EXPENSE_NOT_FOUND",
      message: "Trip expense was not found.",
    };
  }

  const { error: deleteExpenseError } = await supabase
    .from("travel_trip_expenses")
    .delete()
    .eq("id", params.expenseId)
    .eq("trip_id", params.tripId);

  if (deleteExpenseError) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Failed to delete trip expense.",
    };
  }

  await touchTripUpdatedAt(params.tripId);

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "CREATE_FAILED",
      message: "Expense was deleted but failed to refresh trip snapshot.",
    };
  }

  return {
    ok: true,
    trip,
    deletedExpenseId: params.expenseId,
  };
};

const replaceTripSettlementItems = async (params: {
  tripId: string;
  recommendedSettlements: TravelTripPayload["summary"]["recommendedSettlements"];
}): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const now = new Date().toISOString();
  const { error: deleteError } = await supabase
    .from("travel_trip_settlement_items")
    .delete()
    .eq("trip_id", params.tripId);

  if (deleteError) {
    return false;
  }

  if (params.recommendedSettlements.length === 0) {
    return true;
  }

  const rows = params.recommendedSettlements.map((item) => ({
    trip_id: params.tripId,
    from_member_id: item.fromMemberId,
    to_member_id: item.toMemberId,
    amount: toAmount(item.amount),
    status: "open" satisfies TravelSettlementItemStatus,
    settled_at: null,
    updated_at: now,
  }));

  const { error: insertError } = await supabase
    .from("travel_trip_settlement_items")
    .insert(rows);

  return !insertError;
};

export const mutateTravelTripClosureForTrip = async (params: {
  workspaceId: string;
  tripId: string;
  action: TravelTripClosureAction;
  allowUnsettled: boolean;
}): Promise<TravelTripClosureResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  const now = new Date().toISOString();

  if (params.action === "start") {
    if (tripRow.status !== "active") {
      return {
        ok: false,
        reason: "INVALID_STATE",
        message: "Only active trips can start settlement finalization.",
      };
    }

    const tripSnapshot = await buildTripPayload(tripRow);
    if (!tripSnapshot) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Failed to prepare trip settlement finalization snapshot.",
      };
    }

    const replaced = await replaceTripSettlementItems({
      tripId: params.tripId,
      recommendedSettlements: tripSnapshot.summary.recommendedSettlements,
    });
    if (!replaced) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Failed to initialize settlement items for trip finalization.",
      };
    }

    const { error: statusError } = await supabase
      .from("travel_trips")
      .update({
        status: "closing" satisfies TravelTripStatus,
        closed_at: null,
        closure_updated_at: now,
        updated_at: now,
      })
      .eq("id", params.tripId)
      .eq("workspace_id", params.workspaceId);

    if (statusError) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Failed to start trip settlement finalization.",
      };
    }

    const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
    if (!trip) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Trip finalization started but refresh failed.",
      };
    }

    return {
      ok: true,
      action: "start",
      trip,
    };
  }

  if (params.action === "close") {
    if (tripRow.status !== "closing") {
      return {
        ok: false,
        reason: "INVALID_STATE",
        message: "Trip must be in settlement finalization mode before closing.",
      };
    }

    const closingSnapshot = await getTravelTripByWorkspaceAndId(
      params.workspaceId,
      params.tripId,
    );
    if (!closingSnapshot) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Failed to load settlement finalization state.",
      };
    }

    const openCount = closingSnapshot.summary.unsettledSettlementCount;
    if (openCount > 0 && !params.allowUnsettled) {
      return {
        ok: false,
        reason: "BLOCKED",
        message:
          "Trip still has unsettled transfers. Settle them or close with explicit confirmation.",
      };
    }

    const { error: statusError } = await supabase
      .from("travel_trips")
      .update({
        status: "closed" satisfies TravelTripStatus,
        closed_at: now,
        closure_updated_at: now,
        updated_at: now,
      })
      .eq("id", params.tripId)
      .eq("workspace_id", params.workspaceId);

    if (statusError) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Failed to close trip.",
      };
    }

    const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
    if (!trip) {
      return {
        ok: false,
        reason: "FAILED",
        message: "Trip closed but refresh failed.",
      };
    }

    return {
      ok: true,
      action: "close",
      trip,
    };
  }

  if (tripRow.status === "active") {
    return {
      ok: false,
      reason: "INVALID_STATE",
      message: "Trip is already active.",
    };
  }

  const { error: cleanupError } = await supabase
    .from("travel_trip_settlement_items")
    .delete()
    .eq("trip_id", params.tripId);

  if (cleanupError) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Failed to clear settlement finalization snapshot for reopen.",
    };
  }

  const { error: statusError } = await supabase
    .from("travel_trips")
    .update({
      status: "active" satisfies TravelTripStatus,
      closed_at: null,
      closure_updated_at: now,
      updated_at: now,
    })
    .eq("id", params.tripId)
    .eq("workspace_id", params.workspaceId);

  if (statusError) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Failed to reopen trip.",
    };
  }

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Trip reopened but refresh failed.",
    };
  }

  return {
    ok: true,
    action: "reopen",
    trip,
  };
};

export const updateTravelSettlementItemStatusForTrip = async (params: {
  workspaceId: string;
  tripId: string;
  settlementItemId: string;
  markSettled: boolean;
}): Promise<TravelSettlementItemStatusResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const tripRow = await readTripRowByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!tripRow) {
    return {
      ok: false,
      reason: "TRIP_NOT_FOUND",
      message: "Trip was not found in current workspace.",
    };
  }

  if (tripRow.status !== "closing") {
    return {
      ok: false,
      reason: "INVALID_STATE",
      message: "Settlement items can be updated only while trip is in finalization mode.",
    };
  }

  const settlementRow = await readTripSettlementItemById({
    tripId: params.tripId,
    settlementItemId: params.settlementItemId,
  });

  if (!settlementRow) {
    return {
      ok: false,
      reason: "SETTLEMENT_NOT_FOUND",
      message: "Settlement item was not found.",
    };
  }

  const now = new Date().toISOString();
  const nextStatus: TravelSettlementItemStatus = params.markSettled
    ? "settled"
    : "open";

  const { error: updateError } = await supabase
    .from("travel_trip_settlement_items")
    .update({
      status: nextStatus,
      settled_at: params.markSettled ? now : null,
      updated_at: now,
    })
    .eq("id", params.settlementItemId)
    .eq("trip_id", params.tripId);

  if (updateError) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Failed to update settlement item status.",
    };
  }

  await touchTripUpdatedAt(params.tripId, { touchClosureUpdatedAt: true });

  const trip = await getTravelTripByWorkspaceAndId(params.workspaceId, params.tripId);
  if (!trip) {
    return {
      ok: false,
      reason: "FAILED",
      message: "Settlement item updated but trip refresh failed.",
    };
  }

  return {
    ok: true,
    trip,
    settlementItemId: params.settlementItemId,
    status: nextStatus,
  };
};


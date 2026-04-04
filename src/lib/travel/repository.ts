import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildTravelTripSummary,
  resolveTravelExpenseSplits,
  type TravelSplitEngineMember,
} from "@/lib/travel/split";
import type {
  TravelCreateExpenseInput,
  TravelCreateTripInput,
  TravelTripExpensePayload,
  TravelTripListItemPayload,
  TravelTripMemberPayload,
  TravelTripPayload,
} from "@/lib/travel/types";

type TravelTripRow = {
  id: string;
  workspace_id: string;
  title: string;
  base_currency: string;
  description: string | null;
  created_by_profile_id: string | null;
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

type TravelTripMemberCountRow = {
  trip_id: string;
};

type TravelTripExpenseTotalRow = {
  trip_id: string;
  amount: number | string;
};

const tripSelection =
  "id, workspace_id, title, base_currency, description, created_by_profile_id, created_at, updated_at";
const memberSelection =
  "id, trip_id, profile_id, telegram_user_id, display_name, created_at, updated_at";
const expenseSelection =
  "id, trip_id, paid_by_member_id, amount, currency, description, category, split_mode, spent_at, created_at, updated_at";
const splitSelection =
  "id, expense_id, member_id, share_amount, created_at, updated_at";

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

  return {
    id: params.row.id,
    tripId: params.row.trip_id,
    paidByMemberId: params.row.paid_by_member_id,
    paidByMemberDisplayName:
      params.memberNameById.get(params.row.paid_by_member_id) ?? "Unknown member",
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

  const summary = buildTravelTripSummary({
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

  return {
    id: tripRow.id,
    workspaceId: tripRow.workspace_id,
    title: tripRow.title,
    baseCurrency: tripRow.base_currency,
    description: tripRow.description,
    createdByProfileId: tripRow.created_by_profile_id,
    createdAt: tripRow.created_at,
    updatedAt: tripRow.updated_at,
    members: memberPayloads,
    recentExpenses: expensePayloads,
    summary,
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

const touchTripUpdatedAt = async (tripId: string): Promise<void> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("travel_trips")
    .update({ updated_at: new Date().toISOString() })
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

export type CreateTravelExpenseResult =
  | {
      ok: true;
      expense: TravelTripExpensePayload;
      trip: TravelTripPayload;
    }
  | {
      ok: false;
      reason: "TRIP_NOT_FOUND" | "VALIDATION_FAILED" | "CREATE_FAILED";
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
      reason: "TRIP_NOT_FOUND" | "EXPENSE_NOT_FOUND" | "CREATE_FAILED";
      message: string;
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

  const splitResult = resolveTravelExpenseSplits({
    totalAmount: params.input.amount,
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
      amount: params.input.amount,
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

  const splitResult = resolveTravelExpenseSplits({
    totalAmount: params.input.amount,
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
      amount: params.input.amount,
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

import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import {
  deleteTravelExpenseForTrip,
  updateTravelExpenseForTrip,
} from "@/lib/travel/repository";
import { validateTravelCreateExpenseInput } from "@/lib/travel/validation";
import type {
  TravelApiError,
  TravelExpenseDeleteResponse,
  TravelExpenseMutateResponse,
} from "@/lib/travel/types";

type UpdateTravelExpenseBody = {
  initData?: string;
  amount?: unknown;
  paidByMemberId?: unknown;
  description?: unknown;
  category?: unknown;
  splitMode?: unknown;
  selectedMemberIds?: unknown;
  fullAmountMemberId?: unknown;
  manualSplits?: unknown;
  spentAt?: unknown;
};

type DeleteTravelExpenseBody = {
  initData?: string;
};

type RouteContext = {
  params: Promise<{ tripId: string; expenseId: string }>;
};

const codeToStatus: Record<TravelApiError["error"]["code"], number> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
  APP_CONTEXT_NOT_INITIALIZED: 409,
  WORKSPACE_NOT_FOUND: 404,
  WORKSPACE_LIST_FAILED: 500,
  WORKSPACE_UNAVAILABLE: 409,
  TRAVEL_TRIP_VALIDATION_FAILED: 400,
  TRAVEL_TRIP_LIST_FAILED: 500,
  TRAVEL_TRIP_CREATE_FAILED: 500,
  TRAVEL_TRIP_NOT_FOUND: 404,
  TRAVEL_TRIP_EDIT_LOCKED: 409,
  TRAVEL_TRIP_CLOSURE_INVALID_STATE: 409,
  TRAVEL_TRIP_CLOSURE_BLOCKED: 409,
  TRAVEL_TRIP_CLOSURE_FAILED: 500,
  TRAVEL_EXPENSE_VALIDATION_FAILED: 400,
  TRAVEL_EXPENSE_CREATE_FAILED: 500,
  TRAVEL_EXPENSE_UPDATE_FAILED: 500,
  TRAVEL_EXPENSE_DELETE_FAILED: 500,
  TRAVEL_SETTLEMENT_NOT_FOUND: 404,
  TRAVEL_SETTLEMENT_UPDATE_FAILED: 500,
};

const jsonUpdateError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelExpenseMutateResponse>(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

const jsonDeleteError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelExpenseDeleteResponse>(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonUpdateError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId, expenseId } = await context.params;
  if (!tripId) {
    return jsonUpdateError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  if (!expenseId) {
    return jsonUpdateError("TRAVEL_TRIP_NOT_FOUND", "Trip expense id is required.");
  }

  let body: UpdateTravelExpenseBody = {};
  try {
    body = (await request.json()) as UpdateTravelExpenseBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonUpdateError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateTravelCreateExpenseInput({
    amount: body.amount,
    paidByMemberId: body.paidByMemberId,
    description: body.description,
    category: body.category,
    splitMode: body.splitMode,
    selectedMemberIds: body.selectedMemberIds,
    fullAmountMemberId: body.fullAmountMemberId,
    manualSplits: body.manualSplits,
    spentAt: body.spentAt,
  });

  if (!validationResult.ok) {
    return jsonUpdateError(
      "TRAVEL_EXPENSE_VALIDATION_FAILED",
      validationResult.message,
    );
  }

  const updateResult = await updateTravelExpenseForTrip({
    workspaceId: scopeResult.workspace.id,
    tripId,
    expenseId,
    input: validationResult.data,
  });

  if (!updateResult.ok) {
    if (updateResult.reason === "TRIP_NOT_FOUND") {
      return jsonUpdateError("TRAVEL_TRIP_NOT_FOUND", updateResult.message);
    }

    if (updateResult.reason === "TRIP_NOT_ACTIVE") {
      return jsonUpdateError("TRAVEL_TRIP_EDIT_LOCKED", updateResult.message);
    }

    if (updateResult.reason === "EXPENSE_NOT_FOUND") {
      return jsonUpdateError("TRAVEL_TRIP_NOT_FOUND", updateResult.message);
    }

    if (updateResult.reason === "VALIDATION_FAILED") {
      return jsonUpdateError("TRAVEL_EXPENSE_VALIDATION_FAILED", updateResult.message);
    }

    return jsonUpdateError("TRAVEL_EXPENSE_UPDATE_FAILED", updateResult.message);
  }

  return NextResponse.json<TravelExpenseMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: updateResult.trip,
    expense: updateResult.expense,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonDeleteError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId, expenseId } = await context.params;
  if (!tripId) {
    return jsonDeleteError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  if (!expenseId) {
    return jsonDeleteError("TRAVEL_TRIP_NOT_FOUND", "Trip expense id is required.");
  }

  let body: DeleteTravelExpenseBody = {};
  try {
    body = (await request.json()) as DeleteTravelExpenseBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonDeleteError(scopeResult.error.code, scopeResult.error.message);
  }

  const deleteResult = await deleteTravelExpenseForTrip({
    workspaceId: scopeResult.workspace.id,
    tripId,
    expenseId,
  });

  if (!deleteResult.ok) {
    if (deleteResult.reason === "TRIP_NOT_FOUND") {
      return jsonDeleteError("TRAVEL_TRIP_NOT_FOUND", deleteResult.message);
    }

    if (deleteResult.reason === "TRIP_NOT_ACTIVE") {
      return jsonDeleteError("TRAVEL_TRIP_EDIT_LOCKED", deleteResult.message);
    }

    if (deleteResult.reason === "EXPENSE_NOT_FOUND") {
      return jsonDeleteError("TRAVEL_TRIP_NOT_FOUND", deleteResult.message);
    }

    return jsonDeleteError("TRAVEL_EXPENSE_DELETE_FAILED", deleteResult.message);
  }

  return NextResponse.json<TravelExpenseDeleteResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: deleteResult.trip,
    deletedExpenseId: deleteResult.deletedExpenseId,
  });
}

import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { createTravelExpenseForTrip } from "@/lib/travel/repository";
import { validateTravelCreateExpenseInput } from "@/lib/travel/validation";
import type { TravelApiError, TravelExpenseMutateResponse } from "@/lib/travel/types";

type CreateTravelExpenseBody = {
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

type RouteContext = {
  params: Promise<{ tripId: string }>;
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
  TRAVEL_EXPENSE_VALIDATION_FAILED: 400,
  TRAVEL_EXPENSE_CREATE_FAILED: 500,
  TRAVEL_EXPENSE_UPDATE_FAILED: 500,
  TRAVEL_EXPENSE_DELETE_FAILED: 500,
};

const jsonError = (
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

export async function POST(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId } = await context.params;
  if (!tripId) {
    return jsonError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  let body: CreateTravelExpenseBody = {};
  try {
    body = (await request.json()) as CreateTravelExpenseBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
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
    return jsonError("TRAVEL_EXPENSE_VALIDATION_FAILED", validationResult.message);
  }

  const expenseResult = await createTravelExpenseForTrip({
    workspaceId: scopeResult.workspace.id,
    profileId: scopeResult.profileId,
    tripId,
    input: validationResult.data,
  });

  if (!expenseResult.ok) {
    if (expenseResult.reason === "TRIP_NOT_FOUND") {
      return jsonError("TRAVEL_TRIP_NOT_FOUND", expenseResult.message);
    }

    if (expenseResult.reason === "VALIDATION_FAILED") {
      return jsonError("TRAVEL_EXPENSE_VALIDATION_FAILED", expenseResult.message);
    }

    return jsonError("TRAVEL_EXPENSE_CREATE_FAILED", expenseResult.message);
  }

  return NextResponse.json<TravelExpenseMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: expenseResult.trip,
    expense: expenseResult.expense,
  });
}

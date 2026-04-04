import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { mutateTravelTripClosureForTrip } from "@/lib/travel/repository";
import type {
  TravelApiError,
  TravelTripClosureAction,
  TravelTripClosureMutateResponse,
} from "@/lib/travel/types";

type MutateTravelTripClosureBody = {
  initData?: string;
  action?: unknown;
  allowUnsettled?: unknown;
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

const jsonError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelTripClosureMutateResponse>(
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

const normalizeClosureAction = (value: unknown): TravelTripClosureAction | null => {
  if (value === "start" || value === "close" || value === "reopen") {
    return value;
  }

  return null;
};

const normalizeAllowUnsettled = (value: unknown): boolean => {
  return value === true;
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

  let body: MutateTravelTripClosureBody = {};
  try {
    body = (await request.json()) as MutateTravelTripClosureBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const action = normalizeClosureAction(body.action);
  if (!action) {
    return jsonError(
      "TRAVEL_TRIP_CLOSURE_INVALID_STATE",
      "Closure action is invalid.",
    );
  }

  const closureResult = await mutateTravelTripClosureForTrip({
    workspaceId: scopeResult.workspace.id,
    tripId,
    action,
    allowUnsettled: normalizeAllowUnsettled(body.allowUnsettled),
  });

  if (!closureResult.ok) {
    if (closureResult.reason === "TRIP_NOT_FOUND") {
      return jsonError("TRAVEL_TRIP_NOT_FOUND", closureResult.message);
    }

    if (closureResult.reason === "INVALID_STATE") {
      return jsonError("TRAVEL_TRIP_CLOSURE_INVALID_STATE", closureResult.message);
    }

    if (closureResult.reason === "BLOCKED") {
      return jsonError("TRAVEL_TRIP_CLOSURE_BLOCKED", closureResult.message);
    }

    return jsonError("TRAVEL_TRIP_CLOSURE_FAILED", closureResult.message);
  }

  return NextResponse.json<TravelTripClosureMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: closureResult.trip,
    action: closureResult.action,
  });
}

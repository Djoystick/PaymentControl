import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { getTravelTripByWorkspaceAndId } from "@/lib/travel/repository";
import type { TravelApiError, TravelTripDetailResponse } from "@/lib/travel/types";

type ReadTravelTripBody = {
  initData?: string;
};

type RouteContext = {
  params: Promise<{ tripId: string }>;
};

const codeToStatus: Partial<Record<TravelApiError["error"]["code"], number>> = {
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
  return NextResponse.json<TravelTripDetailResponse>(
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

  let body: ReadTravelTripBody = {};
  try {
    body = (await request.json()) as ReadTravelTripBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const trip = await getTravelTripByWorkspaceAndId(scopeResult.workspace.id, tripId);
  if (!trip) {
    return jsonError(
      "TRAVEL_TRIP_NOT_FOUND",
      "Trip was not found in current workspace.",
    );
  }

  return NextResponse.json<TravelTripDetailResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip,
  });
}

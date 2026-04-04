import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { updateTravelTripMemberForTrip } from "@/lib/travel/repository";
import { validateTravelUpdateTripMemberInput } from "@/lib/travel/validation";
import type {
  TravelApiError,
  TravelTripMemberMutateResponse,
} from "@/lib/travel/types";

type UpdateTravelTripMemberBody = {
  initData?: string;
  displayName?: unknown;
  role?: unknown;
  status?: unknown;
};

type RouteContext = {
  params: Promise<{ tripId: string; memberId: string }>;
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
  TRAVEL_MEMBER_VALIDATION_FAILED: 400,
  TRAVEL_MEMBER_NOT_FOUND: 404,
  TRAVEL_MEMBER_CREATE_FAILED: 500,
  TRAVEL_MEMBER_UPDATE_FAILED: 500,
  TRAVEL_SETTLEMENT_NOT_FOUND: 404,
  TRAVEL_SETTLEMENT_UPDATE_FAILED: 500,
};

const jsonError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelTripMemberMutateResponse>(
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
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId, memberId } = await context.params;
  if (!tripId) {
    return jsonError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  if (!memberId) {
    return jsonError("TRAVEL_MEMBER_NOT_FOUND", "Trip member id is required.");
  }

  let body: UpdateTravelTripMemberBody = {};
  try {
    body = (await request.json()) as UpdateTravelTripMemberBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateTravelUpdateTripMemberInput({
    displayName: body.displayName,
    role: body.role,
    status: body.status,
  });

  if (!validationResult.ok) {
    return jsonError("TRAVEL_MEMBER_VALIDATION_FAILED", validationResult.message);
  }

  const updateResult = await updateTravelTripMemberForTrip({
    workspaceId: scopeResult.workspace.id,
    tripId,
    memberId,
    input: validationResult.data,
  });

  if (!updateResult.ok) {
    if (updateResult.reason === "TRIP_NOT_FOUND") {
      return jsonError("TRAVEL_TRIP_NOT_FOUND", updateResult.message);
    }

    if (updateResult.reason === "TRIP_NOT_ACTIVE") {
      return jsonError("TRAVEL_TRIP_EDIT_LOCKED", updateResult.message);
    }

    if (updateResult.reason === "MEMBER_NOT_FOUND") {
      return jsonError("TRAVEL_MEMBER_NOT_FOUND", updateResult.message);
    }

    if (updateResult.reason === "VALIDATION_FAILED") {
      return jsonError("TRAVEL_MEMBER_VALIDATION_FAILED", updateResult.message);
    }

    return jsonError("TRAVEL_MEMBER_UPDATE_FAILED", updateResult.message);
  }

  return NextResponse.json<TravelTripMemberMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: updateResult.trip,
    member: updateResult.member,
  });
}

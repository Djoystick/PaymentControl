import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { readLatestTravelTripInviteForTrip } from "@/lib/travel/repository";
import type {
  TravelApiError,
  TravelTripInviteReadResponse,
} from "@/lib/travel/types";

type ReadTravelTripInviteBody = {
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
  TRAVEL_TRIP_NOT_FOUND: 404,
  TRAVEL_INVITE_FORBIDDEN: 403,
  TRAVEL_INVITE_READ_FAILED: 500,
};

const jsonError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelTripInviteReadResponse>(
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

  let body: ReadTravelTripInviteBody = {};
  try {
    body = (await request.json()) as ReadTravelTripInviteBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const readResult = await readLatestTravelTripInviteForTrip({
    workspaceId: scopeResult.workspace.id,
    profileId: scopeResult.profileId,
    tripId,
  });

  if (!readResult.ok) {
    if (readResult.reason === "TRIP_NOT_FOUND") {
      return jsonError("TRAVEL_TRIP_NOT_FOUND", readResult.message);
    }

    if (readResult.reason === "FORBIDDEN") {
      return jsonError("TRAVEL_INVITE_FORBIDDEN", readResult.message);
    }

    return jsonError("TRAVEL_INVITE_READ_FAILED", readResult.message);
  }

  return NextResponse.json<TravelTripInviteReadResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: readResult.trip,
    invite: readResult.invite,
  });
}

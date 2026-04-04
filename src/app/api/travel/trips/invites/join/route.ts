import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { joinTravelTripByInvite } from "@/lib/travel/repository";
import { validateTravelJoinTripInviteInput } from "@/lib/travel/validation";
import type {
  TravelApiError,
  TravelTripInviteJoinResponse,
} from "@/lib/travel/types";

type JoinTravelTripInviteBody = {
  initData?: string;
  inviteToken?: unknown;
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
  TRAVEL_INVITE_VALIDATION_FAILED: 400,
  TRAVEL_INVITE_NOT_FOUND: 404,
  TRAVEL_INVITE_EXPIRED: 409,
  TRAVEL_INVITE_ALREADY_USED: 409,
  TRAVEL_INVITE_WORKSPACE_MISMATCH: 409,
  TRAVEL_TRIP_EDIT_LOCKED: 409,
  TRAVEL_INVITE_JOIN_FAILED: 500,
};

const jsonError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelTripInviteJoinResponse>(
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

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: JoinTravelTripInviteBody = {};
  try {
    body = (await request.json()) as JoinTravelTripInviteBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateTravelJoinTripInviteInput({
    inviteToken: body.inviteToken,
  });
  if (!validationResult.ok) {
    return jsonError("TRAVEL_INVITE_VALIDATION_FAILED", validationResult.message);
  }

  const joinResult = await joinTravelTripByInvite({
    workspaceId: scopeResult.workspace.id,
    inviteToken: validationResult.data.inviteToken,
    profile: scopeResult.profile,
  });

  if (!joinResult.ok) {
    if (joinResult.reason === "INVITE_NOT_FOUND") {
      return jsonError("TRAVEL_INVITE_NOT_FOUND", joinResult.message);
    }

    if (joinResult.reason === "INVITE_EXPIRED") {
      return jsonError("TRAVEL_INVITE_EXPIRED", joinResult.message);
    }

    if (joinResult.reason === "INVITE_ALREADY_USED") {
      return jsonError("TRAVEL_INVITE_ALREADY_USED", joinResult.message);
    }

    if (joinResult.reason === "WORKSPACE_MISMATCH") {
      return jsonError("TRAVEL_INVITE_WORKSPACE_MISMATCH", joinResult.message);
    }

    if (joinResult.reason === "TRIP_NOT_ACTIVE") {
      return jsonError("TRAVEL_TRIP_EDIT_LOCKED", joinResult.message);
    }

    return jsonError("TRAVEL_INVITE_JOIN_FAILED", joinResult.message);
  }

  return NextResponse.json<TravelTripInviteJoinResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: joinResult.trip,
    invite: joinResult.invite,
    member: joinResult.member,
  });
}

import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { createTravelTripForWorkspace } from "@/lib/travel/repository";
import { validateTravelCreateTripInput } from "@/lib/travel/validation";
import type { TravelApiError, TravelTripMutateResponse } from "@/lib/travel/types";

type CreateTravelTripBody = {
  initData?: string;
  title?: unknown;
  baseCurrency?: unknown;
  description?: unknown;
  memberNames?: unknown;
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
  return NextResponse.json<TravelTripMutateResponse>(
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

  let body: CreateTravelTripBody = {};
  try {
    body = (await request.json()) as CreateTravelTripBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateTravelCreateTripInput({
    title: body.title,
    baseCurrency: body.baseCurrency,
    description: body.description,
    memberNames: body.memberNames,
  });

  if (!validationResult.ok) {
    return jsonError("TRAVEL_TRIP_VALIDATION_FAILED", validationResult.message);
  }

  const trip = await createTravelTripForWorkspace({
    workspaceId: scopeResult.workspace.id,
    profileId: scopeResult.profileId,
    input: validationResult.data,
  });

  if (!trip) {
    return jsonError(
      "TRAVEL_TRIP_CREATE_FAILED",
      "Failed to create travel trip.",
    );
  }

  return NextResponse.json<TravelTripMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip,
  });
}

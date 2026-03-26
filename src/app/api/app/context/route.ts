import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  CurrentAppContextError,
  CurrentAppContextResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";

type CurrentContextBody = {
  initData?: string;
};

const codeToStatus: Record<CurrentAppContextError["error"]["code"], number> = {
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
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<CurrentAppContextResponse>(
      {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message: "Supabase server configuration is missing.",
        },
      },
      { status: 503 },
    );
  }

  let body: CurrentContextBody = {};
  try {
    body = (await request.json()) as CurrentContextBody;
  } catch {
    body = {};
  }

  const result = await readCurrentAppContext(body.initData);
  if (!result.ok) {
    return NextResponse.json<CurrentAppContextResponse>(result, {
      status: codeToStatus[result.error.code] ?? 400,
    });
  }

  return NextResponse.json<CurrentAppContextResponse>(result);
}

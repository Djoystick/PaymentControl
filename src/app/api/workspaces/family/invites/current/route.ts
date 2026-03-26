import { NextResponse } from "next/server";
import { readLatestFamilyInviteInContext } from "@/lib/app-context/service";
import type {
  FamilyInviteReadError,
  FamilyInviteReadResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";

type FamilyInviteReadBody = {
  initData?: string;
};

const codeToStatus: Record<FamilyInviteReadError["error"]["code"], number> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
  APP_CONTEXT_NOT_INITIALIZED: 409,
  WORKSPACE_KIND_NOT_SUPPORTED: 409,
  INVITE_READ_FAILED: 500,
};

const jsonError = (
  status: number,
  code: FamilyInviteReadError["error"]["code"],
  message: string,
) => {
  const payload: FamilyInviteReadError = {
    ok: false,
    error: { code, message },
  };

  return NextResponse.json<FamilyInviteReadResponse>(payload, { status });
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      503,
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: FamilyInviteReadBody = {};
  try {
    body = (await request.json()) as FamilyInviteReadBody;
  } catch {
    body = {};
  }

  const result = await readLatestFamilyInviteInContext(body.initData);
  if (!result.ok) {
    return jsonError(
      codeToStatus[result.error.code] ?? 400,
      result.error.code,
      result.error.message,
    );
  }

  return NextResponse.json<FamilyInviteReadResponse>(result);
}

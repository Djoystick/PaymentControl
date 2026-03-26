import { NextResponse } from "next/server";
import { createFamilyInviteInContext } from "@/lib/app-context/service";
import type {
  FamilyInviteCreateError,
  FamilyInviteCreateResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";

type FamilyInviteCreateBody = {
  initData?: string;
};

const codeToStatus: Record<FamilyInviteCreateError["error"]["code"], number> = {
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
  WORKSPACE_PERMISSION_DENIED: 403,
  INVITE_STORAGE_NOT_READY: 503,
  INVITE_CREATE_FAILED: 500,
  WORKSPACE_LIST_FAILED: 500,
};

const jsonError = (
  status: number,
  code: FamilyInviteCreateError["error"]["code"],
  message: string,
) => {
  const payload: FamilyInviteCreateError = {
    ok: false,
    error: { code, message },
  };

  return NextResponse.json<FamilyInviteCreateResponse>(payload, { status });
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      503,
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: FamilyInviteCreateBody = {};
  try {
    body = (await request.json()) as FamilyInviteCreateBody;
  } catch {
    body = {};
  }

  const result = await createFamilyInviteInContext(body.initData);
  if (!result.ok) {
    return jsonError(
      codeToStatus[result.error.code] ?? 400,
      result.error.code,
      result.error.message,
    );
  }

  return NextResponse.json<FamilyInviteCreateResponse>(result);
}

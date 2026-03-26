import { NextResponse } from "next/server";
import { acceptFamilyInviteInContext } from "@/lib/app-context/service";
import type {
  FamilyInviteAcceptError,
  FamilyInviteAcceptResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";

type FamilyInviteAcceptBody = {
  initData?: string;
  inviteToken?: string;
};

const codeToStatus: Record<FamilyInviteAcceptError["error"]["code"], number> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
  APP_CONTEXT_NOT_INITIALIZED: 409,
  INVITE_TOKEN_INVALID: 400,
  INVITE_NOT_FOUND: 404,
  INVITE_EXPIRED: 409,
  INVITE_ALREADY_USED: 409,
  INVITE_INVALID_WORKSPACE_KIND: 409,
  INVITE_ACCEPT_FAILED: 500,
  WORKSPACE_LIST_FAILED: 500,
};

const jsonError = (
  status: number,
  code: FamilyInviteAcceptError["error"]["code"],
  message: string,
) => {
  const payload: FamilyInviteAcceptError = {
    ok: false,
    error: { code, message },
  };

  return NextResponse.json<FamilyInviteAcceptResponse>(payload, { status });
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      503,
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: FamilyInviteAcceptBody = {};
  try {
    body = (await request.json()) as FamilyInviteAcceptBody;
  } catch {
    body = {};
  }

  const result = await acceptFamilyInviteInContext(
    body.initData,
    body.inviteToken ?? "",
  );
  if (!result.ok) {
    return jsonError(
      codeToStatus[result.error.code] ?? 400,
      result.error.code,
      result.error.message,
    );
  }

  return NextResponse.json<FamilyInviteAcceptResponse>(result);
}

import { NextResponse } from "next/server";
import type {
  AuthBootstrapError,
  AuthBootstrapResponse,
} from "@/lib/auth/types";
import { bootstrapAppContext } from "@/lib/app-context/service";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";

type BootstrapBody = {
  initData?: string;
};

const codeToStatus: Record<AuthBootstrapError["error"]["code"], number> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
};

const jsonError = (
  status: number,
  code: AuthBootstrapError["error"]["code"],
  message: string,
) => {
  const payload: AuthBootstrapError = {
    ok: false,
    error: { code, message },
  };

  return NextResponse.json<AuthBootstrapResponse>(payload, { status });
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      503,
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: BootstrapBody = {};
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    body = {};
  }

  const bootstrapResult = await bootstrapAppContext(body.initData);
  if (!bootstrapResult.ok) {
    return jsonError(
      codeToStatus[bootstrapResult.error.code] ?? 400,
      bootstrapResult.error.code,
      bootstrapResult.error.message,
    );
  }

  return NextResponse.json<AuthBootstrapResponse>({
    ok: true,
    profile: bootstrapResult.profile,
    workspace: bootstrapResult.workspace,
    workspaces: bootstrapResult.workspaces,
    source: bootstrapResult.source,
  });
}

import { NextResponse } from "next/server";
import { switchActiveWorkspaceInContext } from "@/lib/app-context/service";
import type {
  WorkspaceSwitchError,
  WorkspaceSwitchResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";

type SwitchWorkspaceBody = {
  initData?: string;
  workspaceId?: string;
};

const codeToStatus: Record<WorkspaceSwitchError["error"]["code"], number> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
  APP_CONTEXT_NOT_INITIALIZED: 409,
  WORKSPACE_SWITCH_FORBIDDEN: 403,
  WORKSPACE_SWITCH_FAILED: 500,
  WORKSPACE_NOT_FOUND: 404,
  WORKSPACE_LIST_FAILED: 500,
};

const jsonError = (
  status: number,
  code: WorkspaceSwitchError["error"]["code"],
  message: string,
) => {
  const payload: WorkspaceSwitchError = {
    ok: false,
    error: { code, message },
  };

  return NextResponse.json<WorkspaceSwitchResponse>(payload, { status });
};

export async function PATCH(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      503,
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: SwitchWorkspaceBody = {};
  try {
    body = (await request.json()) as SwitchWorkspaceBody;
  } catch {
    body = {};
  }

  const result = await switchActiveWorkspaceInContext(
    body.initData,
    body.workspaceId ?? "",
  );
  if (!result.ok) {
    return jsonError(
      codeToStatus[result.error.code] ?? 400,
      result.error.code,
      result.error.message,
    );
  }

  return NextResponse.json<WorkspaceSwitchResponse>(result);
}

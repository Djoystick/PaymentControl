import { NextResponse } from "next/server";
import type {
  ScenarioUpdateError,
  ScenarioUpdateResponse,
  SelectedScenario,
} from "@/lib/auth/types";
import { resolveTelegramIdentity } from "@/lib/auth/resolve-telegram-identity";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { updateProfileScenarioByTelegramUserId } from "@/lib/profile/repository";

type ScenarioUpdateBody = {
  initData?: string;
  selectedScenario?: string;
};

const isSelectedScenario = (
  value: string | undefined,
): value is SelectedScenario => {
  return value === "single" || value === "family";
};

const jsonError = (
  status: number,
  code: ScenarioUpdateError["error"]["code"],
  message: string,
) => {
  const payload: ScenarioUpdateError = {
    ok: false,
    error: { code, message },
  };

  return NextResponse.json<ScenarioUpdateResponse>(payload, { status });
};

export async function PATCH(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      503,
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: ScenarioUpdateBody = {};
  try {
    body = (await request.json()) as ScenarioUpdateBody;
  } catch {
    body = {};
  }

  if (!isSelectedScenario(body.selectedScenario)) {
    return jsonError(400, "SCENARIO_INVALID", "Selected scenario is invalid.");
  }

  const identityResult = resolveTelegramIdentity(body.initData);
  if (!identityResult.ok) {
    const status =
      identityResult.error.code === "TELEGRAM_INIT_DATA_MISSING" ? 400 : 401;

    return jsonError(status, identityResult.error.code, identityResult.error.message);
  }

  const profile = await updateProfileScenarioByTelegramUserId(
    identityResult.identity.telegramUserId,
    body.selectedScenario,
  );

  if (!profile) {
    return jsonError(
      500,
      "PROFILE_UPDATE_FAILED",
      "Failed to update profile scenario.",
    );
  }

  return NextResponse.json<ScenarioUpdateResponse>({
    ok: true,
    profile,
  });
}

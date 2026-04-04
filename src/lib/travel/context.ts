import "server-only";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type { TravelScopeResolutionResult } from "@/lib/travel/types";

export const resolveTravelScope = async (
  initData: string | undefined,
): Promise<TravelScopeResolutionResult> => {
  const contextResult = await readCurrentAppContext(initData);
  if (!contextResult.ok) {
    return contextResult;
  }

  if (
    contextResult.workspace.kind === "personal" &&
    contextResult.workspace.id.startsWith("virtual-personal-")
  ) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_UNAVAILABLE",
        message:
          "Workspace persistence is not fully initialized. Apply workspace migrations first.",
      },
    };
  }

  return {
    ok: true,
    workspace: contextResult.workspace,
    profileId: contextResult.profile.id,
    profile: {
      id: contextResult.profile.id,
      telegramUserId: contextResult.profile.telegramUserId,
      username: contextResult.profile.username,
      firstName: contextResult.profile.firstName,
    },
  };
};

import "server-only";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type { PaymentsScopeResolutionResult } from "@/lib/payments/types";

type ResolvePaymentsScopeOptions = {
  allowFamilyWorkspace?: boolean;
};

export const resolvePaymentsScope = async (
  initData: string | undefined,
  options?: ResolvePaymentsScopeOptions,
): Promise<PaymentsScopeResolutionResult> => {
  const contextResult = await readCurrentAppContext(initData);
  if (!contextResult.ok) {
    return contextResult;
  }

  if (
    contextResult.workspace.kind !== "personal" &&
    !options?.allowFamilyWorkspace
  ) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_KIND_NOT_SUPPORTED",
        message: "Recurring payments are currently supported only in personal workspaces.",
      },
    };
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
  };
};

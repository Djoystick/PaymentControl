"use client";

import type {
  AuthBootstrapResponse,
  BugReportSubmitResponse,
  CurrentAppContextResponse,
  FamilyInviteAcceptResponse,
  FamilyInviteCreateResponse,
  FamilyInviteReadResponse,
  FamilyWorkspaceCreateResponse,
  PremiumAdminCampaignCreateResponse,
  PremiumAdminCampaignDeactivateResponse,
  PremiumAdminCampaignListResponse,
  PremiumAdminGrantResponse,
  PremiumAdminRevokeResponse,
  PremiumAdminSessionResponse,
  PremiumAdminTargetResolveResponse,
  PremiumPurchaseClaimCreateResponse,
  GiftPremiumClaimResponse,
  PremiumEntitlementReadResponse,
  ScenarioUpdateResponse,
  SelectedScenario,
  WorkspaceSwitchResponse,
} from "@/lib/auth/types";

type RequestBody = Record<string, unknown>;

const postJson = async <T>(
  url: string,
  method: "POST" | "PATCH",
  body: RequestBody,
): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
};

export const bootstrapTelegramAuth = async (
  initData: string,
): Promise<AuthBootstrapResponse> => {
  return postJson<AuthBootstrapResponse>("/api/auth/telegram/bootstrap", "POST", {
    initData,
  });
};

export const updateScenario = async (
  initData: string,
  selectedScenario: SelectedScenario,
): Promise<ScenarioUpdateResponse> => {
  return postJson<ScenarioUpdateResponse>("/api/profile/scenario", "PATCH", {
    initData,
    selectedScenario,
  });
};

export const getCurrentAppContext = async (
  initData: string,
): Promise<CurrentAppContextResponse> => {
  return postJson<CurrentAppContextResponse>("/api/app/context", "POST", {
    initData,
  });
};

export const createFamilyWorkspace = async (
  initData: string,
  title: string,
): Promise<FamilyWorkspaceCreateResponse> => {
  return postJson<FamilyWorkspaceCreateResponse>(
    "/api/workspaces/family/create",
    "POST",
    {
      initData,
      title,
    },
  );
};

export const switchActiveWorkspace = async (
  initData: string,
  workspaceId: string,
): Promise<WorkspaceSwitchResponse> => {
  return postJson<WorkspaceSwitchResponse>("/api/workspaces/active", "PATCH", {
    initData,
    workspaceId,
  });
};

export const createFamilyInvite = async (
  initData: string,
): Promise<FamilyInviteCreateResponse> => {
  return postJson<FamilyInviteCreateResponse>(
    "/api/workspaces/family/invites/create",
    "POST",
    {
      initData,
    },
  );
};

export const readCurrentFamilyInvite = async (
  initData: string,
): Promise<FamilyInviteReadResponse> => {
  return postJson<FamilyInviteReadResponse>(
    "/api/workspaces/family/invites/current",
    "POST",
    {
      initData,
    },
  );
};

export const acceptFamilyInvite = async (
  initData: string,
  inviteToken: string,
): Promise<FamilyInviteAcceptResponse> => {
  return postJson<FamilyInviteAcceptResponse>(
    "/api/workspaces/family/invites/accept",
    "POST",
    {
      initData,
      inviteToken,
    },
  );
};

export const readPremiumEntitlement = async (
  initData: string,
): Promise<PremiumEntitlementReadResponse> => {
  return postJson<PremiumEntitlementReadResponse>("/api/premium/entitlement", "POST", {
    initData,
  });
};

export const claimGiftPremiumCampaign = async (
  initData: string,
  campaignCode: string,
): Promise<GiftPremiumClaimResponse> => {
  return postJson<GiftPremiumClaimResponse>("/api/premium/gift-campaigns/claim", "POST", {
    initData,
    campaignCode,
  });
};

export const createPremiumPurchaseClaim = async (params: {
  initData: string;
  claimRail?: "boosty_premium";
  expectedTier?: string;
  externalPayerHandle?: string;
  paymentProofReference?: string;
  paymentProofText?: string;
  claimNote?: string;
}): Promise<PremiumPurchaseClaimCreateResponse> => {
  return postJson<PremiumPurchaseClaimCreateResponse>(
    "/api/premium/purchase-claims",
    "POST",
    {
      initData: params.initData,
      claimRail: params.claimRail ?? "boosty_premium",
      expectedTier: params.expectedTier ?? "premium",
      externalPayerHandle: params.externalPayerHandle ?? "",
      paymentProofReference: params.paymentProofReference ?? "",
      paymentProofText: params.paymentProofText ?? "",
      claimNote: params.claimNote ?? "",
    },
  );
};

export const readPremiumAdminSession = async (
  initData: string,
): Promise<PremiumAdminSessionResponse> => {
  return postJson<PremiumAdminSessionResponse>("/api/premium/admin", "POST", {
    initData,
    action: "session",
  });
};

export const resolvePremiumAdminTarget = async (
  initData: string,
  targetTelegramUserId: string,
): Promise<PremiumAdminTargetResolveResponse> => {
  return postJson<PremiumAdminTargetResolveResponse>("/api/premium/admin", "POST", {
    initData,
    action: "resolve_target",
    targetTelegramUserId,
  });
};

export const grantPremiumByAdmin = async (params: {
  initData: string;
  targetTelegramUserId: string;
  durationDays: number | null;
  note?: string;
}): Promise<PremiumAdminGrantResponse> => {
  return postJson<PremiumAdminGrantResponse>("/api/premium/admin", "POST", {
    initData: params.initData,
    action: "grant_premium",
    targetTelegramUserId: params.targetTelegramUserId,
    durationDays: params.durationDays,
    note: params.note ?? "",
  });
};

export const revokePremiumByAdmin = async (params: {
  initData: string;
  targetTelegramUserId: string;
  note?: string;
}): Promise<PremiumAdminRevokeResponse> => {
  return postJson<PremiumAdminRevokeResponse>("/api/premium/admin", "POST", {
    initData: params.initData,
    action: "revoke_premium",
    targetTelegramUserId: params.targetTelegramUserId,
    note: params.note ?? "",
  });
};

export const createPremiumGiftCampaignByAdmin = async (params: {
  initData: string;
  campaignCode: string;
  campaignTitle: string;
  totalQuota: number;
  campaignDurationDays: number;
  startsAt?: string;
  endsAt?: string;
}): Promise<PremiumAdminCampaignCreateResponse> => {
  return postJson<PremiumAdminCampaignCreateResponse>("/api/premium/admin", "POST", {
    initData: params.initData,
    action: "create_campaign",
    campaignCode: params.campaignCode,
    campaignTitle: params.campaignTitle,
    totalQuota: params.totalQuota,
    campaignDurationDays: params.campaignDurationDays,
    startsAt: params.startsAt ?? "",
    endsAt: params.endsAt ?? "",
  });
};

export const listPremiumGiftCampaignsByAdmin = async (
  initData: string,
): Promise<PremiumAdminCampaignListResponse> => {
  return postJson<PremiumAdminCampaignListResponse>("/api/premium/admin", "POST", {
    initData,
    action: "list_campaigns",
  });
};

export const deactivatePremiumGiftCampaignByAdmin = async (
  initData: string,
  campaignId: string,
): Promise<PremiumAdminCampaignDeactivateResponse> => {
  return postJson<PremiumAdminCampaignDeactivateResponse>("/api/premium/admin", "POST", {
    initData,
    action: "deactivate_campaign",
    campaignId,
  });
};

export const submitBugReport = async (params: {
  initData: string;
  title: string;
  description: string;
  steps?: string;
  currentScreen?: string;
  language?: "ru" | "en";
}): Promise<BugReportSubmitResponse> => {
  return postJson<BugReportSubmitResponse>("/api/support/bug-report", "POST", {
    initData: params.initData,
    title: params.title,
    description: params.description,
    steps: params.steps ?? "",
    currentScreen: params.currentScreen ?? "",
    language: params.language ?? "",
  });
};

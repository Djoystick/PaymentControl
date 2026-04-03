"use client";

import type {
  AuthBootstrapResponse,
  BugReportSubmitResponse,
  CurrentAppContextResponse,
  FamilyInviteAcceptResponse,
  FamilyInviteCreateResponse,
  FamilyInviteReadResponse,
  FamilyWorkspaceCreateResponse,
  ScenarioUpdateResponse,
  SelectedScenario,
  SupporterBadgeManageAction,
  SupporterBadgeLookupResponse,
  SupporterBadgeManageResponse,
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

export const manageSupporterBadge = async (params: {
  initData: string;
  action: SupporterBadgeManageAction;
  targetTelegramUserId: string;
  note?: string;
}): Promise<SupporterBadgeManageResponse> => {
  return postJson<SupporterBadgeManageResponse>("/api/supporters/badge", "POST", {
    initData: params.initData,
    action: params.action,
    targetTelegramUserId: params.targetTelegramUserId,
    note: params.note ?? "",
  });
};

export const lookupSupporterBadgeTarget = async (params: {
  initData: string;
  targetTelegramUserId: string;
}): Promise<SupporterBadgeLookupResponse> => {
  const query = new URLSearchParams({
    targetTelegramUserId: params.targetTelegramUserId,
  });

  const response = await fetch(`/api/supporters/badge?${query.toString()}`, {
    method: "GET",
    headers: {
      "x-telegram-init-data": params.initData,
    },
  });

  return (await response.json()) as SupporterBadgeLookupResponse;
};

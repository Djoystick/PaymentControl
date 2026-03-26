"use client";

import type {
  AuthBootstrapResponse,
  CurrentAppContextResponse,
  FamilyInviteAcceptResponse,
  FamilyInviteCreateResponse,
  FamilyInviteReadResponse,
  FamilyWorkspaceCreateResponse,
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

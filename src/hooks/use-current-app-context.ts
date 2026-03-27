"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptFamilyInvite as acceptFamilyInviteRequest,
  bootstrapTelegramAuth,
  createFamilyInvite as createFamilyInviteRequest,
  createFamilyWorkspace as createFamilyWorkspaceRequest,
  getCurrentAppContext,
  readPremiumEntitlement as readPremiumEntitlementRequest,
  readCurrentFamilyInvite,
  switchActiveWorkspace as switchActiveWorkspaceRequest,
  updateScenario,
} from "@/lib/auth/client";
import type {
  FamilyInviteAcceptResponse,
  FamilyWorkspaceInvitePayload,
  FamilyWorkspaceInviteStatus,
  PremiumEntitlementStatePayload,
  ProfilePayload,
  SelectedScenario,
  TelegramIdentity,
  WorkspaceSummaryPayload,
} from "@/lib/auth/types";
import {
  maskInviteToken,
  normalizeFamilyInviteToken,
} from "@/lib/auth/invite-token";
import { getTelegramInitData, getTelegramWebApp } from "@/lib/telegram/web-app";
import { resolveScenarioForWorkspaceKind } from "@/hooks/workspace-scenario-sync";

type InviteAcceptDiagnostic = {
  status: "success" | "error";
  code: string;
  message: string;
  attemptedAt: string;
  rawTokenPreview: string;
  normalizedTokenPreview: string;
  workspaceTitle: string | null;
  inviteStatus: FamilyWorkspaceInviteStatus | null;
  workspaceAdded: boolean;
  memberCount: number | null;
};

const toInviteAcceptErrorMessage = (
  response: FamilyInviteAcceptResponse,
): string => {
  if (response.ok) {
    return "Family invite accepted.";
  }

  if (response.error.code === "INVITE_NOT_FOUND") {
    return "Invite token not found. Check token copy and try again.";
  }

  if (response.error.code === "INVITE_EXPIRED") {
    return "Invite has expired. Ask owner to create a new invite.";
  }

  if (response.error.code === "INVITE_ALREADY_USED") {
    return "Invite was already used. Ask owner for a new active invite.";
  }

  if (response.error.code === "INVITE_INVALID_WORKSPACE_KIND") {
    return "Invite does not point to a family workspace.";
  }

  if (response.error.code === "INVITE_TOKEN_INVALID") {
    return "Invite token is empty or invalid.";
  }

  if (response.error.code === "WORKSPACE_LIST_FAILED") {
    return "Invite may be accepted, but workspace refresh failed. Use Refresh context.";
  }

  return response.error.message;
};

type UseCurrentAppContextResult = {
  profile: ProfilePayload | null;
  workspace: WorkspaceSummaryPayload | null;
  source: TelegramIdentity["source"] | null;
  stateLabel: string;
  isLoading: boolean;
  isLoadingPremium: boolean;
  isSavingScenario: boolean;
  isSavingWorkspace: boolean;
  isSavingInvite: boolean;
  actionMessage: string | null;
  isTelegramContext: boolean;
  initData: string;
  workspaces: WorkspaceSummaryPayload[];
  currentFamilyInvite: FamilyWorkspaceInvitePayload | null;
  premiumEntitlement: PremiumEntitlementStatePayload | null;
  inviteAcceptDiagnostic: InviteAcceptDiagnostic | null;
  refreshContext: () => Promise<void>;
  changeScenario: (scenario: SelectedScenario) => Promise<void>;
  createFamilyWorkspace: (title: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createInvite: () => Promise<void>;
  acceptInvite: (inviteToken: string) => Promise<boolean>;
  clearInviteAcceptDiagnostic: () => void;
};

export const useCurrentAppContext = (): UseCurrentAppContextResult => {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSummaryPayload | null>(null);
  const [source, setSource] = useState<TelegramIdentity["source"] | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummaryPayload[]>([]);
  const [currentFamilyInvite, setCurrentFamilyInvite] =
    useState<FamilyWorkspaceInvitePayload | null>(null);
  const [premiumEntitlement, setPremiumEntitlement] =
    useState<PremiumEntitlementStatePayload | null>(null);
  const [inviteAcceptDiagnostic, setInviteAcceptDiagnostic] =
    useState<InviteAcceptDiagnostic | null>(null);
  const [stateLabel, setStateLabel] = useState("Loading current context...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [initData, setInitData] = useState("");

  const isTelegramContext = Boolean(getTelegramWebApp());

  const setContextState = (
    nextProfile: ProfilePayload,
    nextWorkspace: WorkspaceSummaryPayload,
    nextSource: TelegramIdentity["source"],
    nextWorkspaces: WorkspaceSummaryPayload[],
  ) => {
    setProfile(nextProfile);
    setWorkspace(nextWorkspace);
    setSource(nextSource);
    setWorkspaces(nextWorkspaces);
    setStateLabel("Current app context loaded.");
  };

  const loadFamilyInvite = useCallback(
    async (
      telegramInitData: string,
      activeWorkspace: WorkspaceSummaryPayload | null,
    ) => {
      if (!activeWorkspace || activeWorkspace.kind !== "family") {
        setCurrentFamilyInvite(null);
        return;
      }

      try {
        const inviteResult = await readCurrentFamilyInvite(telegramInitData);
        if (inviteResult.ok) {
          setCurrentFamilyInvite(inviteResult.invite);
          return;
        }

        setCurrentFamilyInvite(null);
      } catch {
        setCurrentFamilyInvite(null);
      }
    },
    [],
  );

  const loadPremiumEntitlement = useCallback(async (telegramInitData: string) => {
    setIsLoadingPremium(true);
    try {
      const result = await readPremiumEntitlementRequest(telegramInitData);
      if (!result.ok) {
        setPremiumEntitlement(null);
        return;
      }

      setPremiumEntitlement(result.entitlement);
    } catch {
      setPremiumEntitlement(null);
    } finally {
      setIsLoadingPremium(false);
    }
  }, []);

  const loadCurrentContext = useCallback(
    async (allowBootstrapFallback: boolean) => {
      setIsLoading(true);
      setIsLoadingPremium(true);
      setActionMessage(null);

      const telegramInitData = getTelegramInitData();
      setInitData(telegramInitData);

      try {
        const contextResult = await getCurrentAppContext(telegramInitData);
        if (contextResult.ok) {
          setContextState(
            contextResult.profile,
            contextResult.workspace,
            contextResult.source,
            contextResult.workspaces,
          );
          await loadFamilyInvite(telegramInitData, contextResult.workspace);
          await loadPremiumEntitlement(telegramInitData);
          return;
        }

        if (
          allowBootstrapFallback &&
          (contextResult.error.code === "APP_CONTEXT_NOT_INITIALIZED" ||
            contextResult.error.code === "WORKSPACE_NOT_FOUND")
        ) {
          const bootstrapResult = await bootstrapTelegramAuth(telegramInitData);
          if (!bootstrapResult.ok) {
            setProfile(null);
            setWorkspace(null);
            setSource(null);
            setStateLabel(bootstrapResult.error.message);
            return;
          }

          const refreshedContext = await getCurrentAppContext(telegramInitData);
          if (refreshedContext.ok) {
            setContextState(
              refreshedContext.profile,
              refreshedContext.workspace,
              refreshedContext.source,
              refreshedContext.workspaces,
            );
            await loadFamilyInvite(telegramInitData, refreshedContext.workspace);
            await loadPremiumEntitlement(telegramInitData);
          } else {
            setContextState(
              bootstrapResult.profile,
              bootstrapResult.workspace,
              bootstrapResult.source,
              bootstrapResult.workspaces,
            );
            await loadFamilyInvite(telegramInitData, bootstrapResult.workspace);
            await loadPremiumEntitlement(telegramInitData);
          }

          return;
        }

        setProfile(null);
        setWorkspace(null);
        setSource(null);
        setWorkspaces([]);
        setCurrentFamilyInvite(null);
        setPremiumEntitlement(null);
        setIsLoadingPremium(false);
        setStateLabel(contextResult.error.message);
      } catch {
        setProfile(null);
        setWorkspace(null);
        setSource(null);
        setWorkspaces([]);
        setCurrentFamilyInvite(null);
        setPremiumEntitlement(null);
        setIsLoadingPremium(false);
        setStateLabel("Current context request failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [loadFamilyInvite, loadPremiumEntitlement],
  );

  useEffect(() => {
    loadCurrentContext(true);

    const handleTelegramReady = () => {
      loadCurrentContext(true);
    };

    window.addEventListener("telegram-webapp-ready", handleTelegramReady);
    return () => {
      window.removeEventListener("telegram-webapp-ready", handleTelegramReady);
    };
  }, [loadCurrentContext]);

  const refreshContext = useCallback(async () => {
    await loadCurrentContext(false);
  }, [loadCurrentContext]);

  const syncScenarioWithWorkspaceKind = useCallback(
    async (workspaceKind: WorkspaceSummaryPayload["kind"]) => {
      if (!profile) {
        return true;
      }

      const targetScenario = resolveScenarioForWorkspaceKind(workspaceKind);
      if (profile.selectedScenario === targetScenario) {
        return true;
      }

      const scenarioResult = await updateScenario(initData, targetScenario);
      return scenarioResult.ok;
    },
    [initData, profile],
  );

  const changeScenario = useCallback(
    async (scenario: SelectedScenario) => {
      if (!profile || isSavingScenario || profile.selectedScenario === scenario) {
        return;
      }

      setIsSavingScenario(true);
      setActionMessage(null);

      try {
        const scenarioResult = await updateScenario(initData, scenario);
        if (!scenarioResult.ok) {
          setActionMessage(scenarioResult.error.message);
          return;
        }

        await loadCurrentContext(false);
        setActionMessage("Scenario updated.");
      } catch {
        setActionMessage("Scenario update failed.");
      } finally {
        setIsSavingScenario(false);
      }
    },
    [initData, isSavingScenario, loadCurrentContext, profile],
  );

  const createFamilyWorkspace = useCallback(
    async (title: string) => {
      if (!profile || isSavingWorkspace) {
        return;
      }

      if (!title.trim()) {
        setActionMessage("Family workspace title is required.");
        return;
      }

      setIsSavingWorkspace(true);
      setActionMessage(null);

      try {
        const createResult = await createFamilyWorkspaceRequest(initData, title);
        if (!createResult.ok) {
          setActionMessage(createResult.error.message);
          return;
        }

        const scenarioSynced = await syncScenarioWithWorkspaceKind(
          createResult.workspace.kind,
        );

        await loadCurrentContext(false);
        setActionMessage(
          scenarioSynced
            ? "Family workspace created."
            : "Family workspace created, but scenario sync failed.",
        );
      } catch {
        setActionMessage("Family workspace creation failed.");
      } finally {
        setIsSavingWorkspace(false);
      }
    },
    [
      initData,
      isSavingWorkspace,
      loadCurrentContext,
      profile,
      syncScenarioWithWorkspaceKind,
    ],
  );

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!profile || isSavingWorkspace || !workspaceId.trim()) {
        return;
      }

      if (workspace?.id === workspaceId) {
        return;
      }

      setIsSavingWorkspace(true);
      setActionMessage(null);

      try {
        const switchResult = await switchActiveWorkspaceRequest(initData, workspaceId);
        if (!switchResult.ok) {
          setActionMessage(switchResult.error.message);
          return;
        }

        const scenarioSynced = await syncScenarioWithWorkspaceKind(
          switchResult.workspace.kind,
        );

        await loadCurrentContext(false);
        setActionMessage(
          scenarioSynced
            ? "Workspace switched."
            : "Workspace switched, but scenario sync failed.",
        );
      } catch {
        setActionMessage("Workspace switch failed.");
      } finally {
        setIsSavingWorkspace(false);
      }
    },
    [
      initData,
      isSavingWorkspace,
      loadCurrentContext,
      profile,
      syncScenarioWithWorkspaceKind,
      workspace?.id,
    ],
  );

  const createInvite = useCallback(async () => {
    if (!profile || !workspace || workspace.kind !== "family" || isSavingInvite) {
      return;
    }

    setIsSavingInvite(true);
    setActionMessage(null);
    try {
      const createResult = await createFamilyInviteRequest(initData);
      if (!createResult.ok) {
        setActionMessage(createResult.error.message);
        return;
      }

      setInviteAcceptDiagnostic(null);
      setCurrentFamilyInvite(createResult.invite);
      await loadCurrentContext(false);
      setActionMessage("Family invite created.");
    } catch {
      setActionMessage("Family invite creation failed.");
    } finally {
      setIsSavingInvite(false);
    }
  }, [initData, isSavingInvite, loadCurrentContext, profile, workspace]);

  const acceptInvite = useCallback(
    async (inviteToken: string) => {
      if (!profile || isSavingInvite) {
        return false;
      }

      if (!inviteToken.trim()) {
        setActionMessage("Invite token is required.");
        setInviteAcceptDiagnostic({
          status: "error",
          code: "INVITE_TOKEN_INVALID",
          message: "Invite token is required.",
          attemptedAt: new Date().toISOString(),
          rawTokenPreview: "empty",
          normalizedTokenPreview: "empty",
          workspaceTitle: null,
          inviteStatus: null,
          workspaceAdded: false,
          memberCount: null,
        });
        return false;
      }

      const normalizedToken = normalizeFamilyInviteToken(inviteToken);
      if (!normalizedToken) {
        setActionMessage("Invite token format is invalid.");
        setInviteAcceptDiagnostic({
          status: "error",
          code: "INVITE_TOKEN_INVALID",
          message:
            "Invite token format is invalid. Paste raw token or invite link from owner.",
          attemptedAt: new Date().toISOString(),
          rawTokenPreview: maskInviteToken(inviteToken),
          normalizedTokenPreview: "empty",
          workspaceTitle: null,
          inviteStatus: null,
          workspaceAdded: false,
          memberCount: null,
        });
        return false;
      }

      setIsSavingInvite(true);
      setActionMessage(null);
      try {
        const acceptResult = await acceptFamilyInviteRequest(
          initData,
          normalizedToken,
        );
        if (!acceptResult.ok) {
          const nextMessage = toInviteAcceptErrorMessage(acceptResult);
          setActionMessage(nextMessage);
          setInviteAcceptDiagnostic({
            status: "error",
            code: acceptResult.error.code,
            message: nextMessage,
            attemptedAt: new Date().toISOString(),
            rawTokenPreview: maskInviteToken(inviteToken),
            normalizedTokenPreview: maskInviteToken(normalizedToken),
            workspaceTitle: null,
            inviteStatus: null,
            workspaceAdded: false,
            memberCount: null,
          });
          return false;
        }

        const nextSource =
          source ?? (isTelegramContext ? "telegram" : "dev_fallback");
        setContextState(
          acceptResult.profile,
          acceptResult.workspace,
          nextSource,
          acceptResult.workspaces,
        );
        setCurrentFamilyInvite(acceptResult.invite);

        const scenarioSynced = await syncScenarioWithWorkspaceKind(
          acceptResult.workspace.kind,
        );

        await loadFamilyInvite(initData, acceptResult.workspace);
        await loadPremiumEntitlement(initData);

        const workspaceAdded = acceptResult.workspaces.some(
          (workspaceOption) => workspaceOption.id === acceptResult.workspace.id,
        );
        setInviteAcceptDiagnostic({
          status: "success",
          code: "INVITE_ACCEPTED",
          message: "Invite accepted and family workspace is now available.",
          attemptedAt: new Date().toISOString(),
          rawTokenPreview: maskInviteToken(inviteToken),
          normalizedTokenPreview: maskInviteToken(normalizedToken),
          workspaceTitle: acceptResult.workspace.title,
          inviteStatus: acceptResult.invite.inviteStatus,
          workspaceAdded,
          memberCount: acceptResult.workspace.memberCount,
        });

        setActionMessage(
          scenarioSynced
            ? "Family invite accepted. Workspace list and household should now include this family workspace."
            : "Family invite accepted, but scenario sync failed.",
        );
        return true;
      } catch {
        setActionMessage("Family invite accept failed.");
        setInviteAcceptDiagnostic({
          status: "error",
          code: "INVITE_ACCEPT_FAILED",
          message: "Family invite accept request failed.",
          attemptedAt: new Date().toISOString(),
          rawTokenPreview: maskInviteToken(inviteToken),
          normalizedTokenPreview: maskInviteToken(normalizeFamilyInviteToken(inviteToken)),
          workspaceTitle: null,
          inviteStatus: null,
          workspaceAdded: false,
          memberCount: null,
        });
        return false;
      } finally {
        setIsSavingInvite(false);
      }
    },
    [
      initData,
      isSavingInvite,
      isTelegramContext,
      loadFamilyInvite,
      loadPremiumEntitlement,
      profile,
      source,
      syncScenarioWithWorkspaceKind,
    ],
  );

  const clearInviteAcceptDiagnostic = useCallback(() => {
    setInviteAcceptDiagnostic(null);
  }, []);

  return {
    profile,
    workspace,
    source,
    workspaces,
    currentFamilyInvite,
    premiumEntitlement,
    inviteAcceptDiagnostic,
    stateLabel,
    isLoading,
    isLoadingPremium,
    isSavingScenario,
    isSavingWorkspace,
    isSavingInvite,
    actionMessage,
    isTelegramContext,
    initData,
    refreshContext,
    changeScenario,
    createFamilyWorkspace,
    switchWorkspace,
    createInvite,
    acceptInvite,
    clearInviteAcceptDiagnostic,
  };
};

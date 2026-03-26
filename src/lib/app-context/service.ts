import "server-only";
import type {
  AuthBootstrapErrorCode,
  AuthBootstrapResponse,
  CurrentAppContextErrorCode,
  CurrentAppContextResponse,
  CurrentAppContextSuccess,
  FamilyInviteAcceptResponse,
  FamilyInviteCreateResponse,
  FamilyInviteReadResponse,
  FamilyWorkspaceCreateResponse,
  TelegramIdentity,
  WorkspaceSummaryPayload,
  WorkspaceSwitchResponse,
} from "@/lib/auth/types";
import { resolveTelegramIdentity } from "@/lib/auth/resolve-telegram-identity";
import {
  getProfileByTelegramUserId,
  upsertProfileFromTelegramIdentity,
} from "@/lib/profile/repository";
import {
  acceptFamilyWorkspaceInviteForProfile,
  createFamilyWorkspaceInviteForProfile,
  createFamilyWorkspaceForProfile,
  ensurePersonalWorkspaceForProfile,
  getWorkspaceSummaryForProfile,
  listWorkspaceSummariesForProfile,
  readLatestFamilyInviteForWorkspace,
  switchActiveWorkspaceForProfile,
} from "@/lib/workspace/repository";

const toErrorResponse = (
  code: CurrentAppContextErrorCode,
  message: string,
): CurrentAppContextResponse => {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
};

const toBootstrapErrorResponse = (
  code: AuthBootstrapErrorCode,
  message: string,
): AuthBootstrapResponse => {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
};

const toSuccessResponse = (
  source: TelegramIdentity["source"],
  profile: CurrentAppContextSuccess["profile"],
  workspace: CurrentAppContextSuccess["workspace"],
  workspaces: WorkspaceSummaryPayload[],
): CurrentAppContextSuccess => {
  return {
    ok: true,
    authState: "identified",
    source,
    profile,
    workspace,
    workspaces,
  };
};

const buildFallbackPersonalWorkspace = (
  profile: CurrentAppContextSuccess["profile"],
): CurrentAppContextSuccess["workspace"] => {
  const displayName = profile.firstName.trim() || profile.username || "Personal";
  return {
    id: `virtual-personal-${profile.id}`,
    kind: "personal",
    title: `${displayName}'s Workspace`,
    ownerProfileId: profile.id,
    memberRole: "owner",
    memberCount: 1,
  };
};

const resolveWorkspaceList = async (
  profileId: string,
  fallbackWorkspace: WorkspaceSummaryPayload,
): Promise<WorkspaceSummaryPayload[] | null> => {
  const workspaces = await listWorkspaceSummariesForProfile(profileId);
  if (!workspaces) {
    return null;
  }

  if (workspaces.length === 0) {
    return [fallbackWorkspace];
  }

  return workspaces;
};

export const readCurrentAppContext = async (
  initData: string | undefined,
): Promise<CurrentAppContextResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return toErrorResponse(identityResult.error.code, identityResult.error.message);
  }

  const profile = await getProfileByTelegramUserId(
    identityResult.identity.telegramUserId,
  );
  if (!profile) {
    return toErrorResponse(
      "APP_CONTEXT_NOT_INITIALIZED",
      "App context is not initialized. Run bootstrap first.",
    );
  }

  const workspace =
    (await getWorkspaceSummaryForProfile(profile.id)) ??
    buildFallbackPersonalWorkspace(profile);
  const workspaces = await resolveWorkspaceList(profile.id, workspace);
  if (!workspaces) {
    return toErrorResponse(
      "WORKSPACE_LIST_FAILED",
      "Failed to load available workspaces for profile.",
    );
  }

  return toSuccessResponse(
    identityResult.identity.source,
    { ...profile, activeWorkspaceId: workspace.id },
    workspace,
    workspaces,
  );
};

export const bootstrapAppContext = async (
  initData: string | undefined,
): Promise<AuthBootstrapResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return toBootstrapErrorResponse(
      identityResult.error.code,
      identityResult.error.message,
    );
  }

  const profile = await upsertProfileFromTelegramIdentity(identityResult.identity);
  if (!profile) {
    return toBootstrapErrorResponse(
      "PROFILE_UPSERT_FAILED",
      "Failed to upsert Telegram profile.",
    );
  }

  const workspace = await ensurePersonalWorkspaceForProfile(profile);
  if (!workspace) {
    return toBootstrapErrorResponse(
      "WORKSPACE_ENSURE_FAILED",
      "Failed to ensure personal workspace foundation.",
    );
  }

  const workspaces = await resolveWorkspaceList(profile.id, workspace);
  if (!workspaces) {
    return toBootstrapErrorResponse(
      "WORKSPACE_ENSURE_FAILED",
      "Failed to load workspace list for profile.",
    );
  }

  return {
    ok: true,
    source: identityResult.identity.source,
    profile: {
      ...profile,
      activeWorkspaceId: workspace.id,
    },
    workspace,
    workspaces,
  };
};

export const createFamilyWorkspaceInContext = async (
  initData: string | undefined,
  familyWorkspaceTitle: string,
): Promise<FamilyWorkspaceCreateResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return {
      ok: false,
      error: {
        code: identityResult.error.code,
        message: identityResult.error.message,
      },
    };
  }

  const profile = await getProfileByTelegramUserId(
    identityResult.identity.telegramUserId,
  );
  if (!profile) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "App context is not initialized. Run bootstrap first.",
      },
    };
  }

  const title = familyWorkspaceTitle.trim();
  if (!title) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_TITLE_INVALID",
        message: "Family workspace title is required.",
      },
    };
  }

  const workspace = await createFamilyWorkspaceForProfile(profile, title);
  if (!workspace) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_CREATE_FAILED",
        message: "Failed to create family workspace.",
      },
    };
  }

  const workspaces = await resolveWorkspaceList(profile.id, workspace);
  if (!workspaces) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_LIST_FAILED",
        message: "Failed to load workspace list after creating family workspace.",
      },
    };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      activeWorkspaceId: workspace.id,
    },
    workspace,
    workspaces,
  };
};

export const switchActiveWorkspaceInContext = async (
  initData: string | undefined,
  workspaceId: string,
): Promise<WorkspaceSwitchResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return {
      ok: false,
      error: {
        code: identityResult.error.code,
        message: identityResult.error.message,
      },
    };
  }

  const profile = await getProfileByTelegramUserId(
    identityResult.identity.telegramUserId,
  );
  if (!profile) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "App context is not initialized. Run bootstrap first.",
      },
    };
  }

  const targetWorkspaceId = workspaceId.trim();
  if (!targetWorkspaceId) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_NOT_FOUND",
        message: "Workspace id is required.",
      },
    };
  }

  const workspace = await switchActiveWorkspaceForProfile(
    profile.id,
    targetWorkspaceId,
  );
  if (!workspace) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_SWITCH_FORBIDDEN",
        message: "Workspace switch is not allowed for this profile.",
      },
    };
  }

  const workspaces = await resolveWorkspaceList(profile.id, workspace);
  if (!workspaces) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_LIST_FAILED",
        message: "Failed to load workspace list after switching workspace.",
      },
    };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      activeWorkspaceId: workspace.id,
    },
    workspace,
    workspaces,
  };
};

export const createFamilyInviteInContext = async (
  initData: string | undefined,
): Promise<FamilyInviteCreateResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return {
      ok: false,
      error: {
        code: identityResult.error.code,
        message: identityResult.error.message,
      },
    };
  }

  const profile = await getProfileByTelegramUserId(
    identityResult.identity.telegramUserId,
  );
  if (!profile) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "App context is not initialized. Run bootstrap first.",
      },
    };
  }

  const activeWorkspace = await getWorkspaceSummaryForProfile(profile.id);
  if (!activeWorkspace) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "Active workspace is not initialized.",
      },
    };
  }

  if (activeWorkspace.kind !== "family") {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_KIND_NOT_SUPPORTED",
        message: "Family invites are available only in family workspaces.",
      },
    };
  }

  const inviteResult = await createFamilyWorkspaceInviteForProfile(
    profile.id,
    activeWorkspace.id,
  );
  if (!inviteResult.ok) {
    if (inviteResult.reason === "FORBIDDEN") {
      return {
        ok: false,
        error: {
          code: "WORKSPACE_PERMISSION_DENIED",
          message: "Only family workspace owner can create invites.",
        },
      };
    }

    if (inviteResult.reason === "NOT_FAMILY") {
      return {
        ok: false,
        error: {
          code: "WORKSPACE_KIND_NOT_SUPPORTED",
          message: "Family invites are available only in family workspaces.",
        },
      };
    }

    if (inviteResult.reason === "INVITE_STORAGE_NOT_READY") {
      return {
        ok: false,
        error: {
          code: "INVITE_STORAGE_NOT_READY",
          message:
            "Family invite storage is not ready. Apply Phase 8B invite migration and retry.",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "INVITE_CREATE_FAILED",
        message: "Failed to create family invite.",
      },
    };
  }

  const workspaces = await resolveWorkspaceList(profile.id, activeWorkspace);
  if (!workspaces) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_LIST_FAILED",
        message: "Failed to load workspace list after invite creation.",
      },
    };
  }

  return {
    ok: true,
    invite: inviteResult.invite,
    workspace: activeWorkspace,
    workspaces,
  };
};

export const readLatestFamilyInviteInContext = async (
  initData: string | undefined,
): Promise<FamilyInviteReadResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return {
      ok: false,
      error: {
        code: identityResult.error.code,
        message: identityResult.error.message,
      },
    };
  }

  const profile = await getProfileByTelegramUserId(
    identityResult.identity.telegramUserId,
  );
  if (!profile) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "App context is not initialized. Run bootstrap first.",
      },
    };
  }

  const activeWorkspace = await getWorkspaceSummaryForProfile(profile.id);
  if (!activeWorkspace) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "Active workspace is not initialized.",
      },
    };
  }

  if (activeWorkspace.kind !== "family") {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_KIND_NOT_SUPPORTED",
        message: "Family invites are available only in family workspaces.",
      },
    };
  }

  const invite = await readLatestFamilyInviteForWorkspace(
    profile.id,
    activeWorkspace.id,
  );

  return {
    ok: true,
    invite,
    workspace: activeWorkspace,
  };
};

export const acceptFamilyInviteInContext = async (
  initData: string | undefined,
  inviteToken: string,
): Promise<FamilyInviteAcceptResponse> => {
  const identityResult = resolveTelegramIdentity(initData);
  if (!identityResult.ok) {
    return {
      ok: false,
      error: {
        code: identityResult.error.code,
        message: identityResult.error.message,
      },
    };
  }

  const profile = await getProfileByTelegramUserId(
    identityResult.identity.telegramUserId,
  );
  if (!profile) {
    return {
      ok: false,
      error: {
        code: "APP_CONTEXT_NOT_INITIALIZED",
        message: "App context is not initialized. Run bootstrap first.",
      },
    };
  }

  const token = inviteToken.trim();
  if (!token) {
    return {
      ok: false,
      error: {
        code: "INVITE_TOKEN_INVALID",
        message: "Invite token is required.",
      },
    };
  }

  const acceptResult = await acceptFamilyWorkspaceInviteForProfile(profile.id, token);
  if (!acceptResult.ok) {
    if (acceptResult.reason === "INVITE_NOT_FOUND") {
      return {
        ok: false,
        error: {
          code: "INVITE_NOT_FOUND",
          message: "Invite token was not found.",
        },
      };
    }

    if (acceptResult.reason === "INVITE_EXPIRED") {
      return {
        ok: false,
        error: {
          code: "INVITE_EXPIRED",
          message: "Invite is expired.",
        },
      };
    }

    if (acceptResult.reason === "INVITE_ALREADY_USED") {
      return {
        ok: false,
        error: {
          code: "INVITE_ALREADY_USED",
          message: "Invite is already used.",
        },
      };
    }

    if (acceptResult.reason === "INVITE_INVALID_WORKSPACE_KIND") {
      return {
        ok: false,
        error: {
          code: "INVITE_INVALID_WORKSPACE_KIND",
          message: "Invite does not belong to a family workspace.",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "INVITE_ACCEPT_FAILED",
        message: "Failed to accept family invite.",
      },
    };
  }

  const workspaces = await resolveWorkspaceList(profile.id, acceptResult.workspace);
  if (!workspaces) {
    return {
      ok: false,
      error: {
        code: "WORKSPACE_LIST_FAILED",
        message: "Failed to load workspace list after invite acceptance.",
      },
    };
  }

  return {
    ok: true,
    invite: acceptResult.invite,
    workspace: acceptResult.workspace,
    workspaces,
    profile: {
      ...profile,
      activeWorkspaceId: acceptResult.workspace.id,
    },
  };
};

export type SelectedScenario = "single" | "family";
export type WorkspaceKind = "personal" | "family";
export type WorkspaceMemberRole = "owner" | "member";

export type TelegramIdentity = {
  telegramUserId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  authDate: number | null;
  source: "telegram" | "dev_fallback";
};

export type ProfilePayload = {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  selectedScenario: SelectedScenario;
  activeWorkspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type WorkspaceSummaryPayload = {
  id: string;
  kind: WorkspaceKind;
  title: string;
  ownerProfileId: string;
  memberRole: WorkspaceMemberRole;
  memberCount: number;
};

export type AuthBootstrapSuccess = {
  ok: true;
  profile: ProfilePayload;
  workspace: WorkspaceSummaryPayload;
  workspaces: WorkspaceSummaryPayload[];
  source: TelegramIdentity["source"];
};

export type AuthBootstrapErrorCode =
  | "TELEGRAM_INIT_DATA_MISSING"
  | "TELEGRAM_INIT_DATA_INVALID"
  | "TELEGRAM_INIT_DATA_EXPIRED"
  | "TELEGRAM_USER_INVALID"
  | "TELEGRAM_BOT_TOKEN_MISSING"
  | "SUPABASE_NOT_CONFIGURED"
  | "PROFILE_UPSERT_FAILED"
  | "WORKSPACE_ENSURE_FAILED";

export type AuthBootstrapError = {
  ok: false;
  error: {
    code: AuthBootstrapErrorCode;
    message: string;
  };
};

export type AuthBootstrapResponse = AuthBootstrapSuccess | AuthBootstrapError;

export type CurrentAppContextSuccess = {
  ok: true;
  authState: "identified";
  source: TelegramIdentity["source"];
  profile: ProfilePayload;
  workspace: WorkspaceSummaryPayload;
  workspaces: WorkspaceSummaryPayload[];
};

export type CurrentAppContextErrorCode =
  | AuthBootstrapErrorCode
  | "APP_CONTEXT_NOT_INITIALIZED"
  | "WORKSPACE_NOT_FOUND"
  | "WORKSPACE_LIST_FAILED";

export type CurrentAppContextError = {
  ok: false;
  error: {
    code: CurrentAppContextErrorCode;
    message: string;
  };
};

export type CurrentAppContextResponse =
  | CurrentAppContextSuccess
  | CurrentAppContextError;

export type ScenarioUpdateSuccess = {
  ok: true;
  profile: ProfilePayload;
};

export type ScenarioUpdateErrorCode =
  | AuthBootstrapErrorCode
  | "SCENARIO_INVALID"
  | "PROFILE_UPDATE_FAILED";

export type ScenarioUpdateError = {
  ok: false;
  error: {
    code: ScenarioUpdateErrorCode;
    message: string;
  };
};

export type ScenarioUpdateResponse = ScenarioUpdateSuccess | ScenarioUpdateError;

export type FamilyWorkspaceCreateSuccess = {
  ok: true;
  profile: ProfilePayload;
  workspace: WorkspaceSummaryPayload;
  workspaces: WorkspaceSummaryPayload[];
};

export type FamilyWorkspaceCreateErrorCode =
  | AuthBootstrapErrorCode
  | "APP_CONTEXT_NOT_INITIALIZED"
  | "WORKSPACE_TITLE_INVALID"
  | "WORKSPACE_CREATE_FAILED"
  | "WORKSPACE_LIST_FAILED";

export type FamilyWorkspaceCreateError = {
  ok: false;
  error: {
    code: FamilyWorkspaceCreateErrorCode;
    message: string;
  };
};

export type FamilyWorkspaceCreateResponse =
  | FamilyWorkspaceCreateSuccess
  | FamilyWorkspaceCreateError;

export type WorkspaceSwitchSuccess = {
  ok: true;
  profile: ProfilePayload;
  workspace: WorkspaceSummaryPayload;
  workspaces: WorkspaceSummaryPayload[];
};

export type WorkspaceSwitchErrorCode =
  | AuthBootstrapErrorCode
  | "APP_CONTEXT_NOT_INITIALIZED"
  | "WORKSPACE_SWITCH_FORBIDDEN"
  | "WORKSPACE_SWITCH_FAILED"
  | "WORKSPACE_NOT_FOUND"
  | "WORKSPACE_LIST_FAILED";

export type WorkspaceSwitchError = {
  ok: false;
  error: {
    code: WorkspaceSwitchErrorCode;
    message: string;
  };
};

export type WorkspaceSwitchResponse = WorkspaceSwitchSuccess | WorkspaceSwitchError;

export type FamilyWorkspaceInviteStatus =
  | "active"
  | "accepted"
  | "expired"
  | "revoked";

export type FamilyWorkspaceInvitePayload = {
  id: string;
  inviteToken: string;
  workspaceId: string;
  inviterProfileId: string;
  inviteStatus: FamilyWorkspaceInviteStatus;
  createdAt: string;
  expiresAt: string | null;
  acceptedByProfileId: string | null;
  acceptedAt: string | null;
};

export type FamilyInviteCreateSuccess = {
  ok: true;
  invite: FamilyWorkspaceInvitePayload;
  workspace: WorkspaceSummaryPayload;
  workspaces: WorkspaceSummaryPayload[];
};

export type FamilyInviteCreateErrorCode =
  | AuthBootstrapErrorCode
  | "APP_CONTEXT_NOT_INITIALIZED"
  | "WORKSPACE_KIND_NOT_SUPPORTED"
  | "WORKSPACE_PERMISSION_DENIED"
  | "INVITE_STORAGE_NOT_READY"
  | "INVITE_CREATE_FAILED"
  | "WORKSPACE_LIST_FAILED";

export type FamilyInviteCreateError = {
  ok: false;
  error: {
    code: FamilyInviteCreateErrorCode;
    message: string;
  };
};

export type FamilyInviteCreateResponse =
  | FamilyInviteCreateSuccess
  | FamilyInviteCreateError;

export type FamilyInviteReadSuccess = {
  ok: true;
  invite: FamilyWorkspaceInvitePayload | null;
  workspace: WorkspaceSummaryPayload;
};

export type FamilyInviteReadErrorCode =
  | AuthBootstrapErrorCode
  | "APP_CONTEXT_NOT_INITIALIZED"
  | "WORKSPACE_KIND_NOT_SUPPORTED"
  | "INVITE_READ_FAILED";

export type FamilyInviteReadError = {
  ok: false;
  error: {
    code: FamilyInviteReadErrorCode;
    message: string;
  };
};

export type FamilyInviteReadResponse = FamilyInviteReadSuccess | FamilyInviteReadError;

export type FamilyInviteAcceptSuccess = {
  ok: true;
  invite: FamilyWorkspaceInvitePayload;
  workspace: WorkspaceSummaryPayload;
  workspaces: WorkspaceSummaryPayload[];
  profile: ProfilePayload;
};

export type FamilyInviteAcceptErrorCode =
  | AuthBootstrapErrorCode
  | "APP_CONTEXT_NOT_INITIALIZED"
  | "INVITE_TOKEN_INVALID"
  | "INVITE_NOT_FOUND"
  | "INVITE_EXPIRED"
  | "INVITE_ALREADY_USED"
  | "INVITE_INVALID_WORKSPACE_KIND"
  | "INVITE_ACCEPT_FAILED"
  | "WORKSPACE_LIST_FAILED";

export type FamilyInviteAcceptError = {
  ok: false;
  error: {
    code: FamilyInviteAcceptErrorCode;
    message: string;
  };
};

export type FamilyInviteAcceptResponse =
  | FamilyInviteAcceptSuccess
  | FamilyInviteAcceptError;

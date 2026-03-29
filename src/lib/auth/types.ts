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

export type PremiumEntitlementScope = "profile" | "workspace";
export type PremiumEntitlementSource = "manual_admin" | "boosty" | "gift_campaign";
export type PremiumEntitlementStatus = "active" | "expired" | "revoked";

export type PremiumEntitlementPayload = {
  id: string;
  scope: PremiumEntitlementScope;
  profileId: string | null;
  workspaceId: string | null;
  source: PremiumEntitlementSource;
  status: PremiumEntitlementStatus;
  startsAt: string;
  endsAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PremiumEntitlementStatePayload = {
  plan: "free" | "premium";
  isPremium: boolean;
  effectiveScope: PremiumEntitlementScope | null;
  effectiveSource: PremiumEntitlementSource | null;
  startsAt: string | null;
  endsAt: string | null;
  profileEntitlement: PremiumEntitlementPayload | null;
  workspaceEntitlement: PremiumEntitlementPayload | null;
};

export type PremiumEntitlementReadSuccess = {
  ok: true;
  entitlement: PremiumEntitlementStatePayload;
};

export type PremiumEntitlementReadErrorCode =
  | CurrentAppContextErrorCode
  | "PREMIUM_ENTITLEMENT_READ_FAILED";

export type PremiumEntitlementReadError = {
  ok: false;
  error: {
    code: PremiumEntitlementReadErrorCode;
    message: string;
  };
};

export type PremiumEntitlementReadResponse =
  | PremiumEntitlementReadSuccess
  | PremiumEntitlementReadError;

export type GiftPremiumCampaignStatus = "draft" | "active" | "paused" | "ended";

export type PremiumPurchaseClaimRail = "boosty_premium";
export type PremiumPurchaseClaimStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type PremiumPurchaseClaimPayload = {
  id: string;
  profileId: string;
  workspaceId: string | null;
  telegramUserId: string;
  claimRail: PremiumPurchaseClaimRail;
  expectedTier: string;
  externalPayerHandle: string | null;
  paymentProofReference: string | null;
  paymentProofText: string | null;
  status: PremiumPurchaseClaimStatus;
  claimNote: string | null;
  adminNote: string | null;
  entitlementId: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByAdminTelegramUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PremiumPurchaseClaimCreateSuccess = {
  ok: true;
  claim: PremiumPurchaseClaimPayload;
};

export type PremiumPurchaseClaimCreateErrorCode =
  | CurrentAppContextErrorCode
  | "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT"
  | "PREMIUM_PURCHASE_CLAIM_FAILED";

export type PremiumPurchaseClaimCreateError = {
  ok: false;
  error: {
    code: PremiumPurchaseClaimCreateErrorCode;
    message: string;
  };
};

export type PremiumPurchaseClaimCreateResponse =
  | PremiumPurchaseClaimCreateSuccess
  | PremiumPurchaseClaimCreateError;

export type GiftPremiumClaimStatus =
  | "granted"
  | "rejected_invalid_code"
  | "rejected_inactive_campaign"
  | "rejected_outside_window"
  | "rejected_quota_exhausted"
  | "rejected_already_claimed";

export type GiftPremiumClaimResultPayload = {
  claimId: string;
  campaignId: string | null;
  entitlementId: string | null;
  status: GiftPremiumClaimStatus;
  entitlementGranted: boolean;
  quotaTotal: number;
  quotaUsed: number;
  message: string;
};

export type GiftPremiumClaimSuccess = {
  ok: true;
  result: GiftPremiumClaimResultPayload;
};

export type GiftPremiumClaimErrorCode =
  | CurrentAppContextErrorCode
  | "GIFT_PREMIUM_CLAIM_FAILED";

export type GiftPremiumClaimError = {
  ok: false;
  error: {
    code: GiftPremiumClaimErrorCode;
    message: string;
  };
};

export type GiftPremiumClaimResponse =
  | GiftPremiumClaimSuccess
  | GiftPremiumClaimError;

export type BugReportSubmitSuccess = {
  ok: true;
  reportId: string;
  sentAt: string;
};

export type BugReportSubmitErrorCode =
  | CurrentAppContextErrorCode
  | "BUG_REPORT_INVALID_INPUT"
  | "BUG_REPORT_DELIVERY_NOT_CONFIGURED"
  | "BUG_REPORT_DELIVERY_FAILED";

export type BugReportSubmitError = {
  ok: false;
  error: {
    code: BugReportSubmitErrorCode;
    message: string;
  };
};

export type BugReportSubmitResponse =
  | BugReportSubmitSuccess
  | BugReportSubmitError;

export type PremiumAdminErrorCode =
  | CurrentAppContextErrorCode
  | "PREMIUM_ADMIN_FORBIDDEN"
  | "PREMIUM_ADMIN_INVALID_TARGET_TELEGRAM_ID"
  | "PREMIUM_ADMIN_TARGET_NOT_FOUND"
  | "PREMIUM_ADMIN_INVALID_INPUT"
  | "PREMIUM_ADMIN_CAMPAIGN_NOT_FOUND"
  | "PREMIUM_ADMIN_CAMPAIGN_FOUNDATION_NOT_READY"
  | "PREMIUM_ADMIN_ACTION_FAILED";

export type PremiumAdminTargetPayload = {
  profileId: string;
  telegramUserId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  activeWorkspaceId: string | null;
  premium: PremiumEntitlementStatePayload;
};

export type PremiumAdminCampaignPayload = {
  id: string;
  code: string;
  title: string;
  status: GiftPremiumCampaignStatus;
  totalQuota: number;
  quotaUsed: number;
  claimsTotal: number;
  premiumDurationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PremiumAdminSessionSuccess = {
  ok: true;
  session: {
    isAdmin: boolean;
    adminTelegramUserId: string | null;
  };
};

export type PremiumAdminTargetResolveSuccess = {
  ok: true;
  target: PremiumAdminTargetPayload;
};

export type PremiumAdminGrantSuccess = {
  ok: true;
  target: PremiumAdminTargetPayload;
  entitlementId: string;
};

export type PremiumAdminRevokeSuccess = {
  ok: true;
  target: PremiumAdminTargetPayload;
  revokedCount: number;
};

export type PremiumAdminCampaignCreateSuccess = {
  ok: true;
  campaign: PremiumAdminCampaignPayload;
};

export type PremiumAdminCampaignListSuccess = {
  ok: true;
  campaigns: PremiumAdminCampaignPayload[];
};

export type PremiumAdminCampaignDeactivateSuccess = {
  ok: true;
  campaign: PremiumAdminCampaignPayload;
};

export type PremiumAdminError = {
  ok: false;
  error: {
    code: PremiumAdminErrorCode;
    message: string;
  };
};

export type PremiumAdminSessionResponse =
  | PremiumAdminSessionSuccess
  | PremiumAdminError;

export type PremiumAdminTargetResolveResponse =
  | PremiumAdminTargetResolveSuccess
  | PremiumAdminError;

export type PremiumAdminGrantResponse =
  | PremiumAdminGrantSuccess
  | PremiumAdminError;

export type PremiumAdminRevokeResponse =
  | PremiumAdminRevokeSuccess
  | PremiumAdminError;

export type PremiumAdminCampaignCreateResponse =
  | PremiumAdminCampaignCreateSuccess
  | PremiumAdminError;

export type PremiumAdminCampaignListResponse =
  | PremiumAdminCampaignListSuccess
  | PremiumAdminError;

export type PremiumAdminCampaignDeactivateResponse =
  | PremiumAdminCampaignDeactivateSuccess
  | PremiumAdminError;

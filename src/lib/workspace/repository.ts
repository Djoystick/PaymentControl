import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfilePayload, WorkspaceSummaryPayload } from "@/lib/auth/types";
import { isFamilyInviteStorageNotReadyError } from "@/lib/workspace/invite-storage-errors";

type WorkspaceRow = {
  id: string;
  kind: WorkspaceSummaryPayload["kind"];
  owner_profile_id: string;
  title: string;
};

type MembershipRow = {
  workspace_id: string;
  member_role: WorkspaceSummaryPayload["memberRole"];
};

type ProfileLinkRow = {
  active_workspace_id: string | null;
};

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

type FamilyWorkspaceInviteRow = {
  id: string;
  invite_token: string;
  workspace_id: string;
  inviter_profile_id: string;
  invite_status: FamilyWorkspaceInviteStatus;
  created_at: string;
  expires_at: string | null;
  accepted_by_profile_id: string | null;
  accepted_at: string | null;
};

const PERSONAL_WORKSPACE_KIND: WorkspaceSummaryPayload["kind"] = "personal";
const FAMILY_WORKSPACE_KIND: WorkspaceSummaryPayload["kind"] = "family";
const VIRTUAL_WORKSPACE_PREFIX = "virtual-personal-";

const buildPersonalWorkspaceTitle = (profile: ProfilePayload): string => {
  const displayName = profile.firstName.trim() || profile.username || "Personal";
  return `${displayName}'s Workspace`;
};

const buildVirtualPersonalWorkspace = (
  profile: ProfilePayload,
): WorkspaceSummaryPayload => {
  return {
    id: `${VIRTUAL_WORKSPACE_PREFIX}${profile.id}`,
    kind: PERSONAL_WORKSPACE_KIND,
    title: buildPersonalWorkspaceTitle(profile),
    ownerProfileId: profile.id,
    memberRole: "owner",
    memberCount: 1,
  };
};

const isWorkspaceSchemaMissing = async (): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const workspaceCheck = await supabase.from("workspaces").select("id").limit(1);
  if (workspaceCheck.error?.code === "PGRST205") {
    return true;
  }

  const membersCheck = await supabase
    .from("workspace_members")
    .select("id")
    .limit(1);
  if (membersCheck.error?.code === "PGRST205") {
    return true;
  }

  return false;
};

const loadExistingPersonalWorkspace = async (
  profileId: string,
): Promise<WorkspaceRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, kind, owner_profile_id, title")
    .eq("owner_profile_id", profileId)
    .eq("kind", PERSONAL_WORKSPACE_KIND)
    .maybeSingle<WorkspaceRow>();

  if (error) {
    return null;
  }

  return data;
};

const getOrCreatePersonalWorkspace = async (
  profile: ProfilePayload,
): Promise<WorkspaceRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const existingWorkspace = await loadExistingPersonalWorkspace(profile.id);
  if (existingWorkspace) {
    return existingWorkspace;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      kind: PERSONAL_WORKSPACE_KIND,
      owner_profile_id: profile.id,
      title: buildPersonalWorkspaceTitle(profile),
      updated_at: now,
    })
    .select("id, kind, owner_profile_id, title")
    .single<WorkspaceRow>();

  if (!error && data) {
    return data;
  }

  if (error?.code === "23505") {
    return loadExistingPersonalWorkspace(profile.id);
  }

  return null;
};

const ensureMembership = async (
  workspaceId: string,
  profileId: string,
  memberRole: WorkspaceSummaryPayload["memberRole"] = "owner",
): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      profile_id: profileId,
      member_role: memberRole,
    },
    { onConflict: "workspace_id,profile_id" },
  );

  return !error;
};

const updateActiveWorkspace = async (
  profileId: string,
  workspaceId: string,
): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      active_workspace_id: workspaceId,
      updated_at: now,
      last_seen_at: now,
    })
    .eq("id", profileId);

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("profiles")
      .update({
        updated_at: now,
        last_seen_at: now,
      })
      .eq("id", profileId);

    return !fallback.error;
  }

  return !error;
};

const loadWorkspaceSummaryByIdForProfile = async (
  profileId: string,
  workspaceId: string,
): Promise<WorkspaceSummaryPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, kind, owner_profile_id, title")
    .eq("id", workspaceId)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError || !workspace) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, member_role")
    .eq("workspace_id", workspace.id)
    .eq("profile_id", profileId)
    .maybeSingle<MembershipRow>();

  if (membershipError || !membership) {
    return null;
  }

  const { count, error: memberCountError } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  if (memberCountError) {
    return null;
  }

  return {
    id: workspace.id,
    kind: workspace.kind,
    title: workspace.title,
    ownerProfileId: workspace.owner_profile_id,
    memberRole: membership.member_role,
    memberCount: count ?? 0,
  };
};

const inviteSelection =
  "id, invite_token, workspace_id, inviter_profile_id, invite_status, created_at, expires_at, accepted_by_profile_id, accepted_at";

const toInvitePayload = (
  row: FamilyWorkspaceInviteRow,
): FamilyWorkspaceInvitePayload => {
  return {
    id: row.id,
    inviteToken: row.invite_token,
    workspaceId: row.workspace_id,
    inviterProfileId: row.inviter_profile_id,
    inviteStatus: row.invite_status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedByProfileId: row.accepted_by_profile_id,
    acceptedAt: row.accepted_at,
  };
};

const isInviteExpired = (expiresAt: string | null, now: Date = new Date()): boolean => {
  if (!expiresAt) {
    return false;
  }

  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < now.getTime();
};

const expireInviteById = async (inviteId: string): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("family_workspace_invites")
    .update({
      invite_status: "expired",
    })
    .eq("id", inviteId)
    .eq("invite_status", "active");

  return !error;
};

const revokeInviteById = async (inviteId: string): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("family_workspace_invites")
    .update({
      invite_status: "revoked",
    })
    .eq("id", inviteId)
    .eq("invite_status", "active");

  return !error;
};

const loadPersonalWorkspaceSummary = async (
  profileId: string,
): Promise<WorkspaceSummaryPayload | null> => {
  const personalWorkspace = await loadExistingPersonalWorkspace(profileId);
  if (!personalWorkspace) {
    return null;
  }

  return loadWorkspaceSummaryByIdForProfile(profileId, personalWorkspace.id);
};

export const listWorkspaceSummariesForProfile = async (
  profileId: string,
): Promise<WorkspaceSummaryPayload[] | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("workspace_id, member_role")
    .eq("profile_id", profileId)
    .returns<MembershipRow[]>();

  if (membershipsError?.code === "PGRST205") {
    return [];
  }

  if (membershipsError || !memberships) {
    return null;
  }

  if (memberships.length === 0) {
    return [];
  }

  const membershipMap = new Map(
    memberships.map((membership) => [membership.workspace_id, membership]),
  );

  const workspaceIds = [...new Set(memberships.map((membership) => membership.workspace_id))];
  const { data: workspaces, error: workspacesError } = await supabase
    .from("workspaces")
    .select("id, kind, owner_profile_id, title")
    .in("id", workspaceIds)
    .returns<WorkspaceRow[]>();

  if (workspacesError?.code === "PGRST205") {
    return [];
  }

  if (workspacesError || !workspaces) {
    return null;
  }

  const summaries = await Promise.all(
    workspaces.map(async (workspace) => {
      const membership = membershipMap.get(workspace.id);
      if (!membership) {
        return null;
      }

      const { count, error: memberCountError } = await supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);

      if (memberCountError) {
        return null;
      }

      return {
        id: workspace.id,
        kind: workspace.kind,
        title: workspace.title,
        ownerProfileId: workspace.owner_profile_id,
        memberRole: membership.member_role,
        memberCount: count ?? 0,
      } satisfies WorkspaceSummaryPayload;
    }),
  );

  return summaries
    .filter((summary): summary is WorkspaceSummaryPayload => summary !== null)
    .sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "personal" ? -1 : 1;
      }

      return a.title.localeCompare(b.title);
    });
};

export const getWorkspaceSummaryForProfile = async (
  profileId: string,
): Promise<WorkspaceSummaryPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: profileLink, error: profileLinkError } = await supabase
    .from("profiles")
    .select("active_workspace_id")
    .eq("id", profileId)
    .single<ProfileLinkRow>();

  if (profileLinkError?.code === "42703") {
    return loadPersonalWorkspaceSummary(profileId);
  }

  if (profileLinkError || !profileLink?.active_workspace_id) {
    const personalSummary = await loadPersonalWorkspaceSummary(profileId);
    if (personalSummary) {
      return personalSummary;
    }

    const allWorkspaces = await listWorkspaceSummariesForProfile(profileId);
    return allWorkspaces?.[0] ?? null;
  }

  const activeSummary = await loadWorkspaceSummaryByIdForProfile(
    profileId,
    profileLink.active_workspace_id,
  );
  if (activeSummary) {
    return activeSummary;
  }

  const personalSummary = await loadPersonalWorkspaceSummary(profileId);
  if (personalSummary) {
    return personalSummary;
  }

  const allWorkspaces = await listWorkspaceSummariesForProfile(profileId);
  return allWorkspaces?.[0] ?? null;
};

export const ensurePersonalWorkspaceForProfile = async (
  profile: ProfilePayload,
): Promise<WorkspaceSummaryPayload | null> => {
  const workspace = await getOrCreatePersonalWorkspace(profile);
  if (!workspace) {
    if (await isWorkspaceSchemaMissing()) {
      return buildVirtualPersonalWorkspace(profile);
    }

    return null;
  }

  const membershipEnsured = await ensureMembership(workspace.id, profile.id, "owner");
  if (!membershipEnsured) {
    if (await isWorkspaceSchemaMissing()) {
      return buildVirtualPersonalWorkspace(profile);
    }

    return null;
  }

  const profileLinked = await updateActiveWorkspace(profile.id, workspace.id);
  if (!profileLinked) {
    return null;
  }

  const summary = await getWorkspaceSummaryForProfile(profile.id);
  if (!summary && (await isWorkspaceSchemaMissing())) {
    return buildVirtualPersonalWorkspace(profile);
  }

  return summary;
};

export const createFamilyWorkspaceForProfile = async (
  profile: ProfilePayload,
  title: string,
): Promise<WorkspaceSummaryPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const normalizedTitle = title.trim().slice(0, 120) || "Family Workspace";
  const now = new Date().toISOString();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      kind: FAMILY_WORKSPACE_KIND,
      owner_profile_id: profile.id,
      title: normalizedTitle,
      updated_at: now,
    })
    .select("id, kind, owner_profile_id, title")
    .single<WorkspaceRow>();

  if (workspaceError || !workspace) {
    return null;
  }

  const membershipEnsured = await ensureMembership(workspace.id, profile.id, "owner");
  if (!membershipEnsured) {
    return null;
  }

  const activeUpdated = await updateActiveWorkspace(profile.id, workspace.id);
  if (!activeUpdated) {
    return null;
  }

  return loadWorkspaceSummaryByIdForProfile(profile.id, workspace.id);
};

export const switchActiveWorkspaceForProfile = async (
  profileId: string,
  workspaceId: string,
): Promise<WorkspaceSummaryPayload | null> => {
  const targetWorkspace = await loadWorkspaceSummaryByIdForProfile(
    profileId,
    workspaceId,
  );
  if (!targetWorkspace) {
    return null;
  }

  const activeUpdated = await updateActiveWorkspace(profileId, workspaceId);
  if (!activeUpdated) {
    return null;
  }

  return loadWorkspaceSummaryByIdForProfile(profileId, workspaceId);
};

const readActiveInviteForWorkspace = async (
  workspaceId: string,
): Promise<FamilyWorkspaceInviteRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("family_workspace_invites")
    .select(inviteSelection)
    .eq("workspace_id", workspaceId)
    .eq("invite_status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<FamilyWorkspaceInviteRow>();

  if (error) {
    return null;
  }

  return data;
};

export const readLatestFamilyInviteForWorkspace = async (
  profileId: string,
  workspaceId: string,
): Promise<FamilyWorkspaceInvitePayload | null> => {
  const workspaceSummary = await loadWorkspaceSummaryByIdForProfile(profileId, workspaceId);
  if (!workspaceSummary || workspaceSummary.kind !== FAMILY_WORKSPACE_KIND) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("family_workspace_invites")
    .select(inviteSelection)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<FamilyWorkspaceInviteRow>();

  if (error || !data) {
    return null;
  }

  if (data.invite_status === "active" && isInviteExpired(data.expires_at)) {
    const expired = await expireInviteById(data.id);
    if (!expired) {
      return null;
    }

    return {
      ...toInvitePayload(data),
      inviteStatus: "expired",
    };
  }

  return toInvitePayload(data);
};

export type CreateFamilyWorkspaceInviteResult =
  | { ok: true; invite: FamilyWorkspaceInvitePayload }
  | {
      ok: false;
      reason:
        | "WORKSPACE_NOT_FOUND"
        | "NOT_FAMILY"
        | "FORBIDDEN"
        | "INVITE_STORAGE_NOT_READY"
        | "UNKNOWN";
    };

export const createFamilyWorkspaceInviteForProfile = async (
  profileId: string,
  workspaceId: string,
): Promise<CreateFamilyWorkspaceInviteResult> => {
  const workspaceSummary = await loadWorkspaceSummaryByIdForProfile(profileId, workspaceId);
  if (!workspaceSummary) {
    return { ok: false, reason: "WORKSPACE_NOT_FOUND" };
  }

  if (workspaceSummary.kind !== FAMILY_WORKSPACE_KIND) {
    return { ok: false, reason: "NOT_FAMILY" };
  }

  if (workspaceSummary.memberRole !== "owner") {
    return { ok: false, reason: "FORBIDDEN" };
  }

  const existingActiveInvite = await readActiveInviteForWorkspace(workspaceId);
  if (existingActiveInvite) {
    if (isInviteExpired(existingActiveInvite.expires_at)) {
      const expired = await expireInviteById(existingActiveInvite.id);
      if (!expired) {
        return { ok: false, reason: "UNKNOWN" };
      }
    } else {
      const revoked = await revokeInviteById(existingActiveInvite.id);
      if (!revoked) {
        return { ok: false, reason: "UNKNOWN" };
      }
    }
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, reason: "UNKNOWN" };
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);
  const inviteToken = `fam_${randomUUID().replace(/-/g, "")}`;

  const { data, error } = await supabase
    .from("family_workspace_invites")
    .insert({
      invite_token: inviteToken,
      workspace_id: workspaceId,
      inviter_profile_id: profileId,
      invite_status: "active",
      expires_at: expiresAt.toISOString(),
    })
    .select(inviteSelection)
    .single<FamilyWorkspaceInviteRow>();

  if (isFamilyInviteStorageNotReadyError(error)) {
    return { ok: false, reason: "INVITE_STORAGE_NOT_READY" };
  }

  if (error || !data) {
    return { ok: false, reason: "UNKNOWN" };
  }

  return {
    ok: true,
    invite: toInvitePayload(data),
  };
};

export type AcceptFamilyWorkspaceInviteResult =
  | {
      ok: true;
      invite: FamilyWorkspaceInvitePayload;
      workspace: WorkspaceSummaryPayload;
    }
  | {
      ok: false;
      reason:
        | "INVITE_NOT_FOUND"
        | "INVITE_EXPIRED"
        | "INVITE_ALREADY_USED"
        | "INVITE_INVALID_WORKSPACE_KIND"
        | "UNKNOWN";
    };

export const acceptFamilyWorkspaceInviteForProfile = async (
  profileId: string,
  inviteToken: string,
): Promise<AcceptFamilyWorkspaceInviteResult> => {
  const normalizedToken = inviteToken.trim();
  if (!normalizedToken) {
    return { ok: false, reason: "INVITE_NOT_FOUND" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, reason: "UNKNOWN" };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("family_workspace_invites")
    .select(inviteSelection)
    .eq("invite_token", normalizedToken)
    .maybeSingle<FamilyWorkspaceInviteRow>();

  if (inviteError || !invite) {
    return { ok: false, reason: "INVITE_NOT_FOUND" };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, kind, owner_profile_id, title")
    .eq("id", invite.workspace_id)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError || !workspace || workspace.kind !== FAMILY_WORKSPACE_KIND) {
    return { ok: false, reason: "INVITE_INVALID_WORKSPACE_KIND" };
  }

  if (invite.invite_status !== "active") {
    if (
      invite.invite_status === "accepted" &&
      invite.accepted_by_profile_id === profileId
    ) {
      const switchedWorkspace = await switchActiveWorkspaceForProfile(
        profileId,
        invite.workspace_id,
      );
      if (!switchedWorkspace) {
        return { ok: false, reason: "UNKNOWN" };
      }

      return {
        ok: true,
        invite: toInvitePayload(invite),
        workspace: switchedWorkspace,
      };
    }

    return { ok: false, reason: "INVITE_ALREADY_USED" };
  }

  if (isInviteExpired(invite.expires_at)) {
    const expired = await expireInviteById(invite.id);
    if (!expired) {
      return { ok: false, reason: "UNKNOWN" };
    }

    return { ok: false, reason: "INVITE_EXPIRED" };
  }

  const membershipEnsured = await ensureMembership(
    invite.workspace_id,
    profileId,
    "member",
  );
  if (!membershipEnsured) {
    return { ok: false, reason: "UNKNOWN" };
  }

  const acceptedAt = new Date().toISOString();
  const { data: acceptedInvite, error: acceptError } = await supabase
    .from("family_workspace_invites")
    .update({
      invite_status: "accepted",
      accepted_by_profile_id: profileId,
      accepted_at: acceptedAt,
    })
    .eq("id", invite.id)
    .eq("invite_status", "active")
    .select(inviteSelection)
    .maybeSingle<FamilyWorkspaceInviteRow>();

  if (acceptError) {
    return { ok: false, reason: "UNKNOWN" };
  }

  const switchedWorkspace = await switchActiveWorkspaceForProfile(
    profileId,
    invite.workspace_id,
  );
  if (!switchedWorkspace) {
    return { ok: false, reason: "UNKNOWN" };
  }

  return {
    ok: true,
    invite: toInvitePayload(acceptedInvite ?? invite),
    workspace: switchedWorkspace,
  };
};

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ProfilePayload,
  SelectedScenario,
  SupporterBadgeAdminTargetPayload,
  SupporterBadgeManageAction,
  TelegramIdentity,
} from "@/lib/auth/types";

type ProfileRow = {
  id: string;
  telegram_user_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  selected_scenario: SelectedScenario;
  active_workspace_id?: string | null;
  supporter_badge_active?: boolean | null;
  supporter_badge_granted_at?: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
};

type SupporterBadgeAdminTargetRow = {
  id: string;
  telegram_user_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  supporter_badge_active: boolean;
  supporter_badge_granted_at: string | null;
  supporter_badge_revoked_at: string | null;
  supporter_badge_note: string | null;
  supporter_badge_source: string | null;
  supporter_badge_granted_by_telegram_user_id: string | null;
  supporter_badge_revoked_by_telegram_user_id: string | null;
  updated_at: string;
};

const profileSelection =
  "id, telegram_user_id, username, first_name, last_name, photo_url, selected_scenario, active_workspace_id, supporter_badge_active, supporter_badge_granted_at, created_at, updated_at, last_seen_at";
const legacyProfileSelection =
  "id, telegram_user_id, username, first_name, last_name, photo_url, selected_scenario, active_workspace_id, created_at, updated_at, last_seen_at";

const supporterAdminTargetSelection =
  "id, telegram_user_id, username, first_name, last_name, supporter_badge_active, supporter_badge_granted_at, supporter_badge_revoked_at, supporter_badge_note, supporter_badge_source, supporter_badge_granted_by_telegram_user_id, supporter_badge_revoked_by_telegram_user_id, updated_at";

const isMissingSupporterBadgeColumnError = (
  error: { code?: string } | null,
): boolean => {
  return error?.code === "42703";
};

const toProfilePayload = (row: ProfileRow): ProfilePayload => {
  return {
    id: row.id,
    telegramUserId: String(row.telegram_user_id),
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    selectedScenario: row.selected_scenario,
    activeWorkspaceId: row.active_workspace_id ?? null,
    supporterBadgeActive: Boolean(row.supporter_badge_active),
    supporterBadgeGrantedAt: row.supporter_badge_granted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
};

const toSupporterBadgeAdminTargetPayload = (
  row: SupporterBadgeAdminTargetRow,
): SupporterBadgeAdminTargetPayload => {
  return {
    profileId: row.id,
    telegramUserId: String(row.telegram_user_id),
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    supporterBadgeActive: row.supporter_badge_active,
    supporterBadgeGrantedAt: row.supporter_badge_granted_at,
    supporterBadgeRevokedAt: row.supporter_badge_revoked_at,
    supporterBadgeNote: row.supporter_badge_note,
    supporterBadgeSource: row.supporter_badge_source,
    supporterBadgeGrantedByTelegramUserId:
      row.supporter_badge_granted_by_telegram_user_id,
    supporterBadgeRevokedByTelegramUserId:
      row.supporter_badge_revoked_by_telegram_user_id,
    updatedAt: row.updated_at,
  };
};

export const upsertProfileFromTelegramIdentity = async (
  identity: TelegramIdentity,
): Promise<ProfilePayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        telegram_user_id: identity.telegramUserId,
        username: identity.username,
        first_name: identity.firstName,
        last_name: identity.lastName,
        photo_url: identity.photoUrl,
        updated_at: now,
        last_seen_at: now,
      },
      { onConflict: "telegram_user_id" },
    )
    .select(profileSelection)
    .single<ProfileRow>();

  if (isMissingSupporterBadgeColumnError(error)) {
    const legacyResult = await supabase
      .from("profiles")
      .upsert(
        {
          telegram_user_id: identity.telegramUserId,
          username: identity.username,
          first_name: identity.firstName,
          last_name: identity.lastName,
          photo_url: identity.photoUrl,
          updated_at: now,
          last_seen_at: now,
        },
        { onConflict: "telegram_user_id" },
      )
      .select(legacyProfileSelection)
      .single<ProfileRow>();

    if (legacyResult.error || !legacyResult.data) {
      return null;
    }

    return toProfilePayload(legacyResult.data);
  }

  if (error || !data) {
    return null;
  }

  return toProfilePayload(data);
};

export const updateProfileScenarioByTelegramUserId = async (
  telegramUserId: string,
  selectedScenario: SelectedScenario,
): Promise<ProfilePayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      selected_scenario: selectedScenario,
      updated_at: now,
      last_seen_at: now,
    })
    .eq("telegram_user_id", telegramUserId)
    .select(profileSelection)
    .single<ProfileRow>();

  if (isMissingSupporterBadgeColumnError(error)) {
    const legacyResult = await supabase
      .from("profiles")
      .update({
        selected_scenario: selectedScenario,
        updated_at: now,
        last_seen_at: now,
      })
      .eq("telegram_user_id", telegramUserId)
      .select(legacyProfileSelection)
      .single<ProfileRow>();

    if (legacyResult.error || !legacyResult.data) {
      return null;
    }

    return toProfilePayload(legacyResult.data);
  }

  if (error || !data) {
    return null;
  }

  return toProfilePayload(data);
};

export const getProfileByTelegramUserId = async (
  telegramUserId: string,
): Promise<ProfilePayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelection)
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle<ProfileRow>();

  if (isMissingSupporterBadgeColumnError(error)) {
    const legacyResult = await supabase
      .from("profiles")
      .select(legacyProfileSelection)
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle<ProfileRow>();

    if (legacyResult.error || !legacyResult.data) {
      return null;
    }

    return toProfilePayload(legacyResult.data);
  }

  if (error || !data) {
    return null;
  }

  return toProfilePayload(data);
};

export type UpdateSupporterBadgeForTelegramUserParams = {
  targetTelegramUserId: string;
  actorTelegramUserId: string;
  action: SupporterBadgeManageAction;
  note: string | null;
  source: string;
};

export type UpdateSupporterBadgeForTelegramUserResult =
  | { ok: true; target: SupporterBadgeAdminTargetPayload }
  | {
      ok: false;
      reason: "TARGET_NOT_FOUND" | "FOUNDATION_NOT_READY" | "UPDATE_FAILED";
    };

export type ReadSupporterBadgeAdminTargetByTelegramUserIdResult =
  | { ok: true; target: SupporterBadgeAdminTargetPayload }
  | {
      ok: false;
      reason: "TARGET_NOT_FOUND" | "FOUNDATION_NOT_READY" | "READ_FAILED";
    };

export const readSupporterBadgeAdminTargetByTelegramUserId = async (
  targetTelegramUserId: string,
): Promise<ReadSupporterBadgeAdminTargetByTelegramUserIdResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, reason: "READ_FAILED" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(supporterAdminTargetSelection)
    .eq("telegram_user_id", targetTelegramUserId)
    .maybeSingle<SupporterBadgeAdminTargetRow>();

  if (error) {
    if (error.code === "42703") {
      return { ok: false, reason: "FOUNDATION_NOT_READY" };
    }
    return { ok: false, reason: "READ_FAILED" };
  }

  if (!data) {
    return { ok: false, reason: "TARGET_NOT_FOUND" };
  }

  return {
    ok: true,
    target: toSupporterBadgeAdminTargetPayload(data),
  };
};

export const updateSupporterBadgeForTelegramUser = async (
  params: UpdateSupporterBadgeForTelegramUserParams,
): Promise<UpdateSupporterBadgeForTelegramUserResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, reason: "UPDATE_FAILED" };
  }

  const now = new Date().toISOString();
  const normalizedSource =
    params.source.trim().slice(0, 64) || "manual_owner_assignment";

  const updatePayload =
    params.action === "grant"
      ? {
          supporter_badge_active: true,
          supporter_badge_granted_at: now,
          supporter_badge_revoked_at: null,
          supporter_badge_note: params.note,
          supporter_badge_source: normalizedSource,
          supporter_badge_granted_by_telegram_user_id: params.actorTelegramUserId,
          supporter_badge_revoked_by_telegram_user_id: null,
          updated_at: now,
        }
      : {
          supporter_badge_active: false,
          supporter_badge_revoked_at: now,
          supporter_badge_note: params.note,
          supporter_badge_source: normalizedSource,
          supporter_badge_revoked_by_telegram_user_id: params.actorTelegramUserId,
          updated_at: now,
        };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("telegram_user_id", params.targetTelegramUserId)
    .select(supporterAdminTargetSelection)
    .maybeSingle<SupporterBadgeAdminTargetRow>();

  if (error) {
    if (error.code === "42703") {
      return { ok: false, reason: "FOUNDATION_NOT_READY" };
    }
    return { ok: false, reason: "UPDATE_FAILED" };
  }

  if (!data) {
    return { ok: false, reason: "TARGET_NOT_FOUND" };
  }

  return {
    ok: true,
    target: toSupporterBadgeAdminTargetPayload(data),
  };
};

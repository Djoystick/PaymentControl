import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ProfilePayload,
  SelectedScenario,
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
  created_at: string;
  updated_at: string;
  last_seen_at: string;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
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
    .select(
      "id, telegram_user_id, username, first_name, last_name, photo_url, selected_scenario, active_workspace_id, created_at, updated_at, last_seen_at",
    )
    .single<ProfileRow>();

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
    .select(
      "id, telegram_user_id, username, first_name, last_name, photo_url, selected_scenario, active_workspace_id, created_at, updated_at, last_seen_at",
    )
    .single<ProfileRow>();

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
    .select(
      "id, telegram_user_id, username, first_name, last_name, photo_url, selected_scenario, active_workspace_id, created_at, updated_at, last_seen_at",
    )
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle<ProfileRow>();

  if (error || !data) {
    return null;
  }

  return toProfilePayload(data);
};

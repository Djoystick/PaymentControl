import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PremiumEntitlementPayload,
  PremiumEntitlementScope,
} from "@/lib/auth/types";

type PremiumEntitlementRow = {
  id: string;
  scope: PremiumEntitlementScope;
  profile_id: string | null;
  workspace_id: string | null;
  entitlement_source: PremiumEntitlementPayload["source"];
  status: PremiumEntitlementPayload["status"];
  starts_at: string;
  ends_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PremiumEntitlementLookupResult = {
  ok: boolean;
  entitlement: PremiumEntitlementPayload | null;
};

const entitlementSelection =
  "id, scope, profile_id, workspace_id, entitlement_source, status, starts_at, ends_at, metadata, created_at, updated_at";

const toPremiumEntitlementPayload = (
  row: PremiumEntitlementRow,
): PremiumEntitlementPayload => {
  return {
    id: row.id,
    scope: row.scope,
    profileId: row.profile_id,
    workspaceId: row.workspace_id,
    source: row.entitlement_source,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const pickLatestActiveEntitlement = (
  rows: PremiumEntitlementRow[],
  now: Date,
): PremiumEntitlementPayload | null => {
  for (const row of rows) {
    const startsAt = new Date(row.starts_at);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() > now.getTime()) {
      continue;
    }

    if (row.ends_at) {
      const endsAt = new Date(row.ends_at);
      if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now.getTime()) {
        continue;
      }
    }

    return toPremiumEntitlementPayload(row);
  }

  return null;
};

const readScopeEntitlement = async (
  scope: PremiumEntitlementScope,
  ownerIdField: "profile_id" | "workspace_id",
  ownerId: string,
  now: Date,
): Promise<PremiumEntitlementLookupResult> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      entitlement: null,
    };
  }

  const { data, error } = await supabase
    .from("premium_entitlements")
    .select(entitlementSelection)
    .eq("scope", scope)
    .eq(ownerIdField, ownerId)
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<PremiumEntitlementRow[]>();

  if (error?.code === "PGRST205" || error?.code === "42P01") {
    return {
      ok: true,
      entitlement: null,
    };
  }

  if (error || !data) {
    return {
      ok: false,
      entitlement: null,
    };
  }

  return {
    ok: true,
    entitlement: pickLatestActiveEntitlement(data, now),
  };
};

export const readActiveProfilePremiumEntitlement = async (
  profileId: string,
  now: Date = new Date(),
): Promise<PremiumEntitlementLookupResult> => {
  return readScopeEntitlement("profile", "profile_id", profileId, now);
};

export const readActiveWorkspacePremiumEntitlement = async (
  workspaceId: string,
  now: Date = new Date(),
): Promise<PremiumEntitlementLookupResult> => {
  return readScopeEntitlement("workspace", "workspace_id", workspaceId, now);
};

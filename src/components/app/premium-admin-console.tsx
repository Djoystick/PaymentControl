"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPremiumGiftCampaignByAdmin,
  deactivatePremiumGiftCampaignByAdmin,
  grantPremiumByAdmin,
  listPremiumGiftCampaignsByAdmin,
  readPremiumAdminSession,
  resolvePremiumAdminTarget,
  revokePremiumByAdmin,
} from "@/lib/auth/client";
import type {
  PremiumAdminCampaignPayload,
  PremiumAdminTargetPayload,
} from "@/lib/auth/types";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";

type PremiumAdminConsoleProps = {
  initData: string;
};

const formatDateTime = (value: string | null, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export function PremiumAdminConsole({ initData }: PremiumAdminConsoleProps) {
  const { tr } = useLocalization();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [targetTelegramUserId, setTargetTelegramUserId] = useState("");
  const [target, setTarget] = useState<PremiumAdminTargetPayload | null>(null);
  const [campaigns, setCampaigns] = useState<PremiumAdminCampaignPayload[]>([]);
  const [isResolvingTarget, setIsResolvingTarget] = useState(false);
  const [isSavingPremium, setIsSavingPremium] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [deactivatingCampaignId, setDeactivatingCampaignId] = useState<
    string | null
  >(null);
  const [grantDurationDaysInput, setGrantDurationDaysInput] = useState("30");
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [campaignCodeInput, setCampaignCodeInput] = useState("");
  const [campaignTitleInput, setCampaignTitleInput] = useState("");
  const [campaignQuotaInput, setCampaignQuotaInput] = useState("50");
  const [campaignDurationInput, setCampaignDurationInput] = useState("30");
  const [campaignStartsAtInput, setCampaignStartsAtInput] = useState("");
  const [campaignEndsAtInput, setCampaignEndsAtInput] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true);
    try {
      const response = await listPremiumGiftCampaignsByAdmin(initData);
      if (!response.ok) {
        setAdminMessage(response.error.message);
        return;
      }

      setCampaigns(response.campaigns);
    } catch {
      setAdminMessage(tr("Premium admin request failed."));
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [initData, tr]);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      try {
        const response = await readPremiumAdminSession(initData);
        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setSessionChecked(true);
          setAdminMessage(response.error.message);
          return;
        }

        setIsAdmin(response.session.isAdmin);
        setSessionChecked(true);

        if (response.session.isAdmin) {
          await loadCampaigns();
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setSessionChecked(true);
        setAdminMessage(tr("Premium admin request failed."));
      }
    };

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, [initData, loadCampaigns, tr]);

  const resolveTarget = async () => {
    if (!targetTelegramUserId.trim()) {
      setAdminMessage(tr("Target Telegram user id is required."));
      return;
    }

    setIsResolvingTarget(true);
    setAdminMessage(null);
    try {
      const response = await resolvePremiumAdminTarget(
        initData,
        targetTelegramUserId,
      );
      if (!response.ok) {
        setTarget(null);
        setAdminMessage(response.error.message);
        return;
      }

      setTarget(response.target);
      setAdminMessage(tr("Target account resolved."));
    } catch {
      setTarget(null);
      setAdminMessage(tr("Premium admin request failed."));
    } finally {
      setIsResolvingTarget(false);
    }
  };

  const grantPremium = async () => {
    if (!target) {
      setAdminMessage(tr("Resolve target account before grant/revoke."));
      return;
    }

    const normalizedDuration = grantDurationDaysInput.trim();
    const durationDays =
      normalizedDuration === ""
        ? null
        : Number.parseInt(normalizedDuration, 10);
    if (
      durationDays !== null &&
      (!Number.isInteger(durationDays) || durationDays <= 0)
    ) {
      setAdminMessage(tr("Duration days must be positive integer or empty."));
      return;
    }

    setIsSavingPremium(true);
    setAdminMessage(null);
    try {
      const response = await grantPremiumByAdmin({
        initData,
        targetTelegramUserId: target.telegramUserId,
        durationDays,
        note: adminNoteInput,
      });
      if (!response.ok) {
        setAdminMessage(response.error.message);
        return;
      }

      setTarget(response.target);
      setAdminMessage(tr("Premium granted to target account."));
    } catch {
      setAdminMessage(tr("Premium admin request failed."));
    } finally {
      setIsSavingPremium(false);
    }
  };

  const revokePremium = async () => {
    if (!target) {
      setAdminMessage(tr("Resolve target account before grant/revoke."));
      return;
    }

    setIsSavingPremium(true);
    setAdminMessage(null);
    try {
      const response = await revokePremiumByAdmin({
        initData,
        targetTelegramUserId: target.telegramUserId,
        note: adminNoteInput,
      });
      if (!response.ok) {
        setAdminMessage(response.error.message);
        return;
      }

      setTarget(response.target);
      setAdminMessage(
        tr("Premium revoke completed. Revoked entries: {count}", {
          count: response.revokedCount,
        }),
      );
    } catch {
      setAdminMessage(tr("Premium admin request failed."));
    } finally {
      setIsSavingPremium(false);
    }
  };

  const createCampaign = async () => {
    const quota = Number.parseInt(campaignQuotaInput.trim(), 10);
    const duration = Number.parseInt(campaignDurationInput.trim(), 10);
    if (!Number.isInteger(quota) || quota <= 0) {
      setAdminMessage(tr("Campaign quota must be a positive integer."));
      return;
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      setAdminMessage(tr("Campaign premium duration must be a positive integer."));
      return;
    }

    setIsCreatingCampaign(true);
    setAdminMessage(null);
    try {
      const response = await createPremiumGiftCampaignByAdmin({
        initData,
        campaignCode: campaignCodeInput,
        campaignTitle: campaignTitleInput,
        totalQuota: quota,
        campaignDurationDays: duration,
        startsAt: campaignStartsAtInput,
        endsAt: campaignEndsAtInput,
      });
      if (!response.ok) {
        setAdminMessage(response.error.message);
        return;
      }

      setCampaignCodeInput("");
      setCampaignTitleInput("");
      setCampaignStartsAtInput("");
      setCampaignEndsAtInput("");
      setCampaigns((current) => [response.campaign, ...current]);
      setAdminMessage(tr("Gift campaign created."));
    } catch {
      setAdminMessage(tr("Premium admin request failed."));
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const deactivateCampaign = async (campaignId: string) => {
    setDeactivatingCampaignId(campaignId);
    setAdminMessage(null);
    try {
      const response = await deactivatePremiumGiftCampaignByAdmin(
        initData,
        campaignId,
      );
      if (!response.ok) {
        setAdminMessage(response.error.message);
        return;
      }

      setCampaigns((current) =>
        current.map((item) =>
          item.id === response.campaign.id ? response.campaign : item,
        ),
      );
      setAdminMessage(tr("Campaign deactivated."));
    } catch {
      setAdminMessage(tr("Premium admin request failed."));
    } finally {
      setDeactivatingCampaignId(null);
    }
  };

  const targetPremiumLabel = useMemo(() => {
    if (!target) {
      return null;
    }

    return target.premium.isPremium
      ? tr("Premium active")
      : tr("Free plan active");
  }, [target, tr]);

  const targetPremiumSourceLabel = useMemo(() => {
    if (!target?.premium.effectiveSource) {
      return tr("unknown");
    }

    if (target.premium.effectiveSource === "manual_admin") {
      return tr("Manual/admin grant");
    }

    if (target.premium.effectiveSource === "boosty") {
      return tr("Boosty sync (future)");
    }

    return tr("Gift campaign grant");
  }, [target, tr]);

  if (!sessionChecked || !isAdmin) {
    return null;
  }

  return (
    <details className="mb-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
        <AppIcon name="premium" className="h-3.5 w-3.5" />
        {tr("Owner premium admin")}
      </summary>
      <p className="mt-2 text-xs text-app-text-muted">
        {tr(
          "Owner-only internal console. All actions use stable Telegram numeric user id.",
        )}
      </p>

      <div className="mt-3 rounded-xl border border-app-border bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Target account")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={targetTelegramUserId}
            onChange={(event) => setTargetTelegramUserId(event.target.value)}
            placeholder={tr("Target Telegram user id")}
            className="min-w-[170px] flex-1 rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <button
            type="button"
            onClick={() => void resolveTarget()}
            disabled={isResolvingTarget || !targetTelegramUserId.trim()}
            className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            {isResolvingTarget ? tr("Loading...") : tr("Resolve target")}
          </button>
        </div>
        {target && (
          <div className="mt-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text-muted">
            <p className="font-semibold text-app-text">
              {target.firstName} {target.lastName ?? ""}{" "}
              {target.username ? `(@${target.username})` : ""}
            </p>
            <p className="mt-1">
              {tr("Telegram user id")}: {target.telegramUserId}
            </p>
            <p className="mt-1">
              {tr("Current premium state")}: {targetPremiumLabel}
            </p>
            {target.premium.isPremium && (
              <p className="mt-1">
                {tr("Entitlement source")}: {targetPremiumSourceLabel}
                {". "}
                {tr("Premium valid until")}:{" "}
                {formatDateTime(target.premium.endsAt, tr("No expiry"))}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-app-border bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Manual premium actions")}
        </p>
        <p className="mt-1 text-xs text-app-text-muted">
          {tr("Grant/revoke uses target Telegram numeric user id resolution.")}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={grantDurationDaysInput}
            onChange={(event) => setGrantDurationDaysInput(event.target.value)}
            placeholder={tr("Grant duration days (empty = no expiry)")}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={adminNoteInput}
            onChange={(event) => setAdminNoteInput(event.target.value)}
            placeholder={tr("Admin note (optional)")}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void grantPremium()}
            disabled={isSavingPremium || !target}
            className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            {tr("Grant premium")}
          </button>
          <button
            type="button"
            onClick={() => void revokePremium()}
            disabled={isSavingPremium || !target}
            className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            {tr("Revoke premium")}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-app-border bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Gift campaign control")}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={campaignCodeInput}
            onChange={(event) => setCampaignCodeInput(event.target.value)}
            placeholder={tr("Campaign code")}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={campaignTitleInput}
            onChange={(event) => setCampaignTitleInput(event.target.value)}
            placeholder={tr("Campaign title")}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={campaignQuotaInput}
            onChange={(event) => setCampaignQuotaInput(event.target.value)}
            placeholder={tr("Quota")}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={campaignDurationInput}
            onChange={(event) => setCampaignDurationInput(event.target.value)}
            placeholder={tr("Premium days")}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="datetime-local"
            value={campaignStartsAtInput}
            onChange={(event) => setCampaignStartsAtInput(event.target.value)}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="datetime-local"
            value={campaignEndsAtInput}
            onChange={(event) => setCampaignEndsAtInput(event.target.value)}
            className="rounded-xl border border-app-border px-3 py-2 text-sm text-app-text outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void createCampaign()}
            disabled={isCreatingCampaign}
            className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            {isCreatingCampaign ? tr("Saving...") : tr("Create campaign")}
          </button>
          <button
            type="button"
            onClick={() => void loadCampaigns()}
            disabled={isLoadingCampaigns}
            className="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            {isLoadingCampaigns ? tr("Loading...") : tr("Refresh campaigns")}
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text-muted"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-app-text">
                  {campaign.title} ({campaign.code})
                </p>
                <span className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-semibold">
                  {tr(campaign.status)}
                </span>
              </div>
              <p className="mt-1">
                {tr("Quota used")}: {campaign.quotaUsed}/{campaign.totalQuota}.{" "}
                {tr("Claims")}: {campaign.claimsTotal}. {tr("Premium days")}:{" "}
                {campaign.premiumDurationDays}
              </p>
              <p className="mt-1">
                {tr("Starts")}: {formatDateTime(campaign.startsAt, tr("Not set"))}.{" "}
                {tr("Ends")}: {formatDateTime(campaign.endsAt, tr("Not set"))}
              </p>
              <button
                type="button"
                onClick={() => void deactivateCampaign(campaign.id)}
                disabled={
                  deactivatingCampaignId === campaign.id ||
                  campaign.status === "ended"
                }
                className="mt-2 rounded-lg border border-app-border px-2 py-1 text-[11px] font-semibold text-app-text disabled:opacity-60"
              >
                {campaign.status === "ended"
                  ? tr("Campaign ended")
                  : deactivatingCampaignId === campaign.id
                    ? tr("Saving...")
                    : tr("Deactivate campaign")}
              </button>
            </div>
          ))}
          {!isLoadingCampaigns && campaigns.length === 0 && (
            <p className="text-xs text-app-text-muted">
              {tr("No gift campaigns yet.")}
            </p>
          )}
        </div>
      </div>

      {adminMessage && (
        <p className="mt-2 text-xs font-medium text-app-text">{tr(adminMessage)}</p>
      )}
    </details>
  );
}

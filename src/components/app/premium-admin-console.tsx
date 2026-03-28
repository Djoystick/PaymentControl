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
type AdminMessageTone = "info" | "success" | "error";

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
  const [adminMessageTone, setAdminMessageTone] = useState<AdminMessageTone>("info");

  const clearAdminMessage = useCallback(() => {
    setAdminMessage(null);
    setAdminMessageTone("info");
  }, []);

  const showAdminMessage = useCallback(
    (message: string, tone: AdminMessageTone = "info") => {
      setAdminMessage(message);
      setAdminMessageTone(tone);
    },
    [],
  );

  const loadCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true);
    try {
      const response = await listPremiumGiftCampaignsByAdmin(initData);
      if (!response.ok) {
        showAdminMessage(response.error.message, "error");
        return;
      }

      setCampaigns(response.campaigns);
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [initData, showAdminMessage, tr]);

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
          showAdminMessage(response.error.message, "error");
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
        showAdminMessage(tr("Premium admin request failed."), "error");
      }
    };

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, [initData, loadCampaigns, showAdminMessage, tr]);

  const resolveTarget = async () => {
    if (!targetTelegramUserId.trim()) {
      showAdminMessage(tr("Target Telegram user id is required."), "error");
      return;
    }

    setIsResolvingTarget(true);
    clearAdminMessage();
    try {
      const response = await resolvePremiumAdminTarget(
        initData,
        targetTelegramUserId,
      );
      if (!response.ok) {
        setTarget(null);
        showAdminMessage(response.error.message, "error");
        return;
      }

      setTarget(response.target);
      showAdminMessage(tr("Target account resolved."));
    } catch {
      setTarget(null);
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsResolvingTarget(false);
    }
  };

  const grantPremium = async () => {
    if (!target) {
      showAdminMessage(tr("Resolve target account before grant/revoke."), "error");
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
      showAdminMessage(tr("Duration days must be positive integer or empty."), "error");
      return;
    }

    setIsSavingPremium(true);
    clearAdminMessage();
    try {
      const response = await grantPremiumByAdmin({
        initData,
        targetTelegramUserId: target.telegramUserId,
        durationDays,
        note: adminNoteInput,
      });
      if (!response.ok) {
        showAdminMessage(response.error.message, "error");
        return;
      }

      setTarget(response.target);
      showAdminMessage(tr("Premium granted to target account."), "success");
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsSavingPremium(false);
    }
  };

  const revokePremium = async () => {
    if (!target) {
      showAdminMessage(tr("Resolve target account before grant/revoke."), "error");
      return;
    }

    setIsSavingPremium(true);
    clearAdminMessage();
    try {
      const response = await revokePremiumByAdmin({
        initData,
        targetTelegramUserId: target.telegramUserId,
        note: adminNoteInput,
      });
      if (!response.ok) {
        showAdminMessage(response.error.message, "error");
        return;
      }

      setTarget(response.target);
      showAdminMessage(
        tr("Premium revoke completed. Revoked entries: {count}", {
          count: response.revokedCount,
        }),
        "success",
      );
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsSavingPremium(false);
    }
  };

  const createCampaign = async () => {
    const quota = Number.parseInt(campaignQuotaInput.trim(), 10);
    const duration = Number.parseInt(campaignDurationInput.trim(), 10);
    if (!Number.isInteger(quota) || quota <= 0) {
      showAdminMessage(tr("Campaign quota must be a positive integer."), "error");
      return;
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      showAdminMessage(tr("Campaign premium duration must be a positive integer."), "error");
      return;
    }

    setIsCreatingCampaign(true);
    clearAdminMessage();
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
        showAdminMessage(response.error.message, "error");
        return;
      }

      setCampaignCodeInput("");
      setCampaignTitleInput("");
      setCampaignStartsAtInput("");
      setCampaignEndsAtInput("");
      setCampaigns((current) => [response.campaign, ...current]);
      showAdminMessage(tr("Gift campaign created."), "success");
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const deactivateCampaign = async (campaignId: string) => {
    setDeactivatingCampaignId(campaignId);
    clearAdminMessage();
    try {
      const response = await deactivatePremiumGiftCampaignByAdmin(
        initData,
        campaignId,
      );
      if (!response.ok) {
        showAdminMessage(response.error.message, "error");
        return;
      }

      setCampaigns((current) =>
        current.map((item) =>
          item.id === response.campaign.id ? response.campaign : item,
        ),
      );
      showAdminMessage(tr("Campaign deactivated."), "success");
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
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
    <details className="pc-detail-surface mb-3">
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
            <div className="mt-1">
              <span
                className={`pc-status-pill ${
                  target.premium.isPremium ? "pc-status-pill-success" : ""
                }`}
              >
                <AppIcon
                  name={target.premium.isPremium ? "check" : "clock"}
                  className="h-3 w-3"
                />
                {tr("Current premium state")}: {targetPremiumLabel}
              </span>
            </div>
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
                <span
                  className={`pc-status-pill ${
                    campaign.status === "active"
                      ? "pc-status-pill-success"
                      : campaign.status === "ended" || campaign.status === "paused"
                        ? "pc-status-pill-warning"
                        : ""
                  }`}
                >
                  <AppIcon
                    name={
                      campaign.status === "active"
                        ? "check"
                        : campaign.status === "ended"
                          ? "archive"
                          : campaign.status === "paused"
                            ? "clock"
                            : "template"
                    }
                    className="h-3 w-3"
                  />
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
            <p className="pc-state-inline">
              <AppIcon name="clock" className="h-3.5 w-3.5" />
              {tr("No gift campaigns yet.")}
            </p>
          )}
        </div>
      </div>

      {adminMessage && (
        <p
          className={`pc-feedback mt-2 ${
            adminMessageTone === "success"
              ? "pc-feedback-success"
              : adminMessageTone === "error"
                ? "pc-feedback-error"
                : ""
          }`}
        >
          <AppIcon
            name={
              adminMessageTone === "success"
                ? "check"
                : adminMessageTone === "error"
                  ? "alert"
                  : "refresh"
            }
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          <span>{tr(adminMessage)}</span>
        </p>
      )}
    </details>
  );
}

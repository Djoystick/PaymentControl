"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSupportClaim,
  createPremiumGiftCampaignByAdmin,
  deactivatePremiumGiftCampaignByAdmin,
  grantPremiumByAdmin,
  listPremiumGiftCampaignsByAdmin,
  listSupportClaimsByAdmin,
  readPremiumAdminSession,
  reviewSupportClaimByAdmin,
  resolvePremiumAdminTarget,
  revokePremiumByAdmin,
} from "@/lib/auth/client";
import type {
  PremiumAdminCampaignPayload,
  PremiumAdminSupportClaimReviewDecision,
  PremiumAdminTargetPayload,
  SupportClaimPayload,
} from "@/lib/auth/types";
import { useLocalization } from "@/lib/i18n/localization";
import {
  DEFAULT_PREMIUM_EXPECTED_TIER,
  DEFAULT_SUPPORT_CLAIM_RAIL,
} from "@/lib/premium/purchase-semantics";
import { AppIcon } from "@/components/app/app-icon";

type PremiumAdminConsoleProps = {
  initData: string;
};
type AdminMessageTone = "info" | "success" | "error";
type SupportClaimQueueFilter =
  | "all"
  | "needs_review"
  | "approved"
  | "rejected"
  | "closed";

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
  const [purchaseClaims, setPurchaseClaims] = useState<SupportClaimPayload[]>([]);
  const [supportClaimQueueFilter, setSupportClaimQueueFilter] =
    useState<SupportClaimQueueFilter>("needs_review");
  const [isResolvingTarget, setIsResolvingTarget] = useState(false);
  const [isSavingPremium, setIsSavingPremium] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLoadingPurchaseClaims, setIsLoadingPurchaseClaims] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [deactivatingCampaignId, setDeactivatingCampaignId] = useState<
    string | null
  >(null);
  const [reviewingClaimId, setReviewingClaimId] = useState<string | null>(null);
  const [claimAdminNotes, setClaimAdminNotes] = useState<Record<string, string>>(
    {},
  );
  const [grantDurationDaysInput, setGrantDurationDaysInput] = useState("30");
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [campaignCodeInput, setCampaignCodeInput] = useState("");
  const [campaignTitleInput, setCampaignTitleInput] = useState("");
  const [campaignQuotaInput, setCampaignQuotaInput] = useState("50");
  const [campaignDurationInput, setCampaignDurationInput] = useState("30");
  const [campaignStartsAtInput, setCampaignStartsAtInput] = useState("");
  const [campaignEndsAtInput, setCampaignEndsAtInput] = useState("");
  const [isCreatingVerificationClaim, setIsCreatingVerificationClaim] =
    useState(false);
  const [verificationClaim, setVerificationClaim] =
    useState<SupportClaimPayload | null>(null);
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

  const loadPurchaseClaims = useCallback(async () => {
    setIsLoadingPurchaseClaims(true);
    try {
      const response = await listSupportClaimsByAdmin(initData);
      if (!response.ok) {
        showAdminMessage(response.error.message, "error");
        return;
      }

      setPurchaseClaims(response.claims);
      setClaimAdminNotes((current) => {
        const next: Record<string, string> = { ...current };
        for (const claim of response.claims) {
          next[claim.id] = current[claim.id] ?? claim.adminNote ?? "";
        }

        return next;
      });
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsLoadingPurchaseClaims(false);
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
          await Promise.all([loadCampaigns(), loadPurchaseClaims()]);
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
  }, [initData, loadCampaigns, loadPurchaseClaims, showAdminMessage, tr]);

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

  const createVerificationClaim = async () => {
    setIsCreatingVerificationClaim(true);
    clearAdminMessage();
    try {
      const response = await createSupportClaim({
        initData,
        claimRail: DEFAULT_SUPPORT_CLAIM_RAIL,
        expectedTier: DEFAULT_PREMIUM_EXPECTED_TIER,
        externalPayerHandle: "test_payment_user",
        paymentProofReference: "PAYMENT-QA-001",
        paymentProofText: "manual test payment proof",
        claimNote: "phase 22A manual verification",
      });
      if (!response.ok) {
        setVerificationClaim(null);
        showAdminMessage(response.error.message, "error");
        return;
      }

      setVerificationClaim(response.claim);
      showAdminMessage(
        tr("Temporary support claim created: {claimId}", {
          claimId: response.claim.id,
        }),
        "success",
      );
    } catch {
      setVerificationClaim(null);
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setIsCreatingVerificationClaim(false);
    }
  };

  const updateClaimAdminNote = (claimId: string, value: string) => {
    setClaimAdminNotes((current) => ({
      ...current,
      [claimId]: value,
    }));
  };

  const isClaimReviewable = (status: SupportClaimPayload["status"]) => {
    return status === "submitted" || status === "pending_review";
  };

  const reviewPurchaseClaim = async (
    claimId: string,
    decision: PremiumAdminSupportClaimReviewDecision,
  ) => {
    setReviewingClaimId(claimId);
    clearAdminMessage();
    try {
      const response = await reviewSupportClaimByAdmin({
        initData,
        claimId,
        decision,
        adminNote: claimAdminNotes[claimId] ?? "",
      });
      if (!response.ok) {
        showAdminMessage(response.error.message, "error");
        return;
      }

      setPurchaseClaims((current) =>
        current.map((claim) => (claim.id === response.claim.id ? response.claim : claim)),
      );
      setClaimAdminNotes((current) => ({
        ...current,
        [response.claim.id]: response.claim.adminNote ?? "",
      }));
      showAdminMessage(
        decision === "approve"
          ? tr("Support validation approved: {claimId}", {
              claimId: response.claim.id,
            })
          : tr("Support validation rejected: {claimId}", {
              claimId: response.claim.id,
            }),
        "success",
      );
    } catch {
      showAdminMessage(tr("Premium admin request failed."), "error");
    } finally {
      setReviewingClaimId(null);
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

    if (target.premium.effectiveSource === "one_time_purchase") {
      return tr("Validated support claim");
    }

    if (target.premium.effectiveSource === "boosty") {
      return tr("Validated support claim (legacy)");
    }

    return tr("Gift campaign grant");
  }, [target, tr]);

  const getClaimStatusPillClass = (status: SupportClaimPayload["status"]) => {
    if (status === "approved") {
      return "pc-status-pill-success";
    }

    if (status === "rejected" || status === "expired" || status === "cancelled") {
      return "pc-status-pill-warning";
    }

    return "";
  };

  const getClaimStatusIcon = (status: SupportClaimPayload["status"]) => {
    if (status === "approved") {
      return "check" as const;
    }

    if (status === "rejected" || status === "expired" || status === "cancelled") {
      return "alert" as const;
    }

    if (status === "pending_review") {
      return "refresh" as const;
    }

    return "clock" as const;
  };

  const isLegacyClaimRecord = (claim: SupportClaimPayload) => {
    const normalizedTier = claim.expectedTier.trim().toLowerCase();
    return (
      claim.claimRail === "boosty_premium" ||
      normalizedTier.includes("monthly") ||
      normalizedTier.includes("subscription") ||
      normalizedTier.includes("boosty")
    );
  };

  const getClaimRailLabel = (claim: SupportClaimPayload) => {
    if (claim.claimRail === "one_time_premium") {
      return tr("Current support rail");
    }

    return tr("Legacy support rail (historical subscription-era)");
  };

  const getClaimTierLabel = (claim: SupportClaimPayload) => {
    const normalizedTier = claim.expectedTier.trim().toLowerCase();
    if (normalizedTier === "premium_one_time" || normalizedTier.includes("one_time")) {
      return tr("Current support perk package");
    }

    if (normalizedTier.includes("monthly")) {
      return tr("Legacy monthly package code (historical)");
    }

    if (normalizedTier.includes("year") || normalizedTier.includes("annual")) {
      return tr("Legacy annual package code (historical)");
    }

    return tr("Custom package code");
  };

  const getClaimQueueRank = (status: SupportClaimPayload["status"]): number => {
    if (status === "submitted" || status === "pending_review") {
      return 0;
    }

    if (status === "approved") {
      return 1;
    }

    if (status === "rejected") {
      return 2;
    }

    return 3;
  };

  const sortedPurchaseClaims = useMemo(() => {
    const next = [...purchaseClaims];
    next.sort((left, right) => {
      const statusRankDelta =
        getClaimQueueRank(left.status) - getClaimQueueRank(right.status);
      if (statusRankDelta !== 0) {
        return statusRankDelta;
      }

      if (left.submittedAt !== right.submittedAt) {
        return right.submittedAt.localeCompare(left.submittedAt);
      }

      return right.id.localeCompare(left.id);
    });
    return next;
  }, [purchaseClaims]);

  const supportClaimQueueCounts = useMemo(() => {
    const needsReview = sortedPurchaseClaims.filter(
      (claim) =>
        claim.status === "submitted" || claim.status === "pending_review",
    ).length;
    const approved = sortedPurchaseClaims.filter(
      (claim) => claim.status === "approved",
    ).length;
    const rejected = sortedPurchaseClaims.filter(
      (claim) => claim.status === "rejected",
    ).length;
    const closed = sortedPurchaseClaims.filter(
      (claim) => claim.status === "expired" || claim.status === "cancelled",
    ).length;

    return {
      all: sortedPurchaseClaims.length,
      needsReview,
      approved,
      rejected,
      closed,
    };
  }, [sortedPurchaseClaims]);

  const visiblePurchaseClaims = useMemo(() => {
    if (supportClaimQueueFilter === "all") {
      return sortedPurchaseClaims;
    }

    if (supportClaimQueueFilter === "needs_review") {
      return sortedPurchaseClaims.filter(
        (claim) =>
          claim.status === "submitted" || claim.status === "pending_review",
      );
    }

    if (supportClaimQueueFilter === "approved") {
      return sortedPurchaseClaims.filter((claim) => claim.status === "approved");
    }

    if (supportClaimQueueFilter === "rejected") {
      return sortedPurchaseClaims.filter((claim) => claim.status === "rejected");
    }

    return sortedPurchaseClaims.filter(
      (claim) => claim.status === "expired" || claim.status === "cancelled",
    );
  }, [sortedPurchaseClaims, supportClaimQueueFilter]);

  if (!sessionChecked || !isAdmin) {
    return null;
  }

  return (
    <details className="pc-detail-surface bg-app-surface">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
        <AppIcon name="premium" className="h-3.5 w-3.5" />
        {tr("Owner premium admin")}
      </summary>
      <p className="mt-1.5 text-xs text-app-text-muted">
        {tr(
          "Owner-only internal console. All actions use stable Telegram numeric user id.",
        )}
      </p>

      <div className="pc-detail-surface mt-2 bg-app-surface">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Target account")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={targetTelegramUserId}
            onChange={(event) => setTargetTelegramUserId(event.target.value)}
            placeholder={tr("Target Telegram user id")}
            className="min-w-[170px] flex-1 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <button
            type="button"
            onClick={() => void resolveTarget()}
            disabled={isResolvingTarget || !targetTelegramUserId.trim()}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {isResolvingTarget ? tr("Loading...") : tr("Resolve target")}
          </button>
        </div>
        {target && (
          <div className="pc-state-card mt-2 bg-app-surface px-2 py-1.5 text-xs text-app-text-muted">
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

      <div className="pc-detail-surface mt-2 bg-app-surface">
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
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={adminNoteInput}
            onChange={(event) => setAdminNoteInput(event.target.value)}
            placeholder={tr("Admin note (optional)")}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void grantPremium()}
            disabled={isSavingPremium || !target}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {tr("Grant premium")}
          </button>
          <button
            type="button"
            onClick={() => void revokePremium()}
            disabled={isSavingPremium || !target}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {tr("Revoke premium")}
          </button>
        </div>
      </div>

      <div className="pc-detail-surface mt-2 bg-app-surface">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Gift campaign control")}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={campaignCodeInput}
            onChange={(event) => setCampaignCodeInput(event.target.value)}
            placeholder={tr("Campaign code")}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={campaignTitleInput}
            onChange={(event) => setCampaignTitleInput(event.target.value)}
            placeholder={tr("Campaign title")}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={campaignQuotaInput}
            onChange={(event) => setCampaignQuotaInput(event.target.value)}
            placeholder={tr("Quota")}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="text"
            value={campaignDurationInput}
            onChange={(event) => setCampaignDurationInput(event.target.value)}
            placeholder={tr("Premium days")}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="datetime-local"
            value={campaignStartsAtInput}
            onChange={(event) => setCampaignStartsAtInput(event.target.value)}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
          <input
            type="datetime-local"
            value={campaignEndsAtInput}
            onChange={(event) => setCampaignEndsAtInput(event.target.value)}
            className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void createCampaign()}
            disabled={isCreatingCampaign}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {isCreatingCampaign ? tr("Saving...") : tr("Create campaign")}
          </button>
          <button
            type="button"
            onClick={() => void loadCampaigns()}
            disabled={isLoadingCampaigns}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {isLoadingCampaigns ? tr("Loading...") : tr("Refresh campaigns")}
          </button>
        </div>

        <div className="mt-2 space-y-1.5">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="pc-state-card bg-app-surface px-2 py-1.5 text-xs text-app-text-muted"
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
                className="pc-btn-quiet mt-1.5 disabled:opacity-60"
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

      <details className="pc-detail-surface mt-2 bg-app-surface">
        <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="help" className="h-3.5 w-3.5" />
          {tr("Temporary support claim verification (22A.1)")}
        </summary>
        <p className="mt-2 text-xs text-app-text-muted">
          {tr(
            "Legacy owner-only helper for old verification flows. Keep collapsed unless explicitly needed.",
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void createVerificationClaim()}
            disabled={isCreatingVerificationClaim}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {isCreatingVerificationClaim ? tr("Creating...") : tr("Create test support claim")}
          </button>
        </div>
        <div className="pc-state-card mt-2 bg-app-surface px-2 py-1.5 text-xs text-app-text-muted">
          <p className="font-semibold text-app-text">{tr("Test payload")}</p>
          <p className="mt-1">
            {tr("Rail")}: <span className="font-semibold text-app-text">one_time_premium</span>
          </p>
          <p className="mt-1">
            {tr("Expected tier")}:{" "}
            <span className="font-semibold text-app-text">premium_one_time</span>
          </p>
          <p className="mt-1">
            {tr("External payer handle")}:{" "}
            <span className="font-semibold text-app-text">test_payment_user</span>
          </p>
          <p className="mt-1">
            {tr("Support proof reference")}:{" "}
            <span className="font-semibold text-app-text">PAYMENT-QA-001</span>
          </p>
          <p className="mt-1">
            {tr("Support proof text")}:{" "}
            <span className="font-semibold text-app-text">manual test payment proof</span>
          </p>
          <p className="mt-1">
            {tr("Support note")}:{" "}
            <span className="font-semibold text-app-text">phase 22A manual verification</span>
          </p>
          <p className="mt-1">
            {tr("Telegram user id")}:{" "}
            {tr("taken from current verified app context")}
          </p>
        </div>
        {verificationClaim && (
          <div className="pc-state-card mt-2 bg-app-surface px-2 py-1.5 text-xs text-app-text-muted">
            <p className="font-semibold text-app-text">{tr("Created claim result")}</p>
            <p className="mt-1">
              {tr("Claim id")}: <span className="font-semibold text-app-text">{verificationClaim.id}</span>
            </p>
            <p className="mt-1">
              {tr("Claim status")}: <span className="font-semibold text-app-text">{tr(verificationClaim.status)}</span>
            </p>
            <p className="mt-1">
              {tr("Rail")}: <span className="font-semibold text-app-text">{verificationClaim.claimRail}</span>
            </p>
            <p className="mt-1">
              {tr("Expected tier")}:{" "}
              <span className="font-semibold text-app-text">{verificationClaim.expectedTier}</span>
            </p>
            <p className="mt-1">
              {tr("Telegram user id")}:{" "}
              <span className="font-semibold text-app-text">{verificationClaim.telegramUserId}</span>
            </p>
            <p className="mt-1">
              {tr("Submitted at")}:{" "}
              <span className="font-semibold text-app-text">
                {formatDateTime(verificationClaim.submittedAt, verificationClaim.submittedAt)}
              </span>
            </p>
          </div>
        )}
      </details>

      <div className="pc-detail-surface mt-2 bg-app-surface">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Support claim validation queue")}
        </p>
        <p className="mt-1 text-xs text-app-text-muted">
          {tr(
            "Owner-only manual validation queue for support claims and Premium perk eligibility.",
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPurchaseClaims()}
            disabled={isLoadingPurchaseClaims}
            className="pc-btn-secondary disabled:opacity-60"
          >
            {isLoadingPurchaseClaims ? tr("Loading...") : tr("Refresh claim queue")}
          </button>
        </div>
        <div className="mt-1.5 rounded-xl border border-app-border bg-white px-3 py-2 text-xs text-app-text-muted">
          <p>
            {tr("Visible")}: {visiblePurchaseClaims.length} / {tr("In queue")}:{" "}
            {sortedPurchaseClaims.length}
          </p>
          <p className="mt-1">
            {tr("Needs review first. Legacy context stays readable but secondary.")}
          </p>
          <div className="pc-segmented mt-1.5">
            <button
              type="button"
              onClick={() => setSupportClaimQueueFilter("needs_review")}
              aria-pressed={supportClaimQueueFilter === "needs_review"}
              className="pc-segment-btn min-h-9"
            >
              {tr("Needs review")} ({supportClaimQueueCounts.needsReview})
            </button>
            <button
              type="button"
              onClick={() => setSupportClaimQueueFilter("all")}
              aria-pressed={supportClaimQueueFilter === "all"}
              className="pc-segment-btn min-h-9"
            >
              {tr("All")} ({supportClaimQueueCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSupportClaimQueueFilter("approved")}
              aria-pressed={supportClaimQueueFilter === "approved"}
              className="pc-segment-btn min-h-9"
            >
              {tr("Approved")} ({supportClaimQueueCounts.approved})
            </button>
            <button
              type="button"
              onClick={() => setSupportClaimQueueFilter("rejected")}
              aria-pressed={supportClaimQueueFilter === "rejected"}
              className="pc-segment-btn min-h-9"
            >
              {tr("Rejected")} ({supportClaimQueueCounts.rejected})
            </button>
            <button
              type="button"
              onClick={() => setSupportClaimQueueFilter("closed")}
              aria-pressed={supportClaimQueueFilter === "closed"}
              className="pc-segment-btn min-h-9"
            >
              {tr("Closed")} ({supportClaimQueueCounts.closed})
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          {visiblePurchaseClaims.map((claim) => (
            <details
              key={claim.id}
              className="pc-state-card bg-app-surface px-2 py-1.5 text-xs text-app-text-muted"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-2">
                <span className="min-w-0 flex-1">
                  <span className="inline-flex flex-wrap items-center gap-1 font-semibold text-app-text">
                    <span>
                      {tr("Claim")} #{claim.id.slice(0, 8)}
                    </span>
                    <span
                      className={`pc-status-pill ${
                        isLegacyClaimRecord(claim)
                          ? "pc-status-pill-warning"
                          : "pc-status-pill-success"
                      }`}
                    >
                      <AppIcon
                        name={isLegacyClaimRecord(claim) ? "clock" : "check"}
                        className="h-3 w-3"
                      />
                      {isLegacyClaimRecord(claim)
                        ? tr("Legacy format")
                        : tr("Current format")}
                    </span>
                    {(claim.status === "submitted" || claim.status === "pending_review") && (
                      <span className="pc-status-pill pc-status-pill-warning">
                        <AppIcon name="alert" className="h-3 w-3" />
                        {tr("Needs review")}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 inline-flex flex-wrap items-center gap-1 text-[11px] text-app-text-muted">
                    <span className="pc-status-pill">
                      <AppIcon name="workspace" className="h-3 w-3" />
                      {tr("Telegram user id")}: {claim.telegramUserId}
                    </span>
                    <span className="pc-status-pill">
                      <AppIcon name="support" className="h-3 w-3" />
                      {getClaimRailLabel(claim)}
                    </span>
                    {claim.purchaseCorrelationCode && (
                      <span className="pc-status-pill">
                        <AppIcon name="wallet" className="h-3 w-3" />
                        {tr("Support reference code")}: {claim.purchaseCorrelationCode}
                      </span>
                    )}
                    <span className="pc-status-pill">
                      <AppIcon name="clock" className="h-3 w-3" />
                      {tr("Submitted at")}: {formatDateTime(claim.submittedAt, claim.submittedAt)}
                    </span>
                    <span className="pc-status-pill">
                      <AppIcon name="template" className="h-3 w-3" />
                      {tr("Proof fields")}:{" "}
                      {[
                        claim.paymentProofReference,
                        claim.externalPayerHandle,
                        claim.paymentProofText,
                      ].filter((value) => Boolean(value?.trim())).length}
                      /3
                    </span>
                  </span>
                </span>
                <span
                  className={`pc-status-pill ${getClaimStatusPillClass(claim.status)}`}
                >
                  <AppIcon
                    name={getClaimStatusIcon(claim.status)}
                    className="h-3 w-3"
                  />
                  {tr(claim.status)}
                </span>
              </summary>
              <div className="mt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                  {tr("Decision context")}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`pc-status-pill ${
                      isLegacyClaimRecord(claim)
                        ? "pc-status-pill-warning"
                        : "pc-status-pill-success"
                    }`}
                  >
                    <AppIcon
                      name={isLegacyClaimRecord(claim) ? "clock" : "check"}
                      className="h-3 w-3"
                    />
                    {isLegacyClaimRecord(claim)
                      ? tr("Legacy claim context")
                      : tr("Current support validation path")}
                  </span>
                  <span className="pc-status-pill">
                    <AppIcon name="premium" className="h-3 w-3" />
                    {tr("Expected perk package")}: {getClaimTierLabel(claim)}
                  </span>
                </div>
                <p className="mt-1">
                  {tr("Rail")}: {getClaimRailLabel(claim)} ({claim.claimRail})
                </p>
                <p className="mt-1">
                  {tr("Expected tier")}: {claim.expectedTier}
                </p>
                <p className="mt-1">
                  {tr("Submitted at")}: {formatDateTime(claim.submittedAt, claim.submittedAt)}
                  {". "}
                  {tr("Entitlement linked")}: {claim.entitlementId ? tr("yes") : tr("no")}
                </p>
                {claim.purchaseCorrelationCode && (
                  <p className="mt-1">
                    {tr("Support reference code")}: {claim.purchaseCorrelationCode}
                  </p>
                )}
                {claim.purchaseIntentId && (
                  <p className="mt-1">
                    {tr("Support intent id (legacy)")}: {claim.purchaseIntentId}
                  </p>
                )}
              </div>
              <div className="mt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                  {tr("Submitted proof")}
                </p>
                <div className="mt-1 space-y-1 text-xs">
                  <p>
                    {tr("Support proof reference")}: {claim.paymentProofReference ?? tr("Not set")}
                  </p>
                  <p>
                    {tr("External supporter handle")}: {claim.externalPayerHandle ?? tr("Not set")}
                  </p>
                  <p>
                    {tr("Support proof text")}: {claim.paymentProofText ?? tr("Not set")}
                  </p>
                  <p>
                    {tr("Support note")}: {claim.claimNote ?? tr("Not set")}
                  </p>
                </div>
              </div>
              <div className="mt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                  {tr("Review metadata")}
                </p>
                <div className="mt-1 space-y-1 text-xs">
                  <p>
                    {tr("Admin note")}: {claim.adminNote ?? tr("Not set")}
                  </p>
                  <p>
                    {tr("Reviewed at")}:{" "}
                    {claim.reviewedAt
                      ? formatDateTime(claim.reviewedAt, claim.reviewedAt)
                      : tr("Not set")}
                  </p>
                  <p>
                    {tr("Reviewed by admin Telegram user id")}: {claim.reviewedByAdminTelegramUserId ?? tr("Not set")}
                  </p>
                  <p>
                    {tr("Claim id")}: {claim.id}
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={claimAdminNotes[claim.id] ?? ""}
                  onChange={(event) =>
                    updateClaimAdminNote(claim.id, event.target.value)
                  }
                  placeholder={tr("Admin note (optional)")}
                  className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void reviewPurchaseClaim(claim.id, "approve")}
                    disabled={
                      reviewingClaimId === claim.id || !isClaimReviewable(claim.status)
                    }
                    className="pc-btn-primary disabled:opacity-60"
                  >
                    {reviewingClaimId === claim.id
                      ? tr("Saving...")
                      : tr("Approve support validation")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void reviewPurchaseClaim(claim.id, "reject")}
                    disabled={
                      reviewingClaimId === claim.id || !isClaimReviewable(claim.status)
                    }
                    className="pc-btn-danger disabled:opacity-60"
                  >
                    {reviewingClaimId === claim.id
                      ? tr("Saving...")
                      : tr("Reject support validation")}
                  </button>
                </div>
              </div>
              {isClaimReviewable(claim.status) && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-app-text-muted">
                  <AppIcon name="help" className="h-3.5 w-3.5" />
                  {tr(
                    "Approve validates external support and grants Premium perk access. Reject keeps free core access unchanged.",
                  )}
                </p>
              )}
              {!isClaimReviewable(claim.status) && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-app-text-muted">
                  <AppIcon name="clock" className="h-3.5 w-3.5" />
                  {tr("This claim is already reviewed.")}
                </p>
              )}
            </details>
          ))}
          {!isLoadingPurchaseClaims && sortedPurchaseClaims.length === 0 && (
            <p className="pc-state-inline">
              <AppIcon name="clock" className="h-3.5 w-3.5" />
              {tr("No support claims yet.")}
            </p>
          )}
          {!isLoadingPurchaseClaims &&
            sortedPurchaseClaims.length > 0 &&
            visiblePurchaseClaims.length === 0 && (
              <p className="pc-state-inline">
                <AppIcon name="clock" className="h-3.5 w-3.5" />
                {tr("No claims in this focus yet.")}
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

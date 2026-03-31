"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  FamilyWorkspaceInvitePayload,
  FamilyWorkspaceInviteStatus,
  SupportClaimPayload,
  SupportReferencePayload,
} from "@/lib/auth/types";
import {
  createSupportClaim,
  createSupportReferenceIntent,
  readMySupportReferenceIntents,
  readMySupportClaims,
  submitBugReport,
} from "@/lib/auth/client";
import { useCurrentAppContext } from "@/hooks/use-current-app-context";
import {
  maskInviteToken,
  normalizeFamilyInviteToken,
} from "@/lib/auth/invite-token";
import {
  AppShell,
  ONBOARDING_REPLAY_EVENT,
  ONBOARDING_STORAGE_KEY,
} from "@/components/app/app-shell";
import { LocalizationProvider, useLocalization } from "@/lib/i18n/localization";
import { LandingScreen } from "@/components/app/landing-screen";
import { PaymentsDashboardSection } from "@/components/app/payments-dashboard-section";
import { PaymentsActivitySection } from "@/components/app/payments-activity-section";
import { RecurringPaymentsSection } from "@/components/app/recurring-payments-section";
import { PremiumAdminConsole } from "@/components/app/premium-admin-console";
import { HelpPopover } from "@/components/app/help-popover";
import { AppIcon } from "@/components/app/app-icon";
import { clientEnv } from "@/lib/config/client-env";
import {
  DEFAULT_SUPPORT_CLAIM_RAIL,
  DEFAULT_PREMIUM_EXPECTED_TIER,
  SOFT_PREMIUM_ACCESS_DAYS,
  SOFT_SUPPORT_MIN_AMOUNT_RUB,
} from "@/lib/premium/purchase-semantics";
import { ThemeProvider, useTheme } from "@/lib/theme/theme-context";

const inviteStatusLabels: Record<FamilyWorkspaceInviteStatus, string> = {
  active: "Active",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
};

const inviteStatusHints: Record<FamilyWorkspaceInviteStatus, string> = {
  active: "This invite can be used to join this family workspace.",
  accepted: "This invite was already used.",
  expired: "This invite is no longer valid.",
  revoked: "This invite was turned off.",
};

const formatDateTime = (value: string | null, noExpiryLabel = "No expiry"): string => {
  if (!value) {
    return noExpiryLabel;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

function ProfileScenariosContent() {
  const { tr, language, setLanguage } = useLocalization();
  const { theme, setTheme } = useTheme();
  const readOnboardingFlagState = (): boolean | null => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
    } catch {
      return null;
    }
  };
  const {
    profile,
    workspace,
    source,
    isLoading,
    isLoadingPremium,
    isClaimingGiftPremium,
    isSavingWorkspace,
    isSavingInvite,
    actionMessage,
    initData,
    workspaces,
    premiumEntitlement,
    giftPremiumClaimResult,
    inviteAcceptDiagnostic,
    refreshContext,
    createFamilyWorkspace,
    switchWorkspace,
    createInvite,
    claimGiftPremium,
    acceptInvite,
    clearInviteAcceptDiagnostic,
  } = useCurrentAppContext();
  const [familyWorkspaceTitle, setFamilyWorkspaceTitle] = useState("Family Workspace");
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [generatedInvite, setGeneratedInvite] =
    useState<FamilyWorkspaceInvitePayload | null>(null);
  const [inviteCopyState, setInviteCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [giftCampaignCodeInput, setGiftCampaignCodeInput] = useState("");
  const [isLoadingPurchaseClaims, setIsLoadingPurchaseClaims] = useState(false);
  const [isSubmittingPremiumClaim, setIsSubmittingPremiumClaim] = useState(false);
  const [purchaseClaimExternalHandle, setPurchaseClaimExternalHandle] = useState("");
  const [purchaseClaimProofReference, setPurchaseClaimProofReference] = useState("");
  const [purchaseClaimProofText, setPurchaseClaimProofText] = useState("");
  const [purchaseClaimNote, setPurchaseClaimNote] = useState("");
  const [latestPurchaseClaim, setLatestPurchaseClaim] =
    useState<SupportClaimPayload | null>(null);
  const [latestPurchaseIntent, setLatestPurchaseIntent] =
    useState<SupportReferencePayload | null>(null);
  const [claimStatusCheckedAt, setClaimStatusCheckedAt] = useState<string | null>(null);
  const [intentStatusCheckedAt, setIntentStatusCheckedAt] = useState<string | null>(null);
  const [isLoadingPurchaseIntents, setIsLoadingPurchaseIntents] = useState(false);
  const [isPreparingPurchaseIntent, setIsPreparingPurchaseIntent] = useState(false);
  const [isSupportReferenceVisible, setIsSupportReferenceVisible] = useState(false);
  const [isClaimPanelOpen, setIsClaimPanelOpen] = useState(false);
  const [bugReportTitle, setBugReportTitle] = useState("");
  const [bugReportDescription, setBugReportDescription] = useState("");
  const [bugReportSteps, setBugReportSteps] = useState("");
  const [isSubmittingBugReport, setIsSubmittingBugReport] = useState(false);
  const [bugReportFeedback, setBugReportFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [purchaseClaimFeedback, setPurchaseClaimFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [purchaseIntentFeedback, setPurchaseIntentFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isOnboardingFlagCompleted, setIsOnboardingFlagCompleted] = useState<
    boolean | null
  >(() => readOnboardingFlagState());

  const sourceLabel = useMemo(() => {
    if (source === "telegram") {
      return tr("Telegram verified");
    }

    if (source === "dev_fallback") {
      return tr("Dev fallback");
    }

    return tr("Not identified");
  }, [source, tr]);

  const isVirtualWorkspace = Boolean(
    workspace?.id.startsWith("virtual-personal-"),
  );
  const isFamilyWorkspace = workspace?.kind === "family";

  const normalizedInviteToken = useMemo(
    () => normalizeFamilyInviteToken(inviteTokenInput),
    [inviteTokenInput],
  );
  const premiumSourceLabel = (() => {
    if (!premiumEntitlement?.effectiveSource) {
      return null;
    }

    if (premiumEntitlement.effectiveSource === "manual_admin") {
      return tr("Manual/admin grant");
    }

    if (premiumEntitlement.effectiveSource === "one_time_purchase") {
      return tr("Validated support claim");
    }

    if (premiumEntitlement.effectiveSource === "boosty") {
      return tr("Validated external support");
    }

    return tr("Gift campaign grant");
  })();
  const premiumScopeLabel = premiumEntitlement?.effectiveScope
    ? premiumEntitlement.effectiveScope === "workspace"
      ? tr("Workspace entitlement")
      : tr("Personal entitlement")
    : null;
  const giftClaimStatusLabel = (() => {
    if (!giftPremiumClaimResult) {
      return null;
    }

    if (giftPremiumClaimResult.status === "granted") {
      return tr("Gift claim granted");
    }

    if (giftPremiumClaimResult.status === "rejected_invalid_code") {
      return tr("Gift claim rejected: invalid code");
    }

    if (giftPremiumClaimResult.status === "rejected_inactive_campaign") {
      return tr("Gift claim rejected: campaign inactive");
    }

    if (giftPremiumClaimResult.status === "rejected_outside_window") {
      return tr("Gift claim rejected: outside campaign window");
    }

    if (giftPremiumClaimResult.status === "rejected_quota_exhausted") {
      return tr("Gift claim rejected: quota exhausted");
    }

    return tr("Gift claim rejected: already claimed");
  })();
  const isGiftClaimGranted = giftPremiumClaimResult?.status === "granted";
  const supportRails = clientEnv.supportRails;
  const configuredSupportRails = supportRails.filter((rail) => rail.isConfigured);
  const isClaimRejected = latestPurchaseClaim?.status === "rejected";
  const purchaseClaimStatusLabel = (() => {
    if (!latestPurchaseClaim) {
      return null;
    }

    if (latestPurchaseClaim.status === "submitted") {
      return tr("Claim pending review");
    }

    if (latestPurchaseClaim.status === "pending_review") {
      return tr("Claim in review");
    }

    if (latestPurchaseClaim.status === "approved") {
      return tr("Claim approved");
    }

    if (latestPurchaseClaim.status === "rejected") {
      return tr("Claim rejected");
    }

    if (latestPurchaseClaim.status === "expired") {
      return tr("Claim expired");
    }

    if (latestPurchaseClaim.status === "cancelled") {
      return tr("Claim cancelled");
    }

    return tr("Claim draft");
  })();
  const claimLifecycle = (() => {
    if (premiumEntitlement?.isPremium) {
      return {
        label: tr("Premium active"),
        hint: tr("Premium access is active as a support perk. Core app remains free."),
        tone: "success" as const,
      };
    }

    if (!latestPurchaseClaim) {
      return {
        label: tr("No claim submitted yet"),
        hint: tr("After external support, submit claim with proof for owner review."),
        tone: "neutral" as const,
      };
    }

    if (
      latestPurchaseClaim.status === "submitted" ||
      latestPurchaseClaim.status === "pending_review"
    ) {
      return {
        label: purchaseClaimStatusLabel ?? tr("Claim pending review"),
        hint: tr("Claim is waiting for owner review. Core features continue to work."),
        tone: "warning" as const,
      };
    }

    if (latestPurchaseClaim.status === "approved") {
      return {
        label: purchaseClaimStatusLabel ?? tr("Claim approved"),
        hint: tr("Claim approved. Premium access should appear after refresh."),
        tone: "success" as const,
      };
    }

    if (latestPurchaseClaim.status === "rejected") {
      return {
        label: purchaseClaimStatusLabel ?? tr("Claim rejected"),
        hint: tr("Claim was rejected. Update proof fields and submit a new claim when ready."),
        tone: "warning" as const,
      };
    }

    return {
      label: purchaseClaimStatusLabel ?? tr("Claim draft"),
      hint: tr("Claim is closed. Submit a new claim only after a new support period."),
      tone: "neutral" as const,
    };
  })();
  const claimLifecycleToneClass =
    claimLifecycle.tone === "success"
      ? "pc-status-pill-success"
      : claimLifecycle.tone === "warning"
        ? "pc-status-pill-warning"
        : "";
  const purchaseIntentSummaryLabel = (() => {
    if (!latestPurchaseIntent) {
      return tr("No support reference code yet");
    }

    if (
      latestPurchaseIntent.status === "created" ||
      latestPurchaseIntent.status === "opened_external" ||
      latestPurchaseIntent.status === "returned"
    ) {
      return tr("Support reference code ready");
    }

    if (latestPurchaseIntent.status === "claimed") {
      return tr("Reference code linked to claim");
    }

    return tr("Reference code closed");
  })();
  const linkablePurchaseIntent =
    latestPurchaseIntent &&
    !latestPurchaseIntent.claimId &&
    (latestPurchaseIntent.status === "created" ||
      latestPurchaseIntent.status === "opened_external" ||
      latestPurchaseIntent.status === "returned")
      ? latestPurchaseIntent
      : null;

  const refreshMyPurchaseClaims = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!initData || !profile) {
        setLatestPurchaseClaim(null);
        setClaimStatusCheckedAt(null);
        setIsLoadingPurchaseClaims(false);
        return;
      }

      setIsLoadingPurchaseClaims(true);
      if (!silent) {
        setPurchaseClaimFeedback(null);
      }
      try {
        const response = await readMySupportClaims({
          initData,
          limit: 5,
        });

        if (!response.ok) {
          setLatestPurchaseClaim(null);
          setClaimStatusCheckedAt(new Date().toISOString());
          if (!silent) {
            setPurchaseClaimFeedback({
              kind: "error",
              message: tr(response.error.message),
            });
          }
          return;
        }

        setLatestPurchaseClaim(response.claims[0] ?? null);
        setClaimStatusCheckedAt(new Date().toISOString());
        if (!silent) {
          await refreshContext();
        }
      } catch {
        setLatestPurchaseClaim(null);
        setClaimStatusCheckedAt(new Date().toISOString());
        if (!silent) {
          setPurchaseClaimFeedback({
            kind: "error",
            message: tr("Failed to read support claims."),
          });
        }
      } finally {
        setIsLoadingPurchaseClaims(false);
      }
    },
    [initData, profile, refreshContext, tr],
  );

  const refreshMyPurchaseIntents = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!initData || !profile) {
        setLatestPurchaseIntent(null);
        setIntentStatusCheckedAt(null);
        setIsLoadingPurchaseIntents(false);
        return;
      }

      setIsLoadingPurchaseIntents(true);
      if (!silent) {
        setPurchaseIntentFeedback(null);
      }
      try {
        const response = await readMySupportReferenceIntents({
          initData,
          limit: 5,
        });

        if (!response.ok) {
          setLatestPurchaseIntent(null);
          setIntentStatusCheckedAt(new Date().toISOString());
          if (!silent) {
            setPurchaseIntentFeedback({
              kind: "error",
              message: tr(response.error.message),
            });
          }
          return;
        }

        const latestIntent =
          response.intents.find(
            (intent) =>
              !intent.claimId &&
              intent.status !== "consumed" &&
              intent.status !== "cancelled" &&
              intent.status !== "expired",
          ) ??
          response.intents[0] ??
          null;
        setLatestPurchaseIntent(latestIntent);
        setIntentStatusCheckedAt(new Date().toISOString());
        if (latestIntent) {
          setPurchaseClaimProofReference((current) =>
            current.trim() ? current : latestIntent.correlationCode,
          );
        }
      } catch {
        setLatestPurchaseIntent(null);
        setIntentStatusCheckedAt(new Date().toISOString());
        if (!silent) {
          setPurchaseIntentFeedback({
            kind: "error",
            message: tr("Failed to read support reference codes."),
          });
        }
      } finally {
        setIsLoadingPurchaseIntents(false);
      }
    },
    [initData, profile, tr],
  );

  const prepareSupportReferenceIntent = async () => {
    if (!initData || !profile || isPreparingPurchaseIntent) {
      return;
    }

    setIsPreparingPurchaseIntent(true);
    setPurchaseIntentFeedback(null);
    try {
      const response = await createSupportReferenceIntent({
        initData,
        intentRail: DEFAULT_SUPPORT_CLAIM_RAIL,
        expectedTier: DEFAULT_PREMIUM_EXPECTED_TIER,
      });

      if (!response.ok) {
        setPurchaseIntentFeedback({
          kind: "error",
          message: tr(response.error.message),
        });
        return;
      }

      setLatestPurchaseIntent(response.intent);
      setPurchaseClaimProofReference((current) =>
        current.trim() ? current : response.intent.correlationCode,
      );
      setIntentStatusCheckedAt(new Date().toISOString());
      setIsSupportReferenceVisible(true);
      setIsClaimPanelOpen(true);
      setPurchaseIntentFeedback({
        kind: "success",
        message: tr(
          "Support reference code is ready. Complete support externally, then submit claim.",
        ),
      });
    } catch {
      setPurchaseIntentFeedback({
        kind: "error",
        message: tr("Failed to create support reference code. Please retry."),
      });
    } finally {
      setIsPreparingPurchaseIntent(false);
    }
  };

  useEffect(() => {
    if (!initData || !profile) {
      setLatestPurchaseClaim(null);
      setClaimStatusCheckedAt(null);
      setIsLoadingPurchaseClaims(false);
      return;
    }

    void refreshMyPurchaseClaims({ silent: true });
  }, [initData, profile, refreshMyPurchaseClaims]);

  useEffect(() => {
    if (!initData || !profile) {
      setLatestPurchaseIntent(null);
      setIntentStatusCheckedAt(null);
      setIsLoadingPurchaseIntents(false);
      return;
    }

    void refreshMyPurchaseIntents({ silent: true });
  }, [initData, profile, refreshMyPurchaseIntents]);

  const submitPremiumClaim = async () => {
    if (!initData || !profile || isSubmittingPremiumClaim) {
      return;
    }

    if (
      !purchaseClaimExternalHandle.trim() &&
      !purchaseClaimProofReference.trim() &&
      !purchaseClaimProofText.trim()
    ) {
      setPurchaseClaimFeedback({
        kind: "error",
        message: tr("Add at least one support proof field before claim submission."),
      });
      return;
    }

    setIsSubmittingPremiumClaim(true);
    setPurchaseClaimFeedback(null);
    try {
      const response = await createSupportClaim({
        initData,
        claimRail: linkablePurchaseIntent?.intentRail ?? DEFAULT_SUPPORT_CLAIM_RAIL,
        expectedTier: linkablePurchaseIntent?.expectedTier ?? DEFAULT_PREMIUM_EXPECTED_TIER,
        externalPayerHandle: purchaseClaimExternalHandle.trim(),
        paymentProofReference: purchaseClaimProofReference.trim(),
        paymentProofText: purchaseClaimProofText.trim(),
        claimNote: purchaseClaimNote.trim(),
        purchaseIntentId: linkablePurchaseIntent?.id,
        purchaseCorrelationCode: linkablePurchaseIntent?.correlationCode,
      });
      if (!response.ok) {
        setPurchaseClaimFeedback({
          kind: "error",
          message: tr(response.error.message),
        });
        return;
      }

      setLatestPurchaseClaim(response.claim);
      setClaimStatusCheckedAt(new Date().toISOString());
      setPurchaseClaimExternalHandle("");
      setPurchaseClaimProofReference("");
      setPurchaseClaimProofText("");
      setPurchaseClaimNote("");
      setPurchaseClaimFeedback({
        kind: "success",
        message: tr("Claim submitted. Owner review is now pending."),
      });
      await refreshMyPurchaseIntents({ silent: true });
      await refreshContext();
    } catch {
      setPurchaseClaimFeedback({
        kind: "error",
        message: tr("Failed to submit support claim."),
      });
    } finally {
      setIsSubmittingPremiumClaim(false);
    }
  };

  useEffect(() => {
    const syncOnboardingFlagState = () => {
      setIsOnboardingFlagCompleted(readOnboardingFlagState());
    };

    window.addEventListener("focus", syncOnboardingFlagState);
    return () => {
      window.removeEventListener("focus", syncOnboardingFlagState);
    };
  }, []);

  const replayOnboarding = () => {
    window.dispatchEvent(new Event(ONBOARDING_REPLAY_EVENT));
    setIsOnboardingFlagCompleted(readOnboardingFlagState());
  };

  const submitBugReportFromProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingBugReport) {
      return;
    }

    const title = bugReportTitle.trim();
    const description = bugReportDescription.trim();
    const steps = bugReportSteps.trim();

    if (!initData) {
      setBugReportFeedback({
        kind: "error",
        message: tr("Init context is not ready yet. Please refresh and retry."),
      });
      return;
    }

    if (title.length < 3 || description.length < 10) {
      setBugReportFeedback({
        kind: "error",
        message: tr("Please provide at least a short title and description."),
      });
      return;
    }

    setIsSubmittingBugReport(true);
    setBugReportFeedback(null);
    try {
      const result = await submitBugReport({
        initData,
        title,
        description,
        steps,
        currentScreen: "profile",
        language,
      });

      if (!result.ok) {
        if (result.error.code === "BUG_REPORT_INVALID_INPUT") {
          setBugReportFeedback({
            kind: "error",
            message: tr("Please provide at least a short title and description."),
          });
        } else if (result.error.code === "BUG_REPORT_DELIVERY_NOT_CONFIGURED") {
          setBugReportFeedback({
            kind: "error",
            message: tr(
              "Bug report destination is not configured yet. Please try later.",
            ),
          });
        } else if (result.error.code === "BUG_REPORT_DELIVERY_FAILED") {
          setBugReportFeedback({
            kind: "error",
            message: tr("Could not send bug report. Please try again."),
          });
        } else {
          setBugReportFeedback({
            kind: "error",
            message: tr(result.error.message),
          });
        }
        return;
      }

      setBugReportFeedback({
        kind: "success",
        message: tr("Bug report sent. Report id: {reportId}.", {
          reportId: result.reportId,
        }),
      });
      setBugReportTitle("");
      setBugReportDescription("");
      setBugReportSteps("");
    } catch {
      setBugReportFeedback({
        kind: "error",
        message: tr("Could not send bug report. Please try again."),
      });
    } finally {
      setIsSubmittingBugReport(false);
    }
  };

  const copyGeneratedInviteToken = async () => {
    if (
      !generatedInvite ||
      !workspace ||
      generatedInvite.workspaceId !== workspace.id
    ) {
      return;
    }

    if (!window.navigator?.clipboard) {
      setInviteCopyState("failed");
      return;
    }

    try {
      await window.navigator.clipboard.writeText(generatedInvite.inviteToken);
      setInviteCopyState("copied");
    } catch {
      setInviteCopyState("failed");
    }
  };

  const copyLatestPurchaseCorrelationCode = async () => {
    if (!latestPurchaseIntent?.correlationCode) {
      return;
    }

    if (!window.navigator?.clipboard) {
      setPurchaseIntentFeedback({
        kind: "error",
        message: tr("Copy is not available on this device."),
      });
      return;
    }

    try {
      await window.navigator.clipboard.writeText(latestPurchaseIntent.correlationCode);
      setPurchaseIntentFeedback({
        kind: "success",
        message: tr("Support reference code copied."),
      });
    } catch {
      setPurchaseIntentFeedback({
        kind: "error",
        message: tr("Copy failed. Use reference code shown on screen."),
      });
    }
  };

  const homeScreen = (
    <div className="space-y-2">
      <LandingScreen />
      <PaymentsDashboardSection
        workspace={workspace}
        initData={initData}
        variant="compact"
      />
    </div>
  );

  const remindersScreen = (
    <div className="space-y-2">
      <RecurringPaymentsSection
        workspace={workspace}
        initData={initData}
      />
    </div>
  );

  const historyScreen = (
    <div className="space-y-2">
      <PaymentsActivitySection workspace={workspace} initData={initData} />
    </div>
  );

  const profileScreen = (
    <section className="space-y-2">
      <div className="pc-surface">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-app-text">
            <AppIcon name="profile" className="h-4 w-4" />
            {tr("Profile")}
          </h2>
        </div>
        <p className="mt-1 text-xs text-app-text-muted">
          {tr("Profile controls context and onboarding")}
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="home" className="h-3.5 w-3.5" />
          {tr("Quick start")}
        </p>
        <p className="mt-0.5 text-xs text-app-text-muted">
          {tr("Start in Reminders: add a payment, then use Mark paid when done.")}
        </p>
      </div>
      <div className="pc-surface">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="workspace" className="h-3.5 w-3.5" />
          {tr("Session")}
        </p>
        <p className="mt-1 text-sm font-semibold text-app-text">{sourceLabel}</p>
        {!isLoading && (
          <p className="mt-1 text-xs text-app-text-muted">{tr("Context ready")}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-app-text-muted">
            <AppIcon name="language" className="h-3.5 w-3.5" />
            {tr("Language")}:
          </p>
          <button
            type="button"
            onClick={() => setLanguage("ru")}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              language === "ru"
                ? "border-app-accent bg-app-accent text-white"
                : "border-app-border text-app-text"
            }`}
          >
            {tr("Russian")}
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              language === "en"
                ? "border-app-accent bg-app-accent text-white"
                : "border-app-border text-app-text"
            }`}
          >
            {tr("English")}
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-app-text-muted">
            <AppIcon name="theme" className="h-3.5 w-3.5" />
            {tr("Theme")}:
          </p>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              theme === "light"
                ? "border-app-accent bg-app-accent text-white"
                : "border-app-border text-app-text"
            }`}
          >
            <AppIcon name="sun" className="h-3 w-3" />
            {tr("Light")}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              theme === "dark"
                ? "border-app-accent bg-app-accent text-white"
                : "border-app-border text-app-text"
            }`}
          >
            <AppIcon name="moon" className="h-3 w-3" />
            {tr("Dark")}
          </button>
        </div>
        {profile && (
          <p className="mt-1.5 text-sm text-app-text">
            {profile.firstName} {profile.lastName ?? ""}
            {profile.username ? ` (@${profile.username})` : ""}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={replayOnboarding}
            className="pc-btn-secondary"
          >
            <AppIcon name="refresh" className="h-3.5 w-3.5" />
            {tr("Show onboarding again")}
          </button>
          <HelpPopover
            buttonLabel={tr("Open onboarding help")}
            title={tr("Onboarding verification notes")}
          >
            <p>
              {tr("Local onboarding flag")}:{" "}
              {isOnboardingFlagCompleted === null
                ? tr("unknown (storage unavailable)")
                : isOnboardingFlagCompleted
                  ? tr("completed")
                  : tr("not completed")}
              .
            </p>
            <p>
              {tr(
                "Show onboarding again is replay-only. It does not prove true first-run behavior.",
              )}
            </p>
            <p>
              {tr(
                "True first-run check requires a clean Telegram profile/device storage state and first open of Mini App.",
              )}
            </p>
          </HelpPopover>
        </div>
      </div>
      <section className="pc-surface pc-surface-soft space-y-2">
        <p className="pc-kicker">
          <AppIcon name="support" className="h-3.5 w-3.5" />
          {tr("Support and Premium")}
        </p>
        <p className="text-xs text-app-text-muted">
          {tr(
            "Core app stays fully useful for free. Premium is a calm donor perk after validated support.",
          )}
        </p>
        <p className="text-[11px] text-app-text-muted">
          {tr(
            "Current baseline: from {amount} RUB support -> up to {days} days Premium after validation.",
            {
              amount: SOFT_SUPPORT_MIN_AMOUNT_RUB,
              days: SOFT_PREMIUM_ACCESS_DAYS,
            },
          )}
        </p>
        <div className="pc-detail-surface bg-app-surface">
          <p className="pc-kicker">
            <AppIcon name="premium" className="h-3.5 w-3.5" />
            {tr("Premium status")}
          </p>
          {isLoadingPremium ? (
            <p className="pc-state-inline mt-1">
              <AppIcon name="refresh" className="h-3.5 w-3.5 pc-spin" />
              {tr("Loading premium status...")}
            </p>
          ) : !premiumEntitlement ? (
            <p className="pc-feedback pc-feedback-warning mt-1">
              <AppIcon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{tr("Premium status is temporarily unavailable.")}</span>
            </p>
          ) : (
            <>
              <p
                className={`pc-status-pill mt-1 ${
                  premiumEntitlement.isPremium ? "pc-status-pill-success" : ""
                }`}
              >
                <AppIcon
                  name={premiumEntitlement.isPremium ? "check" : "clock"}
                  className="h-3 w-3"
                />
                {premiumEntitlement.isPremium
                  ? tr("Premium active")
                  : tr("Free plan active")}
              </p>
              {premiumEntitlement.isPremium && (
                <p className="mt-1 text-xs text-app-text-muted">
                  {premiumScopeLabel ? `${tr("Entitlement scope")}: ${premiumScopeLabel}. ` : ""}
                  {premiumSourceLabel
                    ? `${tr("Entitlement source")}: ${premiumSourceLabel}. `
                    : ""}
                  {premiumEntitlement.endsAt
                    ? `${tr("Premium valid until")}: ${formatDateTime(premiumEntitlement.endsAt)}.`
                    : tr("No expiry")}
                </p>
              )}
              {!premiumEntitlement.isPremium && (
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Core features remain free in this phase.")}
                </p>
              )}
              <p className="mt-1 text-xs text-app-text-muted">{tr("Core features stay free.")}</p>
            </>
          )}

          <div className="mt-2 space-y-2">
            <p className="pc-kicker">
              <AppIcon name="support" className="h-3.5 w-3.5" />
              {tr("Support rails")}
            </p>
            <p className="text-xs text-app-text-muted">
              {tr("Support is optional and opens on external provider pages.")}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {supportRails.map((rail) =>
                rail.isConfigured ? (
                  <a
                    key={rail.id}
                    href={rail.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pc-action-card"
                  >
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <AppIcon name="support" className="h-4 w-4" />
                      {tr(rail.title)}
                      <span className={`pc-status-pill ${rail.isPrimary ? "pc-status-pill-success" : ""}`}>
                        {rail.isPrimary ? tr("Primary") : tr("Secondary")}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-app-text-muted">{tr(rail.subtitle)}</p>
                    <span className="pc-btn-secondary mt-2 w-full justify-center text-xs">
                      {tr(rail.ctaLabel)}
                    </span>
                  </a>
                ) : (
                  <div key={rail.id} aria-disabled className="pc-action-card">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <AppIcon name="support" className="h-4 w-4" />
                      {tr(rail.title)}
                      <span className={`pc-status-pill ${rail.isPrimary ? "pc-status-pill-success" : ""}`}>
                        {rail.isPrimary ? tr("Primary") : tr("Secondary")}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-app-text-muted">{tr(rail.subtitle)}</p>
                    <p className="mt-1 text-xs text-app-text-muted">
                      {rail.id === "cloudtips"
                        ? tr("CloudTips slot is prepared and will appear after URL setup.")
                        : tr("Support rail slot prepared. URL is not configured yet.")}
                    </p>
                    <span className="pc-status-pill pc-status-pill-warning mt-2">
                      <AppIcon name="clock" className="h-3 w-3" />
                      {tr("Pending setup")}
                    </span>
                  </div>
                ),
              )}
            </div>
            {configuredSupportRails.length === 0 && (
              <p className="pc-feedback pc-feedback-warning">
                <AppIcon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{tr("No support rails are configured yet.")}</span>
              </p>
            )}
          </div>

          <div className="mt-2 rounded-xl border border-app-border/70 bg-white px-3 py-2">
            <p className="pc-kicker">
              <AppIcon name="wallet" className="h-3.5 w-3.5" />
              {tr("Support reference code")}
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              {tr(
                "Prepare this code before support and add it to your support note if the external rail allows it.",
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void prepareSupportReferenceIntent()}
                disabled={isPreparingPurchaseIntent}
                className="pc-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AppIcon name="template" className="h-3.5 w-3.5" />
                {isPreparingPurchaseIntent
                  ? tr("Preparing support reference...")
                  : tr("Prepare support reference code")}
              </button>
              <button
                type="button"
                onClick={() => setIsClaimPanelOpen(true)}
                aria-pressed={isClaimPanelOpen}
                className="pc-btn-quiet"
              >
                <AppIcon name="wallet" className="h-3.5 w-3.5" />
                {tr("Open claim form")}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-app-text-muted">
              {tr("Reference status")}: {purchaseIntentSummaryLabel}.
            </p>
          </div>

          {(isSupportReferenceVisible || latestPurchaseIntent || purchaseIntentFeedback) && (
            <div className="pc-state-card mt-2 bg-white px-3 py-2 text-xs text-app-text-muted">
              <p className="inline-flex items-center gap-1.5 font-semibold text-app-text">
                <AppIcon name="wallet" className="h-3.5 w-3.5" />
                {tr("Latest support reference")}
              </p>
              {isLoadingPurchaseIntents ? (
                <p className="pc-state-inline mt-1">
                  <AppIcon name="refresh" className="h-3.5 w-3.5 pc-spin" />
                  {tr("Loading support reference code...")}
                </p>
              ) : latestPurchaseIntent ? (
                <>
                  <p className="mt-1">
                    {tr("Latest code")}:{" "}
                    <span className="rounded-md bg-app-surface px-2 py-0.5 font-mono text-app-text">
                      {latestPurchaseIntent.correlationCode}
                    </span>
                  </p>
                  <p className="mt-1">
                    {tr("Reference status")}: {tr(latestPurchaseIntent.status)}.{" "}
                    {tr("Created at")}:{" "}
                    {formatDateTime(latestPurchaseIntent.createdAt, latestPurchaseIntent.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr(
                      "This code helps owner review match your support action. It does not activate Premium automatically.",
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyLatestPurchaseCorrelationCode()}
                      className="pc-btn-secondary"
                    >
                      <AppIcon name="template" className="h-3.5 w-3.5" />
                      {tr("Copy support code")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshMyPurchaseIntents()}
                      disabled={!initData || isLoadingPurchaseIntents}
                      className="pc-btn-quiet disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <AppIcon name="refresh" className="h-3.5 w-3.5" />
                      {tr("Refresh support code")}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr(
                      "After support on external rail, open support claim and submit proof for owner review.",
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr("Support code status last checked")}:{" "}
                    {intentStatusCheckedAt
                      ? formatDateTime(intentStatusCheckedAt, intentStatusCheckedAt)
                      : tr("No support code check yet.")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("No support code prepared yet.")}
                </p>
              )}

              {purchaseIntentFeedback && (
                <p
                  className={`pc-feedback mt-2 ${
                    purchaseIntentFeedback.kind === "success"
                      ? "pc-feedback-success"
                      : "pc-feedback-error"
                  }`}
                >
                  <AppIcon
                    name={purchaseIntentFeedback.kind === "success" ? "check" : "alert"}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  />
                  <span>{purchaseIntentFeedback.message}</span>
                </p>
              )}
            </div>
          )}

          <details
            open={isClaimPanelOpen}
            onToggle={(event) => {
              setIsClaimPanelOpen(event.currentTarget.open);
            }}
            className={`pc-state-card mt-2 bg-app-surface px-3 py-2 text-xs text-app-text-muted ${
              isClaimPanelOpen ? "border-app-accent/70" : ""
            }`}
          >
            <summary className="pc-summary-action inline-flex cursor-pointer items-center gap-1.5 font-semibold text-app-text">
              <AppIcon name="wallet" className="h-3.5 w-3.5" />
              {tr("I already supported, submit claim")}
              {isClaimPanelOpen && <span className="pc-status-pill">{tr("Opened")}</span>}
            </summary>
            <p className="mt-1">
              {tr("Use this after external support to submit claim for owner review.")}
            </p>
            <p className="mt-1 text-[11px] text-app-text-muted">
              {tr("Add at least one support proof field before claim submission.")}
            </p>
            {latestPurchaseIntent && (
              <div className="mt-2 rounded-xl border border-app-border bg-white px-3 py-2 text-xs">
                <p className="font-semibold text-app-text">{tr("Latest support code")}</p>
                <p className="mt-1 text-app-text-muted">
                  {tr("Code")}:{" "}
                  <span className="font-mono font-semibold text-app-text">
                    {latestPurchaseIntent.correlationCode}
                  </span>
                  {" · "}
                  {tr("Reference status")}: {tr(latestPurchaseIntent.status)}
                </p>
                <p className="mt-1 text-app-text-muted">
                  {tr("Claim form is ready. Support reference code is already linked.")}
                </p>
              </div>
            )}
            <div className="mt-2 grid grid-cols-1 gap-2">
              <input
                type="text"
                value={purchaseClaimExternalHandle}
                onChange={(event) => setPurchaseClaimExternalHandle(event.target.value)}
                placeholder={tr("External supporter handle (optional)")}
                className="pc-input"
              />
              <input
                type="text"
                value={purchaseClaimProofReference}
                onChange={(event) => setPurchaseClaimProofReference(event.target.value)}
                placeholder={tr("Support proof reference (optional)")}
                className="pc-input"
              />
              <textarea
                value={purchaseClaimProofText}
                onChange={(event) => setPurchaseClaimProofText(event.target.value)}
                rows={3}
                placeholder={tr("Support proof note (optional)")}
                className="pc-textarea resize-y"
              />
              <input
                type="text"
                value={purchaseClaimNote}
                onChange={(event) => setPurchaseClaimNote(event.target.value)}
                placeholder={tr("Claim note (optional)")}
                className="pc-input"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void submitPremiumClaim()}
                disabled={isSubmittingPremiumClaim}
                className={linkablePurchaseIntent ? "pc-btn-primary" : "pc-btn-secondary"}
              >
                <AppIcon name="check" className="h-3.5 w-3.5" />
                {isSubmittingPremiumClaim
                  ? tr("Submitting claim...")
                  : tr("Submit support claim")}
              </button>
            </div>
            {latestPurchaseClaim && (
              <p className="mt-1.5 text-xs">
                {tr("Latest claim")}: {purchaseClaimStatusLabel ?? tr(latestPurchaseClaim.status)}.{" "}
                {tr("Submitted at")}:{" "}
                {formatDateTime(latestPurchaseClaim.submittedAt, latestPurchaseClaim.submittedAt)}
              </p>
            )}
            {isClaimRejected && (
              <p className="mt-1.5 text-xs text-app-text-muted">
                {tr("Claim was rejected. Update proof and submit a new claim.")}
              </p>
            )}
            {purchaseClaimFeedback && (
              <p
                className={`pc-feedback mt-2 ${
                  purchaseClaimFeedback.kind === "success"
                    ? "pc-feedback-success"
                    : "pc-feedback-error"
                }`}
              >
                <AppIcon
                  name={purchaseClaimFeedback.kind === "success" ? "check" : "alert"}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
                <span>{purchaseClaimFeedback.message}</span>
              </p>
            )}
          </details>

          <div className="mt-2 rounded-xl border border-app-border/70 bg-white px-3 py-2">
            <p className="pc-kicker">
              <AppIcon name="clock" className="h-3.5 w-3.5" />
              {tr("Claim status")}
            </p>
            {isLoadingPurchaseClaims ? (
              <p className="pc-state-inline mt-1">
                <AppIcon name="refresh" className="h-3.5 w-3.5 pc-spin" />
                {tr("Loading claim status...")}
              </p>
            ) : (
              <>
                <p className={`pc-status-pill mt-1 ${claimLifecycleToneClass}`}>
                  <AppIcon
                    name={
                      claimLifecycle.tone === "success"
                        ? "check"
                        : claimLifecycle.tone === "warning"
                          ? "alert"
                          : "clock"
                    }
                    className="h-3 w-3"
                  />
                  {claimLifecycle.label}
                </p>
                <p className="mt-1 text-xs text-app-text-muted">{claimLifecycle.hint}</p>
              </>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-app-text-muted">
              <span>
                {tr("Claim status last checked")}:{" "}
                {claimStatusCheckedAt
                  ? formatDateTime(claimStatusCheckedAt, claimStatusCheckedAt)
                  : tr("No claim status check yet.")}
              </span>
              <button
                type="button"
                onClick={() => void refreshMyPurchaseClaims()}
                disabled={!initData || isLoadingPurchaseClaims}
                className="pc-btn-quiet disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AppIcon name="refresh" className="h-3.5 w-3.5" />
                {tr("Refresh claim status")}
              </button>
            </div>
          </div>
        </div>
        <details className="pc-detail-surface bg-app-surface">
          <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            <AppIcon name="support" className="h-3.5 w-3.5" />
            {tr("Report a bug")}
          </summary>
          <p className="mt-2 text-xs text-app-text-muted">
            {tr("Help us fix issues quickly.")}
          </p>
          <form className="mt-2 space-y-2" onSubmit={submitBugReportFromProfile}>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-app-text">{tr("Issue title")}</p>
              <input
                type="text"
                value={bugReportTitle}
                onChange={(event) => {
                  setBugReportTitle(event.target.value);
                  setBugReportFeedback(null);
                }}
                maxLength={120}
                placeholder={tr("Short subject")}
                className="pc-input"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-app-text">{tr("What happened?")}</p>
              <textarea
                value={bugReportDescription}
                onChange={(event) => {
                  setBugReportDescription(event.target.value);
                  setBugReportFeedback(null);
                }}
                rows={4}
                maxLength={1800}
                placeholder={tr("Describe what you expected and what happened.")}
                className="pc-textarea resize-y"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-app-text">
                {tr("Steps to reproduce (optional)")}
              </p>
              <textarea
                value={bugReportSteps}
                onChange={(event) => {
                  setBugReportSteps(event.target.value);
                  setBugReportFeedback(null);
                }}
                rows={3}
                maxLength={1200}
                placeholder={tr("Optional steps, device details, or timing notes.")}
                className="pc-textarea resize-y"
              />
            </div>
            <p className="text-[11px] text-app-text-muted">
              {tr(
                "Context from your profile, workspace, and language is attached automatically.",
              )}
            </p>
            <button
              type="submit"
              disabled={isSubmittingBugReport}
              className="pc-btn-secondary"
            >
              <AppIcon name="support" className="h-3.5 w-3.5" />
              {isSubmittingBugReport ? tr("Sending...") : tr("Send bug report")}
            </button>
            {bugReportFeedback && (
              <p
                className={`pc-feedback ${
                  bugReportFeedback.kind === "success"
                    ? "pc-feedback-success"
                    : "pc-feedback-error"
                }`}
              >
                <AppIcon
                  name={bugReportFeedback.kind === "success" ? "check" : "alert"}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
                <span>
                  {bugReportFeedback.message}
                </span>
              </p>
            )}
          </form>
        </details>
        <PremiumAdminConsole initData={initData} />
        <details className="pc-detail-surface bg-app-surface">
          <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            <AppIcon name="premium" className="h-3.5 w-3.5" />
            {tr("Gift premium claim (verification)")}
          </summary>
          <p className="mt-2 text-xs text-app-text-muted">
            {tr(
              "This is a compact foundation check surface. It is not a public promo page.",
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={giftCampaignCodeInput}
              onChange={(event) => setGiftCampaignCodeInput(event.target.value)}
              placeholder={tr("Gift campaign code")}
              className="pc-input min-w-[180px] flex-1"
            />
            <button
              type="button"
              onClick={() => void claimGiftPremium(giftCampaignCodeInput)}
              disabled={isClaimingGiftPremium || !giftCampaignCodeInput.trim()}
              className="pc-btn-secondary"
            >
              {isClaimingGiftPremium ? tr("Claiming...") : tr("Claim gift premium")}
            </button>
          </div>
          {giftPremiumClaimResult && (
            <div className="mt-2 rounded-xl border border-app-border bg-white px-3 py-2 text-xs text-app-text-muted">
              <p
                className={`pc-status-pill ${
                  isGiftClaimGranted ? "pc-status-pill-success" : "pc-status-pill-warning"
                }`}
              >
                <AppIcon
                  name={isGiftClaimGranted ? "check" : "alert"}
                  className="h-3 w-3"
                />
                {giftClaimStatusLabel ?? tr("Gift claim status")}
              </p>
              <p className="mt-1">
                {tr("Quota used")}: {giftPremiumClaimResult.quotaUsed} /{" "}
                {giftPremiumClaimResult.quotaTotal}
              </p>
              <p className="mt-1">
                {tr("Claim id")}: {giftPremiumClaimResult.claimId}
              </p>
              {giftPremiumClaimResult.entitlementId && (
                <p className="mt-1">
                  {tr("Entitlement id")}: {giftPremiumClaimResult.entitlementId}
                </p>
              )}
            </div>
          )}
        </details>
      </section>
      <div className="pc-surface pc-surface-soft">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="workspace" className="h-3.5 w-3.5" />
          {tr("Workspace state")}
        </p>
        {workspace ? (
          <>
            <p className="mt-1 text-sm font-semibold text-app-text">
              {workspace.title}
            </p>
            <p className="mt-1 text-sm text-app-text-muted">
              {tr("Type")}: {tr(workspace.kind)}. {tr("Role")}: {tr(workspace.memberRole)}.{" "}
              {tr("Members")}: {workspace.memberCount}.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-app-text-muted">
            {tr("No active workspace resolved yet.")}
          </p>
        )}
        {workspaces.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Workspace switch")}
            </p>
            <div className="space-y-1">
              {workspaces.map((workspaceOption) => (
                <div
                  key={workspaceOption.id}
                  className="flex items-center justify-between rounded-xl border border-app-border bg-white px-3 py-2"
                >
                  <p className="text-sm text-app-text">
                    {workspaceOption.title} ({tr(workspaceOption.kind)})
                  </p>
                  <button
                    type="button"
                    onClick={() => switchWorkspace(workspaceOption.id)}
                    disabled={
                      !profile ||
                      isSavingWorkspace ||
                      workspace?.id === workspaceOption.id
                    }
                    className="pc-btn-quiet rounded-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AppIcon name="refresh" className="h-3 w-3" />
                    {workspace?.id === workspaceOption.id ? tr("Current") : tr("Switch")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {isFamilyWorkspace ? (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              {tr("Family invite")}
            </p>
            <p className="text-xs text-app-text-muted">
              {tr(
                "Generate a fresh one-time invite only when you are ready to send it.",
              )}
            </p>
            <button
              type="button"
              onClick={async () => {
                const invite = await createInvite();
                if (!invite) {
                  return;
                }

                setGeneratedInvite(invite);
                setInviteCopyState("idle");
              }}
              disabled={
                isSavingInvite || isSavingWorkspace || workspace.memberRole !== "owner"
              }
              className="pc-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AppIcon name="add" className="h-3.5 w-3.5" />
              {tr("Generate one-time invite")}
            </button>
            {generatedInvite && generatedInvite.workspaceId === workspace.id ? (
              <div className="rounded-xl border border-app-border bg-white px-3 py-2 text-xs text-app-text">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    {tr("One-time invite for {workspace}", { workspace: workspace.title })}
                  </p>
                  <span className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                    {tr(inviteStatusLabels[generatedInvite.inviteStatus])}
                  </span>
                </div>
                <p className="mt-1 text-app-text-muted">
                  {tr(inviteStatusHints[generatedInvite.inviteStatus])}
                </p>
                <p className="mt-1 text-app-text-muted">
                  {tr("Share this token now. After successful join, it becomes invalid.")}
                </p>
                <p className="mt-1 font-semibold">{tr("Invite token")}</p>
                <p className="mt-1 break-all rounded-lg bg-app-surface px-2 py-1 font-mono text-[11px]">
                  {generatedInvite.inviteToken}
                </p>
                <p className="mt-2 text-app-text-muted">
                  {tr("Expires")}: {formatDateTime(generatedInvite.expiresAt, tr("No expiry"))}
                </p>
                <p className="text-app-text-muted">
                  {tr("Created at")}: {formatDateTime(generatedInvite.createdAt, tr("No expiry"))}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyGeneratedInviteToken()}
                    className="pc-btn-quiet"
                  >
                    <AppIcon name="template" className="h-3 w-3" />
                    {tr("Copy token")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedInvite(null);
                      setInviteCopyState("idle");
                    }}
                    className="pc-btn-quiet"
                  >
                    {tr("Hide token")}
                  </button>
                </div>
                <p
                  className={`pc-status-pill mt-1 ${
                    inviteCopyState === "copied"
                      ? "pc-status-pill-success"
                      : inviteCopyState === "failed"
                        ? "pc-status-pill-error"
                        : ""
                  }`}
                >
                  <AppIcon
                    name={
                      inviteCopyState === "copied"
                        ? "check"
                        : inviteCopyState === "failed"
                          ? "alert"
                          : "clock"
                    }
                    className="h-3 w-3"
                  />
                  {inviteCopyState === "copied"
                    ? tr("Token copied.")
                    : inviteCopyState === "failed"
                      ? tr("Copy failed. Copy token manually.")
                      : tr("Token is shown for this session only.")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-app-text-muted">
                {tr(
                  "No token is shown by default. Generate one only when inviting someone.",
                )}
              </p>
            )}
          </div>
        ) : (
          <details className="pc-detail-surface mt-2 bg-app-surface">
            <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              <AppIcon name="workspace" className="h-3.5 w-3.5" />
              {tr("Family workspace (optional)")}
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-app-text-muted">
                {tr("Create family workspace or join by invite token.")}
              </p>
              {isVirtualWorkspace ? (
                <p className="text-xs text-app-text-muted">
                  {tr(
                    "Workspace persistence is not initialized yet. Apply workspace migrations to enable family workspace creation.",
                  )}
                </p>
              ) : (
                <>
                  <input
                    value={familyWorkspaceTitle}
                    onChange={(event) => setFamilyWorkspaceTitle(event.target.value)}
                    placeholder={tr("Family workspace title")}
                    className="pc-input"
                  />
                  <button
                    type="button"
                    onClick={() => createFamilyWorkspace(familyWorkspaceTitle)}
                    disabled={!profile || isSavingWorkspace}
                    className="pc-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AppIcon name="add" className="h-3.5 w-3.5" />
                    {tr("Create family workspace")}
                  </button>
                </>
              )}
              <div className="space-y-2 rounded-xl border border-app-border bg-white px-3 py-2">
                <p className="text-xs font-semibold text-app-text">{tr("Join by invite token")}</p>
                <input
                  value={inviteTokenInput}
                  onChange={(event) => {
                    setInviteTokenInput(event.target.value);
                    clearInviteAcceptDiagnostic();
                  }}
                  placeholder={tr("Paste family invite token")}
                  className="pc-input"
                />
                <p className="text-[11px] text-app-text-muted">
                  {tr("Preview")}:{" "}
                  {inviteTokenInput.trim()
                    ? maskInviteToken(inviteTokenInput)
                    : tr("empty")}
                  {". "}{tr("Normalized")}:{" "}
                  {normalizedInviteToken
                    ? maskInviteToken(normalizedInviteToken)
                    : tr("not detected")}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const accepted = await acceptInvite(inviteTokenInput);
                    if (accepted) {
                      setInviteTokenInput("");
                    }
                  }}
                  disabled={isSavingInvite || !profile}
                  className="pc-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AppIcon name="check" className="h-3.5 w-3.5" />
                  {tr("Accept invite")}
                </button>
                {inviteAcceptDiagnostic && (
                  <details className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text">
                    <summary className="pc-summary-action inline-flex items-center gap-1.5 font-semibold text-app-text">
                      <AppIcon name="alert" className="h-3.5 w-3.5" />
                      {tr("Accept invite diagnostic")}
                    </summary>
                    <p
                      className={
                        inviteAcceptDiagnostic.status === "success"
                          ? "pc-status-pill pc-status-pill-success mt-2"
                          : "pc-status-pill pc-status-pill-error mt-2"
                      }
                    >
                      <AppIcon
                        name={
                          inviteAcceptDiagnostic.status === "success"
                            ? "check"
                            : "alert"
                        }
                        className="h-3 w-3"
                      />
                      {inviteAcceptDiagnostic.status === "success"
                        ? tr("Accept invite: SUCCESS")
                        : tr("Accept invite: FAILED")}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      {tr(inviteAcceptDiagnostic.message)}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      {tr("Code")}: {inviteAcceptDiagnostic.code}. {tr("Attempted")}:{" "}
                      {new Date(inviteAcceptDiagnostic.attemptedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      {tr("Raw token")}: {inviteAcceptDiagnostic.rawTokenPreview}. {tr("Normalized")}:{" "}
                      {inviteAcceptDiagnostic.normalizedTokenPreview}
                    </p>
                    {inviteAcceptDiagnostic.status === "success" && (
                      <>
                        <p className="mt-1 text-app-text-muted">
                          {tr("Joined workspace")}:{" "}
                          {inviteAcceptDiagnostic.workspaceTitle ?? tr("unknown")}. {tr("Invite status")}:{" "}
                          {inviteAcceptDiagnostic.inviteStatus
                            ? tr(inviteStatusLabels[inviteAcceptDiagnostic.inviteStatus])
                            : tr("unknown")}
                        </p>
                        <p className="mt-1 text-app-text-muted">
                          {tr("Workspace list updated")}:{" "}
                          {inviteAcceptDiagnostic.workspaceAdded ? tr("yes") : tr("no")}.{" "}
                          {tr("Household members")}: {inviteAcceptDiagnostic.memberCount ?? tr("unknown")}
                        </p>
                        <p className="mt-1 text-app-text-muted">
                          {tr(
                            "Next check: family workspace should appear in Workspace switch and household members should no longer be owner-only.",
                          )}
                        </p>
                      </>
                    )}
                    {inviteAcceptDiagnostic.status === "error" && (
                      <p className="mt-1 text-app-text-muted">
                        {tr(
                          "Check token validity/status with owner and retry. If state looks stale, use Refresh context below.",
                        )}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={refreshContext}
                      disabled={isLoading}
                      className="pc-btn-quiet mt-2 disabled:opacity-60"
                    >
                      <AppIcon name="refresh" className="h-3 w-3" />
                      {tr("Refresh context")}
                    </button>
                  </details>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
      {actionMessage && (
        <p className="pc-feedback mt-2">
          <AppIcon name="refresh" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{tr(actionMessage)}</span>
        </p>
      )}
    </section>
  );

  return (
    <AppShell
      screens={{
        home: homeScreen,
        reminders: remindersScreen,
        history: historyScreen,
        profile: profileScreen,
      }}
    />
  );
}

export function ProfileScenariosPlaceholder() {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <ProfileScenariosContent />
      </LocalizationProvider>
    </ThemeProvider>
  );
}


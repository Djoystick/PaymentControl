"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type {
  FamilyWorkspaceInvitePayload,
  FamilyWorkspaceInviteStatus,
} from "@/lib/auth/types";
import { submitBugReport } from "@/lib/auth/client";
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
  const [bugReportTitle, setBugReportTitle] = useState("");
  const [bugReportDescription, setBugReportDescription] = useState("");
  const [bugReportSteps, setBugReportSteps] = useState("");
  const [isSubmittingBugReport, setIsSubmittingBugReport] = useState(false);
  const [bugReportFeedback, setBugReportFeedback] = useState<{
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

    if (premiumEntitlement.effectiveSource === "boosty") {
      return tr("Boosty sync (future)");
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

  const homeScreen = (
    <div className="space-y-3">
      <LandingScreen />
      <PaymentsDashboardSection
        workspace={workspace}
        initData={initData}
        variant="compact"
      />
    </div>
  );

  const remindersScreen = (
    <div className="space-y-3">
      <RecurringPaymentsSection
        workspace={workspace}
        initData={initData}
      />
    </div>
  );

  const historyScreen = (
    <div className="space-y-3">
      <PaymentsActivitySection workspace={workspace} initData={initData} />
    </div>
  );

  const profileScreen = (
    <section className="space-y-3">
      <div className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-app-text">
            <AppIcon name="profile" className="h-4 w-4" />
            {tr("Profile")}
          </h2>
        </div>
        <p className="mt-1 text-xs text-app-text-muted">
          {tr("Profile controls context and onboarding")}
        </p>
      </div>
      <div className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="home" className="h-3.5 w-3.5" />
          {tr("Quick start")}
        </p>
        <p className="mt-1 text-sm text-app-text">
          {tr("Start in Reminders: add a payment, then use Mark paid when done.")}
        </p>
      </div>
      <div className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="workspace" className="h-3.5 w-3.5" />
          {tr("Session")}
        </p>
        <p className="mt-1 text-sm font-semibold text-app-text">{sourceLabel}</p>
        {!isLoading && (
          <p className="mt-1 text-xs text-app-text-muted">{tr("Context ready")}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
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
        <div className="mt-2 flex items-center gap-2">
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
          <p className="mt-2 text-sm text-app-text">
            {profile.firstName} {profile.lastName ?? ""}
            {profile.username ? ` (@${profile.username})` : ""}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={replayOnboarding}
            className="inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-surface-soft px-3 py-1.5 text-xs font-semibold text-app-text"
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
      <div className="rounded-3xl border border-app-border bg-app-surface-soft p-3 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="premium" className="h-3.5 w-3.5" />
          {tr("Premium status")}
        </p>
        {isLoadingPremium ? (
          <p className="mt-1 text-sm text-app-text-muted">
            {tr("Loading premium status...")}
          </p>
        ) : !premiumEntitlement ? (
          <p className="mt-1 text-sm text-app-text-muted">
            {tr("Premium status is temporarily unavailable.")}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm font-semibold text-app-text">
              {premiumEntitlement.isPremium
                ? tr("Premium active")
                : tr("Free plan active")}
            </p>
            {premiumEntitlement.isPremium && (
              <p className="mt-1 text-xs text-app-text-muted">
                {premiumScopeLabel ? `${tr("Entitlement scope")}: ${premiumScopeLabel}. ` : ""}
                {premiumSourceLabel ? `${tr("Entitlement source")}: ${premiumSourceLabel}. ` : ""}
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
            <p className="mt-1 text-xs text-app-text-muted">
              {tr("No core features are locked in this phase.")}
            </p>
          </>
        )}
      </div>
      <details className="rounded-3xl border border-app-border bg-app-surface-soft p-3 shadow-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
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
              className="w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
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
              className="w-full resize-y rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
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
              className="w-full resize-y rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
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
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-app-border bg-white px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            <AppIcon name="support" className="h-3.5 w-3.5" />
            {isSubmittingBugReport ? tr("Sending...") : tr("Send bug report")}
          </button>
          {bugReportFeedback && (
            <p
              className={`text-xs font-medium ${
                bugReportFeedback.kind === "success"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {bugReportFeedback.message}
            </p>
          )}
        </form>
      </details>
      <PremiumAdminConsole initData={initData} />
      <details className="rounded-3xl border border-app-border bg-app-surface-soft p-3 shadow-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
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
            className="min-w-[180px] flex-1 rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
          />
          <button
            type="button"
            onClick={() => void claimGiftPremium(giftCampaignCodeInput)}
            disabled={isClaimingGiftPremium || !giftCampaignCodeInput.trim()}
            className="rounded-xl border border-app-border bg-white px-3 py-2 text-xs font-semibold text-app-text disabled:opacity-60"
          >
            {isClaimingGiftPremium ? tr("Claiming...") : tr("Claim gift premium")}
          </button>
        </div>
        {giftPremiumClaimResult && (
          <div className="mt-2 rounded-xl border border-app-border bg-white px-3 py-2 text-xs text-app-text-muted">
            <p className="font-semibold text-app-text">
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
      <div className="rounded-3xl border border-app-border bg-app-surface-soft p-3 shadow-sm">
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
          <div className="mt-3 space-y-2">
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
                    className="inline-flex items-center gap-1 rounded-full border border-app-border px-2 py-0.5 text-[11px] font-medium text-app-text-muted disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="mt-3 space-y-2">
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
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="inline-flex items-center gap-1 rounded-lg border border-app-border px-2 py-1 text-[11px] font-semibold text-app-text"
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
                    className="rounded-lg border border-app-border px-2 py-1 text-[11px] font-semibold text-app-text"
                  >
                    {tr("Hide token")}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-app-text-muted">
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
          <details className="mt-3 rounded-2xl border border-app-border bg-app-surface p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
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
                    className="w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => createFamilyWorkspace(familyWorkspaceTitle)}
                    disabled={!profile || isSavingWorkspace}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
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
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AppIcon name="check" className="h-3.5 w-3.5" />
                  {tr("Accept invite")}
                </button>
                {inviteAcceptDiagnostic && (
                  <details className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text">
                    <summary className="cursor-pointer font-semibold text-app-text">
                      {tr("Accept invite diagnostic")}
                    </summary>
                    <p
                      className={
                        inviteAcceptDiagnostic.status === "success"
                          ? "mt-2 font-semibold text-emerald-700"
                          : "mt-2 font-semibold text-rose-700"
                      }
                    >
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
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-app-border px-2 py-1 text-[11px] font-semibold text-app-text disabled:opacity-60"
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
        <p className="mt-2 text-xs font-medium text-app-text">{tr(actionMessage)}</p>
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


"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type {
  FamilyWorkspaceInvitePayload,
  FamilyWorkspaceInviteStatus,
  SupporterBadgeAdminTargetPayload,
} from "@/lib/auth/types";
import {
  manageSupporterBadge,
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
import { HelpPopover } from "@/components/app/help-popover";
import { AppIcon } from "@/components/app/app-icon";
import { clientEnv } from "@/lib/config/client-env";
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
    canManageSupporters,
    isLoading,
    isSavingWorkspace,
    isSavingInvite,
    actionMessage,
    initData,
    workspaces,
    inviteAcceptDiagnostic,
    refreshContext,
    createFamilyWorkspace,
    switchWorkspace,
    createInvite,
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
  const [bugReportTitle, setBugReportTitle] = useState("");
  const [bugReportDescription, setBugReportDescription] = useState("");
  const [bugReportSteps, setBugReportSteps] = useState("");
  const [isSubmittingBugReport, setIsSubmittingBugReport] = useState(false);
  const [bugReportFeedback, setBugReportFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [supporterTargetTelegramUserId, setSupporterTargetTelegramUserId] =
    useState("");
  const [supporterBadgeNote, setSupporterBadgeNote] = useState("");
  const [isSubmittingSupporterBadgeAction, setIsSubmittingSupporterBadgeAction] =
    useState(false);
  const [supporterBadgeFeedback, setSupporterBadgeFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [supporterBadgeTarget, setSupporterBadgeTarget] =
    useState<SupporterBadgeAdminTargetPayload | null>(null);
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
  const supportRails = clientEnv.supportRails;
  const configuredSupportRails = supportRails.filter((rail) => rail.isConfigured);

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

  const runSupporterBadgeAction = async (action: "grant" | "revoke") => {
    if (isSubmittingSupporterBadgeAction) {
      return;
    }

    if (!canManageSupporters) {
      setSupporterBadgeFeedback({
        kind: "error",
        message: tr("Current account is not allowed to manage supporter badges."),
      });
      return;
    }

    const targetTelegramUserId = supporterTargetTelegramUserId.trim();
    if (!/^[0-9]{5,20}$/.test(targetTelegramUserId)) {
      setSupporterBadgeFeedback({
        kind: "error",
        message: tr("Target Telegram user id is invalid."),
      });
      return;
    }

    const note = supporterBadgeNote.trim();
    if (note.length > 280) {
      setSupporterBadgeFeedback({
        kind: "error",
        message: tr("Supporter badge note is too long."),
      });
      return;
    }

    if (!initData) {
      setSupporterBadgeFeedback({
        kind: "error",
        message: tr("Init context is not ready yet. Please refresh and retry."),
      });
      return;
    }

    setIsSubmittingSupporterBadgeAction(true);
    setSupporterBadgeFeedback(null);
    try {
      const result = await manageSupporterBadge({
        initData,
        action,
        targetTelegramUserId,
        note,
      });

      if (!result.ok) {
        setSupporterBadgeFeedback({
          kind: "error",
          message: tr(result.error.message),
        });
        return;
      }

      setSupporterBadgeTarget(result.target);
      setSupporterBadgeFeedback({
        kind: "success",
        message:
          action === "grant"
            ? tr("Supporter badge granted.")
            : tr("Supporter badge removed."),
      });

      if (profile && result.target.telegramUserId === profile.telegramUserId) {
        await refreshContext();
      }
    } catch {
      setSupporterBadgeFeedback({
        kind: "error",
        message: tr("Supporter badge request failed."),
      });
    } finally {
      setIsSubmittingSupporterBadgeAction(false);
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
    <section className="flex flex-col gap-2">
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
          <>
            <p className="mt-1.5 text-sm text-app-text">
              {profile.firstName} {profile.lastName ?? ""}
              {profile.username ? ` (@${profile.username})` : ""}
            </p>
            {profile.supporterBadgeActive && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-app-text">
                <AppIcon name="check" className="h-3.5 w-3.5" />
                {tr("Supporter badge")}
                {profile.supporterBadgeGrantedAt && (
                  <span className="pc-status-pill">
                    {tr("Since {date}", {
                      date: formatDateTime(profile.supporterBadgeGrantedAt),
                    })}
                  </span>
                )}
              </p>
            )}
            {profile.supporterBadgeActive && (
              <p className="mt-1 text-xs text-app-text-muted">
                {tr("Thanks for supporting the project.")}
              </p>
            )}
          </>
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
      <details className="pc-surface pc-surface-soft">
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
              <span>{bugReportFeedback.message}</span>
            </p>
          )}
        </form>
      </details>
      {canManageSupporters && (
        <details className="pc-surface pc-surface-soft">
          <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            <AppIcon name="support" className="h-3.5 w-3.5" />
            {tr("Supporter badge management")}
          </summary>
          <p className="mt-2 text-xs text-app-text-muted">
            {tr(
              "Owner-only manual recognition. Badge is cosmetic and does not unlock features.",
            )}
          </p>
          <div className="mt-2 space-y-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-app-text">
                {tr("Target Telegram user id")}
              </p>
              <input
                type="text"
                value={supporterTargetTelegramUserId}
                onChange={(event) => {
                  setSupporterTargetTelegramUserId(event.target.value);
                  setSupporterBadgeFeedback(null);
                }}
                placeholder={tr("Numeric Telegram user id")}
                inputMode="numeric"
                className="pc-input"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-app-text">
                {tr("Owner note (optional)")}
              </p>
              <textarea
                value={supporterBadgeNote}
                onChange={(event) => {
                  setSupporterBadgeNote(event.target.value);
                  setSupporterBadgeFeedback(null);
                }}
                rows={2}
                maxLength={280}
                placeholder={tr("Short internal reason for badge assignment.")}
                className="pc-textarea resize-y"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runSupporterBadgeAction("grant")}
                disabled={isSubmittingSupporterBadgeAction}
                className="pc-btn-secondary disabled:opacity-60"
              >
                <AppIcon name="check" className="h-3.5 w-3.5" />
                {isSubmittingSupporterBadgeAction
                  ? tr("Saving...")
                  : tr("Mark as supporter")}
              </button>
              <button
                type="button"
                onClick={() => void runSupporterBadgeAction("revoke")}
                disabled={isSubmittingSupporterBadgeAction}
                className="pc-btn-quiet disabled:opacity-60"
              >
                <AppIcon name="undo" className="h-3.5 w-3.5" />
                {tr("Remove supporter badge")}
              </button>
            </div>
            {supporterBadgeTarget && (
              <div className="rounded-xl border border-app-border bg-white px-3 py-2 text-xs text-app-text">
                <p className="font-semibold">
                  {supporterBadgeTarget.firstName}{" "}
                  {supporterBadgeTarget.lastName ?? ""}
                  {supporterBadgeTarget.username
                    ? ` (@${supporterBadgeTarget.username})`
                    : ""}
                </p>
                <p className="mt-1 text-app-text-muted">
                  {tr("Telegram user id")}: {supporterBadgeTarget.telegramUserId}
                </p>
                <p className="mt-1 text-app-text-muted">
                  {tr("Badge status")}:{" "}
                  {supporterBadgeTarget.supporterBadgeActive
                    ? tr("Active")
                    : tr("Inactive")}
                </p>
                {supporterBadgeTarget.supporterBadgeGrantedAt && (
                  <p className="mt-1 text-app-text-muted">
                    {tr("Granted at")}:{" "}
                    {formatDateTime(supporterBadgeTarget.supporterBadgeGrantedAt)}
                  </p>
                )}
                {supporterBadgeTarget.supporterBadgeRevokedAt && (
                  <p className="mt-1 text-app-text-muted">
                    {tr("Revoked at")}:{" "}
                    {formatDateTime(supporterBadgeTarget.supporterBadgeRevokedAt)}
                  </p>
                )}
              </div>
            )}
            {supporterBadgeFeedback && (
              <p
                className={`pc-feedback ${
                  supporterBadgeFeedback.kind === "success"
                    ? "pc-feedback-success"
                    : "pc-feedback-error"
                }`}
              >
                <AppIcon
                  name={supporterBadgeFeedback.kind === "success" ? "check" : "alert"}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
                <span>{supporterBadgeFeedback.message}</span>
              </p>
            )}
          </div>
        </details>
      )}
      <details className="pc-surface pc-surface-soft order-last">
        <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          <AppIcon name="support" className="h-3.5 w-3.5" />
          {tr("Support the project")}
          <span className="pc-status-pill">{tr("Optional")}</span>
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-app-text-muted">
            {tr("Payment Control is fully usable without donation.")}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {supportRails.map((rail) =>
              rail.isConfigured ? (
                <a
                  key={rail.id}
                  href={rail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pc-action-card block bg-app-surface-soft"
                >
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-app-text">
                    <AppIcon name="support" className="h-4 w-4" />
                    {tr(rail.title)}
                  </p>
                  <span className="pc-btn-secondary mt-2 w-full justify-center text-xs">
                    {tr(rail.ctaLabel)}
                  </span>
                </a>
              ) : (
                <div
                  key={rail.id}
                  aria-disabled
                  className="pc-action-card bg-app-surface-soft"
                >
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <AppIcon name="support" className="h-4 w-4" />
                    {tr(rail.title)}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {rail.id === "cloudtips" && rail.pendingReason === "duplicates_primary"
                      ? tr("CloudTips URL duplicates primary rail and stays disabled until changed.")
                      : tr("Support link is not configured yet.")}
                  </p>
                </div>
              ),
            )}
          </div>
          {configuredSupportRails.length === 0 && (
            <p className="text-xs text-app-text-muted">{tr("No donation links are configured yet.")}</p>
          )}
          <p className="text-[11px] text-app-text-muted">
            {tr("Donations are optional and never unlock access.")}
          </p>
        </div>
      </details>
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


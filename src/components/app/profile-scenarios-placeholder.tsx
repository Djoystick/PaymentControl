"use client";

import { useMemo, useState } from "react";
import type {
  FamilyWorkspaceInviteStatus,
  SelectedScenario,
} from "@/lib/auth/types";
import { useCurrentAppContext } from "@/hooks/use-current-app-context";
import {
  maskInviteToken,
  normalizeFamilyInviteToken,
} from "@/lib/auth/invite-token";
import { PaymentsDashboardSection } from "@/components/app/payments-dashboard-section";
import { PaymentsActivitySection } from "@/components/app/payments-activity-section";
import { ReminderCandidatesSection } from "@/components/app/reminder-candidates-section";
import { RecurringPaymentsSection } from "@/components/app/recurring-payments-section";

const scenarioCards: Array<{
  key: SelectedScenario;
  title: string;
  caption: string;
  description: string;
}> = [
  {
    key: "single",
    title: "Single mode",
    caption: '"I pay alone"',
    description:
      "Personal subscription and recurring payment tracking for one user.",
  },
  {
    key: "family",
    title: "Family mode",
    caption: '"Family use"',
    description:
      "Shared household expenses with family members and future role support.",
  },
];

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

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "No expiry";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export function ProfileScenariosPlaceholder() {
  const {
    profile,
    workspace,
    source,
    stateLabel,
    isLoading,
    isSavingWorkspace,
    isSavingInvite,
    actionMessage,
    isTelegramContext,
    initData,
    workspaces,
    currentFamilyInvite,
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

  const sourceLabel = useMemo(() => {
    if (source === "telegram") {
      return "Telegram verified";
    }

    if (source === "dev_fallback") {
      return "Dev fallback";
    }

    return "Not identified";
  }, [source]);

  const isVirtualWorkspace = Boolean(
    workspace?.id.startsWith("virtual-personal-"),
  );
  const isFamilyWorkspace = workspace?.kind === "family";
  const activeContextScenario = useMemo<SelectedScenario | null>(() => {
    if (!workspace) {
      return null;
    }

    return workspace.kind === "family" ? "family" : "single";
  }, [workspace]);

  const normalizedInviteToken = useMemo(
    () => normalizeFamilyInviteToken(inviteTokenInput),
    [inviteTokenInput],
  );

  return (
    <div className="space-y-4">
      <section
        id="profile-section"
        className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-app-text">Profile</h2>
          <span className="rounded-full bg-app-warm px-2 py-1 text-[11px] font-semibold text-app-text">
            Phase 8L
          </span>
        </div>
        <div className="mb-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            Auth state
          </p>
          <p className="mt-1 text-sm font-semibold text-app-text">{sourceLabel}</p>
          <p className="mt-1 text-sm text-app-text-muted">
            {isLoading ? "Loading current app context..." : stateLabel}
          </p>
          {profile && (
            <p className="mt-2 text-sm text-app-text">
              {profile.firstName} {profile.lastName ?? ""}
              {profile.username ? ` (@${profile.username})` : ""}
            </p>
          )}
          {!profile && !isLoading && !isTelegramContext && (
            <p className="mt-2 text-xs text-app-text-muted">
              Open this app in Telegram to verify identity, or enable explicit
              dev fallback for local testing.
            </p>
          )}
        </div>
        <div className="mb-3 rounded-2xl border border-app-border bg-app-surface-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            Workspace state
          </p>
          {workspace ? (
            <>
              <p className="mt-1 text-sm font-semibold text-app-text">
                {workspace.title}
              </p>
              <p className="mt-1 text-sm text-app-text-muted">
                Kind: {workspace.kind} | Role: {workspace.memberRole} | Members:{" "}
                {workspace.memberCount}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-app-text-muted">
              No active workspace resolved yet.
            </p>
          )}
          {workspaces.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Workspace switch
              </p>
              <p className="text-xs text-app-text-muted">
                Active app context is controlled here. Personal workspace = Single
                context, Family workspace = Family context.
              </p>
              <div className="space-y-1">
                {workspaces.map((workspaceOption) => (
                  <div
                    key={workspaceOption.id}
                    className="flex items-center justify-between rounded-xl border border-app-border bg-white px-3 py-2"
                  >
                    <p className="text-sm text-app-text">
                      {workspaceOption.title} ({workspaceOption.kind})
                    </p>
                    <button
                      type="button"
                      onClick={() => switchWorkspace(workspaceOption.id)}
                      disabled={
                        !profile ||
                        isSavingWorkspace ||
                        workspace?.id === workspaceOption.id
                      }
                      className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-medium text-app-text-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {workspace?.id === workspaceOption.id ? "Current" : "Switch"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isFamilyWorkspace ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Family invite management
              </p>
              <p className="text-xs text-app-text-muted">
                Invites below are for this family workspace household.
                Accepted members join this same household.
              </p>
              <button
                type="button"
                onClick={createInvite}
                disabled={
                  isSavingInvite || isSavingWorkspace || workspace.memberRole !== "owner"
                }
                className="rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create invite
              </button>
              {currentFamilyInvite ? (
                <div className="rounded-xl border border-app-border bg-white px-3 py-2 text-xs text-app-text">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      Current invite for {workspace.title}
                    </p>
                    <span className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-semibold text-app-text-muted">
                      {inviteStatusLabels[currentFamilyInvite.inviteStatus]}
                    </span>
                  </div>
                  <p className="mt-1 text-app-text-muted">
                    {inviteStatusHints[currentFamilyInvite.inviteStatus]}
                  </p>
                  <p className="mt-1 font-semibold">Invite token</p>
                  <p className="mt-1 break-all rounded-lg bg-app-surface px-2 py-1 font-mono text-[11px]">
                    {currentFamilyInvite.inviteToken}
                  </p>
                  <p className="mt-2 text-app-text-muted">
                    Expires: {formatDateTime(currentFamilyInvite.expiresAt)}
                  </p>
                  <p className="text-app-text-muted">
                    Created: {formatDateTime(currentFamilyInvite.createdAt)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-app-text-muted">
                  No active invite for this family workspace yet. Create one when
                  you are ready to invite a member.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                Family next step
              </p>
              <p className="text-xs text-app-text-muted">
                You are in personal context. Create a family workspace or join by
                invite token when you need shared household tracking.
              </p>
              {isVirtualWorkspace ? (
                <p className="text-xs text-app-text-muted">
                  Workspace persistence is not initialized yet. Apply workspace migrations
                  to enable family workspace creation.
                </p>
              ) : (
                <>
                  <input
                    value={familyWorkspaceTitle}
                    onChange={(event) => setFamilyWorkspaceTitle(event.target.value)}
                    placeholder="Family workspace title"
                    className="w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm text-app-text outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => createFamilyWorkspace(familyWorkspaceTitle)}
                    disabled={!profile || isSavingWorkspace}
                    className="rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Create family workspace
                  </button>
                </>
              )}
              <div className="space-y-2 rounded-xl border border-app-border bg-white px-3 py-2">
                <p className="text-xs font-semibold text-app-text">Join by invite token</p>
                <input
                  value={inviteTokenInput}
                  onChange={(event) => {
                    setInviteTokenInput(event.target.value);
                    clearInviteAcceptDiagnostic();
                  }}
                  placeholder="Paste family invite token"
                  className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none"
                />
                <p className="text-[11px] text-app-text-muted">
                  Token preview:{" "}
                  {inviteTokenInput.trim()
                    ? maskInviteToken(inviteTokenInput)
                    : "empty"}
                  {" | "}Normalized:{" "}
                  {normalizedInviteToken
                    ? maskInviteToken(normalizedInviteToken)
                    : "not detected"}
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
                  className="rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Accept invite
                </button>
                {inviteAcceptDiagnostic && (
                  <div className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text">
                    <p
                      className={
                        inviteAcceptDiagnostic.status === "success"
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-rose-700"
                      }
                    >
                      {inviteAcceptDiagnostic.status === "success"
                        ? "Accept invite: SUCCESS"
                        : "Accept invite: FAILED"}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      {inviteAcceptDiagnostic.message}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      Code: {inviteAcceptDiagnostic.code} | Attempted:{" "}
                      {new Date(inviteAcceptDiagnostic.attemptedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      Raw token: {inviteAcceptDiagnostic.rawTokenPreview} | Normalized:{" "}
                      {inviteAcceptDiagnostic.normalizedTokenPreview}
                    </p>
                    {inviteAcceptDiagnostic.status === "success" && (
                      <>
                        <p className="mt-1 text-app-text-muted">
                          Joined workspace:{" "}
                          {inviteAcceptDiagnostic.workspaceTitle ?? "unknown"} | Invite status:{" "}
                          {inviteAcceptDiagnostic.inviteStatus ?? "unknown"}
                        </p>
                        <p className="mt-1 text-app-text-muted">
                          Workspace list updated:{" "}
                          {inviteAcceptDiagnostic.workspaceAdded ? "yes" : "no"} | Household members:{" "}
                          {inviteAcceptDiagnostic.memberCount ?? "unknown"}
                        </p>
                        <p className="mt-1 text-app-text-muted">
                          Next check: family workspace should appear in Workspace switch and
                          household members should no longer be owner-only.
                        </p>
                      </>
                    )}
                    {inviteAcceptDiagnostic.status === "error" && (
                      <p className="mt-1 text-app-text-muted">
                        Check token validity/status with owner and retry. If state looks stale,
                        use Refresh context below.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={refreshContext}
                      disabled={isLoading}
                      className="mt-2 rounded-lg border border-app-border px-2 py-1 text-[11px] font-semibold text-app-text disabled:opacity-60"
                    >
                      Refresh context
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-app-border bg-app-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              Scenario cards (read-only)
            </p>
            <p className="mt-1 text-xs text-app-text-muted">
              Cards below are informational in this phase. To change active context,
              use Workspace switch above.
            </p>
            {profile && (
              <p className="mt-1 text-xs text-app-text-muted">
                Profile scenario field: {profile.selectedScenario} (auto-synced with
                active workspace where possible).
              </p>
            )}
          </div>
          {scenarioCards.map((scenario) => (
            <article
              key={scenario.key}
              className="rounded-2xl border border-app-border bg-app-surface-soft p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-app-text">{scenario.title}</h3>
                  <p className="text-sm text-app-text-muted">{scenario.caption}</p>
                </div>
                <span className="rounded-full border border-app-border px-2 py-0.5 text-[11px] font-medium text-app-text-muted">
                  {activeContextScenario === scenario.key ? "Active context" : "Not active"}
                </span>
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {scenario.description}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-app-text-muted">
          Context switching is workspace-driven in this phase. Scenario cards no
          longer act as a separate switch.
        </p>
        {actionMessage && (
          <p className="mt-2 text-xs font-medium text-app-text">{actionMessage}</p>
        )}
      </section>

      <PaymentsDashboardSection workspace={workspace} initData={initData} />
      <PaymentsActivitySection workspace={workspace} initData={initData} />
      <ReminderCandidatesSection workspace={workspace} initData={initData} />
      <RecurringPaymentsSection
        workspace={workspace}
        initData={initData}
        currentFamilyInvite={currentFamilyInvite}
      />
    </div>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  createTravelExpense,
  createTravelTrip,
  listTravelTrips,
  readTravelTripDetail,
} from "@/lib/travel/client";
import type {
  TravelSplitMode,
  TravelTripListItemPayload,
  TravelTripPayload,
} from "@/lib/travel/types";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";

type TravelGroupExpensesSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  initData: string;
};

type FeedbackTone = "info" | "success" | "error";

type ExpenseDraft = {
  amount: string;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: TravelSplitMode;
  selectedMemberIds: string[];
  fullAmountMemberId: string;
  manualSharesByMemberId: Record<string, string>;
  spentAt: string;
};

const defaultExpenseDraft: ExpenseDraft = {
  amount: "",
  paidByMemberId: "",
  description: "",
  category: "General",
  splitMode: "equal_all",
  selectedMemberIds: [],
  fullAmountMemberId: "",
  manualSharesByMemberId: {},
  spentAt: "",
};

const splitMemberNames = (value: string): string[] => {
  const parts = value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(part);
  }

  return unique;
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const formatAmount = (amount: number, currency: string): string => {
  return `${amount.toFixed(2)} ${currency}`;
};

const mergeTripListWithDetail = (
  list: TravelTripListItemPayload[],
  trip: TravelTripPayload,
): TravelTripListItemPayload[] => {
  const nextItem: TravelTripListItemPayload = {
    id: trip.id,
    title: trip.title,
    baseCurrency: trip.baseCurrency,
    description: trip.description,
    memberCount: trip.members.length,
    totalExpensesCount: trip.summary.totalExpensesCount,
    totalSpent: trip.summary.totalSpent,
    updatedAt: trip.updatedAt,
  };

  const index = list.findIndex((item) => item.id === trip.id);
  if (index === -1) {
    return [nextItem, ...list];
  }

  const clone = [...list];
  clone[index] = nextItem;
  return clone.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export function TravelGroupExpensesSection({
  workspace,
  initData,
}: TravelGroupExpensesSectionProps) {
  const { tr } = useLocalization();
  const workspaceId = workspace?.id ?? null;
  const [trips, setTrips] = useState<TravelTripListItemPayload[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TravelTripPayload | null>(null);
  const [isTripsLoading, setIsTripsLoading] = useState(false);
  const [isTripLoading, setIsTripLoading] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");

  const [tripTitle, setTripTitle] = useState("");
  const [tripCurrency, setTripCurrency] = useState("RUB");
  const [tripDescription, setTripDescription] = useState("");
  const [tripMembersInput, setTripMembersInput] = useState("");
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(defaultExpenseDraft);

  const workspaceUnavailable = useMemo(() => {
    if (!workspace) {
      return tr("Load current workspace first to use travel groups.");
    }

    if (
      workspace.kind === "personal" &&
      workspace.id.startsWith("virtual-personal-")
    ) {
      return tr(
        "Workspace persistence is not initialized. Apply workspace migrations first.",
      );
    }

    return null;
  }, [workspace, tr]);

  const loadTrips = useCallback(async () => {
    if (!workspaceId || workspaceUnavailable) {
      setTrips([]);
      setSelectedTripId(null);
      setSelectedTrip(null);
      setIsTripsLoading(false);
      return;
    }

    setIsTripsLoading(true);
    setFeedback(null);

    try {
      const result = await listTravelTrips(initData);
      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        setTrips([]);
        setSelectedTripId(null);
        setSelectedTrip(null);
        return;
      }

      setTrips(result.trips);
      setSelectedTripId((current) => {
        if (current && result.trips.some((trip) => trip.id === current)) {
          return current;
        }

        return result.trips[0]?.id ?? null;
      });
    } catch {
      setFeedbackTone("error");
      setFeedback(tr("Failed to load travel trips."));
      setTrips([]);
      setSelectedTripId(null);
      setSelectedTrip(null);
    } finally {
      setIsTripsLoading(false);
    }
  }, [workspaceId, workspaceUnavailable, initData, tr]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    if (!selectedTripId || workspaceUnavailable) {
      setSelectedTrip(null);
      return;
    }

    let isCancelled = false;

    const loadDetail = async () => {
      setIsTripLoading(true);
      try {
        const result = await readTravelTripDetail({
          initData,
          tripId: selectedTripId,
        });
        if (!result.ok) {
          if (!isCancelled) {
            setFeedbackTone("error");
            setFeedback(result.error.message);
            setSelectedTrip(null);
          }
          return;
        }

        if (isCancelled) {
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
      } catch {
        if (!isCancelled) {
          setFeedbackTone("error");
          setFeedback(tr("Failed to load trip details."));
          setSelectedTrip(null);
        }
      } finally {
        if (!isCancelled) {
          setIsTripLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [selectedTripId, initData, workspaceUnavailable, tr]);

  useEffect(() => {
    if (!selectedTrip || selectedTrip.members.length === 0) {
      setExpenseDraft(defaultExpenseDraft);
      return;
    }

    setExpenseDraft((current) => {
      const memberIds = selectedTrip.members.map((member) => member.id);
      const firstMemberId = memberIds[0] ?? "";

      const nextSelectedMemberIds =
        current.selectedMemberIds.length > 0
          ? current.selectedMemberIds.filter((memberId) => memberIds.includes(memberId))
          : memberIds;

      const nextManualShares: Record<string, string> = {};
      for (const memberId of memberIds) {
        nextManualShares[memberId] = current.manualSharesByMemberId[memberId] ?? "";
      }

      return {
        ...current,
        paidByMemberId: memberIds.includes(current.paidByMemberId)
          ? current.paidByMemberId
          : firstMemberId,
        fullAmountMemberId: memberIds.includes(current.fullAmountMemberId)
          ? current.fullAmountMemberId
          : firstMemberId,
        selectedMemberIds: nextSelectedMemberIds,
        manualSharesByMemberId: nextManualShares,
      };
    });
  }, [selectedTrip]);

  const submitTripCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingTrip || workspaceUnavailable) {
      return;
    }

    const memberNames = splitMemberNames(tripMembersInput);
    if (memberNames.length === 0) {
      setFeedbackTone("error");
      setFeedback(tr("Add at least one participant name."));
      return;
    }

    setIsCreatingTrip(true);
    setFeedback(null);
    try {
      const result = await createTravelTrip({
        initData,
        title: tripTitle,
        baseCurrency: tripCurrency.toUpperCase(),
        description: tripDescription,
        memberNames,
      });

      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        return;
      }

      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setSelectedTripId(result.trip.id);
      setSelectedTrip(result.trip);
      setTripTitle("");
      setTripDescription("");
      setTripMembersInput("");
      setFeedbackTone("success");
      setFeedback(tr("Trip created. Add first expense now."));
    } catch {
      setFeedbackTone("error");
      setFeedback(tr("Failed to create trip."));
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const submitExpenseCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingExpense || !selectedTrip) {
      return;
    }

    const amount = Number(expenseDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedbackTone("error");
      setFeedback(tr("Expense amount must be a positive number."));
      return;
    }

    const manualSplits = selectedTrip.members
      .map((member) => ({
        memberId: member.id,
        amount: Number(expenseDraft.manualSharesByMemberId[member.id] ?? ""),
      }))
      .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0);

    setIsCreatingExpense(true);
    setFeedback(null);
    try {
      const result = await createTravelExpense({
        initData,
        tripId: selectedTrip.id,
        amount,
        paidByMemberId: expenseDraft.paidByMemberId,
        description: expenseDraft.description,
        category: expenseDraft.category,
        splitMode: expenseDraft.splitMode,
        selectedMemberIds: expenseDraft.selectedMemberIds,
        fullAmountMemberId: expenseDraft.fullAmountMemberId || null,
        manualSplits,
        spentAt: expenseDraft.spentAt
          ? new Date(`${expenseDraft.spentAt}T12:00:00.000Z`).toISOString()
          : null,
      });

      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        return;
      }

      setSelectedTrip(result.trip);
      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setExpenseDraft((current) => ({
        ...current,
        amount: "",
        description: "",
        splitMode: "equal_all",
        selectedMemberIds: result.trip.members.map((member) => member.id),
        fullAmountMemberId: result.trip.members[0]?.id ?? "",
        manualSharesByMemberId: {},
        spentAt: "",
      }));
      setFeedbackTone("success");
      setFeedback(tr("Expense added and balances updated."));
    } catch {
      setFeedbackTone("error");
      setFeedback(tr("Failed to create trip expense."));
    } finally {
      setIsCreatingExpense(false);
    }
  };

  const toggleSelectedMember = (memberId: string) => {
    setExpenseDraft((current) => {
      const isSelected = current.selectedMemberIds.includes(memberId);
      return {
        ...current,
        selectedMemberIds: isSelected
          ? current.selectedMemberIds.filter((id) => id !== memberId)
          : [...current.selectedMemberIds, memberId],
      };
    });
  };

  return (
    <section className="pc-surface pc-screen-stack">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="pc-kicker">{tr("Travel groups")}</p>
          <h2 className="pc-section-title mt-1">
            <AppIcon name="travel" className="h-4 w-4" />
            {tr("Group expenses")}
          </h2>
          <p className="pc-section-subtitle">
            {tr(
              "Manual-first trip tracking: add expenses quickly, split clearly, and see who owes whom.",
            )}
          </p>
        </div>
        <span className="pc-state-card inline-flex h-9 w-9 items-center justify-center p-0 text-app-accent">
          <AppIcon name="travel" className="h-[18px] w-[18px]" />
        </span>
      </div>

      {workspaceUnavailable && (
        <p className="pc-feedback pc-feedback-warning">
          <AppIcon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{workspaceUnavailable}</span>
        </p>
      )}

      {!workspaceUnavailable && (
        <>
          <details className="pc-detail-surface" open={trips.length === 0}>
            <summary className="pc-summary-action inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              <AppIcon name="add" className="h-3.5 w-3.5" />
              {tr("Create trip")}
            </summary>
            <form className="mt-2 space-y-2" onSubmit={submitTripCreate}>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-app-text">{tr("Trip name")}</p>
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(event) => setTripTitle(event.target.value)}
                  placeholder={tr("Weekend in Kazan")}
                  maxLength={120}
                  className="pc-input"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-app-text">{tr("Base currency")}</p>
                  <input
                    type="text"
                    value={tripCurrency}
                    onChange={(event) =>
                      setTripCurrency(event.target.value.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase())
                    }
                    placeholder="RUB"
                    maxLength={3}
                    className="pc-input uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-app-text">
                    {tr("Trip note (optional)")}
                  </p>
                  <input
                    type="text"
                    value={tripDescription}
                    onChange={(event) => setTripDescription(event.target.value)}
                    placeholder={tr("Friends spring trip")}
                    maxLength={500}
                    className="pc-input"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-app-text">{tr("Participants")}</p>
                <textarea
                  value={tripMembersInput}
                  onChange={(event) => setTripMembersInput(event.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder={tr("One name per line: Anna\nIlya\nMasha")}
                  className="pc-textarea resize-y"
                />
                <p className="text-[11px] text-app-text-muted">
                  {tr("Names only for now. You can start simple and add expenses immediately.")}
                </p>
              </div>
              <button
                type="submit"
                disabled={isCreatingTrip}
                className="pc-btn-primary w-full"
              >
                <AppIcon name="add" className="h-4 w-4" />
                {isCreatingTrip ? tr("Creating...") : tr("Create trip")}
              </button>
            </form>
          </details>

          <section className="pc-detail-surface">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
              <AppIcon name="travel" className="h-3.5 w-3.5" />
              {tr("Trips")}
            </p>

            {isTripsLoading ? (
              <p className="mt-2 text-sm text-app-text-muted">{tr("Loading travel trips...")}</p>
            ) : trips.length === 0 ? (
              <div className="pc-empty-state mt-2">
                <p className="text-sm font-semibold text-app-text">{tr("No trips yet")}</p>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Create your first trip, add participants, then log expenses.")}
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`pc-action-card w-full text-left ${
                      selectedTripId === trip.id ? "border-app-accent" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-app-text">{trip.title}</p>
                    <p className="mt-1 text-xs text-app-text-muted">
                      {tr("Members")}: {trip.memberCount}. {tr("Expenses")}: {trip.totalExpensesCount}. {tr("Total")}: {formatAmount(trip.totalSpent, trip.baseCurrency)}.
                    </p>
                    <p className="mt-1 text-[11px] text-app-text-muted">
                      {tr("Updated at")}: {formatDateTime(trip.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {isTripLoading && (
            <p className="pc-feedback">
              <AppIcon name="refresh" className="pc-spin mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{tr("Loading trip details...")}</span>
            </p>
          )}

          {selectedTrip && !isTripLoading && (
            <section className="pc-screen-stack">
              <div className="pc-surface pc-surface-soft">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-app-text">{selectedTrip.title}</h3>
                  <span className="pc-status-pill">{selectedTrip.baseCurrency}</span>
                </div>
                {selectedTrip.description && (
                  <p className="mt-1 text-xs text-app-text-muted">{selectedTrip.description}</p>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">{tr("Members")}</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">{selectedTrip.members.length}</p>
                  </div>
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">{tr("Expenses")}</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">{selectedTrip.summary.totalExpensesCount}</p>
                  </div>
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">{tr("Total")}</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {formatAmount(selectedTrip.summary.totalSpent, selectedTrip.baseCurrency)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedTrip.members.map((member) => (
                    <span key={member.id} className="pc-chip">
                      {member.displayName}
                    </span>
                  ))}
                </div>
              </div>

              <form className="pc-surface space-y-2" onSubmit={submitExpenseCreate}>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name="add" className="h-3.5 w-3.5" />
                  {tr("Add expense")}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Amount")}</p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={expenseDraft.amount}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className="pc-input"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Paid by")}</p>
                    <select
                      value={expenseDraft.paidByMemberId}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          paidByMemberId: event.target.value,
                        }))
                      }
                      className="pc-select"
                    >
                      {selectedTrip.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Description")}</p>
                    <input
                      type="text"
                      value={expenseDraft.description}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      maxLength={240}
                      placeholder={tr("Dinner, taxi, tickets")}
                      className="pc-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Category")}</p>
                    <select
                      value={expenseDraft.category}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className="pc-select"
                    >
                      <option value="General">{tr("General")}</option>
                      <option value="Food">{tr("Food")}</option>
                      <option value="Transport">{tr("Transport")}</option>
                      <option value="Stay">{tr("Stay")}</option>
                      <option value="Activities">{tr("Activities")}</option>
                      <option value="Other">{tr("Other")}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-app-text">{tr("Expense date (optional)")}</p>
                  <input
                    type="date"
                    value={expenseDraft.spentAt}
                    onChange={(event) =>
                      setExpenseDraft((current) => ({
                        ...current,
                        spentAt: event.target.value,
                      }))
                    }
                    className="pc-input"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-app-text">{tr("Split mode")}</p>
                  <div className="pc-segmented">
                    {[
                      ["equal_all", tr("Equal: all")],
                      ["equal_selected", tr("Equal: selected")],
                      ["full_one", tr("Full amount: one")],
                      ["manual_amounts", tr("Manual amounts")],
                    ].map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setExpenseDraft((current) => ({
                            ...current,
                            splitMode: mode as TravelSplitMode,
                          }))
                        }
                        aria-pressed={expenseDraft.splitMode === mode}
                        className={`pc-segment-btn min-h-8 ${
                          expenseDraft.splitMode === mode ? "pc-segment-btn-active" : ""
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {expenseDraft.splitMode === "equal_selected" && (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Select participants")}</p>
                    <div className="space-y-1">
                      {selectedTrip.members.map((member) => {
                        const isSelected = expenseDraft.selectedMemberIds.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className="pc-check-row"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectedMember(member.id)}
                            />
                            <span>{member.displayName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expenseDraft.splitMode === "full_one" && (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Assign full amount to")}</p>
                    <select
                      value={expenseDraft.fullAmountMemberId}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          fullAmountMemberId: event.target.value,
                        }))
                      }
                      className="pc-select"
                    >
                      {selectedTrip.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {expenseDraft.splitMode === "manual_amounts" && (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Manual split by amount")}</p>
                    {selectedTrip.members.map((member) => (
                      <div key={member.id} className="grid grid-cols-[1fr_120px] items-center gap-2">
                        <p className="text-xs text-app-text">{member.displayName}</p>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expenseDraft.manualSharesByMemberId[member.id] ?? ""}
                          onChange={(event) =>
                            setExpenseDraft((current) => ({
                              ...current,
                              manualSharesByMemberId: {
                                ...current.manualSharesByMemberId,
                                [member.id]: event.target.value,
                              },
                            }))
                          }
                          className="pc-input"
                          placeholder="0.00"
                        />
                      </div>
                    ))}
                    <p className="text-[11px] text-app-text-muted">
                      {tr("For manual mode, entered amounts must equal full expense amount.")}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingExpense}
                  className="pc-btn-primary w-full"
                >
                  <AppIcon name="check" className="h-4 w-4" />
                  {isCreatingExpense ? tr("Saving...") : tr("Save expense")}
                </button>
              </form>

              <div className="pc-surface pc-surface-soft">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name="wallet" className="h-3.5 w-3.5" />
                  {tr("Balances")}
                </p>
                <div className="mt-2 space-y-1">
                  {selectedTrip.summary.balances.map((balance) => (
                    <div
                      key={balance.memberId}
                      className="pc-state-card flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-app-text">
                          {balance.memberDisplayName}
                        </p>
                        <p className="text-[11px] text-app-text-muted">
                          {tr("Paid")}: {formatAmount(balance.paidAmount, selectedTrip.baseCurrency)}. {tr("Owed")}: {formatAmount(balance.owedAmount, selectedTrip.baseCurrency)}.
                        </p>
                      </div>
                      <span
                        className={`pc-status-pill ${
                          balance.netAmount > 0
                            ? "pc-status-pill-success"
                            : balance.netAmount < 0
                              ? "pc-status-pill-error"
                              : ""
                        }`}
                      >
                        {balance.netAmount > 0 ? "+" : ""}
                        {formatAmount(balance.netAmount, selectedTrip.baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-semibold text-app-text">{tr("Who owes whom")}</p>
                  {selectedTrip.summary.settlements.length === 0 ? (
                    <p className="mt-1 text-xs text-app-text-muted">
                      {tr("Balances are already close to zero.")}
                    </p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {selectedTrip.summary.settlements.map((settlement, index) => (
                        <p key={`${settlement.fromMemberId}-${settlement.toMemberId}-${index}`} className="text-xs text-app-text-muted">
                          <span className="font-semibold text-app-text">{settlement.fromMemberDisplayName}</span>{" "}
                          {tr("owes")}{" "}
                          <span className="font-semibold text-app-text">{settlement.toMemberDisplayName}</span>{" "}
                          {formatAmount(settlement.amount, selectedTrip.baseCurrency)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pc-surface pc-surface-soft">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name="history" className="h-3.5 w-3.5" />
                  {tr("Trip expense history")}
                </p>
                {selectedTrip.recentExpenses.length === 0 ? (
                  <div className="pc-empty-state mt-2">
                    <p className="text-sm font-semibold text-app-text">{tr("No expenses yet")}</p>
                    <p className="mt-1 text-xs text-app-text-muted">
                      {tr("Add first expense to see split history here.")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {selectedTrip.recentExpenses.map((expense) => (
                      <div key={expense.id} className="pc-state-card px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-app-text">{expense.description}</p>
                          <span className="pc-status-pill">
                            {formatAmount(expense.amount, expense.currency)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-app-text-muted">
                          {tr("Paid by")}: {expense.paidByMemberDisplayName}. {tr("Category")}: {expense.category}.
                        </p>
                        <p className="mt-1 text-[11px] text-app-text-muted">
                          {formatDateTime(expense.spentAt)}
                        </p>
                        <p className="mt-1 text-[11px] text-app-text-muted">
                          {tr("Split")}: {expense.splits
                            .map((split) => `${split.memberDisplayName} ${split.shareAmount.toFixed(2)}`)
                            .join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {feedback && (
        <p
          className={`pc-feedback ${
            feedbackTone === "success"
              ? "pc-feedback-success"
              : feedbackTone === "error"
                ? "pc-feedback-error"
                : ""
          }`}
        >
          <AppIcon
            name={feedbackTone === "error" ? "alert" : feedbackTone === "success" ? "check" : "refresh"}
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          <span>{tr(feedback)}</span>
        </p>
      )}
    </section>
  );
}

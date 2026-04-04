"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceSummaryPayload } from "@/lib/auth/types";
import {
  createTravelExpense,
  createTravelTrip,
  deleteTravelExpense,
  listTravelTrips,
  mutateTravelTripClosure,
  readTravelTripDetail,
  updateTravelSettlementItemStatus,
  updateTravelExpense,
} from "@/lib/travel/client";
import type {
  TravelSettlementTransferPayload,
  TravelSplitMode,
  TravelTripExpensePayload,
  TravelTripListItemPayload,
  TravelTripPayload,
  TravelTripSettlementItemPayload,
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

type TravelExpenseDefaultsSnapshot = {
  paidByMemberId: string;
  category: string;
  splitMode: TravelSplitMode;
  selectedMemberIds: string[];
  fullAmountMemberId: string;
};

const TRAVEL_EXPENSE_DEFAULTS_STORAGE_KEY =
  "payment_control_travel_expense_defaults_v28d";

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

const getTripStatusLabel = (trip: TravelTripPayload, tr: (text: string) => string): string => {
  if (trip.status === "closed") {
    return tr("Closed");
  }

  if (trip.status === "closing") {
    return tr("Finalizing");
  }

  return tr("Active");
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
    status: trip.status,
    closedAt: trip.closedAt,
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

const toDateInputValue = (isoDate: string): string => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createExpenseDraftFromDefaults = (
  trip: TravelTripPayload,
  defaults: TravelExpenseDefaultsSnapshot | null,
): ExpenseDraft => {
  const memberIds = trip.members.map((member) => member.id);
  const firstMemberId = memberIds[0] ?? "";
  const splitMode = defaults?.splitMode ?? "equal_all";

  const selectedForEqualSelected = defaults?.selectedMemberIds.filter((memberId) =>
    memberIds.includes(memberId),
  );

  const selectedMemberIds =
    splitMode === "equal_selected"
      ? selectedForEqualSelected && selectedForEqualSelected.length > 0
        ? selectedForEqualSelected
        : memberIds
      : memberIds;

  const manualSharesByMemberId = Object.fromEntries(
    memberIds.map((memberId) => [memberId, ""]),
  );

  return {
    amount: "",
    paidByMemberId:
      defaults?.paidByMemberId && memberIds.includes(defaults.paidByMemberId)
        ? defaults.paidByMemberId
        : firstMemberId,
    description: "",
    category: defaults?.category || "General",
    splitMode,
    selectedMemberIds,
    fullAmountMemberId:
      defaults?.fullAmountMemberId && memberIds.includes(defaults.fullAmountMemberId)
        ? defaults.fullAmountMemberId
        : firstMemberId,
    manualSharesByMemberId,
    spentAt: "",
  };
};

const createExpenseDraftFromExistingExpense = (
  trip: TravelTripPayload,
  expense: TravelTripExpensePayload,
): ExpenseDraft => {
  const memberIds = trip.members.map((member) => member.id);
  const firstMemberId = memberIds[0] ?? "";
  const splitMap = new Map(expense.splits.map((split) => [split.memberId, split]));
  const manualSharesByMemberId = Object.fromEntries(
    memberIds.map((memberId) => [memberId, splitMap.get(memberId)?.shareAmount.toFixed(2) ?? ""]),
  );

  const selectedMemberIds =
    expense.splitMode === "equal_selected"
      ? expense.splits
          .map((split) => split.memberId)
          .filter((memberId) => memberIds.includes(memberId))
      : memberIds;

  const fullAmountMemberId =
    expense.splitMode === "full_one"
      ? expense.splits[0]?.memberId ?? expense.paidByMemberId
      : expense.paidByMemberId;

  return {
    amount: expense.amount.toFixed(2),
    paidByMemberId: memberIds.includes(expense.paidByMemberId)
      ? expense.paidByMemberId
      : firstMemberId,
    description: expense.description,
    category: expense.category,
    splitMode: expense.splitMode,
    selectedMemberIds,
    fullAmountMemberId: memberIds.includes(fullAmountMemberId)
      ? fullAmountMemberId
      : firstMemberId,
    manualSharesByMemberId,
    spentAt: toDateInputValue(expense.spentAt),
  };
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
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpenseId, setIsDeletingExpenseId] = useState<string | null>(null);
  const [isClosureMutating, setIsClosureMutating] = useState(false);
  const [isSettlementMutatingId, setIsSettlementMutatingId] = useState<string | null>(
    null,
  );
  const [allowCloseWithUnsettledConfirm, setAllowCloseWithUnsettledConfirm] =
    useState(false);
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");

  const [tripTitle, setTripTitle] = useState("");
  const [tripCurrency, setTripCurrency] = useState("RUB");
  const [tripDescription, setTripDescription] = useState("");
  const [tripMembersInput, setTripMembersInput] = useState("");
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(defaultExpenseDraft);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseHistorySort, setExpenseHistorySort] = useState<"newest" | "highest">(
    "newest",
  );
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const expenseFormRef = useRef<HTMLFormElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

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

  const readExpenseDefaultsForTrip = useCallback(
    (tripId: string): TravelExpenseDefaultsSnapshot | null => {
      if (typeof window === "undefined" || !workspaceId) {
        return null;
      }

      const storageKey = `${workspaceId}:${tripId}`;

      try {
        const raw = window.localStorage.getItem(TRAVEL_EXPENSE_DEFAULTS_STORAGE_KEY);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const value = parsed[storageKey];
        if (!value || typeof value !== "object") {
          return null;
        }

        const typed = value as Partial<TravelExpenseDefaultsSnapshot>;
        const splitMode = typed.splitMode;
        if (
          splitMode !== "equal_all" &&
          splitMode !== "equal_selected" &&
          splitMode !== "full_one" &&
          splitMode !== "manual_amounts"
        ) {
          return null;
        }

        return {
          paidByMemberId:
            typeof typed.paidByMemberId === "string" ? typed.paidByMemberId : "",
          category: typeof typed.category === "string" ? typed.category : "General",
          splitMode,
          selectedMemberIds: Array.isArray(typed.selectedMemberIds)
            ? typed.selectedMemberIds
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
            : [],
          fullAmountMemberId:
            typeof typed.fullAmountMemberId === "string"
              ? typed.fullAmountMemberId
              : "",
        };
      } catch {
        return null;
      }
    },
    [workspaceId],
  );

  const writeExpenseDefaultsForTrip = useCallback(
    (tripId: string, defaults: TravelExpenseDefaultsSnapshot) => {
      if (typeof window === "undefined" || !workspaceId) {
        return;
      }

      const storageKey = `${workspaceId}:${tripId}`;
      try {
        const raw = window.localStorage.getItem(TRAVEL_EXPENSE_DEFAULTS_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        parsed[storageKey] = defaults;
        window.localStorage.setItem(
          TRAVEL_EXPENSE_DEFAULTS_STORAGE_KEY,
          JSON.stringify(parsed),
        );
      } catch {
        // Ignore storage write errors in restricted environments.
      }
    },
    [workspaceId],
  );

  const buildManualSplitsFromDraft = useCallback(
    (trip: TravelTripPayload): Array<{ memberId: string; amount: number }> => {
      return trip.members
        .map((member) => ({
          memberId: member.id,
          amount: Number(expenseDraft.manualSharesByMemberId[member.id] ?? ""),
        }))
        .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0);
    },
    [expenseDraft.manualSharesByMemberId],
  );

  const isExpenseSaveInProgress = isCreatingExpense || isUpdatingExpense;
  const isEditingExpense = editingExpenseId !== null;
  const isTripEditable = selectedTrip?.status === "active";

  const sortedRecentExpenses = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    const next = [...selectedTrip.recentExpenses];
    if (expenseHistorySort === "highest") {
      next.sort((left, right) => {
        if (right.amount !== left.amount) {
          return right.amount - left.amount;
        }

        if (left.spentAt !== right.spentAt) {
          return right.spentAt.localeCompare(left.spentAt);
        }

        return right.createdAt.localeCompare(left.createdAt);
      });
      return next;
    }

    next.sort((left, right) => {
      if (left.spentAt !== right.spentAt) {
        return right.spentAt.localeCompare(left.spentAt);
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
    return next;
  }, [selectedTrip, expenseHistorySort]);

  const settlementItemsByTransferKey = useMemo(() => {
    if (!selectedTrip) {
      return new Map<string, TravelTripSettlementItemPayload>();
    }

    return new Map(
      selectedTrip.summary.settlementItems.map((item) => [
        `${item.fromMemberId}:${item.toMemberId}`,
        item,
      ]),
    );
  }, [selectedTrip]);

  const unresolvedSettlements = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelSettlementTransferPayload[];
    }

    return selectedTrip.summary.settlements;
  }, [selectedTrip]);

  const focusExpenseForm = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      expenseFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    });
  }, []);

  const resetExpenseDraftToDefaults = useCallback(
    (trip: TravelTripPayload) => {
      const defaults = readExpenseDefaultsForTrip(trip.id);
      setExpenseDraft(createExpenseDraftFromDefaults(trip, defaults));
    },
    [readExpenseDefaultsForTrip],
  );

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
      setEditingExpenseId(null);
      setPendingDeleteExpenseId(null);
      setAllowCloseWithUnsettledConfirm(false);
      setExpenseDraft(defaultExpenseDraft);
      return;
    }

    if (editingExpenseId) {
      const editingExpense = selectedTrip.recentExpenses.find(
        (expense) => expense.id === editingExpenseId,
      );

      if (!editingExpense) {
        setEditingExpenseId(null);
        setPendingDeleteExpenseId(null);
        resetExpenseDraftToDefaults(selectedTrip);
        return;
      }

      setExpenseDraft(createExpenseDraftFromExistingExpense(selectedTrip, editingExpense));
      return;
    }

    setPendingDeleteExpenseId(null);
    setAllowCloseWithUnsettledConfirm(false);
    resetExpenseDraftToDefaults(selectedTrip);
  }, [editingExpenseId, resetExpenseDraftToDefaults, selectedTrip]);

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

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTrip || isExpenseSaveInProgress) {
      return;
    }

    if (selectedTrip.status !== "active") {
      setFeedbackTone("error");
      setFeedback(tr("Trip is not active. Reopen trip editing to add or update expenses."));
      return;
    }

    const amount = Number(expenseDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedbackTone("error");
      setFeedback(tr("Expense amount must be a positive number."));
      return;
    }

    const manualSplits = buildManualSplitsFromDraft(selectedTrip);
    const spentAtIso = expenseDraft.spentAt
      ? new Date(`${expenseDraft.spentAt}T12:00:00.000Z`).toISOString()
      : null;

    const payload = {
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
      spentAt: spentAtIso,
    };

    const defaultsSnapshot: TravelExpenseDefaultsSnapshot = {
      paidByMemberId: payload.paidByMemberId,
      category: payload.category,
      splitMode: payload.splitMode,
      selectedMemberIds: [...payload.selectedMemberIds],
      fullAmountMemberId: payload.fullAmountMemberId ?? "",
    };

    setFeedback(null);
    if (isEditingExpense) {
      setIsUpdatingExpense(true);
    } else {
      setIsCreatingExpense(true);
    }

    try {
      const result =
        isEditingExpense && editingExpenseId
          ? await updateTravelExpense({
              ...payload,
              expenseId: editingExpenseId,
            })
          : await createTravelExpense(payload);

      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        return;
      }

      writeExpenseDefaultsForTrip(result.trip.id, defaultsSnapshot);
      setSelectedTrip(result.trip);
      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setEditingExpenseId(null);
      setPendingDeleteExpenseId(null);
      setExpenseDraft(createExpenseDraftFromDefaults(result.trip, defaultsSnapshot));
      setFeedbackTone("success");
      setFeedback(
        tr(
          isEditingExpense
            ? "Expense updated and balances recalculated."
            : "Expense added and balances updated.",
        ),
      );
      focusExpenseForm();
    } catch {
      setFeedbackTone("error");
      setFeedback(
        tr(
          isEditingExpense
            ? "Failed to update trip expense."
            : "Failed to create trip expense.",
        ),
      );
    } finally {
      if (isEditingExpense) {
        setIsUpdatingExpense(false);
      } else {
        setIsCreatingExpense(false);
      }
    }
  };

  const startExpenseEdit = useCallback(
    (expense: TravelTripExpensePayload) => {
      if (!selectedTrip || isExpenseSaveInProgress || isDeletingExpenseId) {
        return;
      }

      if (selectedTrip.status !== "active") {
        setFeedbackTone("error");
        setFeedback(tr("Trip is not active. Reopen trip editing to add or update expenses."));
        return;
      }

      setPendingDeleteExpenseId(null);
      setEditingExpenseId(expense.id);
      setExpenseDraft(createExpenseDraftFromExistingExpense(selectedTrip, expense));
      setFeedbackTone("info");
      setFeedback(tr("Editing expense. Update fields and save changes."));
      focusExpenseForm();
    },
    [
      focusExpenseForm,
      isDeletingExpenseId,
      isExpenseSaveInProgress,
      selectedTrip,
      tr,
      setFeedback,
      setFeedbackTone,
    ],
  );

  const cancelExpenseEdit = useCallback(() => {
    if (!selectedTrip || isExpenseSaveInProgress || isDeletingExpenseId) {
      return;
    }

    setEditingExpenseId(null);
    setPendingDeleteExpenseId(null);
    resetExpenseDraftToDefaults(selectedTrip);
    setFeedbackTone("info");
    setFeedback(tr("Edit cancelled. Back to quick add mode."));
  }, [
    isDeletingExpenseId,
    isExpenseSaveInProgress,
    resetExpenseDraftToDefaults,
    selectedTrip,
    tr,
  ]);

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!selectedTrip || isExpenseSaveInProgress || isDeletingExpenseId) {
        return;
      }

      if (selectedTrip.status !== "active") {
        setFeedbackTone("error");
        setFeedback(tr("Trip is not active. Reopen trip editing to add or update expenses."));
        return;
      }

      setFeedback(null);
      setIsDeletingExpenseId(expenseId);
      try {
        const result = await deleteTravelExpense({
          initData,
          tripId: selectedTrip.id,
          expenseId,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setPendingDeleteExpenseId(null);
        if (editingExpenseId === expenseId) {
          setEditingExpenseId(null);
          resetExpenseDraftToDefaults(result.trip);
        }
        setFeedbackTone("success");
        setFeedback(tr("Expense deleted. Balances recalculated."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to delete trip expense."));
      } finally {
        setIsDeletingExpenseId(null);
      }
    },
    [
      editingExpenseId,
      initData,
      isDeletingExpenseId,
      isExpenseSaveInProgress,
      resetExpenseDraftToDefaults,
      selectedTrip,
      tr,
    ],
  );

  const runTripClosureAction = useCallback(
    async (action: "start" | "close" | "reopen", allowUnsettled = false) => {
      if (!selectedTrip || isClosureMutating || isSettlementMutatingId) {
        return;
      }

      setFeedback(null);
      setIsClosureMutating(true);
      try {
        const result = await mutateTravelTripClosure({
          initData,
          tripId: selectedTrip.id,
          action,
          allowUnsettled,
        });

        if (!result.ok) {
          if (result.error.code === "TRAVEL_TRIP_CLOSURE_BLOCKED" && action === "close") {
            setAllowCloseWithUnsettledConfirm(true);
          }
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setAllowCloseWithUnsettledConfirm(false);

        if (result.trip.status !== "active") {
          setEditingExpenseId(null);
          setPendingDeleteExpenseId(null);
        } else {
          resetExpenseDraftToDefaults(result.trip);
        }

        setFeedbackTone("success");
        if (result.action === "start") {
          setFeedback(tr("Settlement finalization started. Mark transfers as settled and close trip when ready."));
          return;
        }

        if (result.action === "close") {
          setFeedback(tr("Trip closed. Expenses are now read-only and final settlement snapshot is saved."));
          return;
        }

        setFeedback(tr("Trip reopened. You can edit expenses and continue the trip."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to update trip closure state."));
      } finally {
        setIsClosureMutating(false);
      }
    },
    [
      initData,
      isClosureMutating,
      isSettlementMutatingId,
      resetExpenseDraftToDefaults,
      selectedTrip,
      tr,
    ],
  );

  const toggleSettlementStatus = useCallback(
    async (settlementItemId: string, markSettled: boolean) => {
      if (!selectedTrip || isClosureMutating || isSettlementMutatingId) {
        return;
      }

      if (selectedTrip.status !== "closing") {
        setFeedbackTone("error");
        setFeedback(tr("Settlement items can be updated only while trip is in finalization mode."));
        return;
      }

      setFeedback(null);
      setIsSettlementMutatingId(settlementItemId);
      try {
        const result = await updateTravelSettlementItemStatus({
          initData,
          tripId: selectedTrip.id,
          settlementItemId,
          markSettled,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setAllowCloseWithUnsettledConfirm(false);
        setFeedbackTone("success");
        setFeedback(
          tr(
            markSettled
              ? "Settlement marked as done."
              : "Settlement returned to open list.",
          ),
        );
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to update settlement item."));
      } finally {
        setIsSettlementMutatingId(null);
      }
    },
    [initData, isClosureMutating, isSettlementMutatingId, selectedTrip, tr],
  );

  const scrollToHistory = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      historySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-app-text">{trip.title}</p>
                      <span
                        className={`pc-status-pill ${
                          trip.status === "closed"
                            ? "pc-status-pill-success"
                            : trip.status === "closing"
                              ? "pc-status-pill-warning"
                              : ""
                        }`}
                      >
                        {tr(
                          trip.status === "closed"
                            ? "Closed"
                            : trip.status === "closing"
                              ? "Finalizing"
                              : "Active",
                        )}
                      </span>
                    </div>
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
                  <div className="flex items-center gap-1.5">
                    <span className="pc-status-pill">{selectedTrip.baseCurrency}</span>
                    <span
                      className={`pc-status-pill ${
                        selectedTrip.status === "closed"
                          ? "pc-status-pill-success"
                          : selectedTrip.status === "closing"
                            ? "pc-status-pill-warning"
                            : ""
                      }`}
                    >
                      {getTripStatusLabel(selectedTrip, tr)}
                    </span>
                  </div>
                </div>
                {selectedTrip.description && (
                  <p className="mt-1 text-xs text-app-text-muted">{selectedTrip.description}</p>
                )}
                {selectedTrip.closedAt && (
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr("Closed at")}: {formatDateTime(selectedTrip.closedAt)}
                  </p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
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
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">{tr("Open settlements")}</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {selectedTrip.summary.unsettledSettlementCount}
                    </p>
                  </div>
                  <div className="pc-state-card p-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">{tr("Settled")}</p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {selectedTrip.summary.settledSettlementCount}
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
                <p className="mt-2 text-[11px] text-app-text-muted">
                  {selectedTrip.recentExpenses.length > 0
                    ? tr("Last activity") +
                      ": " +
                      selectedTrip.recentExpenses[0]?.description +
                      " • " +
                      formatDateTime(selectedTrip.recentExpenses[0]?.spentAt ?? "")
                    : tr("No expenses yet")}
                </p>
                {selectedTrip.status !== "active" && (
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {selectedTrip.summary.readyForClosure
                      ? tr("Ready to close trip.")
                      : tr("Settle open transfers before closing trip.")}
                  </p>
                )}
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={focusExpenseForm}
                    disabled={!isTripEditable || isClosureMutating || isSettlementMutatingId !== null}
                    className="pc-btn-primary w-full"
                  >
                    <AppIcon name="add" className="h-3.5 w-3.5" />
                    {tr("Quick add expense")}
                  </button>
                  <button
                    type="button"
                    onClick={scrollToHistory}
                    className="pc-btn-secondary w-full"
                  >
                    <AppIcon name="history" className="h-3.5 w-3.5" />
                    {tr("View recent expenses")}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {selectedTrip.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void runTripClosureAction("start")}
                      disabled={isClosureMutating || isSettlementMutatingId !== null}
                      className="pc-btn-secondary w-full"
                    >
                      <AppIcon name="check" className="h-3.5 w-3.5" />
                      {isClosureMutating ? tr("Saving...") : tr("Start finalization")}
                    </button>
                  )}
                  {selectedTrip.status === "closing" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void runTripClosureAction("close", false)}
                        disabled={isClosureMutating || isSettlementMutatingId !== null}
                        className="pc-btn-primary w-full"
                      >
                        <AppIcon name="check" className="h-3.5 w-3.5" />
                        {isClosureMutating ? tr("Saving...") : tr("Close trip")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void runTripClosureAction("reopen")}
                        disabled={isClosureMutating || isSettlementMutatingId !== null}
                        className="pc-btn-secondary w-full"
                      >
                        <AppIcon name="undo" className="h-3.5 w-3.5" />
                        {tr("Back to active")}
                      </button>
                    </>
                  )}
                  {selectedTrip.status === "closed" && (
                    <button
                      type="button"
                      onClick={() => void runTripClosureAction("reopen")}
                      disabled={isClosureMutating || isSettlementMutatingId !== null}
                      className="pc-btn-secondary w-full"
                    >
                      <AppIcon name="undo" className="h-3.5 w-3.5" />
                      {tr("Reopen trip")}
                    </button>
                  )}
                </div>
                {allowCloseWithUnsettledConfirm && selectedTrip.status === "closing" && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-900">
                      {tr("Trip still has open settlements. Close anyway?")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => void runTripClosureAction("close", true)}
                        disabled={isClosureMutating || isSettlementMutatingId !== null}
                        className="pc-btn-danger"
                      >
                        <AppIcon name="check" className="h-3.5 w-3.5" />
                        {tr("Close with open settlements")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowCloseWithUnsettledConfirm(false)}
                        disabled={isClosureMutating || isSettlementMutatingId !== null}
                        className="pc-btn-secondary"
                      >
                        {tr("Keep trip active")}
                      </button>
                    </div>
                  </div>
                )}
                {selectedTrip.status === "closed" && (
                  <p className="mt-2 text-[11px] text-app-text-muted">
                    {tr("Closed trip stays available as read-only history with final settlement summary.")}
                  </p>
                )}
              </div>

              {isTripEditable ? (
                <form
                  ref={expenseFormRef}
                  className="pc-surface space-y-2"
                  onSubmit={submitExpense}
                >
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name={isEditingExpense ? "edit" : "add"} className="h-3.5 w-3.5" />
                  {tr(isEditingExpense ? "Edit expense" : "Add expense")}
                </p>
                <p className="text-[11px] text-app-text-muted">
                  {tr("Fast path: amount, payer, description, then save.")}
                </p>
                {isEditingExpense && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-900">
                      {tr("You are editing an existing expense.")}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-800">
                      {tr("Save changes to recalculate balances, or cancel to return to quick add.")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={cancelExpenseEdit}
                        disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                        className="pc-btn-secondary"
                      >
                        {tr("Cancel edit")}
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Amount")}</p>
                    <input
                      ref={amountInputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                    disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                        disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                              disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                          disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
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
                  disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                  className="pc-btn-primary w-full"
                >
                  <AppIcon name="check" className="h-4 w-4" />
                  {isExpenseSaveInProgress
                    ? tr("Saving...")
                    : tr(isEditingExpense ? "Save changes" : "Save expense")}
                </button>
                </form>
              ) : (
                <div className="pc-surface pc-surface-soft">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                    <AppIcon name="add" className="h-3.5 w-3.5" />
                    {tr("Expense editing is locked")}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {tr(
                      selectedTrip.status === "closed"
                        ? "Trip is closed. Reopen only if your group decides to continue editing."
                        : "Trip is in finalization mode. Mark settlements and close trip, or return to active mode for edits.",
                    )}
                  </p>
                </div>
              )}

              <div className="pc-surface pc-surface-soft">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name="wallet" className="h-3.5 w-3.5" />
                  {tr("Balances")}
                </p>
                <p className="mt-1 text-[11px] text-app-text-muted">
                  {tr("Positive balance means member should receive money back. Negative means member should pay.")}
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-app-text">{tr("Who owes whom")}</p>
                    <span className="text-[11px] text-app-text-muted">
                      {tr("Open")}: {selectedTrip.summary.unsettledSettlementCount} •{" "}
                      {formatAmount(
                        selectedTrip.summary.unsettledSettlementTotal,
                        selectedTrip.baseCurrency,
                      )}
                    </span>
                  </div>
                  {unresolvedSettlements.length === 0 ? (
                    <p className="mt-1 text-xs text-app-text-muted">
                      {tr("Balances are already close to zero.")}
                    </p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {unresolvedSettlements.map((settlement, index) => {
                        const settlementItem = settlementItemsByTransferKey.get(
                          `${settlement.fromMemberId}:${settlement.toMemberId}`,
                        );
                        const canToggleSettlement =
                          selectedTrip.status === "closing" &&
                          settlementItem &&
                          isSettlementMutatingId !== settlementItem.id;

                        return (
                          <div
                            key={`${settlement.fromMemberId}-${settlement.toMemberId}-${index}`}
                            className="pc-state-card space-y-1 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-app-text-muted">
                                <span className="font-semibold text-app-text">
                                  {settlement.fromMemberDisplayName}
                                </span>{" "}
                                {tr("owes")}{" "}
                                <span className="font-semibold text-app-text">
                                  {settlement.toMemberDisplayName}
                                </span>
                              </p>
                              <span className="pc-status-pill pc-status-pill-warning">
                                {formatAmount(settlement.amount, selectedTrip.baseCurrency)}
                              </span>
                            </div>
                            {selectedTrip.status === "closing" && settlementItem && (
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void toggleSettlementStatus(settlementItem.id, true)
                                  }
                                  disabled={
                                    isClosureMutating ||
                                    isSettlementMutatingId !== null ||
                                    !canToggleSettlement
                                  }
                                  className="pc-btn-secondary"
                                >
                                  <AppIcon name="check" className="h-3.5 w-3.5" />
                                  {isSettlementMutatingId === settlementItem.id
                                    ? tr("Saving...")
                                    : tr("Mark as settled")}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(selectedTrip.status === "closing" || selectedTrip.status === "closed") && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-app-text">{tr("Settled transfers")}</p>
                        <span className="text-[11px] text-app-text-muted">
                          {selectedTrip.summary.settledSettlementCount} •{" "}
                          {formatAmount(
                            selectedTrip.summary.settledSettlementTotal,
                            selectedTrip.baseCurrency,
                          )}
                        </span>
                      </div>
                      {selectedTrip.summary.settledSettlements.length === 0 ? (
                        <p className="text-[11px] text-app-text-muted">
                          {tr("No settled transfers yet.")}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {selectedTrip.summary.settledSettlements.map((settlement, index) => {
                            const settlementItem = settlementItemsByTransferKey.get(
                              `${settlement.fromMemberId}:${settlement.toMemberId}`,
                            );

                            return (
                              <div
                                key={`settled-${settlement.fromMemberId}-${settlement.toMemberId}-${index}`}
                                className="pc-state-card space-y-1 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-app-text-muted">
                                    <span className="font-semibold text-app-text">
                                      {settlement.fromMemberDisplayName}
                                    </span>{" "}
                                    {tr("paid")}{" "}
                                    <span className="font-semibold text-app-text">
                                      {settlement.toMemberDisplayName}
                                    </span>
                                  </p>
                                  <span className="pc-status-pill pc-status-pill-success">
                                    {formatAmount(settlement.amount, selectedTrip.baseCurrency)}
                                  </span>
                                </div>
                                {selectedTrip.status === "closing" && settlementItem && (
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void toggleSettlementStatus(settlementItem.id, false)
                                      }
                                      disabled={
                                        isClosureMutating ||
                                        isSettlementMutatingId !== null
                                      }
                                      className="pc-btn-secondary"
                                    >
                                      <AppIcon name="undo" className="h-3.5 w-3.5" />
                                      {isSettlementMutatingId === settlementItem.id
                                        ? tr("Saving...")
                                        : tr("Return to open")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div ref={historySectionRef} className="pc-surface pc-surface-soft">
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                        {tr("Sort")}
                      </span>
                      <div className="pc-segmented">
                        <button
                          type="button"
                          onClick={() => setExpenseHistorySort("newest")}
                          aria-pressed={expenseHistorySort === "newest"}
                          className={`pc-segment-btn min-h-8 ${
                            expenseHistorySort === "newest" ? "pc-segment-btn-active" : ""
                          }`}
                        >
                          {tr("Newest")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseHistorySort("highest")}
                          aria-pressed={expenseHistorySort === "highest"}
                          className={`pc-segment-btn min-h-8 ${
                            expenseHistorySort === "highest" ? "pc-segment-btn-active" : ""
                          }`}
                        >
                          {tr("Highest amount")}
                        </button>
                      </div>
                    </div>

                    {sortedRecentExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className={`pc-state-card px-3 py-2 ${
                          editingExpenseId === expense.id ? "border-app-accent" : ""
                        }`}
                      >
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
                        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => startExpenseEdit(expense)}
                            disabled={
                              !isTripEditable ||
                              isDeletingExpenseId !== null ||
                              isExpenseSaveInProgress ||
                              isClosureMutating ||
                              isSettlementMutatingId !== null
                            }
                            className="pc-btn-secondary w-full"
                          >
                            <AppIcon name="edit" className="h-3.5 w-3.5" />
                            {tr("Edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteExpenseId((current) =>
                                current === expense.id ? null : expense.id,
                              )
                            }
                            disabled={
                              !isTripEditable ||
                              isDeletingExpenseId !== null ||
                              isExpenseSaveInProgress ||
                              isClosureMutating ||
                              isSettlementMutatingId !== null
                            }
                            className="pc-btn-danger w-full"
                          >
                            <AppIcon name="archive" className="h-3.5 w-3.5" />
                            {isDeletingExpenseId === expense.id
                              ? tr("Deleting...")
                              : tr("Delete expense")}
                          </button>
                        </div>
                        {pendingDeleteExpenseId === expense.id && (
                          <div className="mt-2 rounded-xl border border-red-200 bg-red-50/70 px-2 py-2 text-xs text-red-900">
                            <p className="font-semibold">
                              {tr("Delete this expense? Balances will be recalculated immediately.")}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => void deleteExpense(expense.id)}
                                disabled={
                                  isDeletingExpenseId !== null || isExpenseSaveInProgress
                                }
                                className="pc-btn-danger"
                              >
                                <AppIcon name="archive" className="h-3.5 w-3.5" />
                                {tr("Confirm delete")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteExpenseId(null)}
                                disabled={
                                  isDeletingExpenseId !== null || isExpenseSaveInProgress
                                }
                                className="pc-btn-secondary"
                              >
                                {tr("Cancel delete")}
                              </button>
                            </div>
                          </div>
                        )}
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

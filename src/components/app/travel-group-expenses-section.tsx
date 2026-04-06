"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ProfilePayload, WorkspaceSummaryPayload } from "@/lib/auth/types";
import { normalizeTravelExpenseAmount } from "@/lib/travel/currency";
import {
  createTravelExpense,
  createTravelTripInvite,
  createTravelTripMember,
  createTravelReceiptDraft,
  createTravelTrip,
  deleteTravelReceiptDraft,
  deleteTravelExpense,
  joinTravelTripByInvite,
  listTravelTrips,
  mutateTravelTripClosure,
  parseTravelReceiptDraft,
  readTravelTripInvite,
  readTravelTripDetail,
  replaceTravelReceiptDraftImage,
  updateTravelSettlementItemStatus,
  updateTravelExpense,
  updateTravelTripMember,
} from "@/lib/travel/client";
import {
  readCachedTravelTripDetail,
  readCachedTravelTripsList,
  writeCachedTravelTripDetail,
  writeCachedTravelTripsList,
} from "@/lib/travel/client-cache";
import type {
  TravelTripInvitePayload,
  TravelReceiptDraftPayload,
  TravelSettlementTransferPayload,
  TravelSplitMode,
  TravelTripExpensePayload,
  TravelTripListItemPayload,
  TravelTripMemberPayload,
  TravelTripPayload,
  TravelTripSettlementItemPayload,
} from "@/lib/travel/types";
import { maskTravelInviteToken } from "@/lib/travel/invite-token";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";
import { ModalSheet } from "@/components/app/modal-sheet";

type TravelGroupExpensesSectionProps = {
  workspace: WorkspaceSummaryPayload | null;
  profile: ProfilePayload | null;
  initData: string;
};

type FeedbackTone = "info" | "success" | "error";
type TripListFilter = "active" | "completed" | "archived" | "all";
type ReceiptListFilter = "attention" | "ready" | "processed" | "all";
type TripWorkspaceLayer = "expenses" | "settlements" | "history";
const tripListFilters: readonly TripListFilter[] = [
  "active",
  "completed",
  "archived",
  "all",
];
const receiptListFilters: readonly ReceiptListFilter[] = [
  "attention",
  "ready",
  "processed",
  "all",
];

type ExpenseDraft = {
  amount: string;
  expenseCurrency: string;
  conversionRate: string;
  paidByMemberId: string;
  description: string;
  category: string;
  splitMode: TravelSplitMode;
  selectedMemberIds: string[];
  fullAmountMemberId: string;
  manualSharesByMemberId: Record<string, string>;
  spentAt: string;
};

type ReceiptPrefillField =
  | "amount"
  | "expenseCurrency"
  | "conversionRate"
  | "spentAt"
  | "description"
  | "category";

const defaultExpenseDraft: ExpenseDraft = {
  amount: "",
  expenseCurrency: "",
  conversionRate: "",
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
  expenseCurrency: string;
  conversionRate: string;
  category: string;
  splitMode: TravelSplitMode;
  selectedMemberIds: string[];
  fullAmountMemberId: string;
};

const TRAVEL_EXPENSE_DEFAULTS_STORAGE_KEY =
  "payment_control_travel_expense_defaults_v28f";
const TRAVEL_FX_RATE_MEMORY_STORAGE_KEY =
  "payment_control_travel_fx_rate_memory_v28p";
const TRAVEL_FX_RATE_MEMORY_MAX_PER_WORKSPACE = 80;

type TravelFxRateMemorySnapshot = {
  sourceCurrency: string;
  tripCurrency: string;
  conversionRate: string;
  updatedAt: string;
};

type TravelFxRateSuggestion = {
  key: string;
  conversionRate: string;
  updatedAt: string;
  source: "memory" | "recent";
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

const formatRateInputValue = (value: number): string => {
  return value.toFixed(6).replace(/\.?0+$/, "");
};

const getTravelFxPairKey = (sourceCurrency: string, tripCurrency: string): string => {
  return `${sourceCurrency.trim().toUpperCase()}->${tripCurrency.trim().toUpperCase()}`;
};

const getActiveMembersFromTrip = (
  trip: TravelTripPayload,
): TravelTripMemberPayload[] => {
  return trip.members.filter((member) => member.status === "active");
};

const getEditableMembersForExpense = (
  trip: TravelTripPayload,
  expense: TravelTripExpensePayload,
): TravelTripMemberPayload[] => {
  const activeMembers = getActiveMembersFromTrip(trip);
  const historicalMemberIds = new Set<string>([
    expense.paidByMemberId,
    ...expense.splits.map((split) => split.memberId),
  ]);
  const activeMemberIds = new Set(activeMembers.map((member) => member.id));
  const allowedMemberIds = new Set<string>([
    ...activeMemberIds,
    ...historicalMemberIds,
  ]);

  const allowedMembers = trip.members.filter((member) =>
    allowedMemberIds.has(member.id),
  );
  if (allowedMembers.length > 0) {
    return allowedMembers;
  }

  return trip.members;
};

const getTripStatusLabel = (trip: TravelTripPayload, tr: (text: string) => string): string => {
  if (trip.status === "archived") {
    return tr("Archived");
  }

  if (trip.status === "closed") {
    return tr("Completed");
  }

  if (trip.status === "closing") {
    return tr("Finalizing");
  }

  return tr("Active");
};

const getTripListFilterLabel = (
  filter: TripListFilter,
  tr: (text: string) => string,
): string => {
  if (filter === "active") {
    return tr("Active");
  }
  if (filter === "completed") {
    return tr("Completed");
  }
  if (filter === "archived") {
    return tr("Archived");
  }
  return tr("All");
};

const getTripWorkspaceLayerLabel = (
  layer: TripWorkspaceLayer,
  tr: (text: string) => string,
): string => {
  if (layer === "settlements") {
    return tr("Settlements");
  }

  if (layer === "history") {
    return tr("History");
  }

  return tr("Expenses");
};

const getReceiptListFilterLabel = (
  filter: ReceiptListFilter,
  tr: (text: string) => string,
): string => {
  if (filter === "attention") {
    return tr("Needs attention");
  }

  if (filter === "ready") {
    return tr("Ready");
  }

  if (filter === "processed") {
    return tr("Processed");
  }

  return tr("All");
};

const getReceiptDraftStatusLabel = (
  status: TravelReceiptDraftPayload["status"],
  tr: (text: string) => string,
): string => {
  if (status === "parsed") {
    return tr("Parsed");
  }

  if (status === "ocr_failed") {
    return tr("Needs retry");
  }

  if (status === "finalized") {
    return tr("Linked");
  }

  return tr("Draft");
};

const getReceiptFieldQualityLabel = (
  quality: TravelReceiptDraftPayload["ocrFieldQuality"][keyof TravelReceiptDraftPayload["ocrFieldQuality"]],
  tr: (text: string) => string,
): string => {
  if (quality === "high") {
    return tr("High confidence");
  }

  if (quality === "medium") {
    return tr("Medium confidence");
  }

  if (quality === "low") {
    return tr("Needs review");
  }

  return tr("Not detected");
};

const getReceiptFieldQualityClass = (
  quality: TravelReceiptDraftPayload["ocrFieldQuality"][keyof TravelReceiptDraftPayload["ocrFieldQuality"]],
): string => {
  if (quality === "high") {
    return "pc-status-pill-success";
  }

  if (quality === "medium") {
    return "";
  }

  if (quality === "low") {
    return "pc-status-pill-warning";
  }

  return "pc-status-pill-error";
};

const getReceiptDraftNextActionLabel = (
  receiptDraft: TravelReceiptDraftPayload,
  tr: (text: string) => string,
): string => {
  if (receiptDraft.status === "finalized") {
    return tr("Receipt is already linked to expense. Open linked expense for final review.");
  }

  if (receiptDraft.status === "parsed") {
    return tr("Review OCR fields and apply to expense form.");
  }

  if (receiptDraft.status === "ocr_failed") {
    return tr("Replace photo for better quality or run OCR again.");
  }

  return tr("Run OCR prefill now or keep this draft for later.");
};

const derivePrefillReviewFields = (
  receiptDraft: TravelReceiptDraftPayload,
): ReceiptPrefillField[] => {
  const fields: ReceiptPrefillField[] = [];
  const addUnique = (field: ReceiptPrefillField) => {
    if (!fields.includes(field)) {
      fields.push(field);
    }
  };

  if (
    receiptDraft.ocrFieldQuality.sourceAmount === "low" ||
    receiptDraft.ocrFieldQuality.sourceAmount === "missing"
  ) {
    addUnique("amount");
  }

  if (
    receiptDraft.ocrFieldQuality.sourceCurrency === "low" ||
    receiptDraft.ocrFieldQuality.sourceCurrency === "missing"
  ) {
    addUnique("expenseCurrency");
  }

  if (
    receiptDraft.ocrFieldQuality.conversionRate === "low" ||
    receiptDraft.ocrFieldQuality.conversionRate === "missing"
  ) {
    addUnique("conversionRate");
  }

  if (
    receiptDraft.ocrFieldQuality.spentAt === "low" ||
    receiptDraft.ocrFieldQuality.spentAt === "missing"
  ) {
    addUnique("spentAt");
  }

  if (
    receiptDraft.ocrFieldQuality.description === "low" ||
    receiptDraft.ocrFieldQuality.description === "missing" ||
    receiptDraft.ocrFieldQuality.merchant === "low" ||
    receiptDraft.ocrFieldQuality.merchant === "missing"
  ) {
    addUnique("description");
  }

  if (
    receiptDraft.ocrFieldQuality.category === "low" ||
    receiptDraft.ocrFieldQuality.category === "missing"
  ) {
    addUnique("category");
  }

  return fields;
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
    archivedAt: trip.archivedAt,
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
  const memberIds = getActiveMembersFromTrip(trip).map((member) => member.id);
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
    expenseCurrency:
      defaults?.expenseCurrency && /^[A-Z]{3}$/.test(defaults.expenseCurrency)
        ? defaults.expenseCurrency
        : trip.baseCurrency,
    conversionRate: defaults?.conversionRate && Number(defaults.conversionRate) > 0
      ? defaults.conversionRate
      : "1",
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
  const memberIds = getEditableMembersForExpense(trip, expense).map(
    (member) => member.id,
  );
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
    amount: expense.sourceAmount.toFixed(2),
    expenseCurrency: expense.sourceCurrency,
    conversionRate:
      expense.sourceCurrency === trip.baseCurrency
        ? "1"
        : formatRateInputValue(expense.conversionRate),
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

const createExpenseDraftFromReceiptSuggestion = (params: {
  trip: TravelTripPayload;
  currentDraft: ExpenseDraft;
  receiptDraft: TravelReceiptDraftPayload;
}): ExpenseDraft => {
  const memberIds = getActiveMembersFromTrip(params.trip).map((member) => member.id);
  const firstMemberId = memberIds[0] ?? "";
  const currentSplitMode = params.currentDraft.splitMode;

  const sourceCurrency =
    params.receiptDraft.ocrSuggestedCurrency ?? params.trip.baseCurrency;
  const sourceAmount = params.receiptDraft.ocrSuggestedAmount;
  const suggestedRate = params.receiptDraft.ocrSuggestedConversionRate;
  const nextConversionRate =
    sourceCurrency === params.trip.baseCurrency
      ? "1"
      : suggestedRate && suggestedRate > 0
        ? formatRateInputValue(suggestedRate)
        : params.currentDraft.conversionRate || "1";

  return {
    ...params.currentDraft,
    amount: sourceAmount && sourceAmount > 0 ? sourceAmount.toFixed(2) : "",
    expenseCurrency: sourceCurrency,
    conversionRate: nextConversionRate,
    description:
      params.receiptDraft.ocrSuggestedDescription ??
      params.receiptDraft.ocrSuggestedMerchant ??
      params.currentDraft.description,
    category: params.receiptDraft.ocrSuggestedCategory ?? params.currentDraft.category,
    spentAt: params.receiptDraft.ocrSuggestedSpentAt
      ? toDateInputValue(params.receiptDraft.ocrSuggestedSpentAt)
      : params.currentDraft.spentAt,
    paidByMemberId: memberIds.includes(params.currentDraft.paidByMemberId)
      ? params.currentDraft.paidByMemberId
      : firstMemberId,
    selectedMemberIds:
      currentSplitMode === "equal_selected" && params.currentDraft.selectedMemberIds.length > 0
        ? params.currentDraft.selectedMemberIds.filter((memberId) =>
            memberIds.includes(memberId),
          )
        : memberIds,
  };
};

export function TravelGroupExpensesSection({
  workspace,
  profile,
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
  const [isCreatingReceiptDraft, setIsCreatingReceiptDraft] = useState(false);
  const [isParsingReceiptDraftId, setIsParsingReceiptDraftId] = useState<string | null>(
    null,
  );
  const [isDeletingReceiptDraftId, setIsDeletingReceiptDraftId] = useState<string | null>(
    null,
  );
  const [isResettingReceiptDraftId, setIsResettingReceiptDraftId] = useState<string | null>(
    null,
  );
  const [isReplacingReceiptDraftId, setIsReplacingReceiptDraftId] = useState<string | null>(
    null,
  );
  const [replaceReceiptDraftId, setReplaceReceiptDraftId] = useState<string | null>(
    null,
  );
  const [isClosureMutating, setIsClosureMutating] = useState(false);
  const [isSettlementMutatingId, setIsSettlementMutatingId] = useState<string | null>(
    null,
  );
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isMutatingMemberId, setIsMutatingMemberId] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isJoiningInvite, setIsJoiningInvite] = useState(false);
  const [joinInviteTokenInput, setJoinInviteTokenInput] = useState("");
  const [activeTripInvite, setActiveTripInvite] =
    useState<TravelTripInvitePayload | null>(null);
  const [inviteCopyState, setInviteCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [allowCloseWithUnsettledConfirm, setAllowCloseWithUnsettledConfirm] =
    useState(false);
  const [allowArchiveTripConfirm, setAllowArchiveTripConfirm] = useState(false);
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [tripListFilter, setTripListFilter] = useState<TripListFilter>("active");
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTripOverviewModalOpen, setIsTripOverviewModalOpen] = useState(false);
  const [isTripLifecycleModalOpen, setIsTripLifecycleModalOpen] = useState(false);
  const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(false);
  const [isReceiptPanelOpen, setIsReceiptPanelOpen] = useState(false);
  const [isExpenseFormPanelOpen, setIsExpenseFormPanelOpen] = useState(false);
  const [receiptListFilter, setReceiptListFilter] =
    useState<ReceiptListFilter>("attention");
  const [tripWorkspaceLayer, setTripWorkspaceLayer] =
    useState<TripWorkspaceLayer>("expenses");
  const [activeReceiptReviewId, setActiveReceiptReviewId] = useState<string | null>(
    null,
  );
  const [isReceiptRawTextModalOpen, setIsReceiptRawTextModalOpen] = useState(false);
  const [highlightedExpenseId, setHighlightedExpenseId] = useState<string | null>(
    null,
  );
  const [fxRateMemoryByPair, setFxRateMemoryByPair] = useState<
    Record<string, TravelFxRateMemorySnapshot>
  >({});

  const [tripTitle, setTripTitle] = useState("");
  const [tripCurrency, setTripCurrency] = useState("RUB");
  const [tripDescription, setTripDescription] = useState("");
  const [tripMembersInput, setTripMembersInput] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [linkNewMemberToCurrentProfile, setLinkNewMemberToCurrentProfile] =
    useState(false);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(defaultExpenseDraft);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [attachedReceiptDraftId, setAttachedReceiptDraftId] = useState<string | null>(
    null,
  );
  const [prefillReviewFields, setPrefillReviewFields] = useState<ReceiptPrefillField[]>(
    [],
  );
  const [expenseHistorySort, setExpenseHistorySort] = useState<"newest" | "highest">(
    "newest",
  );
  const tripTitleInputRef = useRef<HTMLInputElement | null>(null);
  const joinInviteInputRef = useRef<HTMLInputElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const createReceiptInputRef = useRef<HTMLInputElement | null>(null);
  const replaceReceiptInputRef = useRef<HTMLInputElement | null>(null);
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
          expenseCurrency:
            typeof typed.expenseCurrency === "string" &&
            /^[A-Z]{3}$/.test(typed.expenseCurrency)
              ? typed.expenseCurrency
              : "",
          conversionRate:
            typeof typed.conversionRate === "string" && Number(typed.conversionRate) > 0
              ? typed.conversionRate
              : "1",
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

  const writeFxRateMemoryForPair = useCallback(
    (params: {
      sourceCurrency: string;
      tripCurrency: string;
      conversionRate: number;
    }) => {
      if (typeof window === "undefined" || !workspaceId) {
        return;
      }

      const sourceCurrency = params.sourceCurrency.trim().toUpperCase();
      const tripCurrency = params.tripCurrency.trim().toUpperCase();
      if (
        !/^[A-Z]{3}$/.test(sourceCurrency) ||
        !/^[A-Z]{3}$/.test(tripCurrency) ||
        sourceCurrency === tripCurrency ||
        !Number.isFinite(params.conversionRate) ||
        params.conversionRate <= 0
      ) {
        return;
      }

      const pairKey = getTravelFxPairKey(sourceCurrency, tripCurrency);
      const entry: TravelFxRateMemorySnapshot = {
        sourceCurrency,
        tripCurrency,
        conversionRate: formatRateInputValue(params.conversionRate),
        updatedAt: new Date().toISOString(),
      };

      setFxRateMemoryByPair((current) => ({
        ...current,
        [pairKey]: entry,
      }));

      try {
        const raw = window.localStorage.getItem(TRAVEL_FX_RATE_MEMORY_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        parsed[`${workspaceId}:${pairKey}`] = entry;

        const workspaceEntries = Object.entries(parsed)
          .filter(([key]) => key.startsWith(`${workspaceId}:`))
          .map(([key, value]) => {
            const typed = value as Partial<TravelFxRateMemorySnapshot>;
            const updatedAt =
              typeof typed.updatedAt === "string" ? typed.updatedAt : "";
            return { key, updatedAt };
          })
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

        if (workspaceEntries.length > TRAVEL_FX_RATE_MEMORY_MAX_PER_WORKSPACE) {
          for (const overflow of workspaceEntries.slice(TRAVEL_FX_RATE_MEMORY_MAX_PER_WORKSPACE)) {
            delete parsed[overflow.key];
          }
        }

        window.localStorage.setItem(
          TRAVEL_FX_RATE_MEMORY_STORAGE_KEY,
          JSON.stringify(parsed),
        );
      } catch {
        // Ignore storage write errors in restricted environments.
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !workspaceId) {
      setFxRateMemoryByPair({});
      return;
    }

    try {
      const raw = window.localStorage.getItem(TRAVEL_FX_RATE_MEMORY_STORAGE_KEY);
      if (!raw) {
        setFxRateMemoryByPair({});
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next: Record<string, TravelFxRateMemorySnapshot> = {};
      const prefix = `${workspaceId}:`;

      for (const [key, value] of Object.entries(parsed)) {
        if (!key.startsWith(prefix) || !value || typeof value !== "object") {
          continue;
        }

        const typed = value as Partial<TravelFxRateMemorySnapshot>;
        const sourceCurrency =
          typeof typed.sourceCurrency === "string"
            ? typed.sourceCurrency.trim().toUpperCase()
            : "";
        const tripCurrency =
          typeof typed.tripCurrency === "string"
            ? typed.tripCurrency.trim().toUpperCase()
            : "";
        const conversionRateRaw =
          typeof typed.conversionRate === "string"
            ? typed.conversionRate
            : String(typed.conversionRate ?? "");
        const conversionRate = Number(conversionRateRaw);
        const updatedAt =
          typeof typed.updatedAt === "string" ? typed.updatedAt : "";
        if (
          !/^[A-Z]{3}$/.test(sourceCurrency) ||
          !/^[A-Z]{3}$/.test(tripCurrency) ||
          sourceCurrency === tripCurrency ||
          !Number.isFinite(conversionRate) ||
          conversionRate <= 0 ||
          !updatedAt
        ) {
          continue;
        }

        const pairKey = getTravelFxPairKey(sourceCurrency, tripCurrency);
        next[pairKey] = {
          sourceCurrency,
          tripCurrency,
          conversionRate: formatRateInputValue(conversionRate),
          updatedAt,
        };
      }

      setFxRateMemoryByPair(next);
    } catch {
      setFxRateMemoryByPair({});
    }
  }, [workspaceId]);

  const isExpenseSaveInProgress = isCreatingExpense || isUpdatingExpense;
  const isEditingExpense = editingExpenseId !== null;
  const isTripEditable = selectedTrip?.status === "active";
  const inactiveTripMembers = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelTripMemberPayload[];
    }

    return selectedTrip.members.filter((member) => member.status === "inactive");
  }, [selectedTrip]);
  const editingExpenseSnapshot = useMemo(() => {
    if (!selectedTrip || !editingExpenseId) {
      return null;
    }

    return (
      selectedTrip.recentExpenses.find((expense) => expense.id === editingExpenseId) ??
      null
    );
  }, [editingExpenseId, selectedTrip]);
  const expenseFormMembers = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelTripMemberPayload[];
    }

    if (editingExpenseSnapshot) {
      return getEditableMembersForExpense(selectedTrip, editingExpenseSnapshot);
    }

    return getActiveMembersFromTrip(selectedTrip);
  }, [editingExpenseSnapshot, selectedTrip]);
  const expenseFormMemberIds = useMemo(
    () => new Set(expenseFormMembers.map((member) => member.id)),
    [expenseFormMembers],
  );
  const buildManualSplitsFromDraft = useCallback(
    (): Array<{ memberId: string; amount: number }> => {
      return expenseFormMembers
        .map((member) => ({
          memberId: member.id,
          amount: Number(expenseDraft.manualSharesByMemberId[member.id] ?? ""),
        }))
        .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0);
    },
    [expenseDraft.manualSharesByMemberId, expenseFormMembers],
  );
  const orderedTripMembers = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelTripMemberPayload[];
    }

    return [...selectedTrip.members].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === "organizer" ? -1 : 1;
      }

      if (left.status !== right.status) {
        return left.status === "active" ? -1 : 1;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
  }, [selectedTrip]);
  const currentProfileMember = useMemo(() => {
    if (!selectedTrip || !profile) {
      return null;
    }

    return (
      selectedTrip.members.find((member) => member.profileId === profile.id) ?? null
    );
  }, [profile, selectedTrip]);
  const joinedTripMembers = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelTripMemberPayload[];
    }

    return selectedTrip.members.filter((member) => member.profileId !== null);
  }, [selectedTrip]);
  const localOnlyTripMembers = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelTripMemberPayload[];
    }

    return selectedTrip.members.filter((member) => member.profileId === null);
  }, [selectedTrip]);
  const canManageTripInvite = useMemo(() => {
    if (!selectedTrip || !profile || selectedTrip.status !== "active") {
      return false;
    }

    if (selectedTrip.createdByProfileId === profile.id) {
      return true;
    }

    return currentProfileMember?.role === "organizer";
  }, [currentProfileMember?.role, profile, selectedTrip]);
  const selectedTripIdForInvite = selectedTrip?.id ?? null;
  const normalizedExpenseCurrency = expenseDraft.expenseCurrency.trim().toUpperCase();
  const isCrossCurrencyDraft =
    !!selectedTrip &&
    !!normalizedExpenseCurrency &&
    normalizedExpenseCurrency !== selectedTrip.baseCurrency;
  const normalizedAmountPreview = useMemo(() => {
    if (!selectedTrip) {
      return null;
    }

    const amount = Number(expenseDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    if (!/^[A-Z]{3}$/.test(normalizedExpenseCurrency)) {
      return null;
    }

    const conversionRate =
      expenseDraft.conversionRate.trim().length > 0
        ? Number(expenseDraft.conversionRate)
        : null;
    const normalized = normalizeTravelExpenseAmount({
      sourceAmount: amount,
      sourceCurrency: normalizedExpenseCurrency,
      tripCurrency: selectedTrip.baseCurrency,
      conversionRate:
        conversionRate !== null && Number.isFinite(conversionRate)
          ? conversionRate
          : null,
    });

    if (!normalized.ok) {
      return null;
    }

    return normalized.data;
  }, [
    expenseDraft.amount,
    expenseDraft.conversionRate,
    normalizedExpenseCurrency,
    selectedTrip,
  ]);
  const currentFxPairKey = useMemo(() => {
    if (!selectedTrip || !isCrossCurrencyDraft) {
      return "";
    }

    return getTravelFxPairKey(normalizedExpenseCurrency, selectedTrip.baseCurrency);
  }, [isCrossCurrencyDraft, normalizedExpenseCurrency, selectedTrip]);
  const rememberedFxRate = useMemo(() => {
    if (!currentFxPairKey) {
      return null;
    }

    return fxRateMemoryByPair[currentFxPairKey] ?? null;
  }, [currentFxPairKey, fxRateMemoryByPair]);
  const recentFxRateSuggestions = useMemo(() => {
    if (!selectedTrip || !isCrossCurrencyDraft) {
      return [] as TravelFxRateSuggestion[];
    }

    const seen = new Set<string>();
    const suggestions: TravelFxRateSuggestion[] = [];
    const sortedByRecent = [...selectedTrip.recentExpenses].sort((left, right) => {
      if (left.spentAt !== right.spentAt) {
        return right.spentAt.localeCompare(left.spentAt);
      }

      return right.createdAt.localeCompare(left.createdAt);
    });

    for (const expense of sortedByRecent) {
      if (
        expense.sourceCurrency !== normalizedExpenseCurrency ||
        expense.currency !== selectedTrip.baseCurrency ||
        !Number.isFinite(expense.conversionRate) ||
        expense.conversionRate <= 0
      ) {
        continue;
      }

      const rateValue = formatRateInputValue(expense.conversionRate);
      if (seen.has(rateValue)) {
        continue;
      }

      seen.add(rateValue);
      suggestions.push({
        key: `${expense.id}:${rateValue}`,
        conversionRate: rateValue,
        updatedAt: expense.spentAt,
        source: "recent",
      });
      if (suggestions.length >= 3) {
        break;
      }
    }

    return suggestions;
  }, [isCrossCurrencyDraft, normalizedExpenseCurrency, selectedTrip]);
  const fxRateSuggestions = useMemo(() => {
    const next: TravelFxRateSuggestion[] = [];
    const seenRates = new Set<string>();

    if (rememberedFxRate) {
      seenRates.add(rememberedFxRate.conversionRate);
      next.push({
        key: "memory",
        conversionRate: rememberedFxRate.conversionRate,
        updatedAt: rememberedFxRate.updatedAt,
        source: "memory",
      });
    }

    for (const suggestion of recentFxRateSuggestions) {
      if (seenRates.has(suggestion.conversionRate)) {
        continue;
      }

      seenRates.add(suggestion.conversionRate);
      next.push(suggestion);
    }

    return next.slice(0, 4);
  }, [recentFxRateSuggestions, rememberedFxRate]);

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

  const settlementTotalStepCount = useMemo(() => {
    if (!selectedTrip) {
      return 0;
    }

    return (
      selectedTrip.summary.unsettledSettlementCount +
      selectedTrip.summary.settledSettlementCount
    );
  }, [selectedTrip]);

  const settlementProgressPercent = useMemo(() => {
    if (!selectedTrip) {
      return 0;
    }

    if (settlementTotalStepCount === 0) {
      return 100;
    }

    return Math.round(
      (selectedTrip.summary.settledSettlementCount / settlementTotalStepCount) *
        100,
    );
  }, [selectedTrip, settlementTotalStepCount]);

  const receiptDrafts = useMemo(() => {
    if (!selectedTrip) {
      return [] as TravelReceiptDraftPayload[];
    }

    return selectedTrip.receiptDrafts;
  }, [selectedTrip]);

  const pendingReceiptDraftCount = useMemo(() => {
    return receiptDrafts.filter((draft) => draft.status !== "finalized").length;
  }, [receiptDrafts]);

  const receiptFilterCounts = useMemo(() => {
    const counts: Record<ReceiptListFilter, number> = {
      attention: 0,
      ready: 0,
      processed: 0,
      all: receiptDrafts.length,
    };

    for (const draft of receiptDrafts) {
      if (draft.status === "finalized") {
        counts.processed += 1;
        continue;
      }

      if (draft.status === "parsed") {
        counts.ready += 1;
        continue;
      }

      counts.attention += 1;
    }

    return counts;
  }, [receiptDrafts]);

  const filteredReceiptDrafts = useMemo(() => {
    if (receiptListFilter === "all") {
      return receiptDrafts;
    }

    if (receiptListFilter === "processed") {
      return receiptDrafts.filter((draft) => draft.status === "finalized");
    }

    if (receiptListFilter === "ready") {
      return receiptDrafts.filter((draft) => draft.status === "parsed");
    }

    return receiptDrafts.filter(
      (draft) => draft.status === "draft" || draft.status === "ocr_failed",
    );
  }, [receiptDrafts, receiptListFilter]);

  const tripFilterCounts = useMemo(() => {
    const counts: Record<TripListFilter, number> = {
      active: 0,
      completed: 0,
      archived: 0,
      all: trips.length,
    };

    for (const trip of trips) {
      if (trip.status === "archived") {
        counts.archived += 1;
        continue;
      }

      if (trip.status === "closed") {
        counts.completed += 1;
        continue;
      }

      counts.active += 1;
    }

    return counts;
  }, [trips]);

  const filteredTrips = useMemo(() => {
    if (tripListFilter === "all") {
      return trips;
    }

    if (tripListFilter === "archived") {
      return trips.filter((trip) => trip.status === "archived");
    }

    if (tripListFilter === "completed") {
      return trips.filter((trip) => trip.status === "closed");
    }

    return trips.filter(
      (trip) => trip.status === "active" || trip.status === "closing",
    );
  }, [tripListFilter, trips]);

  const attachedReceiptDraft = useMemo(() => {
    if (!attachedReceiptDraftId) {
      return null;
    }

    return receiptDrafts.find((draft) => draft.id === attachedReceiptDraftId) ?? null;
  }, [attachedReceiptDraftId, receiptDrafts]);

  const prefillReviewFieldSet = useMemo(
    () => new Set(prefillReviewFields),
    [prefillReviewFields],
  );

  const prefillReviewSummary = useMemo(() => {
    if (prefillReviewFields.length === 0) {
      return "";
    }

    const labels = prefillReviewFields.map((field) => {
      if (field === "amount") {
        return tr("Amount");
      }
      if (field === "expenseCurrency") {
        return tr("Expense currency");
      }
      if (field === "conversionRate") {
        return tr("Conversion rate");
      }
      if (field === "spentAt") {
        return tr("Expense date");
      }
      if (field === "description") {
        return tr("Description");
      }
      return tr("Category");
    });

    return labels.join(", ");
  }, [prefillReviewFields, tr]);

  const finalizedReceiptByExpenseId = useMemo(() => {
    const next = new Map<string, TravelReceiptDraftPayload>();
    for (const receiptDraft of receiptDrafts) {
      if (receiptDraft.status === "finalized" && receiptDraft.finalizedExpenseId) {
        next.set(receiptDraft.finalizedExpenseId, receiptDraft);
      }
    }

    return next;
  }, [receiptDrafts]);

  const activeReceiptReview = useMemo(() => {
    if (!activeReceiptReviewId) {
      return null;
    }

    return receiptDrafts.find((draft) => draft.id === activeReceiptReviewId) ?? null;
  }, [activeReceiptReviewId, receiptDrafts]);

  useEffect(() => {
    if (!activeReceiptReviewId) {
      setIsReceiptRawTextModalOpen(false);
    }
  }, [activeReceiptReviewId]);

  const linkedExpenseForActiveReceipt = useMemo(() => {
    if (!selectedTrip || !activeReceiptReview?.finalizedExpenseId) {
      return null;
    }

    return (
      selectedTrip.recentExpenses.find(
        (expense) => expense.id === activeReceiptReview.finalizedExpenseId,
      ) ?? null
    );
  }, [activeReceiptReview, selectedTrip]);

  const focusExpenseForm = useCallback(() => {
    setTripWorkspaceLayer("expenses");
    setIsExpenseFormPanelOpen(true);

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      });
    });
  }, []);

  const resetExpenseDraftToDefaults = useCallback(
    (trip: TravelTripPayload) => {
      const defaults = readExpenseDefaultsForTrip(trip.id);
      setExpenseDraft(createExpenseDraftFromDefaults(trip, defaults));
      setPrefillReviewFields([]);
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

    const cachedTripsList = readCachedTravelTripsList(workspaceId);
    const hasCachedSnapshot = Boolean(cachedTripsList);

    if (cachedTripsList) {
      setTrips(cachedTripsList.value.trips);
    }

    setIsTripsLoading(!hasCachedSnapshot);
    setFeedback(null);

    try {
      const result = await listTravelTrips(initData);
      if (!result.ok) {
        if (!hasCachedSnapshot) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          setTrips([]);
          setSelectedTripId(null);
          setSelectedTrip(null);
        }
        return;
      }

      setTrips(result.trips);
      writeCachedTravelTripsList(workspaceId, { trips: result.trips });
      setSelectedTripId((current) => {
        if (current && result.trips.some((trip) => trip.id === current)) {
          return current;
        }

        return null;
      });
    } catch {
      if (!hasCachedSnapshot) {
        setFeedbackTone("error");
        setFeedback(tr("Failed to load travel trips."));
        setTrips([]);
        setSelectedTripId(null);
        setSelectedTrip(null);
      }
    } finally {
      setIsTripsLoading(false);
    }
  }, [workspaceId, workspaceUnavailable, initData, tr]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    if (selectedTripId === null) {
      return;
    }

    if (trips.length === 0 || filteredTrips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    if (!filteredTrips.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId(null);
    }
  }, [filteredTrips, selectedTripId, trips]);

  useEffect(() => {
    if (!selectedTripId || !workspaceId || workspaceUnavailable) {
      setSelectedTrip(null);
      return;
    }

    const tripId = selectedTripId;
    let isCancelled = false;

    const loadDetail = async () => {
      const cachedTripDetail = readCachedTravelTripDetail(workspaceId, tripId);
      const hasCachedSnapshot = Boolean(cachedTripDetail);
      if (cachedTripDetail) {
        setSelectedTrip(cachedTripDetail.value.trip);
        setTrips((current) => mergeTripListWithDetail(current, cachedTripDetail.value.trip));
      }

      setIsTripLoading(!hasCachedSnapshot);
      try {
        const result = await readTravelTripDetail({
          initData,
          tripId,
        });
        if (!result.ok) {
          if (!isCancelled && !hasCachedSnapshot) {
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
        writeCachedTravelTripDetail(workspaceId, tripId, { trip: result.trip });
      } catch {
        if (!isCancelled && !hasCachedSnapshot) {
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
  }, [selectedTripId, initData, workspaceId, workspaceUnavailable, tr]);

  const refreshSelectedTripSnapshot = useCallback(
    async (tripId: string) => {
      if (!workspaceId || workspaceUnavailable) {
        return;
      }

      try {
        const result = await readTravelTripDetail({
          initData,
          tripId,
        });

        if (!result.ok) {
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        writeCachedTravelTripDetail(workspaceId, tripId, { trip: result.trip });
      } catch {
        // Ignore refresh errors after optimistic failure paths.
      }
    },
    [initData, workspaceId, workspaceUnavailable],
  );

  useEffect(() => {
    if (!selectedTripIdForInvite || !canManageTripInvite) {
      setActiveTripInvite(null);
      setIsLoadingInvite(false);
      return;
    }

    let isCancelled = false;
    const tripId = selectedTripIdForInvite;

    const readInvite = async () => {
      setIsLoadingInvite(true);
      try {
        const result = await readTravelTripInvite({
          initData,
          tripId,
        });

        if (isCancelled) {
          return;
        }

        if (!result.ok) {
          setActiveTripInvite(null);
          setInviteCopyState("idle");
          if (result.error.code !== "TRAVEL_INVITE_FORBIDDEN") {
            setFeedbackTone("error");
            setFeedback(result.error.message);
          }
          return;
        }

        setActiveTripInvite(result.invite);
        setInviteCopyState("idle");
        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
      } catch {
        if (!isCancelled) {
          setActiveTripInvite(null);
          setInviteCopyState("idle");
          setFeedbackTone("error");
          setFeedback(tr("Failed to load trip invite status."));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingInvite(false);
        }
      }
    };

    void readInvite();

    return () => {
      isCancelled = true;
    };
  }, [canManageTripInvite, initData, selectedTripIdForInvite, tr]);

  useEffect(() => {
    if (!selectedTrip || selectedTrip.members.length === 0) {
      setEditingExpenseId(null);
      setEditingMemberId(null);
      setEditingMemberName("");
      setNewMemberName("");
      setLinkNewMemberToCurrentProfile(false);
      setPendingDeleteExpenseId(null);
      setAllowCloseWithUnsettledConfirm(false);
      setAllowArchiveTripConfirm(false);
      setAttachedReceiptDraftId(null);
      setPrefillReviewFields([]);
      setActiveReceiptReviewId(null);
      setIsReceiptRawTextModalOpen(false);
      setHighlightedExpenseId(null);
      setActiveTripInvite(null);
      setInviteCopyState("idle");
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
      setAttachedReceiptDraftId(null);
      setPrefillReviewFields([]);
      return;
    }

    if (
      editingMemberId &&
      !selectedTrip.members.some((member) => member.id === editingMemberId)
    ) {
      setEditingMemberId(null);
      setEditingMemberName("");
    }

    if (
      attachedReceiptDraftId &&
      !selectedTrip.receiptDrafts.some((draft) => draft.id === attachedReceiptDraftId)
    ) {
      setAttachedReceiptDraftId(null);
      setPrefillReviewFields([]);
    }

    if (
      activeReceiptReviewId &&
      !selectedTrip.receiptDrafts.some((draft) => draft.id === activeReceiptReviewId)
    ) {
      setActiveReceiptReviewId(null);
    }

    if (attachedReceiptDraft?.status === "finalized") {
      setAttachedReceiptDraftId(null);
      setPrefillReviewFields([]);
    }

    setPendingDeleteExpenseId(null);
    setAllowCloseWithUnsettledConfirm(false);
    setAllowArchiveTripConfirm(false);
    resetExpenseDraftToDefaults(selectedTrip);
  }, [
    attachedReceiptDraft,
    attachedReceiptDraftId,
    activeReceiptReviewId,
    editingMemberId,
    editingExpenseId,
    resetExpenseDraftToDefaults,
    selectedTrip,
  ]);

  useEffect(() => {
    if (!isCreateTripModalOpen || typeof window === "undefined") {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      tripTitleInputRef.current?.focus();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isCreatingTrip) {
        return;
      }

      event.preventDefault();
      setIsCreateTripModalOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCreateTripModalOpen, isCreatingTrip]);

  useEffect(() => {
    if (!isJoinModalOpen || typeof window === "undefined") {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      joinInviteInputRef.current?.focus();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isJoiningInvite) {
        return;
      }

      event.preventDefault();
      setIsJoinModalOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isJoinModalOpen, isJoiningInvite]);

  useEffect(() => {
    setIsParticipantPanelOpen(false);
    setIsReceiptPanelOpen(false);
    setIsExpenseFormPanelOpen(false);
    setIsTripOverviewModalOpen(false);
    setIsTripLifecycleModalOpen(false);
    setIsJoinModalOpen(false);
    setTripWorkspaceLayer("expenses");
    setActiveReceiptReviewId(null);
    setHighlightedExpenseId(null);
  }, [selectedTripId]);

  useEffect(() => {
    if (!highlightedExpenseId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setHighlightedExpenseId(null);
    }, 7000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [highlightedExpenseId]);

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
      setTripWorkspaceLayer("expenses");
      setTripTitle("");
      setTripDescription("");
      setTripMembersInput("");
      setIsCreateTripModalOpen(false);
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

    const expenseCurrency = expenseDraft.expenseCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(expenseCurrency)) {
      setFeedbackTone("error");
      setFeedback(tr("Expense currency must be a 3-letter code."));
      return;
    }

    const conversionRateInput =
      expenseDraft.conversionRate.trim().length > 0
        ? Number(expenseDraft.conversionRate)
        : null;
    const normalizedAmount = normalizeTravelExpenseAmount({
      sourceAmount: amount,
      sourceCurrency: expenseCurrency,
      tripCurrency: selectedTrip.baseCurrency,
      conversionRate:
        conversionRateInput !== null && Number.isFinite(conversionRateInput)
          ? conversionRateInput
          : null,
    });
    if (!normalizedAmount.ok) {
      setFeedbackTone("error");
      setFeedback(tr(normalizedAmount.message));
      return;
    }

    if (!expenseFormMemberIds.has(expenseDraft.paidByMemberId)) {
      setFeedbackTone("error");
      setFeedback(tr("Expense payer must be active or already present in this expense history."));
      return;
    }

    const selectedMemberIds = expenseDraft.selectedMemberIds.filter((memberId) =>
      expenseFormMemberIds.has(memberId),
    );
    const fullAmountMemberId = expenseFormMemberIds.has(expenseDraft.fullAmountMemberId)
      ? expenseDraft.fullAmountMemberId
      : "";
    const manualSplits = buildManualSplitsFromDraft();
    const spentAtIso = expenseDraft.spentAt
      ? new Date(`${expenseDraft.spentAt}T12:00:00.000Z`).toISOString()
      : null;

    const payload = {
      initData,
      tripId: selectedTrip.id,
      amount,
      expenseCurrency: normalizedAmount.data.sourceCurrency,
      conversionRate: normalizedAmount.data.conversionRate,
      paidByMemberId: expenseDraft.paidByMemberId,
      description: expenseDraft.description,
      category: expenseDraft.category,
      splitMode: expenseDraft.splitMode,
      selectedMemberIds,
      fullAmountMemberId: fullAmountMemberId || null,
      manualSplits,
      spentAt: spentAtIso,
      receiptDraftId: !isEditingExpense ? attachedReceiptDraftId : null,
    };

    const defaultsSnapshot: TravelExpenseDefaultsSnapshot = {
      paidByMemberId: payload.paidByMemberId,
      expenseCurrency: payload.expenseCurrency,
      conversionRate: String(payload.conversionRate),
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
      writeFxRateMemoryForPair({
        sourceCurrency: payload.expenseCurrency,
        tripCurrency: result.trip.baseCurrency,
        conversionRate: payload.conversionRate,
      });
      setSelectedTrip(result.trip);
      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setEditingExpenseId(null);
      setPendingDeleteExpenseId(null);
      setAttachedReceiptDraftId(null);
      setPrefillReviewFields([]);
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
      setAttachedReceiptDraftId(null);
      setPrefillReviewFields([]);
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
    async (
      action: "start" | "close" | "reopen" | "archive" | "unarchive",
      allowUnsettled = false,
    ) => {
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
        setAllowArchiveTripConfirm(false);

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

        if (result.action === "archive") {
          setFeedback(tr("Trip moved to archive. It stays readable and can be restored later."));
          return;
        }

        if (result.action === "unarchive") {
          setFeedback(tr("Trip restored from archive to completed list."));
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
      setAllowArchiveTripConfirm,
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

  const openCreateReceiptPicker = useCallback(() => {
    if (
      !selectedTrip ||
      !isTripEditable ||
      isCreatingReceiptDraft ||
      isParsingReceiptDraftId !== null ||
      isDeletingReceiptDraftId !== null ||
      isResettingReceiptDraftId !== null ||
      isReplacingReceiptDraftId !== null
    ) {
      return;
    }

    createReceiptInputRef.current?.click();
  }, [
    isCreatingReceiptDraft,
    isDeletingReceiptDraftId,
    isParsingReceiptDraftId,
    isReplacingReceiptDraftId,
    isResettingReceiptDraftId,
    isTripEditable,
    selectedTrip,
  ]);

  const captureReceiptDraft = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const inputElement = event.currentTarget;
      const selectedFile = inputElement.files?.[0] ?? null;
      inputElement.value = "";

      if (
        !selectedTrip ||
        !selectedFile ||
        isCreatingReceiptDraft ||
        isParsingReceiptDraftId !== null ||
        isDeletingReceiptDraftId !== null ||
        isResettingReceiptDraftId !== null ||
        isReplacingReceiptDraftId !== null
      ) {
        return;
      }

      if (selectedTrip.status !== "active") {
        setFeedbackTone("error");
        setFeedback(tr("Trip is not active. Reopen trip editing to add new receipt drafts."));
        return;
      }

      setFeedback(null);
      setIsCreatingReceiptDraft(true);
      try {
        const result = await createTravelReceiptDraft({
          initData,
          tripId: selectedTrip.id,
          receiptImage: selectedFile,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setFeedbackTone("success");
        setFeedback(
          tr("Receipt draft saved. You can parse now or continue later."),
        );
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to save receipt draft."));
      } finally {
        setIsCreatingReceiptDraft(false);
      }
    },
    [
      initData,
      isCreatingReceiptDraft,
      isDeletingReceiptDraftId,
      isParsingReceiptDraftId,
      isReplacingReceiptDraftId,
      isResettingReceiptDraftId,
      selectedTrip,
      tr,
    ],
  );

  const parseReceiptDraft = useCallback(
    async (receiptDraftId: string) => {
      if (
        !selectedTrip ||
        isParsingReceiptDraftId ||
        isCreatingReceiptDraft ||
        isResettingReceiptDraftId ||
        isReplacingReceiptDraftId ||
        isDeletingReceiptDraftId
      ) {
        return;
      }

      setFeedback(null);
      setIsParsingReceiptDraftId(receiptDraftId);
      try {
        const result = await parseTravelReceiptDraft({
          initData,
          tripId: selectedTrip.id,
          receiptDraftId,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          void refreshSelectedTripSnapshot(selectedTrip.id);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setFeedbackTone("success");
        setFeedback(
          tr("OCR prefill is ready. Review fields before saving expense."),
        );
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to parse receipt draft."));
        void refreshSelectedTripSnapshot(selectedTrip.id);
      } finally {
        setIsParsingReceiptDraftId(null);
      }
    },
    [
      initData,
      isCreatingReceiptDraft,
      isDeletingReceiptDraftId,
      isParsingReceiptDraftId,
      isReplacingReceiptDraftId,
      isResettingReceiptDraftId,
      refreshSelectedTripSnapshot,
      selectedTrip,
      tr,
    ],
  );

  const resetReceiptDraftHints = useCallback(
    async (receiptDraftId: string) => {
      if (
        !selectedTrip ||
        isResettingReceiptDraftId ||
        isCreatingReceiptDraft ||
        isParsingReceiptDraftId ||
        isReplacingReceiptDraftId ||
        isDeletingReceiptDraftId
      ) {
        return;
      }

      if (selectedTrip.status !== "active") {
        setFeedbackTone("error");
        setFeedback(tr("Trip is not active. Reopen trip editing to manage receipt drafts."));
        return;
      }

      setFeedback(null);
      setIsResettingReceiptDraftId(receiptDraftId);
      try {
        const result = await parseTravelReceiptDraft({
          initData,
          tripId: selectedTrip.id,
          receiptDraftId,
          action: "reset",
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        if (attachedReceiptDraftId === receiptDraftId) {
          setAttachedReceiptDraftId(null);
          setPrefillReviewFields([]);
        }
        setFeedbackTone("success");
        setFeedback(tr("OCR hints were reset. You can parse again or continue manually."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to reset receipt OCR hints."));
      } finally {
        setIsResettingReceiptDraftId(null);
      }
    },
    [
      attachedReceiptDraftId,
      initData,
      isCreatingReceiptDraft,
      isDeletingReceiptDraftId,
      isParsingReceiptDraftId,
      isReplacingReceiptDraftId,
      isResettingReceiptDraftId,
      selectedTrip,
      tr,
    ],
  );

  const openReplaceReceiptImagePicker = useCallback(
    (receiptDraftId: string) => {
      if (
        !selectedTrip ||
        selectedTrip.status !== "active" ||
        isReplacingReceiptDraftId !== null ||
        isParsingReceiptDraftId !== null ||
        isCreatingReceiptDraft
      ) {
        return;
      }

      setReplaceReceiptDraftId(receiptDraftId);
      replaceReceiptInputRef.current?.click();
    },
    [
      isCreatingReceiptDraft,
      isParsingReceiptDraftId,
      isReplacingReceiptDraftId,
      selectedTrip,
    ],
  );

  const replaceReceiptDraftPhoto = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const inputElement = event.currentTarget;
      const selectedFile = inputElement.files?.[0] ?? null;
      inputElement.value = "";

      if (
        !selectedTrip ||
        selectedTrip.status !== "active" ||
        !replaceReceiptDraftId ||
        !selectedFile ||
        isReplacingReceiptDraftId !== null
      ) {
        if (!selectedFile) {
          setReplaceReceiptDraftId(null);
        }
        return;
      }

      setFeedback(null);
      setIsReplacingReceiptDraftId(replaceReceiptDraftId);
      try {
        const result = await replaceTravelReceiptDraftImage({
          initData,
          tripId: selectedTrip.id,
          receiptDraftId: replaceReceiptDraftId,
          receiptImage: selectedFile,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        if (attachedReceiptDraftId === replaceReceiptDraftId) {
          setAttachedReceiptDraftId(null);
          setPrefillReviewFields([]);
        }
        setFeedbackTone("success");
        setFeedback(tr("Receipt photo replaced. Run OCR again when ready."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to replace receipt draft photo."));
      } finally {
        setIsReplacingReceiptDraftId(null);
        setReplaceReceiptDraftId(null);
      }
    },
    [
      attachedReceiptDraftId,
      initData,
      isReplacingReceiptDraftId,
      replaceReceiptDraftId,
      selectedTrip,
      tr,
    ],
  );

  const applyReceiptPrefillToExpenseForm = useCallback(
    (receiptDraft: TravelReceiptDraftPayload) => {
      if (!selectedTrip || selectedTrip.status !== "active") {
        setFeedbackTone("error");
        setFeedback(tr("Trip is not active. Reopen trip editing to add or update expenses."));
        return;
      }

      if (receiptDraft.status === "finalized") {
        setFeedbackTone("info");
        setFeedback(tr("This receipt draft is already linked to saved expense."));
        return;
      }

      setEditingExpenseId(null);
      setPendingDeleteExpenseId(null);
      setAttachedReceiptDraftId(receiptDraft.id);
      setPrefillReviewFields(derivePrefillReviewFields(receiptDraft));
      setExpenseDraft((current) =>
        createExpenseDraftFromReceiptSuggestion({
          trip: selectedTrip,
          currentDraft: current,
          receiptDraft,
        }),
      );
      setFeedbackTone("info");
      setFeedback(
        tr("Receipt prefill applied. Confirm payer/split and save expense manually."),
      );
      focusExpenseForm();
    },
    [focusExpenseForm, selectedTrip, tr],
  );

  const deleteReceiptDraft = useCallback(
    async (receiptDraftId: string) => {
      if (
        !selectedTrip ||
        isDeletingReceiptDraftId ||
        isCreatingReceiptDraft ||
        isParsingReceiptDraftId ||
        isResettingReceiptDraftId ||
        isReplacingReceiptDraftId
      ) {
        return;
      }

      if (selectedTrip.status !== "active") {
        setFeedbackTone("error");
        setFeedback(tr("Trip is not active. Reopen trip editing to manage receipt drafts."));
        return;
      }

      setFeedback(null);
      setIsDeletingReceiptDraftId(receiptDraftId);
      try {
        const result = await deleteTravelReceiptDraft({
          initData,
          tripId: selectedTrip.id,
          receiptDraftId,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        if (attachedReceiptDraftId === receiptDraftId) {
          setAttachedReceiptDraftId(null);
          setPrefillReviewFields([]);
        }
        setFeedbackTone("success");
        setFeedback(tr("Receipt draft removed."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to delete receipt draft."));
      } finally {
        setIsDeletingReceiptDraftId(null);
      }
    },
    [
      attachedReceiptDraftId,
      initData,
      isCreatingReceiptDraft,
      isDeletingReceiptDraftId,
      isParsingReceiptDraftId,
      isReplacingReceiptDraftId,
      isResettingReceiptDraftId,
      selectedTrip,
      tr,
    ],
  );

  const addTripMember = useCallback(async () => {
    if (!selectedTrip || !isTripEditable || isAddingMember || isMutatingMemberId) {
      return;
    }

    const displayName = newMemberName.trim();
    if (!displayName) {
      setFeedbackTone("error");
      setFeedback(tr("Participant name is required and must be 80 characters or less."));
      return;
    }

    setFeedback(null);
    setIsAddingMember(true);
    try {
      const result = await createTravelTripMember({
        initData,
        tripId: selectedTrip.id,
        displayName,
        role: "participant",
        status: "active",
        linkToCurrentProfile: linkNewMemberToCurrentProfile,
      });

      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        return;
      }

      setSelectedTrip(result.trip);
      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setNewMemberName("");
      setLinkNewMemberToCurrentProfile(false);
      setFeedbackTone("success");
      setFeedback(tr("Participant added. They are active for new expenses now."));
    } catch {
      setFeedbackTone("error");
      setFeedback(tr("Failed to add participant to trip."));
    } finally {
      setIsAddingMember(false);
    }
  }, [
    initData,
    isAddingMember,
    isMutatingMemberId,
    isTripEditable,
    linkNewMemberToCurrentProfile,
    newMemberName,
    selectedTrip,
    tr,
  ]);

  const createTripInvite = useCallback(async () => {
    if (
      !selectedTrip ||
      !canManageTripInvite ||
      isCreatingInvite ||
      isJoiningInvite ||
      isLoadingInvite
    ) {
      return;
    }

    setFeedback(null);
    setIsCreatingInvite(true);
    setInviteCopyState("idle");
    try {
      const result = await createTravelTripInvite({
        initData,
        tripId: selectedTrip.id,
      });

      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        return;
      }

      setSelectedTrip(result.trip);
      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setActiveTripInvite(result.invite);
      setFeedbackTone("success");
      setFeedback(tr("Trip invite is ready. Share token so participants can join this trip."));
    } catch {
      setFeedbackTone("error");
      setFeedback(tr("Failed to create trip invite."));
    } finally {
      setIsCreatingInvite(false);
    }
  }, [
    canManageTripInvite,
    initData,
    isCreatingInvite,
    isJoiningInvite,
    isLoadingInvite,
    selectedTrip,
    tr,
  ]);

  const copyTripInviteToken = useCallback(async () => {
    if (!activeTripInvite) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setInviteCopyState("failed");
      setFeedbackTone("error");
      setFeedback(tr("Invite copy failed. Copy token manually."));
      return;
    }

    try {
      await navigator.clipboard.writeText(activeTripInvite.inviteToken);
      setInviteCopyState("copied");
      setFeedbackTone("success");
      setFeedback(tr("Invite token copied."));
    } catch {
      setInviteCopyState("failed");
      setFeedbackTone("error");
      setFeedback(tr("Invite copy failed. Copy token manually."));
    }
  }, [activeTripInvite, tr]);

  const joinTripViaInviteToken = useCallback(async () => {
    if (workspaceUnavailable || isJoiningInvite) {
      return;
    }

    const token = joinInviteTokenInput.trim();
    if (!token) {
      setFeedbackTone("error");
      setFeedback(tr("Invite token is empty or invalid."));
      return;
    }

    setFeedback(null);
    setIsJoiningInvite(true);
    try {
      const result = await joinTravelTripByInvite({
        initData,
        inviteToken: token,
      });

      if (!result.ok) {
        setFeedbackTone("error");
        setFeedback(result.error.message);
        return;
      }

      setJoinInviteTokenInput("");
      setIsJoinModalOpen(false);
      setSelectedTrip(result.trip);
      setSelectedTripId(result.trip.id);
      setTripWorkspaceLayer("expenses");
      setTrips((current) => mergeTripListWithDetail(current, result.trip));
      setTripListFilter("active");
      if (selectedTrip?.id === result.trip.id) {
        setActiveTripInvite(result.invite);
      }
      setFeedbackTone("success");
      setFeedback(
        tr(
          "Joined trip successfully. Participant is now linked to your profile in this workspace.",
        ),
      );
    } catch {
      setFeedbackTone("error");
      setFeedback(tr("Failed to join trip by invite token."));
    } finally {
      setIsJoiningInvite(false);
    }
  }, [initData, isJoiningInvite, joinInviteTokenInput, selectedTrip?.id, tr, workspaceUnavailable]);

  const startMemberRename = useCallback((member: TravelTripMemberPayload) => {
    setEditingMemberId(member.id);
    setEditingMemberName(member.displayName);
  }, []);

  const cancelMemberRename = useCallback(() => {
    setEditingMemberId(null);
    setEditingMemberName("");
  }, []);

  const saveMemberRename = useCallback(
    async (member: TravelTripMemberPayload) => {
      if (
        !selectedTrip ||
        !isTripEditable ||
        isMutatingMemberId ||
        isAddingMember
      ) {
        return;
      }

      const nextDisplayName = editingMemberName.trim();
      if (!nextDisplayName) {
        setFeedbackTone("error");
        setFeedback(tr("Participant name is required and must be 80 characters or less."));
        return;
      }

      if (nextDisplayName === member.displayName) {
        cancelMemberRename();
        return;
      }

      setFeedback(null);
      setIsMutatingMemberId(member.id);
      try {
        const result = await updateTravelTripMember({
          initData,
          tripId: selectedTrip.id,
          memberId: member.id,
          displayName: nextDisplayName,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setEditingMemberId(null);
        setEditingMemberName("");
        setFeedbackTone("success");
        setFeedback(tr("Participant name updated."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to update trip participant."));
      } finally {
        setIsMutatingMemberId(null);
      }
    },
    [
      cancelMemberRename,
      editingMemberName,
      initData,
      isAddingMember,
      isMutatingMemberId,
      isTripEditable,
      selectedTrip,
      tr,
    ],
  );

  const updateMemberStatus = useCallback(
    async (member: TravelTripMemberPayload, nextStatus: "active" | "inactive") => {
      if (
        !selectedTrip ||
        !isTripEditable ||
        isMutatingMemberId ||
        isAddingMember
      ) {
        return;
      }

      if (member.status === nextStatus) {
        return;
      }

      setFeedback(null);
      setIsMutatingMemberId(member.id);
      try {
        const result = await updateTravelTripMember({
          initData,
          tripId: selectedTrip.id,
          memberId: member.id,
          status: nextStatus,
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setFeedbackTone("success");
        setFeedback(
          tr(
            nextStatus === "inactive"
              ? "Participant moved out of new expenses. History stays intact."
              : "Participant is active for new expenses again.",
          ),
        );
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to update participant status."));
      } finally {
        setIsMutatingMemberId(null);
      }
    },
    [
      initData,
      isAddingMember,
      isMutatingMemberId,
      isTripEditable,
      selectedTrip,
      tr,
    ],
  );

  const promoteMemberToOrganizer = useCallback(
    async (member: TravelTripMemberPayload) => {
      if (
        !selectedTrip ||
        !isTripEditable ||
        isMutatingMemberId ||
        isAddingMember ||
        member.role === "organizer"
      ) {
        return;
      }

      setFeedback(null);
      setIsMutatingMemberId(member.id);
      try {
        const result = await updateTravelTripMember({
          initData,
          tripId: selectedTrip.id,
          memberId: member.id,
          role: "organizer",
          status: "active",
        });

        if (!result.ok) {
          setFeedbackTone("error");
          setFeedback(result.error.message);
          return;
        }

        setSelectedTrip(result.trip);
        setTrips((current) => mergeTripListWithDetail(current, result.trip));
        setFeedbackTone("success");
        setFeedback(tr("Organizer updated. Participant workflow now follows new organizer."));
      } catch {
        setFeedbackTone("error");
        setFeedback(tr("Failed to rotate organizer role for trip participants."));
      } finally {
        setIsMutatingMemberId(null);
      }
    },
    [
      initData,
      isAddingMember,
      isMutatingMemberId,
      isTripEditable,
      selectedTrip,
      tr,
    ],
  );

  const scrollToHistory = useCallback(() => {
    setTripWorkspaceLayer("history");

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        historySectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);

  const openLinkedExpenseFromReceipt = useCallback(
    (expenseId: string) => {
      if (!selectedTrip) {
        return;
      }

      const hasExpense = selectedTrip.recentExpenses.some(
        (expense) => expense.id === expenseId,
      );

      if (!hasExpense) {
        setFeedbackTone("error");
        setFeedback(tr("Linked expense is no longer available in current trip history."));
        return;
      }

      setExpenseHistorySort("newest");
      setHighlightedExpenseId(expenseId);
      setActiveReceiptReviewId(null);
      scrollToHistory();
      setFeedbackTone("info");
      setFeedback(tr("Opened linked expense in trip history."));
    },
    [scrollToHistory, selectedTrip, tr],
  );

  const toggleSelectedMember = (memberId: string) => {
    if (!expenseFormMemberIds.has(memberId)) {
      return;
    }

    setExpenseDraft((current) => {
      const isSelected = current.selectedMemberIds.includes(memberId);
      return {
        ...current,
        selectedMemberIds: isSelected
          ? current.selectedMemberIds.filter((id) => id !== memberId)
          : [...current.selectedMemberIds, memberId].filter((id) =>
              expenseFormMemberIds.has(id),
            ),
      };
    });
  };

  const clearPrefillReviewField = useCallback((field: ReceiptPrefillField) => {
    setPrefillReviewFields((current) => current.filter((item) => item !== field));
  }, []);

  const applyFxRateSuggestion = useCallback(
    (conversionRate: string, source: "memory" | "recent") => {
      clearPrefillReviewField("conversionRate");
      setExpenseDraft((current) => ({
        ...current,
        conversionRate,
      }));
      setFeedbackTone("info");
      setFeedback(
        tr(
          source === "memory"
            ? "Last saved FX rate applied. Review and save manually."
            : "Recent FX rate applied. Review and save manually.",
        ),
      );
    },
    [clearPrefillReviewField, tr],
  );

  const createTripModal =
    typeof document !== "undefined" && isCreateTripModalOpen
      ? createPortal(
          <div
            className="pc-modal-overlay pc-modal-overlay-sheet z-[90]"
            onClick={() => {
              if (!isCreatingTrip) {
                setIsCreateTripModalOpen(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr("Create trip")}
              className="pc-modal-dialog w-full max-w-lg p-3 sm:p-3.5"
              style={{
                maxHeight:
                  "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pc-modal-sheet-head">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pc-kicker">
                      <AppIcon name="travel" className="h-3.5 w-3.5" />
                      {tr("Travel groups")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {tr("Create trip")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateTripModalOpen(false)}
                    disabled={isCreatingTrip}
                    aria-label={tr("Close form")}
                    className="pc-icon-btn disabled:opacity-60"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d="M6 6l12 12" />
                      <path d="M18 6l-12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Keep it short: trip name, base currency, participants, and start.")}
                </p>
              </div>

              <form className="mt-2 space-y-2" onSubmit={submitTripCreate}>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-app-text">{tr("Trip name")}</p>
                  <input
                    ref={tripTitleInputRef}
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
                        setTripCurrency(
                          event.target.value
                            .replace(/[^A-Za-z]/g, "")
                            .slice(0, 3)
                            .toUpperCase(),
                        )
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
                <div className="pc-modal-sheet-foot mt-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isCreatingTrip}
                      className="pc-btn-primary grow"
                    >
                      <AppIcon name="add" className="h-4 w-4" />
                      {isCreatingTrip ? tr("Creating...") : tr("Create trip")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateTripModalOpen(false)}
                      disabled={isCreatingTrip}
                      className="pc-btn-secondary"
                    >
                      {tr("Cancel")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  const joinTripModal =
    typeof document !== "undefined" && isJoinModalOpen
      ? createPortal(
          <div
            className="pc-modal-overlay pc-modal-overlay-sheet z-[92]"
            onClick={() => {
              if (!isJoiningInvite) {
                setIsJoinModalOpen(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr("Join shared trip")}
              className="pc-modal-dialog w-full max-w-lg p-3 sm:p-3.5"
              style={{
                maxHeight:
                  "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pc-modal-sheet-head">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pc-kicker">
                      <AppIcon name="workspace" className="h-3.5 w-3.5" />
                      {tr("Travel groups")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {tr("Join shared trip")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    disabled={isJoiningInvite}
                    aria-label={tr("Close form")}
                    className="pc-icon-btn disabled:opacity-60"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d="M6 6l12 12" />
                      <path d="M18 6l-12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Paste invite token from organizer and join trip in current workspace context.")}
                </p>
              </div>

              <div className="mt-2 space-y-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-app-text">{tr("Trip invite token")}</p>
                  <input
                    ref={joinInviteInputRef}
                    type="text"
                    value={joinInviteTokenInput}
                    onChange={(event) => setJoinInviteTokenInput(event.target.value)}
                    placeholder={tr("Trip invite token")}
                    className="pc-input"
                    maxLength={256}
                    disabled={isJoiningInvite || isTripsLoading || isTripLoading}
                  />
                </div>
                <div className="pc-modal-sheet-foot mt-1">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void joinTripViaInviteToken()}
                      disabled={
                        isJoiningInvite ||
                        isTripsLoading ||
                        isTripLoading ||
                        joinInviteTokenInput.trim().length === 0
                      }
                      className="pc-btn-primary grow"
                    >
                      <AppIcon name="check" className="h-4 w-4" />
                      {isJoiningInvite ? tr("Joining...") : tr("Join trip")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(false)}
                      disabled={isJoiningInvite}
                      className="pc-btn-secondary"
                    >
                      {tr("Cancel")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const receiptReviewModal =
    typeof document !== "undefined" && activeReceiptReview
      ? createPortal(
          <div
            className="pc-modal-overlay pc-modal-overlay-sheet z-[95]"
            onClick={() => setActiveReceiptReviewId(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={tr("Receipt review")}
              className="pc-modal-dialog w-full max-w-lg p-3 sm:p-3.5"
              style={{
                maxHeight:
                  "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pc-modal-sheet-head">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="pc-kicker">
                      <AppIcon name="template" className="h-3.5 w-3.5" />
                      {tr("Receipt review")}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-app-text">
                      {activeReceiptReview.imageFileName ?? tr("Receipt photo")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveReceiptReviewId(null)}
                    aria-label={tr("Close review")}
                    className="pc-icon-btn"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d="M6 6l12 12" />
                      <path d="M18 6l-12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`pc-status-pill ${
                      activeReceiptReview.status === "parsed"
                        ? "pc-status-pill-success"
                        : activeReceiptReview.status === "ocr_failed"
                          ? "pc-status-pill-error"
                          : activeReceiptReview.status === "finalized"
                            ? "pc-status-pill-warning"
                            : ""
                    }`}
                  >
                    {getReceiptDraftStatusLabel(activeReceiptReview.status, tr)}
                  </span>
                  <span className="text-[11px] text-app-text-muted">
                    {tr("Saved at")}: {formatDateTime(activeReceiptReview.createdAt)}
                  </span>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="overflow-hidden rounded-xl border border-app-border/70 bg-app-surface/70">
                  <img
                    src={activeReceiptReview.imageDataUrl}
                    alt={tr("Receipt photo")}
                    className="h-44 w-full object-cover sm:h-52"
                  />
                </div>

                <div className="pc-state-card space-y-1">
                  <p className="text-xs font-semibold text-app-text">
                    {tr("Receipt summary")}
                  </p>
                  <p className="text-[11px] text-app-text-muted">
                    {getReceiptDraftNextActionLabel(activeReceiptReview, tr)}
                  </p>
                  <p className="text-[11px] text-app-text-muted">
                    {tr("Parse attempts")}: {activeReceiptReview.ocrParseAttempts}
                    {activeReceiptReview.ocrLastAttemptAt
                      ? ` • ${tr("Last parse attempt")}: ${formatDateTime(activeReceiptReview.ocrLastAttemptAt)}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-app-text-muted">
                    {tr("Image updated")}: {formatDateTime(activeReceiptReview.sourceImageUpdatedAt)}
                  </p>
                </div>

                {activeReceiptReview.status !== "draft" && (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">
                      {tr("Detected values")}
                    </p>
                    <p className="text-[11px] text-app-text-muted">
                      {activeReceiptReview.ocrSuggestedAmount &&
                      activeReceiptReview.ocrSuggestedCurrency
                        ? `${tr("OCR amount")}: ${formatAmount(
                            activeReceiptReview.ocrSuggestedAmount,
                            activeReceiptReview.ocrSuggestedCurrency,
                          )}. `
                        : ""}
                      {activeReceiptReview.ocrSuggestedDescription
                        ? `${tr("OCR description")}: ${activeReceiptReview.ocrSuggestedDescription}.`
                        : tr("OCR parsed the receipt. Review details in expense form before saving.")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ["sourceAmount", tr("Amount")],
                          ["sourceCurrency", tr("Expense currency")],
                          ["spentAt", tr("Expense date")],
                          ["merchant", tr("Merchant")],
                          ["description", tr("Description")],
                          ["category", tr("Category")],
                        ] as const
                      ).map(([key, label]) => (
                        <span
                          key={`${activeReceiptReview.id}-${key}`}
                          className={`pc-status-pill ${getReceiptFieldQualityClass(
                            activeReceiptReview.ocrFieldQuality[key],
                          )}`}
                        >
                          {label}:{" "}
                          {getReceiptFieldQualityLabel(activeReceiptReview.ocrFieldQuality[key], tr)}
                        </span>
                      ))}
                    </div>
                    {activeReceiptReview.status === "parsed" && activeReceiptReview.ocrRawText && (
                      <button
                        type="button"
                        onClick={() => setIsReceiptRawTextModalOpen(true)}
                        className="pc-btn-secondary mt-1 min-h-8 px-2 py-1 text-[11px]"
                      >
                        <AppIcon name="template" className="h-3.5 w-3.5" />
                        {tr("OCR text snippet")}
                      </button>
                    )}
                  </div>
                )}

                {activeReceiptReview.finalizedExpenseId && (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Linked expense")}</p>
                    {linkedExpenseForActiveReceipt ? (
                      <>
                        <p className="text-[11px] text-app-text-muted">
                          {linkedExpenseForActiveReceipt.description} •{" "}
                          {formatAmount(
                            linkedExpenseForActiveReceipt.sourceAmount,
                            linkedExpenseForActiveReceipt.sourceCurrency,
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            openLinkedExpenseFromReceipt(linkedExpenseForActiveReceipt.id)
                          }
                          className="pc-btn-secondary"
                        >
                          <AppIcon name="history" className="h-3.5 w-3.5" />
                          {tr("Open linked expense")}
                        </button>
                      </>
                    ) : (
                      <p className="text-[11px] text-app-text-muted">
                        {tr("Linked expense id")}: {activeReceiptReview.finalizedExpenseId}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void parseReceiptDraft(activeReceiptReview.id)}
                    disabled={
                      !isTripEditable ||
                      activeReceiptReview.status === "finalized" ||
                      isParsingReceiptDraftId !== null ||
                      isCreatingReceiptDraft ||
                      isDeletingReceiptDraftId !== null ||
                      isResettingReceiptDraftId !== null ||
                      isReplacingReceiptDraftId !== null
                    }
                    className="pc-btn-secondary"
                  >
                    <AppIcon name="refresh" className="h-3.5 w-3.5" />
                    {isParsingReceiptDraftId === activeReceiptReview.id
                      ? tr("Parsing...")
                      : activeReceiptReview.status === "parsed"
                        ? tr("Reparse OCR")
                        : tr("Run OCR prefill")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetReceiptDraftHints(activeReceiptReview.id)}
                    disabled={
                      !isTripEditable ||
                      activeReceiptReview.status === "finalized" ||
                      isResettingReceiptDraftId !== null ||
                      isCreatingReceiptDraft ||
                      isParsingReceiptDraftId !== null ||
                      isDeletingReceiptDraftId !== null ||
                      isReplacingReceiptDraftId !== null
                    }
                    className="pc-btn-secondary"
                  >
                    <AppIcon name="undo" className="h-3.5 w-3.5" />
                    {isResettingReceiptDraftId === activeReceiptReview.id
                      ? tr("Saving...")
                      : tr("Reset OCR hints")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openReplaceReceiptImagePicker(activeReceiptReview.id)}
                    disabled={
                      !isTripEditable ||
                      activeReceiptReview.status === "finalized" ||
                      isReplacingReceiptDraftId !== null ||
                      isCreatingReceiptDraft ||
                      isParsingReceiptDraftId !== null ||
                      isDeletingReceiptDraftId !== null ||
                      isResettingReceiptDraftId !== null
                    }
                    className="pc-btn-secondary"
                  >
                    <AppIcon name="edit" className="h-3.5 w-3.5" />
                    {isReplacingReceiptDraftId === activeReceiptReview.id
                      ? tr("Saving...")
                      : tr("Replace photo")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyReceiptPrefillToExpenseForm(activeReceiptReview)}
                    disabled={
                      !isTripEditable ||
                      activeReceiptReview.status === "finalized" ||
                      isResettingReceiptDraftId !== null
                    }
                    className="pc-btn-secondary"
                  >
                    <AppIcon name="edit" className="h-3.5 w-3.5" />
                    {tr("Use in expense form")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteReceiptDraft(activeReceiptReview.id)}
                    disabled={
                      !isTripEditable ||
                      activeReceiptReview.status === "finalized" ||
                      isDeletingReceiptDraftId !== null ||
                      isCreatingReceiptDraft ||
                      isParsingReceiptDraftId !== null ||
                      isResettingReceiptDraftId !== null ||
                      isReplacingReceiptDraftId !== null
                    }
                    className="pc-btn-danger"
                  >
                    <AppIcon name="archive" className="h-3.5 w-3.5" />
                    {isDeletingReceiptDraftId === activeReceiptReview.id
                      ? tr("Deleting...")
                      : tr("Delete draft")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const receiptRawTextModal = (
    <ModalSheet
      open={
        isReceiptRawTextModalOpen &&
        Boolean(activeReceiptReview && activeReceiptReview.status === "parsed" && activeReceiptReview.ocrRawText)
      }
      onClose={() => setIsReceiptRawTextModalOpen(false)}
      title={tr("OCR text snippet")}
      titleIcon={<AppIcon name="template" className="h-3.5 w-3.5" />}
      description={tr("Raw OCR output preview for manual verification.")}
      widthClassName="max-w-lg"
      overlayClassName="z-[99]"
    >
      <p className="whitespace-pre-wrap text-[11px] text-app-text-muted">
        {activeReceiptReview?.ocrRawText?.slice(0, 900) ?? ""}
      </p>
    </ModalSheet>
  );

  return (
    <section className="pc-surface pc-screen-stack">
      <div className="pc-surface-head">
        <div className="pc-surface-head-main">
          <p className="pc-kicker">{tr("Travel groups")}</p>
          <h2 className="pc-section-title mt-1">
            <AppIcon name="travel" className="h-4 w-4" />
            {tr("Group expenses")}
          </h2>
          <p className="pc-section-subtitle">
            {tr("Trips, receipts, and settlements")}
          </p>
        </div>
      </div>

      {workspaceUnavailable && (
        <p className="pc-feedback pc-feedback-warning">
          <AppIcon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{workspaceUnavailable}</span>
        </p>
      )}

      {!workspaceUnavailable && (
        <>
          {selectedTripId === null && (
            <>
              <section className="pc-detail-surface">
                <div className="pc-surface-head">
                  <p className="pc-inline-meta text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                    <AppIcon name="workspace" className="h-3.5 w-3.5" />
                    {tr("Trips")}
                  </p>
                  <div className="pc-surface-head-actions">
                    <button
                      type="button"
                      onClick={() => setIsCreateTripModalOpen(true)}
                      disabled={isCreatingTrip || isTripsLoading}
                      className="pc-btn-primary min-h-8 px-3 py-1.5"
                    >
                      <AppIcon name="add" className="h-3.5 w-3.5" />
                      {tr("Create trip")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(true)}
                      disabled={isJoiningInvite || isTripsLoading || isTripLoading}
                      className="pc-btn-secondary min-h-8 px-3 py-1.5"
                    >
                      <AppIcon name="workspace" className="h-3.5 w-3.5" />
                      {tr("Join shared trip")}
                    </button>
                  </div>
                </div>
            <div className="pc-segmented mt-2">
              {tripListFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTripListFilter(filter)}
                  aria-pressed={tripListFilter === filter}
                  className={`pc-segment-btn min-h-8 ${
                    tripListFilter === filter ? "pc-segment-btn-active" : ""
                  }`}
                >
                  {getTripListFilterLabel(filter, tr)} ({tripFilterCounts[filter]})
                </button>
              ))}
            </div>

            {isTripsLoading ? (
              <p className="mt-2 text-sm text-app-text-muted">{tr("Loading travel trips...")}</p>
            ) : trips.length === 0 ? (
              <div className="pc-empty-state mt-2">
                <p className="text-sm font-semibold text-app-text">{tr("No trips yet")}</p>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Create your first trip.")}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateTripModalOpen(true)}
                  className="pc-btn-primary mt-2"
                >
                  <AppIcon name="add" className="h-3.5 w-3.5" />
                  {tr("Create trip")}
                </button>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="pc-empty-state mt-2">
                <p className="text-sm font-semibold text-app-text">
                  {tr("No trips in this section yet")}
                </p>
                <p className="mt-1 text-xs text-app-text-muted">
                  {tr("Choose another section or show all trips.")}
                </p>
                {tripListFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setTripListFilter("all")}
                    className="pc-btn-quiet mt-2"
                  >
                    {tr("Show all trips")}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {filteredTrips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => {
                      setTripWorkspaceLayer("expenses");
                      setSelectedTripId(trip.id);
                    }}
                    className={`pc-action-card w-full text-left ${
                      selectedTripId === trip.id ? "border-app-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-app-text">{trip.title}</p>
                      <span
                        className={`pc-status-pill ${
                          trip.status === "archived"
                            ? "pc-status-pill-error"
                            : trip.status === "closed"
                            ? "pc-status-pill-success"
                            : trip.status === "closing"
                              ? "pc-status-pill-warning"
                              : ""
                        }`}
                      >
                        {tr(
                          trip.status === "archived"
                            ? "Archived"
                            : trip.status === "closed"
                              ? "Completed"
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
                    {trip.archivedAt && (
                      <p className="mt-1 text-[11px] text-app-text-muted">
                        {tr("Archived at")}: {formatDateTime(trip.archivedAt)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
              </section>
            </>
          )}

          {selectedTripId !== null && isTripLoading && (
            <p className="pc-feedback">
              <AppIcon name="refresh" className="pc-spin mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{tr("Loading trip details...")}</span>
            </p>
          )}

          {selectedTripId !== null && !isTripLoading && !selectedTrip && (
            <div className="pc-empty-state">
              <p className="text-sm font-semibold text-app-text">
                {tr("Trip details are unavailable right now.")}
              </p>
              <p className="mt-1 text-xs text-app-text-muted">
                {tr("Return to trip list and try opening it again.")}
              </p>
              <button
                type="button"
                onClick={() => setSelectedTripId(null)}
                className="pc-btn-secondary mt-2"
              >
                <AppIcon name="undo" className="h-3.5 w-3.5" />
                {tr("Back to trips")}
              </button>
            </div>
          )}

          {selectedTripId !== null && selectedTrip && !isTripLoading && (
            <section className="pc-screen-stack">
              <div className="pc-surface pc-surface-soft">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-app-text">{selectedTrip.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="pc-status-pill">{selectedTrip.baseCurrency}</span>
                    <span
                      className={`pc-status-pill ${
                        selectedTrip.status === "archived"
                          ? "pc-status-pill-error"
                          : selectedTrip.status === "closed"
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
                {selectedTrip.archivedAt && (
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr("Archived at")}: {formatDateTime(selectedTrip.archivedAt)}
                  </p>
                )}
                <div className="pc-context-row mt-2">
                  <p className="pc-context-row-main">
                    <AppIcon name="travel" className="h-3.5 w-3.5" />
                    <span>
                      {tr("Current layer")}: {getTripWorkspaceLayerLabel(tripWorkspaceLayer, tr)}
                    </span>
                  </p>
                  <div className="pc-context-row-actions">
                    {tripWorkspaceLayer !== "expenses" && (
                      <button
                        type="button"
                        onClick={() => setTripWorkspaceLayer("expenses")}
                        className="pc-btn-quiet min-h-8 px-2 py-1 text-[11px]"
                      >
                        <AppIcon name="undo" className="h-3.5 w-3.5" />
                        {tr("Reset layer")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTripId(null)}
                      className="pc-btn-quiet min-h-8 px-2 py-1 text-[11px]"
                    >
                      <AppIcon name="undo" className="h-3.5 w-3.5" />
                      {tr("Back to trips")}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTripOverviewModalOpen(true)}
                  className="pc-btn-secondary mt-2"
                >
                  <AppIcon name="template" className="h-3.5 w-3.5" />
                  {tr("Trip overview")}
                </button>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={focusExpenseForm}
                    disabled={!isTripEditable || isClosureMutating || isSettlementMutatingId !== null}
                    className="pc-btn-primary w-full sm:w-auto"
                  >
                    <AppIcon name={isEditingExpense ? "edit" : "add"} className="h-3.5 w-3.5" />
                    {tr(isEditingExpense ? "Edit expense form" : "Quick add expense")}
                  </button>
                </div>
                <div className="pc-segmented mt-2">
                  <button
                    type="button"
                    onClick={() => setTripWorkspaceLayer("expenses")}
                    aria-pressed={tripWorkspaceLayer === "expenses"}
                    className={`pc-segment-btn min-h-8 ${
                      tripWorkspaceLayer === "expenses" ? "pc-segment-btn-active" : ""
                    }`}
                  >
                    {tr("Expenses")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripWorkspaceLayer("settlements")}
                    aria-pressed={tripWorkspaceLayer === "settlements"}
                    className={`pc-segment-btn min-h-8 ${
                      tripWorkspaceLayer === "settlements" ? "pc-segment-btn-active" : ""
                    }`}
                  >
                    {tr("Settlements")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripWorkspaceLayer("history")}
                    aria-pressed={tripWorkspaceLayer === "history"}
                    className={`pc-segment-btn min-h-8 ${
                      tripWorkspaceLayer === "history" ? "pc-segment-btn-active" : ""
                    }`}
                  >
                    {tr("History")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTripLifecycleModalOpen(true)}
                  className="pc-btn-secondary mt-2"
                >
                  <AppIcon name="check" className="h-3.5 w-3.5" />
                  {tr("Trip lifecycle actions")}
                </button>

                {isTripOverviewModalOpen && (
                  <ModalSheet
                    open={isTripOverviewModalOpen}
                    onClose={() => setIsTripOverviewModalOpen(false)}
                    title={tr("Trip overview")}
                    titleIcon={<AppIcon name="template" className="h-3.5 w-3.5" />}
                    description={tr("Summary metrics and latest activity for this trip.")}
                    widthClassName="max-w-3xl"
                    overlayClassName="z-[97]"
                  >
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-6">
                    <div className="pc-state-card p-2">
                      <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                        {tr("Active members")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-app-text">
                        {selectedTrip.summary.activeMemberCount}
                      </p>
                      <p className="mt-0.5 text-[10px] text-app-text-muted">
                        {tr("Total")}: {selectedTrip.members.length}
                      </p>
                    </div>
                    <div className="pc-state-card p-2">
                      <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                        {tr("Expenses")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-app-text">
                        {selectedTrip.summary.totalExpensesCount}
                      </p>
                    </div>
                    <div className="pc-state-card p-2">
                      <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                        {tr("Total")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-app-text">
                        {formatAmount(selectedTrip.summary.totalSpent, selectedTrip.baseCurrency)}
                      </p>
                    </div>
                    <div className="pc-state-card p-2">
                      <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                        {tr("Open settlements")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-app-text">
                        {selectedTrip.summary.unsettledSettlementCount}
                      </p>
                    </div>
                    <div className="pc-state-card p-2">
                      <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                        {tr("Inactive")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-app-text">
                        {selectedTrip.summary.inactiveMemberCount}
                      </p>
                    </div>
                    <div className="pc-state-card p-2">
                      <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                        {tr("Settled")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-app-text">
                        {selectedTrip.summary.settledSettlementCount}
                      </p>
                    </div>
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
                  {selectedTrip.status === "closing" && (
                    <p className="mt-1 text-[11px] text-app-text-muted">
                      {selectedTrip.summary.readyForClosure
                        ? tr("Ready to close trip.")
                        : tr("Settle open transfers before closing trip.")}
                    </p>
                  )}
                  {selectedTrip.status === "archived" && (
                    <p className="mt-1 text-[11px] text-app-text-muted">
                      {tr("Archived trip is read-only and kept for post-trip reference.")}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr("Trip totals and settlements are calculated in base currency.")}
                  </p>
                  </ModalSheet>
                )}

                {isTripLifecycleModalOpen && (
                  <ModalSheet
                    open={isTripLifecycleModalOpen}
                    onClose={() => setIsTripLifecycleModalOpen(false)}
                    title={tr("Trip lifecycle actions")}
                    titleIcon={<AppIcon name="check" className="h-3.5 w-3.5" />}
                    description={tr("Finalize, close, archive, and restore this trip lifecycle.")}
                    widthClassName="max-w-2xl"
                    overlayClassName="z-[97]"
                  >
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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
                      <>
                        <button
                          type="button"
                          onClick={() => void runTripClosureAction("reopen")}
                          disabled={isClosureMutating || isSettlementMutatingId !== null}
                          className="pc-btn-secondary w-full"
                        >
                          <AppIcon name="undo" className="h-3.5 w-3.5" />
                          {tr("Reopen trip")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllowArchiveTripConfirm(true)}
                          disabled={isClosureMutating || isSettlementMutatingId !== null}
                          className="pc-btn-secondary w-full"
                        >
                          <AppIcon name="archive" className="h-3.5 w-3.5" />
                          {tr("Move to archive")}
                        </button>
                      </>
                    )}
                    {selectedTrip.status === "archived" && (
                      <button
                        type="button"
                        onClick={() => void runTripClosureAction("unarchive")}
                        disabled={isClosureMutating || isSettlementMutatingId !== null}
                        className="pc-btn-secondary w-full"
                      >
                        <AppIcon name="undo" className="h-3.5 w-3.5" />
                        {tr("Restore from archive")}
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

                  {allowArchiveTripConfirm && selectedTrip.status === "closed" && (
                    <div className="mt-2 rounded-xl border border-app-border/80 bg-app-surface/80 px-3 py-2">
                      <p className="text-xs font-semibold text-app-text">
                        {tr("Move this completed trip to archive?")}
                      </p>
                      <p className="mt-1 text-[11px] text-app-text-muted">
                        {tr(
                          "Archive keeps trip history available and removes it from active/completed focus lists.",
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void runTripClosureAction("archive")}
                          disabled={isClosureMutating || isSettlementMutatingId !== null}
                          className="pc-btn-secondary"
                        >
                          <AppIcon name="archive" className="h-3.5 w-3.5" />
                          {tr("Archive trip")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllowArchiveTripConfirm(false)}
                          disabled={isClosureMutating || isSettlementMutatingId !== null}
                          className="pc-btn-quiet"
                        >
                          {tr("Keep as completed")}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTrip.status === "closed" && (
                    <p className="mt-2 text-[11px] text-app-text-muted">
                      {tr(
                        "Closed trip stays available as read-only history with final settlement summary.",
                      )}
                    </p>
                  )}
                  {selectedTrip.status === "archived" && (
                    <p className="mt-2 text-[11px] text-app-text-muted">
                      {tr("Archived trip stays read-only. Restore it to completed list when needed.")}
                    </p>
                  )}
                  </ModalSheet>
                )}
              </div>

              {tripWorkspaceLayer === "expenses" && (
                <>
                  <div className="pc-surface pc-surface-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-app-text-muted">
                      {tr("Expense workspace actions")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsParticipantPanelOpen(true)}
                        className="pc-btn-secondary"
                      >
                        <AppIcon name="profile" className="h-3.5 w-3.5" />
                        {tr("Participants")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReceiptPanelOpen(true)}
                        className="pc-btn-secondary"
                      >
                        <AppIcon name="template" className="h-3.5 w-3.5" />
                        {tr("Receipt drafts")}
                      </button>
                      {!isTripEditable && (
                        <span className="pc-chip">{tr("Expense editing is locked")}</span>
                      )}
                    </div>
                  </div>

                  {isParticipantPanelOpen && (
                    <ModalSheet
                      open={isParticipantPanelOpen}
                      onClose={() => setIsParticipantPanelOpen(false)}
                      title={tr("Participants")}
                      titleIcon={<AppIcon name="profile" className="h-3.5 w-3.5" />}
                      description={tr("Manage active/inactive members and invite linkage.")}
                      widthClassName="max-w-2xl"
                      overlayClassName="z-[97]"
                    >
                    <div className="pc-surface pc-surface-soft">
                <p className="mt-1 text-[11px] text-app-text-muted">
                  {tr(
                    "Organizer and active participants are used for new expenses. Inactive participants stay in history and past settlements.",
                  )}
                </p>
                {!isTripEditable && (
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr("Participant edits are available only while trip is active.")}
                  </p>
                )}
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="pc-state-card px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                      {tr("Joined profiles")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {joinedTripMembers.length}
                    </p>
                    <p className="mt-0.5 text-[11px] text-app-text-muted">
                      {tr("Local only")}: {localOnlyTripMembers.length}
                    </p>
                  </div>
                  <div className="pc-state-card px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                      {tr("Current member")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-app-text">
                      {currentProfileMember
                        ? currentProfileMember.displayName
                        : tr("Not linked yet")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-app-text-muted">
                      {currentProfileMember
                        ? tr("You are linked to this participant in trip context.")
                        : tr("Join via invite or mark yourself in participant list.")}
                    </p>
                  </div>
                </div>

                {(canManageTripInvite || activeTripInvite !== null) && (
                  <div className="mt-2 rounded-xl border border-app-border/70 bg-app-surface/65 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-app-text">
                        {tr("Shared invite")}
                      </p>
                      <button
                        type="button"
                        onClick={() => void createTripInvite()}
                        disabled={
                          !canManageTripInvite ||
                          isCreatingInvite ||
                          isJoiningInvite ||
                          isLoadingInvite
                        }
                        className="pc-btn-secondary"
                      >
                        <AppIcon name="add" className="h-3.5 w-3.5" />
                        {isCreatingInvite ? tr("Saving...") : tr("Create invite")}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-app-text-muted">
                      {tr("Organizer can share one active invite token. New invite revokes previous active token.")}
                    </p>
                    {isLoadingInvite && (
                      <p className="mt-1 text-[11px] text-app-text-muted">
                        {tr("Loading invite status...")}
                      </p>
                    )}
                    {activeTripInvite ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-app-text">
                          {tr("Invite token")}:{" "}
                          <span className="font-mono text-[11px]">
                            {maskTravelInviteToken(activeTripInvite.inviteToken)}
                          </span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={`pc-status-pill ${
                              activeTripInvite.inviteStatus === "active"
                                ? "pc-status-pill-success"
                                : activeTripInvite.inviteStatus === "accepted"
                                  ? "pc-status-pill-warning"
                                  : "pc-status-pill-error"
                            }`}
                          >
                            {tr(
                              activeTripInvite.inviteStatus === "active"
                                ? "Active"
                                : activeTripInvite.inviteStatus === "accepted"
                                  ? "Accepted"
                                  : activeTripInvite.inviteStatus === "expired"
                                    ? "Expired"
                                    : "Revoked",
                            )}
                          </span>
                          {activeTripInvite.expiresAt && (
                            <span className="text-[11px] text-app-text-muted">
                              {tr("Expires")}: {formatDateTime(activeTripInvite.expiresAt)}
                            </span>
                          )}
                        </div>
                        {activeTripInvite.inviteStatus === "active" && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => void copyTripInviteToken()}
                              className="pc-btn-secondary"
                            >
                              <AppIcon name="check" className="h-3.5 w-3.5" />
                              {inviteCopyState === "copied"
                                ? tr("Copied")
                                : inviteCopyState === "failed"
                                  ? tr("Copy failed")
                                  : tr("Copy invite")}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-app-text-muted">
                        {tr("No invite yet. Create one when your group is ready to join this trip.")}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">
                      {tr("Add participant")}
                    </p>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(event) => setNewMemberName(event.target.value)}
                      maxLength={80}
                      placeholder={tr("Participant name")}
                      disabled={!isTripEditable || isAddingMember || isMutatingMemberId !== null}
                      className="pc-input"
                    />
                    <label className="pc-check-row text-xs">
                      <input
                        type="checkbox"
                        checked={linkNewMemberToCurrentProfile}
                        onChange={(event) =>
                          setLinkNewMemberToCurrentProfile(event.target.checked)
                        }
                        disabled={
                          !isTripEditable || isAddingMember || isMutatingMemberId !== null
                        }
                      />
                      <span>{tr("Mark as me (link to current profile)")}</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void addTripMember()}
                    disabled={
                      !isTripEditable ||
                      isAddingMember ||
                      isMutatingMemberId !== null ||
                      newMemberName.trim().length === 0
                    }
                    className="pc-btn-secondary h-fit w-full sm:w-auto"
                  >
                    <AppIcon name="add" className="h-3.5 w-3.5" />
                    {isAddingMember ? tr("Saving...") : tr("Add participant")}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {orderedTripMembers.map((member) => {
                    const isMemberBusy = isMutatingMemberId === member.id;
                    const isEditingMemberName = editingMemberId === member.id;
                    const showInactiveAction =
                      member.status === "active" && member.role !== "organizer";

                    return (
                      <div key={member.id} className="pc-state-card space-y-1 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <p className="text-xs font-semibold text-app-text">
                            {member.displayName}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <span className="pc-status-pill">
                              {member.role === "organizer" ? tr("Organizer") : tr("Participant")}
                            </span>
                            <span
                              className={`pc-status-pill ${
                                member.status === "inactive"
                                  ? "pc-status-pill-warning"
                                  : "pc-status-pill-success"
                              }`}
                            >
                              {member.status === "active" ? tr("Active") : tr("Inactive")}
                            </span>
                            {member.profileId === profile?.id ? (
                              <span className="pc-status-pill pc-status-pill-success">
                                {tr("You")}
                              </span>
                            ) : member.profileId ? (
                              <span className="pc-status-pill">{tr("Joined")}</span>
                            ) : (
                              <span className="pc-status-pill">{tr("Local")}</span>
                            )}
                          </div>
                        </div>
                        {member.inactiveAt && member.status === "inactive" && (
                          <p className="text-[11px] text-app-text-muted">
                            {tr("Inactive since")}: {formatDateTime(member.inactiveAt)}
                          </p>
                        )}
                        {isEditingMemberName ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editingMemberName}
                              onChange={(event) => setEditingMemberName(event.target.value)}
                              disabled={isMemberBusy || isAddingMember}
                              maxLength={80}
                              className="pc-input"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => void saveMemberRename(member)}
                                disabled={isMemberBusy || isAddingMember}
                                className="pc-btn-secondary"
                              >
                                <AppIcon name="check" className="h-3.5 w-3.5" />
                                {isMemberBusy ? tr("Saving...") : tr("Save name")}
                              </button>
                              <button
                                type="button"
                                onClick={cancelMemberRename}
                                disabled={isMemberBusy || isAddingMember}
                                className="pc-btn-quiet"
                              >
                                {tr("Cancel")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => startMemberRename(member)}
                              disabled={!isTripEditable || isMutatingMemberId !== null || isAddingMember}
                              className="pc-btn-secondary"
                            >
                              <AppIcon name="edit" className="h-3.5 w-3.5" />
                              {tr("Rename")}
                            </button>
                            {member.role !== "organizer" && (
                              <button
                                type="button"
                                onClick={() => void promoteMemberToOrganizer(member)}
                                disabled={!isTripEditable || isMutatingMemberId !== null || isAddingMember}
                                className="pc-btn-secondary"
                              >
                                <AppIcon name="check" className="h-3.5 w-3.5" />
                                {tr("Make organizer")}
                              </button>
                            )}
                            {showInactiveAction && (
                              <button
                                type="button"
                                onClick={() => void updateMemberStatus(member, "inactive")}
                                disabled={!isTripEditable || isMutatingMemberId !== null || isAddingMember}
                                className="pc-btn-secondary"
                              >
                                <AppIcon name="clock" className="h-3.5 w-3.5" />
                                {tr("Move out of new expenses")}
                              </button>
                            )}
                            {member.status === "inactive" && (
                              <button
                                type="button"
                                onClick={() => void updateMemberStatus(member, "active")}
                                disabled={!isTripEditable || isMutatingMemberId !== null || isAddingMember}
                                className="pc-btn-secondary"
                              >
                                <AppIcon name="undo" className="h-3.5 w-3.5" />
                                {tr("Return to active")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {inactiveTripMembers.length > 0 && (
                  <p className="mt-2 text-[11px] text-app-text-muted">
                    {tr(
                      "Inactive participants are hidden from default payer/split pickers for new expenses, but remain available in historical edits.",
                    )}
                  </p>
                )}
                    </div>
                    </ModalSheet>
                  )}

                  {isReceiptPanelOpen && (
                    <ModalSheet
                      open={isReceiptPanelOpen}
                      onClose={() => setIsReceiptPanelOpen(false)}
                      title={tr("Receipt drafts")}
                      titleIcon={<AppIcon name="template" className="h-3.5 w-3.5" />}
                      description={tr("Save now, parse later, and link receipts to expenses.")}
                      widthClassName="max-w-3xl"
                      overlayClassName="z-[97]"
                    >
                    <div className="pc-surface pc-surface-soft">
                <p className="mt-1 text-[11px] text-app-text-muted">
                  {tr("Save now, parse later. OCR suggests fields, but you always confirm before saving expense.")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <input
                    ref={replaceReceiptInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={replaceReceiptDraftPhoto}
                    className="sr-only"
                  />
                  <input
                    ref={createReceiptInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={
                      !isTripEditable ||
                      isCreatingReceiptDraft ||
                      isParsingReceiptDraftId !== null ||
                      isDeletingReceiptDraftId !== null ||
                      isResettingReceiptDraftId !== null ||
                      isReplacingReceiptDraftId !== null
                    }
                    onChange={captureReceiptDraft}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={openCreateReceiptPicker}
                    disabled={
                      !isTripEditable ||
                      isCreatingReceiptDraft ||
                      isParsingReceiptDraftId !== null ||
                      isDeletingReceiptDraftId !== null ||
                      isResettingReceiptDraftId !== null ||
                      isReplacingReceiptDraftId !== null
                    }
                    className="pc-btn-secondary"
                  >
                    <AppIcon name="add" className="h-3.5 w-3.5" />
                    {isCreatingReceiptDraft ? tr("Saving...") : tr("Add receipt photo")}
                  </button>
                  <span className="text-[11px] text-app-text-muted">
                    {tr("Open drafts")}: {pendingReceiptDraftCount}
                  </span>
                </div>
                {receiptDrafts.length === 0 ? (
                  <p className="mt-2 text-xs text-app-text-muted">
                    {tr("No receipt drafts yet. Capture a receipt when you pay, parse later when convenient.")}
                  </p>
                ) : (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="pc-state-card p-2">
                        <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                          {tr("Needs attention")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-app-text">
                          {receiptFilterCounts.attention}
                        </p>
                      </div>
                      <div className="pc-state-card p-2">
                        <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                          {tr("Ready")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-app-text">
                          {receiptFilterCounts.ready}
                        </p>
                      </div>
                      <div className="pc-state-card p-2">
                        <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                          {tr("Processed")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-app-text">
                          {receiptFilterCounts.processed}
                        </p>
                      </div>
                      <div className="pc-state-card p-2">
                        <p className="text-[11px] font-semibold uppercase text-app-text-muted">
                          {tr("All")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-app-text">
                          {receiptFilterCounts.all}
                        </p>
                      </div>
                    </div>

                    <div className="pc-segmented mt-2">
                      {receiptListFilters.map((filter) => (
                        <button
                          key={`receipt-filter-${filter}`}
                          type="button"
                          onClick={() => setReceiptListFilter(filter)}
                          aria-pressed={receiptListFilter === filter}
                          className={`pc-segment-btn min-h-8 ${
                            receiptListFilter === filter ? "pc-segment-btn-active" : ""
                          }`}
                        >
                          {getReceiptListFilterLabel(filter, tr)} ({receiptFilterCounts[filter]})
                        </button>
                      ))}
                    </div>

                    {filteredReceiptDrafts.length === 0 ? (
                      <div className="pc-empty-state mt-2">
                        <p className="text-sm font-semibold text-app-text">
                          {tr("No receipts in this section yet")}
                        </p>
                        <p className="mt-1 text-xs text-app-text-muted">
                          {receiptListFilter === "attention"
                            ? tr("New and failed OCR drafts appear here.")
                            : receiptListFilter === "ready"
                              ? tr("Parsed receipts waiting for review appear here.")
                              : receiptListFilter === "processed"
                                ? tr("Receipts already linked to expenses appear here.")
                                : tr("No receipt drafts match current filter yet.")}
                        </p>
                        {receiptListFilter !== "all" && (
                          <button
                            type="button"
                            onClick={() => setReceiptListFilter("all")}
                            className="pc-btn-quiet mt-2"
                          >
                            {tr("Show all receipts")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {filteredReceiptDrafts.map((receiptDraft) => {
                          const isParsed = receiptDraft.status === "parsed";
                          const isFinalized = receiptDraft.status === "finalized";
                          const linkedExpense =
                            receiptDraft.finalizedExpenseId && selectedTrip
                              ? selectedTrip.recentExpenses.find(
                                  (expense) =>
                                    expense.id === receiptDraft.finalizedExpenseId,
                                ) ?? null
                              : null;

                          return (
                            <div key={receiptDraft.id} className="pc-state-card px-3 py-2">
                              <div className="flex items-start gap-2">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-app-border/60 bg-app-surface/60">
                                  <img
                                    src={receiptDraft.imageDataUrl}
                                    alt={tr("Receipt photo")}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="truncate text-xs font-semibold text-app-text">
                                      {receiptDraft.imageFileName ?? tr("Receipt photo")}
                                    </p>
                                    <span
                                      className={`pc-status-pill ${
                                        receiptDraft.status === "parsed"
                                          ? "pc-status-pill-success"
                                          : receiptDraft.status === "ocr_failed"
                                            ? "pc-status-pill-error"
                                            : receiptDraft.status === "finalized"
                                              ? "pc-status-pill-warning"
                                              : ""
                                      }`}
                                    >
                                      {getReceiptDraftStatusLabel(receiptDraft.status, tr)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-app-text-muted">
                                    {tr("Saved at")}: {formatDateTime(receiptDraft.createdAt)}
                                  </p>
                                  <p className="mt-1 text-[11px] text-app-text-muted">
                                    {getReceiptDraftNextActionLabel(receiptDraft, tr)}
                                  </p>
                                  {receiptDraft.ocrSuggestedAmount &&
                                    receiptDraft.ocrSuggestedCurrency && (
                                      <p className="mt-1 text-[11px] text-app-text-muted">
                                        {tr("OCR amount")}:{" "}
                                        {formatAmount(
                                          receiptDraft.ocrSuggestedAmount,
                                          receiptDraft.ocrSuggestedCurrency,
                                        )}
                                      </p>
                                    )}
                                  {linkedExpense && (
                                    <p className="mt-1 text-[11px] text-app-text-muted">
                                      {tr("Linked expense")}: {linkedExpense.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveReceiptReviewId(receiptDraft.id)}
                                  className="pc-btn-secondary"
                                >
                                  <AppIcon name="history" className="h-3.5 w-3.5" />
                                  {tr("Review receipt")}
                                </button>
                                {!isFinalized && (
                                  <button
                                    type="button"
                                    onClick={() => void parseReceiptDraft(receiptDraft.id)}
                                    disabled={
                                      !isTripEditable ||
                                      isParsingReceiptDraftId !== null ||
                                      isCreatingReceiptDraft ||
                                      isDeletingReceiptDraftId !== null ||
                                      isResettingReceiptDraftId !== null ||
                                      isReplacingReceiptDraftId !== null
                                    }
                                    className="pc-btn-secondary"
                                  >
                                    <AppIcon name="refresh" className="h-3.5 w-3.5" />
                                    {isParsingReceiptDraftId === receiptDraft.id
                                      ? tr("Parsing...")
                                      : isParsed
                                        ? tr("Reparse OCR")
                                        : tr("Run OCR prefill")}
                                  </button>
                                )}
                                {isParsed && !isFinalized && (
                                  <button
                                    type="button"
                                    onClick={() => applyReceiptPrefillToExpenseForm(receiptDraft)}
                                    disabled={!isTripEditable || isResettingReceiptDraftId !== null}
                                    className="pc-btn-secondary"
                                  >
                                    <AppIcon name="edit" className="h-3.5 w-3.5" />
                                    {tr("Use in expense form")}
                                  </button>
                                )}
                                {linkedExpense && (
                                  <button
                                    type="button"
                                    onClick={() => openLinkedExpenseFromReceipt(linkedExpense.id)}
                                    className="pc-btn-secondary"
                                  >
                                    <AppIcon name="history" className="h-3.5 w-3.5" />
                                    {tr("Open linked expense")}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                    </div>
                    </ModalSheet>
                  )}

                  {isTripEditable ? (
                    isExpenseFormPanelOpen && (
                    <ModalSheet
                      open={isExpenseFormPanelOpen}
                      onClose={() => {
                        if (isEditingExpense) {
                          cancelExpenseEdit();
                        }
                        setIsExpenseFormPanelOpen(false);
                      }}
                      title={tr(isEditingExpense ? "Edit expense form" : "Expense form")}
                      titleIcon={
                        <AppIcon
                          name={isEditingExpense ? "edit" : "add"}
                          className="h-3.5 w-3.5"
                        />
                      }
                      description={tr("Save expenses in a focused modal flow.")}
                      widthClassName="max-w-3xl"
                      overlayClassName="z-[98]"
                    >
                      <form
                        ref={expenseFormRef}
                        className="pc-surface space-y-2"
                        onSubmit={submitExpense}
                      >
                {isEditingExpense && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-900">
                      {tr("You are editing an existing expense.")}
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
                {attachedReceiptDraft && !isEditingExpense && (
                  <div className="rounded-xl border border-app-border bg-app-surface/80 px-3 py-2">
                    <p className="text-xs font-semibold text-app-text">
                      {tr("Receipt draft attached to this expense save")}
                    </p>
                    <p className="mt-1 text-[11px] text-app-text-muted">
                      {tr("You can edit every field. Expense will be created only after manual confirmation.")}
                    </p>
                    {prefillReviewSummary ? (
                      <p className="mt-1 text-[11px] text-app-text-muted">
                        {tr("Please double-check fields")}: {prefillReviewSummary}.
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-app-text-muted">
                        {tr("OCR quality is stable. Still review before saving.")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="pc-chip">
                        {attachedReceiptDraft.imageFileName ?? tr("Receipt photo")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedReceiptDraftId(null);
                          setPrefillReviewFields([]);
                        }}
                        disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                        className="pc-btn-secondary"
                      >
                        {tr("Detach receipt draft")}
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
                      onChange={(event) => {
                        clearPrefillReviewField("amount");
                        setExpenseDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }));
                      }}
                      className={`pc-input ${
                        prefillReviewFieldSet.has("amount") ? "border-amber-300 bg-amber-50/40" : ""
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Expense currency")}</p>
                    <input
                      type="text"
                      value={expenseDraft.expenseCurrency}
                      onChange={(event) => {
                        clearPrefillReviewField("expenseCurrency");
                        setExpenseDraft((current) => ({
                          ...current,
                          expenseCurrency: event.target.value
                            .replace(/[^A-Za-z]/g, "")
                            .slice(0, 3)
                            .toUpperCase(),
                        }));
                      }}
                      placeholder={selectedTrip.baseCurrency}
                      maxLength={3}
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                      className={`pc-input uppercase ${
                        prefillReviewFieldSet.has("expenseCurrency")
                          ? "border-amber-300 bg-amber-50/40"
                          : ""
                      }`}
                    />
                  </div>
                </div>
                {isCrossCurrencyDraft ? (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">
                      {tr("Conversion rate to trip currency")}
                    </p>
                    <p className="text-[11px] text-app-text-muted">
                      {tr("Rate pair")}: 1 {normalizedExpenseCurrency} = ?{" "}
                      {selectedTrip.baseCurrency}
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                      value={expenseDraft.conversionRate}
                      onChange={(event) => {
                        clearPrefillReviewField("conversionRate");
                        setExpenseDraft((current) => ({
                          ...current,
                          conversionRate: event.target.value,
                        }));
                      }}
                      className={`pc-input ${
                        prefillReviewFieldSet.has("conversionRate")
                          ? "border-amber-300 bg-amber-50/40"
                          : ""
                      }`}
                      placeholder={tr("How many trip-currency units for 1 source-currency unit")}
                    />
                    <p className="text-[11px] text-app-text-muted">
                      {tr("You save a fixed rate for this expense. Past expenses are never recalculated automatically.")}
                    </p>
                    {isEditingExpense &&
                      editingExpenseSnapshot &&
                      editingExpenseSnapshot.sourceCurrency !== selectedTrip.baseCurrency && (
                        <p className="text-[11px] text-app-text-muted">
                          {tr("Current saved rate")}:{" "}
                          {formatRateInputValue(editingExpenseSnapshot.conversionRate)}.{" "}
                          {tr("Changing rate will recalculate this expense and trip balances.")}
                        </p>
                      )}
                    {fxRateSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-app-text-muted">
                          {tr("Helpful rate suggestions for this currency pair")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {fxRateSuggestions.map((suggestion) => (
                            <button
                              key={`${currentFxPairKey}:${suggestion.key}`}
                              type="button"
                              onClick={() =>
                                applyFxRateSuggestion(
                                  suggestion.conversionRate,
                                  suggestion.source,
                                )
                              }
                              disabled={
                                isExpenseSaveInProgress || isDeletingExpenseId !== null
                              }
                              className="pc-btn-quiet min-h-7 px-2 py-0.5 text-[11px]"
                            >
                              {suggestion.source === "memory"
                                ? tr("Use last saved")
                                : tr("Use recent rate")}
                              : {suggestion.conversionRate} •{" "}
                              {formatDateTime(suggestion.updatedAt)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {normalizedAmountPreview ? (
                      <div className="space-y-1 text-[11px] text-app-text-muted">
                        <p>
                          {tr("Will be saved as")}:{" "}
                          {formatAmount(
                            normalizedAmountPreview.tripAmount,
                            selectedTrip.baseCurrency,
                          )}
                        </p>
                        <p>
                          {tr("FX breakdown")}:{" "}
                          {formatAmount(
                            normalizedAmountPreview.sourceAmount,
                            normalizedAmountPreview.sourceCurrency,
                          )}{" "}
                          × {normalizedAmountPreview.conversionRate.toFixed(6)} ={" "}
                          {formatAmount(
                            normalizedAmountPreview.tripAmount,
                            selectedTrip.baseCurrency,
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-app-text-muted">
                        {tr("Set a positive conversion rate to calculate trip-currency amount.")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">
                      {tr("No conversion needed")}
                    </p>
                    <p className="text-[11px] text-app-text-muted">
                      {tr("Same as trip currency. Expense is saved directly in trip totals with fixed rate 1.")}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Description")}</p>
                    <input
                      type="text"
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                      value={expenseDraft.description}
                      onChange={(event) => {
                        clearPrefillReviewField("description");
                        setExpenseDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }));
                      }}
                      maxLength={240}
                      placeholder={tr("Dinner, taxi, tickets")}
                      className={`pc-input ${
                        prefillReviewFieldSet.has("description")
                          ? "border-amber-300 bg-amber-50/40"
                          : ""
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Category")}</p>
                    <select
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                      value={expenseDraft.category}
                      onChange={(event) => {
                        clearPrefillReviewField("category");
                        setExpenseDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }));
                      }}
                      className={`pc-select ${
                        prefillReviewFieldSet.has("category")
                          ? "border-amber-300 bg-amber-50/40"
                          : ""
                      }`}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                      {expenseFormMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                          {member.status === "inactive" ? ` (${tr("Inactive")})` : ""}
                        </option>
                      ))}
                    </select>
                    {isEditingExpense && inactiveTripMembers.length > 0 && (
                      <p className="text-[11px] text-app-text-muted">
                        {tr(
                          "Inactive participants are available here only when this expense already contains them.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Expense date (optional)")}</p>
                    <input
                      type="date"
                      disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                      value={expenseDraft.spentAt}
                      onChange={(event) => {
                        clearPrefillReviewField("spentAt");
                        setExpenseDraft((current) => ({
                          ...current,
                          spentAt: event.target.value,
                        }));
                      }}
                      className={`pc-input ${
                        prefillReviewFieldSet.has("spentAt")
                          ? "border-amber-300 bg-amber-50/40"
                          : ""
                      }`}
                    />
                  </div>
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
                      {expenseFormMembers.map((member) => {
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
                            <span>
                              {member.displayName}
                              {member.status === "inactive"
                                ? ` (${tr("Inactive")})`
                                : ""}
                            </span>
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
                      {expenseFormMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.displayName}
                          {member.status === "inactive" ? ` (${tr("Inactive")})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {expenseDraft.splitMode === "manual_amounts" && (
                  <div className="pc-state-card space-y-1">
                    <p className="text-xs font-semibold text-app-text">{tr("Manual split by amount")}</p>
                    {expenseFormMembers.map((member) => (
                      <div key={member.id} className="grid grid-cols-[1fr_120px] items-center gap-2">
                        <p className="text-xs text-app-text">
                          {member.displayName}
                          {member.status === "inactive" ? ` (${tr("Inactive")})` : ""}
                        </p>
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
                      {tr(
                        "For manual mode, entered amounts must equal full expense amount in trip currency.",
                      )}
                    </p>
                  </div>
                )}

                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="submit"
                            disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                            className="pc-btn-primary grow"
                          >
                            <AppIcon name="check" className="h-4 w-4" />
                            {isExpenseSaveInProgress
                              ? tr("Saving...")
                              : tr(isEditingExpense ? "Save changes" : "Save expense")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingExpense) {
                                cancelExpenseEdit();
                              }
                              setIsExpenseFormPanelOpen(false);
                            }}
                            disabled={isExpenseSaveInProgress || isDeletingExpenseId !== null}
                            className="pc-btn-secondary"
                          >
                            {tr("Hide form")}
                          </button>
                        </div>
                      </form>
                    </ModalSheet>
                    )
                  ) : (
                    <div className="pc-surface pc-surface-soft">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                        <AppIcon name="add" className="h-3.5 w-3.5" />
                        {tr("Expense editing is locked")}
                      </p>
                      <p className="mt-1 text-xs text-app-text-muted">
                        {tr(
                          selectedTrip.status === "archived"
                            ? "Trip is archived. Restore it to completed list before reopening for edits."
                            : selectedTrip.status === "closed"
                            ? "Trip is closed. Reopen only if your group decides to continue editing."
                            : "Trip is in finalization mode. Mark settlements and close trip, or return to active mode for edits.",
                        )}
                      </p>
                    </div>
                  )}
                </>
              )}

              {tripWorkspaceLayer === "settlements" && (
                <div className="pc-surface pc-surface-soft">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name="wallet" className="h-3.5 w-3.5" />
                  {tr("Balances")}
                </p>
                <p className="mt-1 text-[11px] text-app-text-muted">
                  {tr("Positive balance means member should receive money back. Negative means member should pay.")}
                </p>
                <p className="mt-1 text-[11px] text-app-text-muted">
                  {tr("Balances below use trip base currency totals.")}
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
                    <p className="text-xs font-semibold text-app-text">
                      {tr("Recommended settlement plan")}
                    </p>
                    <span className="text-[11px] text-app-text-muted">
                      {tr("Open")}: {selectedTrip.summary.unsettledSettlementCount} •{" "}
                      {formatAmount(
                        selectedTrip.summary.unsettledSettlementTotal,
                        selectedTrip.baseCurrency,
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-app-text-muted">
                    {tr("Plan steps")}: {selectedTrip.summary.settlementOptimizedTransferCount}.{" "}
                    {selectedTrip.summary.settlementReducedTransferCount > 0
                      ? tr(
                          "Optimization removed {count} transfer(s) from baseline plan ({baseline}).",
                          {
                            count: selectedTrip.summary.settlementReducedTransferCount,
                            baseline:
                              selectedTrip.summary.settlementBaselineTransferCount,
                          },
                        )
                      : tr("Current plan is already compact for these balances.")}
                  </p>
                  {(selectedTrip.status === "closing" ||
                    selectedTrip.status === "closed" ||
                    selectedTrip.status === "archived") && (
                    <p className="mt-1 text-[11px] text-app-text-muted">
                      {tr("Settlement progress")}: {settlementProgressPercent}% (
                      {selectedTrip.summary.settledSettlementCount}/
                      {settlementTotalStepCount})
                    </p>
                  )}
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
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-app-text-muted">
                              {tr("Step")} {index + 1}
                            </p>
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

                  {(selectedTrip.status === "closing" ||
                    selectedTrip.status === "closed" ||
                    selectedTrip.status === "archived") && (
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
              )}

              {tripWorkspaceLayer === "history" && (
                <div ref={historySectionRef} className="pc-surface pc-surface-soft">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                  <AppIcon name="history" className="h-3.5 w-3.5" />
                  {tr("Trip expense history")}
                </p>
                {selectedTrip.recentExpenses.length === 0 ? (
                  <div className="pc-empty-state mt-2">
                    <p className="text-sm font-semibold text-app-text">{tr("No expenses yet")}</p>
                    <p className="mt-1 text-xs text-app-text-muted">
                      {isTripEditable
                        ? tr("Add first expense to see split history here.")
                        : tr("No expenses were recorded before this trip became read-only.")}
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
                          editingExpenseId === expense.id
                            ? "border-app-accent"
                            : highlightedExpenseId === expense.id
                              ? "border-app-accent/70 bg-app-accent/5"
                              : ""
                        }`}
                      >
                        {(() => {
                          const linkedReceiptDraft = finalizedReceiptByExpenseId.get(expense.id);
                          return (
                            <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-app-text">{expense.description}</p>
                          <span className="pc-status-pill">
                            {formatAmount(expense.sourceAmount, expense.sourceCurrency)}
                          </span>
                        </div>
                        {linkedReceiptDraft && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <p className="text-[11px] text-app-text-muted">
                              {tr("Receipt attached")}:{" "}
                              {linkedReceiptDraft.imageFileName ?? tr("Receipt photo")}
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveReceiptReviewId(linkedReceiptDraft.id)}
                              className="pc-btn-secondary"
                            >
                              <AppIcon name="history" className="h-3.5 w-3.5" />
                              {tr("Review receipt")}
                            </button>
                          </div>
                        )}
                        {expense.sourceCurrency !== expense.currency && (
                          <div className="mt-1 space-y-1 text-[11px] text-app-text-muted">
                            <p>
                              {tr("Rate pair")}: 1 {expense.sourceCurrency} ={" "}
                              {expense.conversionRate.toFixed(6)} {expense.currency}
                            </p>
                            <p>
                              {tr("FX breakdown")}:{" "}
                              {formatAmount(expense.sourceAmount, expense.sourceCurrency)} ×{" "}
                              {expense.conversionRate.toFixed(6)} ={" "}
                              {formatAmount(expense.amount, expense.currency)}
                            </p>
                          </div>
                        )}
                        <p className="mt-1 text-xs text-app-text-muted">
                          {tr("Paid by")}: {expense.paidByMemberDisplayName}. {tr("Category")}: {expense.category}.
                        </p>
                        <p className="mt-1 text-[11px] text-app-text-muted">
                          {formatDateTime(expense.spentAt)}
                        </p>
                        <p className="mt-1 text-[11px] text-app-text-muted">
                          {tr("Split")}: {expense.splits
                            .map(
                              (split) =>
                                `${split.memberDisplayName} ${split.shareAmount.toFixed(2)} ${selectedTrip.baseCurrency}`,
                            )
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
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}
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
      {createTripModal}
      {joinTripModal}
      {receiptReviewModal}
      {receiptRawTextModal}
    </section>
  );
}

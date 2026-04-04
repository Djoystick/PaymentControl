import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import {
  deleteTravelReceiptDraftForTrip,
  parseTravelReceiptDraftForTrip,
} from "@/lib/travel/repository";
import type {
  TravelApiError,
  TravelReceiptDraftDeleteResponse,
  TravelReceiptDraftMutateResponse,
} from "@/lib/travel/types";

type PatchTravelReceiptBody = {
  initData?: string;
  action?: unknown;
};

type DeleteTravelReceiptBody = {
  initData?: string;
};

type RouteContext = {
  params: Promise<{ tripId: string; receiptDraftId: string }>;
};

const codeToStatus: Partial<Record<TravelApiError["error"]["code"], number>> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
  APP_CONTEXT_NOT_INITIALIZED: 409,
  WORKSPACE_NOT_FOUND: 404,
  WORKSPACE_LIST_FAILED: 500,
  WORKSPACE_UNAVAILABLE: 409,
  TRAVEL_TRIP_VALIDATION_FAILED: 400,
  TRAVEL_TRIP_LIST_FAILED: 500,
  TRAVEL_TRIP_CREATE_FAILED: 500,
  TRAVEL_TRIP_NOT_FOUND: 404,
  TRAVEL_TRIP_EDIT_LOCKED: 409,
  TRAVEL_TRIP_CLOSURE_INVALID_STATE: 409,
  TRAVEL_TRIP_CLOSURE_BLOCKED: 409,
  TRAVEL_TRIP_CLOSURE_FAILED: 500,
  TRAVEL_EXPENSE_VALIDATION_FAILED: 400,
  TRAVEL_EXPENSE_CREATE_FAILED: 500,
  TRAVEL_EXPENSE_UPDATE_FAILED: 500,
  TRAVEL_EXPENSE_DELETE_FAILED: 500,
  TRAVEL_RECEIPT_VALIDATION_FAILED: 400,
  TRAVEL_RECEIPT_CREATE_FAILED: 500,
  TRAVEL_RECEIPT_NOT_FOUND: 404,
  TRAVEL_RECEIPT_PARSE_FAILED: 500,
  TRAVEL_RECEIPT_DELETE_FAILED: 500,
  TRAVEL_OCR_UNAVAILABLE: 409,
  TRAVEL_SETTLEMENT_NOT_FOUND: 404,
  TRAVEL_SETTLEMENT_UPDATE_FAILED: 500,
};

const jsonPatchError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelReceiptDraftMutateResponse>(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

const jsonDeleteError = (
  code: TravelApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<TravelReceiptDraftDeleteResponse>(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

const isParseAction = (value: unknown): boolean => {
  return value === "parse";
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonPatchError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId, receiptDraftId } = await context.params;
  if (!tripId) {
    return jsonPatchError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  if (!receiptDraftId) {
    return jsonPatchError(
      "TRAVEL_RECEIPT_NOT_FOUND",
      "Receipt draft id is required.",
    );
  }

  let body: PatchTravelReceiptBody = {};
  try {
    body = (await request.json()) as PatchTravelReceiptBody;
  } catch {
    body = {};
  }

  if (!isParseAction(body.action)) {
    return jsonPatchError(
      "TRAVEL_RECEIPT_VALIDATION_FAILED",
      "Receipt draft action is invalid.",
    );
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonPatchError(scopeResult.error.code, scopeResult.error.message);
  }

  const parseResult = await parseTravelReceiptDraftForTrip({
    workspaceId: scopeResult.workspace.id,
    tripId,
    receiptDraftId,
  });

  if (!parseResult.ok) {
    if (parseResult.reason === "TRIP_NOT_FOUND") {
      return jsonPatchError("TRAVEL_TRIP_NOT_FOUND", parseResult.message);
    }

    if (parseResult.reason === "RECEIPT_NOT_FOUND") {
      return jsonPatchError("TRAVEL_RECEIPT_NOT_FOUND", parseResult.message);
    }

    if (parseResult.reason === "VALIDATION_FAILED") {
      return jsonPatchError("TRAVEL_RECEIPT_VALIDATION_FAILED", parseResult.message);
    }

    if (parseResult.reason === "OCR_UNAVAILABLE") {
      return jsonPatchError("TRAVEL_OCR_UNAVAILABLE", parseResult.message);
    }

    return jsonPatchError("TRAVEL_RECEIPT_PARSE_FAILED", parseResult.message);
  }

  return NextResponse.json<TravelReceiptDraftMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: parseResult.trip,
    receiptDraft: parseResult.receiptDraft,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonDeleteError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId, receiptDraftId } = await context.params;
  if (!tripId) {
    return jsonDeleteError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  if (!receiptDraftId) {
    return jsonDeleteError(
      "TRAVEL_RECEIPT_NOT_FOUND",
      "Receipt draft id is required.",
    );
  }

  let body: DeleteTravelReceiptBody = {};
  try {
    body = (await request.json()) as DeleteTravelReceiptBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolveTravelScope(body.initData);
  if (!scopeResult.ok) {
    return jsonDeleteError(scopeResult.error.code, scopeResult.error.message);
  }

  const deleteResult = await deleteTravelReceiptDraftForTrip({
    workspaceId: scopeResult.workspace.id,
    tripId,
    receiptDraftId,
  });

  if (!deleteResult.ok) {
    if (deleteResult.reason === "TRIP_NOT_FOUND") {
      return jsonDeleteError("TRAVEL_TRIP_NOT_FOUND", deleteResult.message);
    }

    if (deleteResult.reason === "TRIP_NOT_ACTIVE") {
      return jsonDeleteError("TRAVEL_TRIP_EDIT_LOCKED", deleteResult.message);
    }

    if (deleteResult.reason === "RECEIPT_NOT_FOUND") {
      return jsonDeleteError("TRAVEL_RECEIPT_NOT_FOUND", deleteResult.message);
    }

    return jsonDeleteError("TRAVEL_RECEIPT_DELETE_FAILED", deleteResult.message);
  }

  return NextResponse.json<TravelReceiptDraftDeleteResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: deleteResult.trip,
    deletedReceiptDraftId: deleteResult.deletedReceiptDraftId,
  });
}

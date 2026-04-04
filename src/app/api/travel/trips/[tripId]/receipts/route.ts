import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolveTravelScope } from "@/lib/travel/context";
import { createTravelReceiptDraftForTrip } from "@/lib/travel/repository";
import { validateTravelCreateReceiptDraftInput } from "@/lib/travel/validation";
import type {
  TravelApiError,
  TravelReceiptDraftMutateResponse,
} from "@/lib/travel/types";

type RouteContext = {
  params: Promise<{ tripId: string }>;
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

const jsonError = (
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

const fileToDataUrl = async (file: File): Promise<string | null> => {
  const mimeType = file.type?.trim().toLowerCase();
  if (!mimeType || !mimeType.startsWith("image/")) {
    return null;
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  if (!base64) {
    return null;
  }

  return `data:${mimeType};base64,${base64}`;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { tripId } = await context.params;
  if (!tripId) {
    return jsonError("TRAVEL_TRIP_NOT_FOUND", "Trip id is required.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(
      "TRAVEL_RECEIPT_VALIDATION_FAILED",
      "Receipt form payload is invalid.",
    );
  }

  const initData = formData.get("initData");
  const receiptImage = formData.get("receiptImage");

  if (!(receiptImage instanceof File)) {
    return jsonError(
      "TRAVEL_RECEIPT_VALIDATION_FAILED",
      "Receipt image is missing or invalid.",
    );
  }

  const imageDataUrl = await fileToDataUrl(receiptImage);
  if (!imageDataUrl) {
    return jsonError(
      "TRAVEL_RECEIPT_VALIDATION_FAILED",
      "Receipt image is missing or invalid.",
    );
  }

  const scopeResult = await resolveTravelScope(
    typeof initData === "string" ? initData : undefined,
  );
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateTravelCreateReceiptDraftInput({
    imageDataUrl,
    imageMimeType: receiptImage.type,
    imageFileName: receiptImage.name,
  });
  if (!validationResult.ok) {
    return jsonError("TRAVEL_RECEIPT_VALIDATION_FAILED", validationResult.message);
  }

  const createResult = await createTravelReceiptDraftForTrip({
    workspaceId: scopeResult.workspace.id,
    profileId: scopeResult.profileId,
    tripId,
    input: validationResult.data,
  });

  if (!createResult.ok) {
    if (createResult.reason === "TRIP_NOT_FOUND") {
      return jsonError("TRAVEL_TRIP_NOT_FOUND", createResult.message);
    }

    if (createResult.reason === "TRIP_NOT_ACTIVE") {
      return jsonError("TRAVEL_TRIP_EDIT_LOCKED", createResult.message);
    }

    if (createResult.reason === "VALIDATION_FAILED") {
      return jsonError("TRAVEL_RECEIPT_VALIDATION_FAILED", createResult.message);
    }

    return jsonError("TRAVEL_RECEIPT_CREATE_FAILED", createResult.message);
  }

  return NextResponse.json<TravelReceiptDraftMutateResponse>({
    ok: true,
    workspace: scopeResult.workspace,
    trip: createResult.trip,
    receiptDraft: createResult.receiptDraft,
  });
}

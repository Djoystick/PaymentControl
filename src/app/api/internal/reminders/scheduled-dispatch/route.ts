import { NextResponse } from "next/server";
import { isSupabaseServerConfigured, serverEnv } from "@/lib/config/server-env";
import { runScheduledReminderDispatch } from "@/lib/payments/reminder-dispatch";

type ScheduledDispatchErrorCode =
  | "SUPABASE_NOT_CONFIGURED"
  | "SCHEDULE_SECRET_NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "SCHEDULED_DISPATCH_FAILED";

type ScheduledDispatchResponse =
  | {
      ok: true;
      summary: {
        evaluationDate: string;
        workspacesSeen: number;
        workspacesEligible: number;
        candidatesSeen: number;
        attemptsCreated: number;
        duplicatesSkipped: number;
        sent: number;
        skipped: number;
        failed: number;
      };
    }
  | {
      ok: false;
      error: {
        code: ScheduledDispatchErrorCode;
        message: string;
      };
    };

const jsonError = (code: ScheduledDispatchErrorCode, message: string, status: number) => {
  return NextResponse.json<ScheduledDispatchResponse>(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
};

const getConfiguredSecrets = (): string[] => {
  const candidates = [
    serverEnv.reminderScheduledDispatchSecret,
    serverEnv.cronSecret,
  ].filter(Boolean);
  return [...new Set(candidates)];
};

const getBearerToken = (authorizationHeader: string | null): string | null => {
  const normalized = authorizationHeader?.trim() ?? "";
  if (!normalized.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = normalized.slice(7).trim();
  return token || null;
};

const isAuthorizedRequest = (request: Request, method: "GET" | "POST"): boolean => {
  const configuredSecrets = getConfiguredSecrets();
  if (configuredSecrets.length === 0) {
    return false;
  }

  const headerSecret = request.headers.get("x-reminder-schedule-secret")?.trim() ?? "";
  const bearerToken = getBearerToken(request.headers.get("authorization"));

  if (method === "GET") {
    if (!bearerToken) {
      return false;
    }

    return configuredSecrets.includes(bearerToken);
  }

  if (headerSecret && configuredSecrets.includes(headerSecret)) {
    return true;
  }

  if (bearerToken && configuredSecrets.includes(bearerToken)) {
    return true;
  }

  return false;
};

const runScheduledDispatch = async (request: Request, method: "GET" | "POST") => {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
      503,
    );
  }

  const configuredSecrets = getConfiguredSecrets();
  if (configuredSecrets.length === 0) {
    return jsonError(
      "SCHEDULE_SECRET_NOT_CONFIGURED",
      "Scheduled dispatch secret is not configured. Set REMINDER_SCHEDULED_DISPATCH_SECRET or CRON_SECRET.",
      503,
    );
  }

  if (!isAuthorizedRequest(request, method)) {
    return jsonError("UNAUTHORIZED", "Unauthorized scheduled dispatch trigger.", 401);
  }

  const summary = await runScheduledReminderDispatch();
  if (!summary) {
    return jsonError(
      "SCHEDULED_DISPATCH_FAILED",
      "Failed to run scheduled reminder dispatch.",
      500,
    );
  }

  return NextResponse.json<ScheduledDispatchResponse>({
    ok: true,
    summary,
  });
};

export async function POST(request: Request) {
  return runScheduledDispatch(request, "POST");
}

export async function GET(request: Request) {
  return runScheduledDispatch(request, "GET");
}

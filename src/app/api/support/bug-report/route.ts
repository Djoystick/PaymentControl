import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  BugReportSubmitErrorCode,
  BugReportSubmitResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured, serverEnv } from "@/lib/config/server-env";
import { sendTelegramMessageWithPreflight } from "@/lib/payments/telegram-delivery";
import { formatBugReportRuntimeContextLines } from "@/lib/support/bug-report-runtime-context";

type BugReportBody = {
  initData?: string;
  title?: string;
  description?: string;
  steps?: string;
  currentScreen?: string;
  language?: string;
  theme?: string;
  runtimeContext?: unknown;
};

const codeToStatus: Record<BugReportSubmitErrorCode, number> = {
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
  BUG_REPORT_INVALID_INPUT: 400,
  BUG_REPORT_DELIVERY_NOT_CONFIGURED: 503,
  BUG_REPORT_DELIVERY_FAILED: 502,
};

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1800;
const MAX_STEPS_LENGTH = 1200;
const MAX_NOTE_LENGTH = 280;
const TELEGRAM_TEXT_LIMIT = 3900;

const normalizeSingleLine = (value: string | undefined, maxLength: number): string => {
  const normalized = (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
  return normalized;
};

const normalizeMultiline = (value: string | undefined, maxLength: number): string => {
  const normalized = (value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
  return normalized;
};

const normalizeLanguage = (value: string | undefined): "ru" | "en" | "unknown" => {
  if (value === "ru" || value === "en") {
    return value;
  }

  return "unknown";
};

const normalizeTheme = (value: string | undefined): "light" | "dark" | "unknown" => {
  if (value === "light" || value === "dark") {
    return value;
  }

  return "unknown";
};

const normalizeCurrentScreen = (value: string | undefined): string => {
  const normalized = normalizeSingleLine(value, MAX_NOTE_LENGTH).toLowerCase();
  if (
    normalized === "home" ||
    normalized === "reminders" ||
    normalized === "history" ||
    normalized === "profile"
  ) {
    return normalized;
  }

  return "unknown";
};

const toDisplayName = (firstName: string, lastName: string | null): string => {
  const fullName = [firstName, lastName ?? ""].join(" ").trim();
  return fullName || "Unknown";
};

const buildBugReportMessage = (params: {
  reportId: string;
  timestampIso: string;
  title: string;
  description: string;
  steps: string | null;
  language: "ru" | "en" | "unknown";
  currentScreen: string;
  theme: "light" | "dark" | "unknown";
  runtimeContextLines: string[];
  contextSource: "telegram" | "dev_fallback";
  reporter: {
    telegramUserId: string;
    username: string | null;
    firstName: string;
    lastName: string | null;
    selectedScenario: "single" | "family";
  };
  workspace: {
    id: string;
    title: string;
    kind: "personal" | "family";
    memberRole: "owner" | "member";
    memberCount: number;
  };
}): string => {
  const reporterName = toDisplayName(
    params.reporter.firstName,
    params.reporter.lastName,
  );
  const reporterUsername = params.reporter.username
    ? `@${params.reporter.username}`
    : "not set";
  const lines = [
    "Payment Control - Bug report",
    `Report ID: ${params.reportId}`,
    `Time (UTC): ${params.timestampIso}`,
    "",
    "Reporter",
    `- Telegram user id: ${params.reporter.telegramUserId}`,
    `- Username: ${reporterUsername}`,
    `- Name: ${reporterName}`,
    "",
    "App context",
    `- Auth source: ${params.contextSource}`,
    `- Language: ${params.language}`,
    `- Screen: ${params.currentScreen}`,
    `- Theme: ${params.theme}`,
    `- Scenario: ${params.reporter.selectedScenario}`,
    `- Workspace: ${params.workspace.title}`,
    `- Workspace kind: ${params.workspace.kind}`,
    `- Workspace role: ${params.workspace.memberRole}`,
    `- Workspace members: ${params.workspace.memberCount}`,
    `- Workspace id: ${params.workspace.id}`,
    "",
    "Issue",
    `Title: ${params.title}`,
    "Description:",
    params.description,
  ];

  if (params.runtimeContextLines.length > 0) {
    lines.push("", "Runtime UI context");
    for (const line of params.runtimeContextLines) {
      lines.push(`- ${line}`);
    }
  }

  if (params.steps) {
    lines.push("", "Steps / details:", params.steps);
  }

  return lines.join("\n").trim();
};

const truncateForTelegram = (value: string): string => {
  if (value.length <= TELEGRAM_TEXT_LIMIT) {
    return value;
  }

  const suffix = "\n\n[truncated to fit Telegram message limit]";
  const maxWithoutSuffix = TELEGRAM_TEXT_LIMIT - suffix.length;
  return `${value.slice(0, Math.max(0, maxWithoutSuffix)).trimEnd()}${suffix}`;
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<BugReportSubmitResponse>(
      {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message: "Supabase server configuration is missing.",
        },
      },
      { status: 503 },
    );
  }

  let body: BugReportBody = {};
  try {
    body = (await request.json()) as BugReportBody;
  } catch {
    body = {};
  }

  const title = normalizeSingleLine(body.title, MAX_TITLE_LENGTH);
  const description = normalizeMultiline(body.description, MAX_DESCRIPTION_LENGTH);
  const steps = normalizeMultiline(body.steps, MAX_STEPS_LENGTH);
  const language = normalizeLanguage(body.language);
  const currentScreen = normalizeCurrentScreen(body.currentScreen);
  const theme = normalizeTheme(body.theme);
  const runtimeContextLines = formatBugReportRuntimeContextLines(body.runtimeContext);

  if (title.length < 3 || description.length < 10) {
    return NextResponse.json<BugReportSubmitResponse>(
      {
        ok: false,
        error: {
          code: "BUG_REPORT_INVALID_INPUT",
          message:
            "Bug report title and description are required (min 3 / 10 characters).",
        },
      },
      { status: 400 },
    );
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<BugReportSubmitResponse>(
      {
        ok: false,
        error: {
          code: contextResult.error.code,
          message: contextResult.error.message,
        },
      },
      { status: codeToStatus[contextResult.error.code] ?? 400 },
    );
  }

  if (!serverEnv.bugReportTelegramChatId) {
    return NextResponse.json<BugReportSubmitResponse>(
      {
        ok: false,
        error: {
          code: "BUG_REPORT_DELIVERY_NOT_CONFIGURED",
          message: "Bug report destination is not configured on server.",
        },
      },
      { status: 503 },
    );
  }

  const reportId = `BR-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`.toUpperCase();
  const timestampIso = new Date().toISOString();
  const message = truncateForTelegram(
    buildBugReportMessage({
      reportId,
      timestampIso,
      title,
      description,
      steps: steps || null,
      language,
      currentScreen,
      theme,
      runtimeContextLines,
      contextSource: contextResult.source,
      reporter: {
        telegramUserId: contextResult.profile.telegramUserId,
        username: contextResult.profile.username,
        firstName: contextResult.profile.firstName,
        lastName: contextResult.profile.lastName,
        selectedScenario: contextResult.profile.selectedScenario,
      },
      workspace: {
        id: contextResult.workspace.id,
        title: contextResult.workspace.title,
        kind: contextResult.workspace.kind,
        memberRole: contextResult.workspace.memberRole,
        memberCount: contextResult.workspace.memberCount,
      },
    }),
  );

  const deliveryResult = await sendTelegramMessageWithPreflight({
    recipientTelegramUserId: serverEnv.bugReportTelegramChatId,
    recipientSource: "stored_chat_id",
    text: message,
  });

  if (deliveryResult.status !== "sent") {
    const detailCode = deliveryResult.errorCode || "UNKNOWN";
    const detailMessage = deliveryResult.errorMessage || "Unknown Telegram error.";
    return NextResponse.json<BugReportSubmitResponse>(
      {
        ok: false,
        error: {
          code: "BUG_REPORT_DELIVERY_FAILED",
          message: `Bug report delivery failed: ${detailCode}. ${detailMessage}`,
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json<BugReportSubmitResponse>({
    ok: true,
    reportId,
    sentAt: timestampIso,
  });
}

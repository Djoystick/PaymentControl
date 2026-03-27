import {
  clientEnv,
  isSupabaseClientConfigured,
  isTelegramConfigPresent,
} from "@/lib/config/client-env";

export function LandingScreen() {
  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
        Home
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-app-text">
        Today snapshot
      </h2>
      <p className="mt-1 text-xs text-app-text-muted">
        Reminders for actions, History for recent changes.
      </p>
      <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          Runtime status
        </summary>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
          <div className="rounded-xl bg-app-surface px-3 py-2 text-app-text">
            Telegram:{" "}
            <span className="font-semibold">
              {isTelegramConfigPresent ? "Configured" : "Pending env"}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface px-3 py-2 text-app-text">
            Supabase:{" "}
            <span className="font-semibold">
              {isSupabaseClientConfigured ? "Configured" : "Pending env"}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface px-3 py-2 text-app-text">
            Stage: <span className="font-semibold">{clientEnv.appStage}</span>
          </div>
        </div>
      </details>
    </section>
  );
}

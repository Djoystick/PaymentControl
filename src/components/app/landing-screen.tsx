import {
  clientEnv,
  isSupabaseClientConfigured,
  isTelegramConfigPresent,
} from "@/lib/config/client-env";

export function LandingScreen() {
  return (
    <div className="space-y-3">
      <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
          Home
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-app-text">
          Quick overview
        </h2>
        <p className="mt-2 text-sm text-app-text-muted">
          Fast snapshot for today. Open Reminders for operational work and History for recent changes.
        </p>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <h2 className="text-base font-semibold text-app-text">Runtime status</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
          <div className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text">
            Telegram integration: <span className="font-semibold">{isTelegramConfigPresent ? "Configured" : "Pending .env values"}</span>
          </div>
          <div className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text">
            Supabase client config: <span className="font-semibold">{isSupabaseClientConfigured ? "Configured" : "Pending .env values"}</span>
          </div>
          <div className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text">
            App stage: <span className="font-semibold">{clientEnv.appStage}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

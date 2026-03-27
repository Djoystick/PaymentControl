import { clientEnv } from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";

export function LandingScreen() {
  const { tr } = useLocalization();

  return (
    <div className="space-y-3">
      <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
          {tr("Telegram Mini App")}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-app-text">
          {tr("Payment Control")}
        </h1>
        <p className="mt-1 text-xs text-app-text-muted">
          {tr("Foundation for recurring payments and household tracking")}
        </p>
        <p className="mt-2 inline-flex rounded-full bg-app-warm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-text">
          {tr("Phase 14A")}
        </p>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
          {tr("Home")}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-app-text">
          {tr("Today snapshot")}
        </h2>
        <p className="mt-1 text-xs text-app-text-muted">
          {tr("Keep it simple: Reminders for actions, History for updates.")}
        </p>
        <p className="mt-2 rounded-xl border border-app-border bg-app-surface-soft px-3 py-2 text-sm text-app-text">
          {tr("First step: open Reminders and add your first payment.")}
        </p>
        <p className="mt-2 text-xs text-app-text-muted">
          {tr("Runtime stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
        </p>
      </section>
    </div>
  );
}

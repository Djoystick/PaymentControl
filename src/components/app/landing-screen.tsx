import { clientEnv } from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";

export function LandingScreen() {
  const { tr } = useLocalization();

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            {tr("Today snapshot")}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-app-text">
            {tr("Payment Control")}
          </h1>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface-soft text-app-accent">
          <AppIcon name="home" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 rounded-xl border border-app-border bg-app-surface-soft px-3 py-2 text-sm text-app-text">
        {tr("First step: open Reminders and add your first payment.")}
      </p>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-surface-soft px-2.5 py-1 text-[11px] text-app-text-muted">
        <AppIcon name="workspace" className="h-3.5 w-3.5" />
        <span>
          {tr("Runtime stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
        </span>
      </div>
    </section>
  );
}

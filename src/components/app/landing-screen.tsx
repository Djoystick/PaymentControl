import { clientEnv } from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";

export function LandingScreen() {
  const { tr } = useLocalization();

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-app-text">
        {tr("Payment Control")}
      </h1>
      <p className="mt-2 rounded-xl border border-app-border bg-app-surface-soft px-3 py-2 text-sm text-app-text">
        {tr("First step: open Reminders and add your first payment.")}
      </p>
      <p className="mt-2 text-[11px] text-app-text-muted">
        {tr("Runtime stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
      </p>
    </section>
  );
}

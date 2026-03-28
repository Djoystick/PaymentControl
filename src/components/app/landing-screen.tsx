import { clientEnv } from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";
import { APP_TAB_NAVIGATE_EVENT, type AppTab } from "@/components/app/app-shell";

export function LandingScreen() {
  const { tr } = useLocalization();
  const openReminders = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<{ tab: AppTab }>(APP_TAB_NAVIGATE_EVENT, {
        detail: { tab: "reminders" },
      }),
    );
  };

  return (
    <section className="rounded-3xl border border-app-border bg-gradient-to-b from-app-surface to-app-surface-soft/45 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted">
            {tr("Today snapshot")}
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-app-text">
            {tr("Payment Control")}
          </h1>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-app-border bg-app-surface text-app-accent shadow-[0_8px_18px_var(--app-frame-shadow)]">
          <AppIcon name="home" className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5">
        <p className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Primary next action")}
        </p>
        <button
          type="button"
          onClick={openReminders}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-app-accent px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(31,122,67,0.3)] transition hover:bg-app-accent-strong"
        >
          <AppIcon name="add" className="h-4 w-4" />
          {tr("Open Reminders and add payment")}
        </button>
        <p className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text-muted">
          {tr("Keep it simple: Reminders for actions, History for updates.")}
        </p>
      </div>

      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-[11px] text-app-text-muted">
        <AppIcon name="workspace" className="h-3.5 w-3.5" />
        <span>
          {tr("Runtime stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
        </span>
      </div>
    </section>
  );
}

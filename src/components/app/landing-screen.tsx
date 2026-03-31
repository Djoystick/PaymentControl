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
    <section className="pc-surface bg-gradient-to-b from-app-surface to-app-surface-soft/45">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="pc-kicker">
            {tr("Today focus")}
          </p>
          <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-app-text">
            {tr("Payment Control")}
          </h1>
          <p className="mt-0.5 text-xs text-app-text-muted">
            {tr("One short routine: Reminders for actions, History for proof.")}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-accent shadow-[0_6px_14px_var(--app-frame-shadow)]">
          <AppIcon name="home" className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={openReminders}
          className="pc-btn-primary w-full gap-2"
        >
          <AppIcon name="add" className="h-4 w-4" />
          {tr("Open Reminders and add payment")}
        </button>
      </div>

      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[11px] text-app-text-muted">
        <AppIcon name="workspace" className="h-3.5 w-3.5" />
        <span>
          {tr("Runtime stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
        </span>
      </div>
    </section>
  );
}

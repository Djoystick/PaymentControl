import {
  clientEnv,
  isSupabaseClientConfigured,
  isTelegramConfigPresent,
} from "@/lib/config/client-env";
import { useLocalization } from "@/lib/i18n/localization";

export function LandingScreen() {
  const { tr } = useLocalization();

  return (
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
      <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
          {tr("Runtime status")}
        </summary>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
          <div className="rounded-xl bg-app-surface px-3 py-2 text-app-text">
            {tr("Telegram")}: {" "}
            <span className="font-semibold">
              {isTelegramConfigPresent ? tr("Configured") : tr("Pending env")}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface px-3 py-2 text-app-text">
            {tr("Supabase")}: {" "}
            <span className="font-semibold">
              {isSupabaseClientConfigured ? tr("Configured") : tr("Pending env")}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface px-3 py-2 text-app-text">
            {tr("Stage")}: <span className="font-semibold">{clientEnv.appStage}</span>
          </div>
        </div>
      </details>
    </section>
  );
}

import {
  clientEnv,
  isSupabaseClientConfigured,
  isTelegramConfigPresent,
} from "@/lib/config/client-env";
import { ProfileScenariosPlaceholder } from "@/components/app/profile-scenarios-placeholder";

const foundationSteps = [
  "Next.js + TypeScript + Tailwind project baseline",
  "Telegram Mini App bootstrap + init data verification API",
  "Supabase-backed profile upsert foundation",
  "Personal workspace + membership bootstrap foundation",
  "Current app context read endpoint and client context loading flow",
  "Profile scenario persistence (single/family) at profile level",
  "Recurring payments schema + personal workspace CRUD foundation",
  "Payment current-cycle paid/unpaid state foundation",
  "Dashboard MVP summary (today/upcoming/overdue + cycle state counts)",
  "Quick add starter templates for faster recurring payment creation",
  "Reminder preferences + reminder candidate foundation",
  "Controlled reminder dispatch + dispatch attempt logging foundation",
  "Telegram delivery readiness + manual test send diagnostics",
  "Safe local browser mode outside Telegram",
];

export function LandingScreen() {
  return (
    <>
      <section
        id="home-section"
        className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
          Home
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-app-text">
          Payment Control overview
        </h2>
        <p className="mt-2 text-sm text-app-text-muted">
          Working personal and family foundations are active in this runtime.
          Use the blocks below for daily tracking and quick status checks.
        </p>
        <details className="mt-3 rounded-2xl border border-app-border bg-app-surface-soft px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-app-text">
            Foundation steps (compact view)
          </summary>
          <ul className="mt-2 space-y-1.5 text-sm">
            {foundationSteps.map((step) => (
              <li
                key={step}
                className="rounded-xl bg-app-surface px-2 py-1.5 text-app-text"
              >
                {step}
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
        <h2 className="text-base font-semibold text-app-text">Bootstrap status</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
          <div className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text">
            Telegram integration surface:{" "}
            <span className="font-semibold">
              {isTelegramConfigPresent ? "Configured" : "Pending .env values"}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text">
            Supabase client config:{" "}
            <span className="font-semibold">
              {isSupabaseClientConfigured ? "Configured" : "Pending .env values"}
            </span>
          </div>
          <div className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text">
            App stage: <span className="font-semibold">{clientEnv.appStage}</span>
          </div>
        </div>
      </section>

      <ProfileScenariosPlaceholder />
    </>
  );
}

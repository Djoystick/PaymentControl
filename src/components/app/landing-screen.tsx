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
        className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
          Start Screen
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-app-text">
          Phase 6F delivery UX cleanup
        </h2>
        <p className="mt-2 text-sm text-app-text-muted">
          This pass keeps working reminder delivery as-is and polishes onboarding,
          phase labeling, and success-state readability.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {foundationSteps.map((step) => (
            <li
              key={step}
              className="rounded-xl bg-app-surface-soft px-3 py-2 text-app-text"
            >
              {step}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm">
        <h2 className="text-base font-semibold text-app-text">Bootstrap status</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
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

"use client";

import { useEffect, useState } from "react";

type AppShellProps = {
  children: React.ReactNode;
};

type AppTab = "home" | "activity" | "profile";

const tabTargets: Record<AppTab, string> = {
  home: "home-section",
  activity: "activity-section",
  profile: "profile-section",
};

const tabHashes: Record<AppTab, string> = {
  home: "#home-section",
  activity: "#activity-section",
  profile: "#profile-section",
};

const hashToTab: Record<string, AppTab> = {
  "#home-section": "home",
  "#activity-section": "activity",
  "#profile-section": "profile",
};

export function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("home");

  useEffect(() => {
    const syncActiveTabFromHash = () => {
      const nextTab = hashToTab[window.location.hash];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    };

    syncActiveTabFromHash();
    window.addEventListener("hashchange", syncActiveTabFromHash);
    return () => {
      window.removeEventListener("hashchange", syncActiveTabFromHash);
    };
  }, []);

  const handleTabClick = (tab: AppTab) => {
    setActiveTab(tab);
    const targetId = tabTargets[tab];
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-5">
      <header className="rounded-3xl border border-app-border bg-app-surface/95 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
          Telegram Mini App
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-app-text">
          Payment Control
        </h1>
        <p className="mt-1 text-sm text-app-text-muted">
          Foundation for recurring payments and household tracking
        </p>
      </header>

      <main className="relative z-0 mt-4 flex-1 space-y-3 pb-24">{children}</main>

      <footer className="sticky bottom-2 z-40 mt-4 rounded-3xl border border-app-border bg-app-surface p-2 shadow-sm [padding-bottom:calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="grid grid-cols-3 gap-2 text-xs font-medium">
          <a
            href={tabHashes.home}
            onClick={(event) => {
              event.preventDefault();
              handleTabClick("home");
            }}
            aria-current={activeTab === "home" ? "page" : undefined}
            className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
              activeTab === "home"
                ? "bg-app-accent text-white"
                : "bg-app-surface-soft text-app-text-muted"
            }`}
          >
            Home
          </a>
          <a
            href={tabHashes.activity}
            onClick={(event) => {
              event.preventDefault();
              handleTabClick("activity");
            }}
            aria-current={activeTab === "activity" ? "page" : undefined}
            className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
              activeTab === "activity"
                ? "bg-app-accent text-white"
                : "bg-app-surface-soft text-app-text-muted"
            }`}
          >
            Activity
          </a>
          <a
            href={tabHashes.profile}
            onClick={(event) => {
              event.preventDefault();
              handleTabClick("profile");
            }}
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={`touch-manipulation rounded-2xl px-2 py-3 text-center ${
              activeTab === "profile"
                ? "bg-app-accent text-white"
                : "bg-app-surface-soft text-app-text-muted"
            }`}
          >
            Profile
          </a>
        </div>
      </footer>
    </div>
  );
}

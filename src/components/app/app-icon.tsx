"use client";

type AppIconName =
  | "home"
  | "reminders"
  | "history"
  | "profile"
  | "help"
  | "theme"
  | "sun"
  | "moon"
  | "language"
  | "premium"
  | "workspace"
  | "support"
  | "payments"
  | "subscriptions"
  | "add"
  | "refresh"
  | "clock"
  | "alert"
  | "wallet"
  | "check"
  | "undo"
  | "edit"
  | "archive"
  | "template";

type AppIconProps = {
  name: AppIconName;
  className?: string;
  strokeWidth?: number;
};

export function AppIcon({
  name,
  className = "h-4 w-4",
  strokeWidth = 1.9,
}: AppIconProps) {
  const baseProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...baseProps}>
        <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
        <path d="M10 12h4v4h-4l0 -4" />
      </svg>
    );
  }

  if (name === "reminders") {
    return (
      <svg {...baseProps}>
        <path d="M3.5 5.5l1.5 1.5l2.5 -2.5" />
        <path d="M3.5 11.5l1.5 1.5l2.5 -2.5" />
        <path d="M3.5 17.5l1.5 1.5l2.5 -2.5" />
        <path d="M11 6l9 0" />
        <path d="M11 12l9 0" />
        <path d="M11 18l9 0" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...baseProps}>
        <path d="M12 8l0 4l2 2" />
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg {...baseProps}>
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M9 10a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
        <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
      </svg>
    );
  }

  if (name === "help") {
    return (
      <svg {...baseProps}>
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
        <path d="M12 16v.01" />
        <path d="M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
      </svg>
    );
  }

  if (name === "theme") {
    return (
      <svg {...baseProps}>
        <path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" />
        <path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      </svg>
    );
  }

  if (name === "sun") {
    return (
      <svg {...baseProps}>
        <path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
        <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
      </svg>
    );
  }

  if (name === "moon") {
    return (
      <svg {...baseProps}>
        <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" />
      </svg>
    );
  }

  if (name === "language") {
    return (
      <svg {...baseProps}>
        <path d="M9 6.371c0 4.418 -2.239 6.629 -5 6.629" />
        <path d="M4 6.371h7" />
        <path d="M5 9c0 2.144 2.252 3.908 6 4" />
        <path d="M12 20l4 -9l4 9" />
        <path d="M19.1 18h-6.2" />
        <path d="M6.694 3l.793 .582" />
      </svg>
    );
  }

  if (name === "premium") {
    return (
      <svg {...baseProps}>
        <path d="M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4l4 -6" />
      </svg>
    );
  }

  if (name === "workspace") {
    return (
      <svg {...baseProps}>
        <path d="M8 9l5 5v7h-5v-4m0 4h-5v-7l5 -5m1 1v-6a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v17h-8" />
        <path d="M13 7l0 .01" />
        <path d="M17 7l0 .01" />
        <path d="M17 11l0 .01" />
        <path d="M17 15l0 .01" />
      </svg>
    );
  }

  if (name === "support") {
    return (
      <svg {...baseProps}>
        <path d="M9 9v-1a3 3 0 0 1 6 0v1" />
        <path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" />
        <path d="M3 13l4 0" />
        <path d="M17 13l4 0" />
        <path d="M12 20l0 -6" />
        <path d="M4 19l3.35 -2" />
        <path d="M20 19l-3.35 -2" />
        <path d="M4 7l3.75 2.4" />
        <path d="M20 7l-3.75 2.4" />
      </svg>
    );
  }

  if (name === "payments") {
    return (
      <svg {...baseProps}>
        <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2" />
      </svg>
    );
  }

  if (name === "add") {
    return (
      <svg {...baseProps}>
        <path d="M12 5l0 14" />
        <path d="M5 12l14 0" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...baseProps}>
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...baseProps}>
        <path d="M12 7l0 5l3 3" />
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...baseProps}>
        <path d="M12 9v4" />
        <path d="M12 16v.01" />
        <path d="M5.07 19h13.86c1.54 0 2.5 -1.67 1.73 -3l-6.93 -12c-.77 -1.33 -2.69 -1.33 -3.46 0l-6.93 12c-.77 1.33 .19 3 1.73 3z" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg {...baseProps}>
        <path d="M17 8h1a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-13a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12" />
        <path d="M15 8v-3a1 1 0 0 0 -1 -1h-10" />
        <path d="M18 13v.01" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...baseProps}>
        <path d="M5 12l5 5l10 -10" />
      </svg>
    );
  }

  if (name === "undo") {
    return (
      <svg {...baseProps}>
        <path d="M9 14l-4 -4l4 -4" />
        <path d="M5 10h7a5 5 0 0 1 5 5v1" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...baseProps}>
        <path d="M8 20h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 .293 -.707l10 -10a2.414 2.414 0 0 1 3.414 0l1.293 1.293a2.414 2.414 0 0 1 0 3.414l-10 10a1 1 0 0 1 -.707 .293z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    );
  }

  if (name === "archive") {
    return (
      <svg {...baseProps}>
        <path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v2h-18z" />
        <path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-8" />
        <path d="M10 12l4 0" />
      </svg>
    );
  }

  if (name === "template") {
    return (
      <svg {...baseProps}>
        <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
        <path d="M6 16h-1a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  return (
    <svg {...baseProps}>
      <path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3" />
      <path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3" />
    </svg>
  );
}

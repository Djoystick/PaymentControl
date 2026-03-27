"use client";

import { useEffect, useRef, useState } from "react";

type HelpPopoverProps = {
  buttonLabel: string;
  title: string;
  children: React.ReactNode;
};

export function HelpPopover({ buttonLabel, title, children }: HelpPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsidePointer);
    window.addEventListener("touchstart", handleOutsidePointer);
    window.addEventListener("keydown", handleEscClose);

    return () => {
      window.removeEventListener("mousedown", handleOutsidePointer);
      window.removeEventListener("touchstart", handleOutsidePointer);
      window.removeEventListener("keydown", handleEscClose);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={buttonLabel}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-app-border bg-white text-[11px] font-semibold text-app-text"
      >
        ?
      </button>

      {isOpen && (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-app-border bg-white p-3 text-left text-xs text-app-text shadow-[0_10px_24px_rgba(19,32,20,0.14)]">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-app-text">{title}</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={buttonLabel}
              className="rounded-md border border-app-border px-1.5 py-0.5 text-[11px] text-app-text-muted"
            >
              x
            </button>
          </div>
          <div className="mt-1.5 space-y-1 text-app-text-muted">{children}</div>
        </div>
      )}
    </div>
  );
}

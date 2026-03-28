"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AppIcon } from "@/components/app/app-icon";

type HelpPopoverProps = {
  buttonLabel: string;
  title: string;
  children: React.ReactNode;
};

export function HelpPopover({ buttonLabel, title, children }: HelpPopoverProps) {
  const viewportPadding = 10;
  const triggerGap = 8;
  const fallbackPopoverHeight = 180;
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setPopoverStyle(null);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportOffsetLeft = visualViewport?.offsetLeft ?? 0;
    const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(272, viewportWidth - viewportPadding * 2);
    if (width <= 0) {
      return;
    }
    const popoverHeight = popoverRef.current?.offsetHeight ?? fallbackPopoverHeight;

    let left = triggerRect.left + triggerRect.width / 2 - width / 2;
    left = Math.max(
      viewportOffsetLeft + viewportPadding,
      Math.min(
        left,
        viewportOffsetLeft + viewportWidth - width - viewportPadding,
      ),
    );

    let top = triggerRect.bottom + triggerGap;
    const canRenderAbove =
      triggerRect.top - triggerGap - popoverHeight >=
      viewportOffsetTop + viewportPadding;
    const overflowsBottom =
      top + popoverHeight + viewportPadding >
      viewportOffsetTop + viewportHeight;

    if (overflowsBottom && canRenderAbove) {
      top = triggerRect.top - triggerGap - popoverHeight;
    }

    top = Math.max(
      viewportOffsetTop + viewportPadding,
      Math.min(
        top,
        viewportOffsetTop + viewportHeight - popoverHeight - viewportPadding,
      ),
    );

    setPopoverStyle({ left, top, width });
  }, [fallbackPopoverHeight, triggerGap, viewportPadding]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();
  }, [isOpen, updatePopoverPosition]);

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
        closePopover();
      }
    };

    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePopover();
      }
    };

    const handleViewportChange = () => {
      updatePopoverPosition();
    };

    window.requestAnimationFrame(() => {
      updatePopoverPosition();
    });

    window.addEventListener("mousedown", handleOutsidePointer);
    window.addEventListener("touchstart", handleOutsidePointer);
    window.addEventListener("keydown", handleEscClose);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("mousedown", handleOutsidePointer);
      window.removeEventListener("touchstart", handleOutsidePointer);
      window.removeEventListener("keydown", handleEscClose);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closePopover, isOpen, updatePopoverPosition]);

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((current) => {
            const nextState = !current;
            if (!nextState) {
              setPopoverStyle(null);
            }
            return nextState;
          });
        }}
        aria-label={buttonLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-app-border bg-app-surface-elevated text-app-text"
      >
        <AppIcon name="help" className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`fixed z-[70] max-h-[calc(100dvh-20px)] max-w-[calc(100dvw-20px)] overflow-y-auto rounded-xl border border-app-border bg-app-surface-elevated p-3 text-left text-xs text-app-text shadow-[0_10px_24px_var(--app-frame-shadow)] ${
            popoverStyle ? "" : "invisible"
          }`}
          style={
            popoverStyle ?? {
              left: `${viewportPadding}px`,
              top: `${viewportPadding}px`,
              width: `calc(100dvw - ${viewportPadding * 2}px)`,
            }
          }
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-app-text">{title}</p>
            <button
              type="button"
              onClick={closePopover}
              aria-label={buttonLabel}
              className="rounded-md border border-app-border px-1.5 py-0.5 text-[11px] text-app-text-muted"
            >
              x
            </button>
          </div>
          <div className="mt-1.5 space-y-1 break-words [overflow-wrap:anywhere] text-app-text-muted">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

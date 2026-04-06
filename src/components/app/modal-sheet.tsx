"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocalization } from "@/lib/i18n/localization";
import { AppIcon } from "@/components/app/app-icon";

type ModalSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  titleIcon?: ReactNode;
  children: ReactNode;
  widthClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
};

export function ModalSheet({
  open,
  onClose,
  title,
  description,
  titleIcon,
  children,
  widthClassName = "max-w-lg",
  overlayClassName = "z-[95]",
  bodyClassName = "",
}: ModalSheetProps) {
  const { tr } = useLocalization();

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`pc-modal-overlay pc-modal-overlay-sheet ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pc-modal-dialog w-full ${widthClassName} p-3 sm:p-3.5`}
        style={{
          maxHeight:
            "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pc-modal-sheet-head">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-app-text">
              {titleIcon}
              {title}
            </p>
            {description && (
              <p className="mt-1 text-xs text-app-text-muted">{description}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="pc-btn-quiet min-h-8 px-2 py-1 text-[11px]">
            <AppIcon name="undo" className="h-3.5 w-3.5" />
            {tr("Close")}
          </button>
        </div>
        <div className={`pc-modal-sheet-body ${bodyClassName}`.trim()}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

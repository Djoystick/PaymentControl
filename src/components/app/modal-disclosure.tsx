"use client";

import { ReactNode, useState } from "react";
import { ModalSheet } from "@/components/app/modal-sheet";

type ModalDisclosureProps = {
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  trigger: ReactNode;
  triggerClassName?: string;
  widthClassName?: string;
  overlayClassName?: string;
  children: ReactNode;
};

export function ModalDisclosure({
  title,
  titleIcon,
  description,
  trigger,
  triggerClassName = "pc-btn-secondary w-full justify-start",
  widthClassName = "max-w-lg",
  overlayClassName = "z-[96]",
  children,
}: ModalDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>
      <ModalSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        titleIcon={titleIcon}
        description={description}
        widthClassName={widthClassName}
        overlayClassName={overlayClassName}
      >
        {children}
      </ModalSheet>
    </>
  );
}

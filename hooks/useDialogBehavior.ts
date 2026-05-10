"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

let dialogOpenCount = 0;
let savedBodyOverflow: string | null = null;

export function useDialogBehavior(
  open: boolean,
  onClose: () => void,
  dialogRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (dialogRef?.current && e.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled"));

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, dialogRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (dialogOpenCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialogOpenCount += 1;
    return () => {
      dialogOpenCount -= 1;
      if (dialogOpenCount <= 0) {
        dialogOpenCount = 0;
        document.body.style.overflow = savedBodyOverflow ?? "";
        savedBodyOverflow = null;
      }
    };
  }, [open]);
}

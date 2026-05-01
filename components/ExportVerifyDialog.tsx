"use client";

import { useCallback, useId } from "react";
import { ExportTurnstile } from "./ExportTurnstile";
import { useDialogBehavior } from "../hooks/useDialogBehavior";
import { buttonStyles } from "../utils/styles";

type ExportVerifyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteKey: string;
  widgetKey: number;
  /** Called with Turnstile token when verification succeeds. */
  onVerified: (token: string) => void;
};

export function ExportVerifyDialog({
  open,
  onOpenChange,
  siteKey,
  widgetKey,
  onVerified,
}: ExportVerifyDialogProps) {
  const titleId = useId();

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useDialogBehavior(open, handleClose);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Close verification dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="text-center text-[0.92rem] font-semibold tracking-[0.04em] text-white/88"
        >
          Verify to download
        </h2>
        <p className="mt-2 text-center text-[0.76rem] leading-snug tracking-[0.03em] text-white/48">
          Complete the check below, then your export will start.
        </p>
        <div className="mt-5 flex justify-center">
          <ExportTurnstile
            siteKey={siteKey}
            widgetKey={widgetKey}
            onToken={(token) => {
              if (token) {
                onVerified(token);
              }
            }}
          />
        </div>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={buttonStyles.reload}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

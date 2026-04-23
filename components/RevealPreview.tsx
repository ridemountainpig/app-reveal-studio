"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { AppReveal } from "./AppReveal";
import { ExportMessageDialog } from "./ExportMessageDialog";
import { ExportVerifyDialog } from "./ExportVerifyDialog";
import type {
  BadgeVariant,
  EditableLayerId,
  LayerTransform,
  LayerTransforms,
} from "../types/revealControls";
import { buttonStyles } from "../utils/styles";

type RevealPreviewProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  badgeVariant: BadgeVariant;
  badgePrefix: string;
  iconCornerRadius: number;
  durationMs: number;
  playbackRate: number;
  restartToken: number;
  iconUrl?: string;
  badgeIconUrl?: string;
  glowColor: string;
  glowSize: number;
  rimColor: string;
  grayColor: string;
  layerTransforms: LayerTransforms;
  previewPadding: string;
  onLayerTransformChange: (
    layerId: EditableLayerId,
    value: LayerTransform,
  ) => void;
  onReloadAnimation: () => void;
  onExportVideo: () => void;
  onCancelExport: () => void;
  exportStatus: string;
  exportDialog: { title: string; message: string } | null;
  isExporting: boolean;
  isCancelling: boolean;
  turnstileSiteKey?: string;
  onTurnstileToken: (token: string | null) => void;
  onDismissExportDialog: () => void;
};

export function RevealPreview({
  title,
  subtitle,
  ctaLabel,
  badgeVariant,
  badgePrefix,
  iconCornerRadius,
  durationMs,
  playbackRate,
  restartToken,
  iconUrl,
  badgeIconUrl,
  glowColor,
  glowSize,
  rimColor,
  grayColor,
  layerTransforms,
  previewPadding,
  onLayerTransformChange,
  onReloadAnimation,
  onExportVideo,
  onCancelExport,
  exportStatus,
  exportDialog,
  isExporting,
  isCancelling,
  turnstileSiteKey,
  onTurnstileToken,
  onDismissExportDialog,
}: RevealPreviewProps) {
  const [exportVerifyOpen, setExportVerifyOpen] = useState(false);
  const [dialogTurnstileKey, setDialogTurnstileKey] = useState(0);

  const handleDownloadClick = useCallback(() => {
    if (isExporting || isCancelling) {
      return;
    }
    if (turnstileSiteKey) {
      if (exportVerifyOpen) {
        return;
      }
      setDialogTurnstileKey((k) => k + 1);
      setExportVerifyOpen(true);
      return;
    }
    onExportVideo();
  }, [
    exportVerifyOpen,
    isCancelling,
    isExporting,
    onExportVideo,
    turnstileSiteKey,
  ]);

  const handleVerifyDialogClose = useCallback(
    (open: boolean) => {
      setExportVerifyOpen(open);
      if (!open) {
        onTurnstileToken(null);
      }
    },
    [onTurnstileToken],
  );

  const handleTurnstileVerified = useCallback(
    (token: string) => {
      onTurnstileToken(token);
      setExportVerifyOpen(false);
      onExportVideo();
    },
    [onExportVideo, onTurnstileToken],
  );

  return (
    <div
      className={`flex w-full min-w-0 flex-col items-center ${previewPadding} py-6 pb-10 sm:py-8 sm:pb-12`}
    >
      <div className="flex shrink-0 justify-center">
        <AppReveal
          title={title}
          subtitle={subtitle}
          ctaLabel={ctaLabel}
          badgeVariant={badgeVariant}
          badgePrefix={badgePrefix}
          iconCornerRadius={iconCornerRadius}
          durationMs={durationMs}
          playbackRate={playbackRate}
          restartToken={restartToken}
          iconUrl={iconUrl}
          iconAlt={title}
          badgeIconUrl={badgeIconUrl}
          badgeIconAlt={ctaLabel}
          glowColor={glowColor}
          glowSize={glowSize}
          rimColor={rimColor}
          grayColor={grayColor}
          editable={!isExporting}
          layerTransforms={layerTransforms}
          onLayerTransformChange={onLayerTransformChange}
        />
      </div>
      <section className="mt-8 flex w-full max-w-full flex-col items-center justify-center gap-2 px-4 sm:mt-10">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={onReloadAnimation}
              className={buttonStyles.reload}
              aria-label="Reload Animation"
              disabled={isExporting}
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M15.833 10A5.833 5.833 0 1 1 14.125 5.875"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.833 3.333V6.667H12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reload
            </motion.button>

            <motion.button
              type="button"
              whileHover={isCancelling ? undefined : { scale: 1.03 }}
              whileTap={isCancelling ? undefined : { scale: 0.98 }}
              onClick={isExporting ? onCancelExport : handleDownloadClick}
              disabled={isCancelling}
              className={buttonStyles.export}
              aria-label={
                isCancelling
                  ? "Cancelling export"
                  : isExporting
                    ? "Cancel export"
                    : "Download Animation"
              }
            >
              {isExporting ? (
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="m15 9-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m9 9 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M10 3.333V12.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.667 9.583L10 12.917L13.333 9.583"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.167 15.833H15.833"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="sm:hidden">
                {isCancelling
                  ? "Cancelling..."
                  : isExporting
                    ? "Cancel"
                    : "Download"}
              </span>
              <span className="hidden sm:inline">
                {isCancelling
                  ? "Cancelling..."
                  : isExporting
                    ? "Cancel Download"
                    : "Download Animation"}
              </span>
            </motion.button>
          </div>
          <div className="flex min-h-5 items-center justify-center gap-2 text-center text-[0.76rem] font-medium tracking-[0.03em] text-white/52">
            {isExporting ? (
              <svg
                className="h-3.5 w-3.5 shrink-0 animate-spin"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="6.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  opacity="0.24"
                />
                <path
                  d="M10 3.5A6.5 6.5 0 0 1 16.5 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
            <p>{exportStatus}</p>
          </div>
        </div>
      </section>
      {!isExporting ? (
        <p className="pointer-events-none max-w-[min(18rem,calc(100vw-2rem))] px-4 text-center text-[0.72rem] leading-snug font-medium tracking-[0.03em] text-white/38 sm:max-w-[min(20rem,calc(100vw-8rem))] sm:px-0">
          Drag title, subtitle, icon, or badge to move, use blue corner handles
          to scale.
        </p>
      ) : null}

      {turnstileSiteKey ? (
        <ExportVerifyDialog
          open={exportVerifyOpen}
          onOpenChange={handleVerifyDialogClose}
          siteKey={turnstileSiteKey}
          widgetKey={dialogTurnstileKey}
          onVerified={handleTurnstileVerified}
        />
      ) : null}
      {exportDialog ? (
        <ExportMessageDialog
          open
          title={exportDialog.title}
          message={exportDialog.message}
          onOpenChange={(open) => {
            if (!open) {
              onDismissExportDialog();
            }
          }}
        />
      ) : null}
    </div>
  );
}

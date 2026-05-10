"use client";

import { motion } from "framer-motion";
import { startTransition, useCallback, useMemo, useRef, useState } from "react";
import { RevealPreview } from "../components/RevealPreview";
import { RevealControlsPanel } from "../components/RevealControlsPanel";
import { useExportVideo } from "../hooks/useExportVideo";
import { useRevealControls } from "../hooks/useRevealControls";
import { getExportPayload } from "../utils/exportPayload";
import { buttonStyles } from "../utils/styles";

export default function Home() {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
  const [animationReloadKey, setAnimationReloadKey] = useState(0);
  const {
    controls,
    iconFileInputKey,
    badgeIconFileInputKey,
    uploadedIconName,
    uploadedIconUrl,
    uploadedBadgeIconName,
    uploadedBadgeIconUrl,
    updateTextControl,
    updateRangeControl,
    updateColorControl,
    updateBadgeVariant,
    updateLayerTransform,
    setUploadedIconFile,
    setUploadedBadgeIconFile,
    clearUploadedIcon,
    clearUploadedBadgeIcon,
    safeTitle,
    safeSubtitle,
    safeBadgeVariant,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
    safeLayerTransforms,
  } = useRevealControls();

  const toggleCollapsed = useCallback(() => {
    setIsPanelCollapsed((current) => !current);
  }, []);

  const requestCollapse = useCallback(() => {
    setIsPanelCollapsed(true);
  }, []);

  const reloadAnimation = useCallback(() => {
    startTransition(() => {
      setAnimationReloadKey((current) => current + 1);
    });
  }, []);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileTokenRef = useRef<string | null>(null);
  const handleTurnstileToken = useCallback((token: string | null) => {
    turnstileTokenRef.current = token;
  }, []);
  const getTurnstileToken = useCallback(() => turnstileTokenRef.current, []);
  const onExportTurnstileReset = useCallback(() => {
    turnstileTokenRef.current = null;
  }, []);

  const exportPayload = useMemo(
    () =>
      getExportPayload({
        safeTitle,
        safeSubtitle,
        safeBadgeVariant,
        safeBadgeLabel,
        safeBadgePrefix,
        safeIconUrl,
        safeBadgeIconUrl,
        previewControls: controls,
      }),
    [
      safeTitle,
      safeSubtitle,
      safeBadgeVariant,
      safeBadgeLabel,
      safeBadgePrefix,
      safeIconUrl,
      safeBadgeIconUrl,
      controls,
    ],
  );

  const {
    isExporting,
    isCancelling,
    exportStatus,
    exportDialog,
    exportVideo,
    cancelExport,
    dismissExportDialog,
  } = useExportVideo(
    turnstileSiteKey
      ? {
          payload: exportPayload,
          turnstileRequired: true,
          getTurnstileToken,
          onExportSettled: onExportTurnstileReset,
        }
      : { payload: exportPayload },
  );

  const previewPadding = isPanelCollapsed ? "" : "xl:pr-[27rem]";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-x-auto overflow-y-auto bg-black">
      <h1 className="sr-only">
        App Reveal Studio — Create App Reveal Videos Online
      </h1>
      <motion.a
        href="https://yencheng.dev"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className={buttonStyles.cornerLink}
        aria-label="YC — yencheng.dev"
      >
        Built by YC
      </motion.a>

      <RevealControlsPanel
        controls={controls}
        isCollapsed={isPanelCollapsed}
        iconFileInputKey={iconFileInputKey}
        badgeIconFileInputKey={badgeIconFileInputKey}
        uploadedIconName={uploadedIconName}
        uploadedIconUrl={uploadedIconUrl}
        uploadedBadgeIconName={uploadedBadgeIconName}
        uploadedBadgeIconUrl={uploadedBadgeIconUrl}
        onToggleCollapsed={toggleCollapsed}
        onRequestCollapse={requestCollapse}
        onTextChange={updateTextControl}
        onRangeChange={updateRangeControl}
        onColorChange={updateColorControl}
        onBadgeVariantChange={updateBadgeVariant}
        onIconFileChange={setUploadedIconFile}
        onBadgeIconFileChange={setUploadedBadgeIconFile}
        onClearUploadedIcon={clearUploadedIcon}
        onClearUploadedBadgeIcon={clearUploadedBadgeIcon}
      />

      <RevealPreview
        title={safeTitle}
        subtitle={safeSubtitle}
        ctaLabel={safeBadgeLabel}
        badgeVariant={safeBadgeVariant}
        badgePrefix={safeBadgePrefix}
        iconCornerRadius={controls.iconCornerRadius}
        durationMs={controls.durationMs}
        playbackRate={controls.playbackRate}
        restartToken={animationReloadKey}
        iconUrl={safeIconUrl}
        badgeIconUrl={safeBadgeIconUrl}
        glowColor={controls.glowColor}
        glowSize={controls.glowSize}
        rimColor={controls.rimColor}
        grayColor={controls.grayColor}
        layerTransforms={safeLayerTransforms}
        previewPadding={previewPadding}
        onLayerTransformChange={updateLayerTransform}
        onReloadAnimation={reloadAnimation}
        onExportVideo={exportVideo}
        onCancelExport={cancelExport}
        exportStatus={exportStatus}
        exportDialog={exportDialog}
        isExporting={isExporting}
        isCancelling={isCancelling}
        turnstileSiteKey={turnstileSiteKey}
        onTurnstileToken={handleTurnstileToken}
        onDismissExportDialog={dismissExportDialog}
      />
    </main>
  );
}

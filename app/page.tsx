"use client";

import { motion } from "framer-motion";
import { startTransition, useCallback, useState } from "react";
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
    previewControls,
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

  const exportPayload = getExportPayload({
    safeTitle,
    safeSubtitle,
    safeBadgeVariant,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
    previewControls,
  });

  const { isExporting, isCancelling, exportStatus, exportVideo, cancelExport } =
    useExportVideo({
      payload: exportPayload,
    });

  const previewPadding = isPanelCollapsed ? "xl:pr-[7.5rem]" : "xl:pr-[27rem]";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-x-auto overflow-y-auto bg-black">
      <motion.a
        href="https://yencheng.dev"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className={buttonStyles.cornerLink}
        aria-label="YC — yencheng.dev"
      >
        Build by YC
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
        iconCornerRadius={previewControls.iconCornerRadius}
        durationMs={previewControls.durationMs}
        playbackRate={previewControls.playbackRate}
        restartToken={animationReloadKey}
        iconUrl={safeIconUrl}
        badgeIconUrl={safeBadgeIconUrl}
        glowColor={previewControls.glowColor}
        glowSize={previewControls.glowSize}
        rimColor={previewControls.rimColor}
        grayColor={previewControls.grayColor}
        layerTransforms={safeLayerTransforms}
        previewPadding={previewPadding}
        onLayerTransformChange={updateLayerTransform}
        onReloadAnimation={reloadAnimation}
        onExportVideo={exportVideo}
        onCancelExport={cancelExport}
        exportStatus={exportStatus}
        isExporting={isExporting}
        isCancelling={isCancelling}
      />
    </main>
  );
}

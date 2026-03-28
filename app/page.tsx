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
        href="https://github.com/ridemountainpig/app-reveal-studio"
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className={buttonStyles.github}
      >
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.426 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.344-3.369-1.344-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.07 1.532 1.033 1.532 1.033.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.53 9.53 0 0 1 2.504.337c1.909-1.296 2.748-1.027 2.748-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.481A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z" />
        </svg>
        GitHub
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

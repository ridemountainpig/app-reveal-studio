"use client";

import { motion } from "framer-motion";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AppReveal } from "../components/AppReveal";
import { RevealControlsPanel } from "../components/RevealControlsPanel";
import { useRevealControls } from "../hooks/useRevealControls";
import { buttonStyles, mediaQueries, exportMessages } from "../utils/styles";

type RevealPreviewProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  badgePrefix: string;
  iconCornerRadius: number;
  durationMs: number;
  playbackRate: number;
  restartToken: number;
  iconUrl?: string;
  badgeIconUrl?: string;
  glowColor: string;
  rimColor: string;
  grayColor: string;
  previewPadding: string;
  previewRef: RefObject<HTMLDivElement | null>;
  onReloadAnimation: () => void;
  onExportVideo: () => void;
  exportStatus: string;
  isExporting: boolean;
};

const RevealPreview = memo(function RevealPreview({
  title,
  subtitle,
  ctaLabel,
  badgePrefix,
  iconCornerRadius,
  durationMs,
  playbackRate,
  restartToken,
  iconUrl,
  badgeIconUrl,
  glowColor,
  rimColor,
  grayColor,
  previewPadding,
  previewRef,
  onReloadAnimation,
  onExportVideo,
  exportStatus,
  isExporting,
}: RevealPreviewProps) {
  return (
    <>
      <div className={`flex w-full flex-col items-center ${previewPadding}`}>
        <div
          ref={previewRef}
          className="px-[clamp(1.5rem,5vw,3rem)] py-[clamp(2rem,6vw,4rem)]"
        >
          <AppReveal
            title={title}
            subtitle={subtitle}
            ctaLabel={ctaLabel}
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
            rimColor={rimColor}
            grayColor={grayColor}
          />
        </div>
      </div>
      <section
        className={`fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-8 ${previewPadding}`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={onReloadAnimation}
              className={buttonStyles.reload}
              aria-label="Reload Animation"
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
              whileHover={isExporting ? undefined : { scale: 1.03 }}
              whileTap={isExporting ? undefined : { scale: 0.98 }}
              onClick={onExportVideo}
              disabled={isExporting}
              className={buttonStyles.export}
              aria-label={
                isExporting ? "Rendering Animation" : "Download Animation"
              }
            >
              {isExporting ? (
                <svg
                  className="h-4 w-4 shrink-0 animate-spin"
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
                {isExporting ? "Rendering..." : "Download"}
              </span>
              <span className="hidden sm:inline">
                {isExporting ? "Rendering Animation..." : "Download Animation"}
              </span>
            </motion.button>
          </div>
          <p className="min-h-5 text-center text-[0.76rem] font-medium tracking-[0.03em] text-white/52">
            {exportStatus}
          </p>
        </div>
      </section>
    </>
  );
});

const SUCCESS_RESET_MS = 2400;
const MAX_EXPORT_PAYLOAD_BYTES = 4 * 1024 * 1024;

function getExportPayload(
  safeTitle: string,
  safeSubtitle: string,
  safeBadgeLabel: string,
  safeBadgePrefix: string,
  safeIconUrl: string | undefined,
  safeBadgeIconUrl: string | undefined,
  previewControls: {
    iconCornerRadius: number;
    durationMs: number;
    playbackRate: number;
    glowColor: string;
    rimColor: string;
    grayColor: string;
  },
) {
  return {
    title: safeTitle,
    subtitle: safeSubtitle,
    ctaLabel: safeBadgeLabel,
    badgePrefix: safeBadgePrefix,
    iconUrl: safeIconUrl ?? "",
    badgeIconUrl: safeBadgeIconUrl ?? "",
    iconCornerRadius: String(previewControls.iconCornerRadius),
    durationMs: String(previewControls.durationMs),
    playbackRate: String(previewControls.playbackRate),
    glowColor: previewControls.glowColor,
    rimColor: previewControls.rimColor,
    grayColor: previewControls.grayColor,
  };
}

export default function Home() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);

  useEffect(() => {
    setIsPanelCollapsed(!window.matchMedia(mediaQueries.desktopMin).matches);
  }, []);
  const [animationReloadKey, setAnimationReloadKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
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
    setUploadedIconFile,
    setUploadedBadgeIconFile,
    clearUploadedIcon,
    clearUploadedBadgeIcon,
    safeTitle,
    safeSubtitle,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
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

  const exportVideo = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportStatus(exportMessages.rendering);

    try {
      const payload = getExportPayload(
        safeTitle,
        safeSubtitle,
        safeBadgeLabel,
        safeBadgePrefix,
        safeIconUrl,
        safeBadgeIconUrl,
        previewControls,
      );
      const serializedPayload = JSON.stringify(payload);
      const payloadBytes = new TextEncoder().encode(serializedPayload).length;

      if (payloadBytes > MAX_EXPORT_PAYLOAD_BYTES) {
        throw new Error(
          "Images are too large to export. Use smaller files or lower-resolution icons.",
        );
      }

      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serializedPayload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Export failed.");
      }

      setExportStatus(exportMessages.downloading);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "app-reveal.mp4";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);

      setExportStatus(exportMessages.downloaded);
      setTimeout(() => setExportStatus(""), SUCCESS_RESET_MS);
    } catch (error) {
      setExportStatus(
        error instanceof Error ? error.message : exportMessages.failed,
      );
      setTimeout(() => setExportStatus(""), SUCCESS_RESET_MS);
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    safeTitle,
    safeSubtitle,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
    previewControls,
  ]);

  const previewPadding = isPanelCollapsed ? "xl:pr-[7.5rem]" : "xl:pr-[27rem]";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-x-hidden overflow-y-auto bg-black px-[clamp(1.5rem,5vw,3rem)] py-[clamp(1.5rem,5vw,3rem)]">
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
        onIconFileChange={setUploadedIconFile}
        onBadgeIconFileChange={setUploadedBadgeIconFile}
        onClearUploadedIcon={clearUploadedIcon}
        onClearUploadedBadgeIcon={clearUploadedBadgeIcon}
      />

      <RevealPreview
        title={safeTitle}
        subtitle={safeSubtitle}
        ctaLabel={safeBadgeLabel}
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
        previewPadding={previewPadding}
        previewRef={previewRef}
        onReloadAnimation={reloadAnimation}
        onExportVideo={exportVideo}
        exportStatus={exportStatus}
        isExporting={isExporting}
      />
    </main>
  );
}

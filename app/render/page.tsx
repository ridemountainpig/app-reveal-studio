"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppReveal } from "../../components/AppReveal";
import {
  EXPORT_PAYLOAD_STORAGE_KEY,
  EXPORT_SETTINGS,
} from "../../constants/exportSettings";
import {
  readRenderControls,
  type RenderControls,
} from "../../utils/renderControls";

declare global {
  interface Window {
    __EXPORT_READY__?: boolean;
    __EXPORT_ERROR__?: string;
    __setTimelineProgress?: (progress: number) => Promise<void>;
  }
}

const waitForNextPaint = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));

const waitForImages = async (container: HTMLElement) => {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, EXPORT_SETTINGS.IMAGE_LOAD_TIMEOUT_MS);
          }),
    ),
  );
};

export default function RenderPage() {
  return (
    <Suspense>
      <RenderPageInner />
    </Suspense>
  );
}

function RenderPageInner() {
  const searchParams = useSearchParams();
  const captureRef = useRef<HTMLDivElement | null>(null);
  const hasStarted = useRef(false);
  const timelineRef = useRef<{ set: (value: number) => void } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const [renderControls, setRenderControls] = useState<RenderControls>(() =>
    readRenderControls((key) => searchParams.get(key) ?? undefined),
  );

  useEffect(() => {
    const exportMode = searchParams.get("renderMode") === "export";
    setIsExportMode(exportMode);

    if (!exportMode) {
      setRenderControls(
        readRenderControls((key) => searchParams.get(key) ?? undefined),
      );
      setIsReady(true);
      return;
    }

    try {
      const rawPayload = window.sessionStorage.getItem(
        EXPORT_PAYLOAD_STORAGE_KEY,
      );
      if (!rawPayload) {
        throw new Error("Export payload not found.");
      }

      const payload = JSON.parse(rawPayload) as Record<string, string>;
      setRenderControls(readRenderControls((key) => payload[key]));
      window.sessionStorage.removeItem(EXPORT_PAYLOAD_STORAGE_KEY);
      setIsReady(true);
    } catch (error) {
      window.__EXPORT_ERROR__ =
        error instanceof Error ? error.message : "Invalid export payload.";
      window.__EXPORT_READY__ = true;
    }
  }, [searchParams]);

  const {
    title,
    subtitle,
    ctaLabel,
    badgeVariant,
    badgePrefix,
    iconUrl,
    badgeIconUrl,
    iconCornerRadius,
    durationMs,
    playbackRate,
    glowColor,
    glowSize,
    rimColor,
    grayColor,
    layerTransforms,
  } = renderControls;

  useEffect(() => {
    if (!isReady || !isExportMode) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    let cancelled = false;

    const setup = async () => {
      const node = captureRef.current;
      if (!node) {
        throw new Error("Capture node not found.");
      }

      if (typeof document !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }

      await waitForImages(node);
      await waitForNextPaint();
      if (cancelled) return;

      const rect = node.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) {
        throw new Error("Invalid preview size.");
      }

      const scale = Math.min(
        EXPORT_SETTINGS.WIDTH / rect.width,
        EXPORT_SETTINGS.HEIGHT / rect.height,
      );
      node.style.transform = `scale(${scale})`;
      node.style.transformOrigin = "center center";

      timelineRef.current?.set(0);

      window.__setTimelineProgress = (progress: number) =>
        new Promise<void>((resolve) => {
          timelineRef.current?.set(progress);
          requestAnimationFrame(() => resolve());
        });

      await waitForNextPaint();
      await waitForNextPaint();
      window.__EXPORT_READY__ = true;
    };

    setup().catch((error) => {
      window.__EXPORT_ERROR__ =
        error instanceof Error ? error.message : "Export setup failed.";
      window.__EXPORT_READY__ = true;
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, isExportMode]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black"
      style={{ width: 1080, height: 1920 }}
    >
      {isReady ? (
        <div ref={captureRef} className={isExportMode ? "" : "px-12 py-16"}>
          <AppReveal
            title={title}
            subtitle={subtitle}
            ctaLabel={ctaLabel}
            badgeVariant={badgeVariant}
            badgePrefix={badgePrefix}
            iconCornerRadius={iconCornerRadius}
            durationMs={durationMs}
            playbackRate={playbackRate}
            restartToken={1}
            iconUrl={iconUrl}
            iconAlt={title}
            badgeIconUrl={badgeIconUrl}
            badgeIconAlt={ctaLabel}
            glowColor={glowColor}
            glowSize={glowSize}
            rimColor={rimColor}
            grayColor={grayColor}
            layerTransforms={layerTransforms}
            timelineRef={timelineRef}
          />
        </div>
      ) : null}
    </div>
  );
}

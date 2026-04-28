"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppReveal } from "../../components/AppReveal";
import { generateVideo } from "../../lib/exportVideo";
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
    __EXPORT_DONE__?: boolean;
    __EXPORT_RESULT_BASE64__?: string;
    __EXPORT_ERROR__?: string;
    __CAPTURE_DONE__?: boolean;
    __CAPTURE_FRAMES__?: string[];
    __CAPTURE_ERROR__?: string;
    __ENCODE_INPUT__?: { frames: string[] };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to serialize export result."));
        return;
      }

      const commaIndex = reader.result.indexOf(",");
      resolve(
        commaIndex === -1 ? reader.result : reader.result.slice(commaIndex + 1),
      );
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to serialize export result."));
    };

    reader.readAsDataURL(new Blob([buffer], { type: "video/mp4" }));
  });
}

export default function RenderPage() {
  return (
    <Suspense>
      <RenderPageInner />
    </Suspense>
  );
}

function RenderPageInner() {
  const searchParams = useSearchParams();
  const renderMode = searchParams.get("renderMode");

  if (renderMode === "encodeFrames") {
    return <EncodeFramesInner />;
  }

  return <CaptureInner />;
}

function EncodeFramesInner() {
  useEffect(() => {
    const input = window.__ENCODE_INPUT__;

    if (!input?.frames?.length) {
      window.__EXPORT_ERROR__ = "Encode input not found.";
      window.__EXPORT_DONE__ = true;
      return;
    }

    void (async () => {
      try {
        const { encodeFromJpegFrames } = await import("../../lib/exportVideo");
        const buffer = await encodeFromJpegFrames(input.frames);
        window.__EXPORT_RESULT_BASE64__ = await arrayBufferToBase64(buffer);
        window.__EXPORT_DONE__ = true;
      } catch (err) {
        window.__EXPORT_ERROR__ =
          err instanceof Error ? err.message : "Encode failed.";
        window.__EXPORT_DONE__ = true;
      }
    })();
  }, []);

  return null;
}

function CaptureInner() {
  const searchParams = useSearchParams();
  const captureRef = useRef<HTMLDivElement | null>(null);
  const hasStarted = useRef(false);
  const timelineRef = useRef<{ set: (value: number) => void } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [renderControls, setRenderControls] = useState<RenderControls>(() =>
    readRenderControls((key) => searchParams.get(key) ?? undefined),
  );

  useEffect(() => {
    const renderMode = searchParams.get("renderMode");
    const isCapture =
      renderMode === "export" || renderMode === "captureSegment";

    if (!isCapture) {
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
      const msg =
        error instanceof Error ? error.message : "Invalid export payload.";
      if (renderMode === "captureSegment") {
        window.__CAPTURE_ERROR__ = msg;
        window.__CAPTURE_DONE__ = true;
      } else {
        window.__EXPORT_ERROR__ = msg;
        window.__EXPORT_DONE__ = true;
      }
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
    if (!isReady) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    const renderMode = searchParams.get("renderMode");

    const timer = setTimeout(async () => {
      const node = captureRef.current;
      if (!node) {
        const msg = "Capture node not found.";
        if (renderMode === "captureSegment") {
          window.__CAPTURE_ERROR__ = msg;
          window.__CAPTURE_DONE__ = true;
        } else {
          window.__EXPORT_ERROR__ = msg;
          window.__EXPORT_DONE__ = true;
        }
        return;
      }

      try {
        const timelineControl = timelineRef.current;

        if (renderMode === "captureSegment") {
          const frameStart = Number(searchParams.get("frameStart") ?? "0");
          const frameEnd = Number(searchParams.get("frameEnd") ?? "0");
          const frameTotal = Number(
            searchParams.get("frameTotal") ?? String(frameEnd + 1),
          );

          const { captureFrameSegment } = await import("../../lib/exportVideo");
          const frames = await captureFrameSegment(
            node,
            timelineControl,
            frameStart,
            frameEnd,
            frameTotal,
          );
          window.__CAPTURE_FRAMES__ = frames;
          window.__CAPTURE_DONE__ = true;
        } else {
          const buffer = await generateVideo(node, durationMs, timelineControl);
          window.__EXPORT_RESULT_BASE64__ = await arrayBufferToBase64(buffer);
          window.__EXPORT_DONE__ = true;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Export failed.";
        if (renderMode === "captureSegment") {
          window.__CAPTURE_ERROR__ = msg;
          window.__CAPTURE_DONE__ = true;
        } else {
          window.__EXPORT_ERROR__ = msg;
          window.__EXPORT_DONE__ = true;
        }
      }
    }, EXPORT_SETTINGS.EXPORT_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [durationMs, isReady, searchParams]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black"
      style={{ width: 1080, height: 1920 }}
    >
      {isReady ? (
        <div ref={captureRef} className="px-12 py-16">
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

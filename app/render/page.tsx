"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppReveal } from "../../components/AppReveal";
import { generateVideo } from "../../lib/exportVideo";
import { initialControls } from "../../utils/revealControls";

const EXPORT_PAYLOAD_STORAGE_KEY = "app-reveal-export-payload";

declare global {
  interface Window {
    __EXPORT_DONE__?: boolean;
    __EXPORT_RESULT__?: ArrayBuffer;
    __EXPORT_ERROR__?: string;
  }
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
  const captureRef = useRef<HTMLDivElement | null>(null);
  const hasStarted = useRef(false);
  const timelineRef = useRef<{ set: (value: number) => void } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [renderControls, setRenderControls] = useState(() => ({
    title: searchParams.get("title") || initialControls.title,
    subtitle: searchParams.get("subtitle") || initialControls.subtitle,
    ctaLabel: searchParams.get("ctaLabel") || initialControls.badgeLabel,
    badgePrefix: searchParams.get("badgePrefix") || initialControls.badgePrefix,
    iconUrl: searchParams.get("iconUrl") || undefined,
    badgeIconUrl: searchParams.get("badgeIconUrl") || undefined,
    iconCornerRadius: Number(
      searchParams.get("iconCornerRadius") || initialControls.iconCornerRadius,
    ),
    durationMs: Number(
      searchParams.get("durationMs") || initialControls.durationMs,
    ),
    playbackRate: Number(
      searchParams.get("playbackRate") || initialControls.playbackRate,
    ),
    glowColor: searchParams.get("glowColor") || initialControls.glowColor,
    rimColor: searchParams.get("rimColor") || initialControls.rimColor,
    grayColor: searchParams.get("grayColor") || initialControls.grayColor,
  }));

  useEffect(() => {
    const isExportMode = searchParams.get("renderMode") === "export";

    if (!isExportMode) {
      setRenderControls({
        title: searchParams.get("title") || initialControls.title,
        subtitle: searchParams.get("subtitle") || initialControls.subtitle,
        ctaLabel: searchParams.get("ctaLabel") || initialControls.badgeLabel,
        badgePrefix:
          searchParams.get("badgePrefix") || initialControls.badgePrefix,
        iconUrl: searchParams.get("iconUrl") || undefined,
        badgeIconUrl: searchParams.get("badgeIconUrl") || undefined,
        iconCornerRadius: Number(
          searchParams.get("iconCornerRadius") ||
            initialControls.iconCornerRadius,
        ),
        durationMs: Number(
          searchParams.get("durationMs") || initialControls.durationMs,
        ),
        playbackRate: Number(
          searchParams.get("playbackRate") || initialControls.playbackRate,
        ),
        glowColor: searchParams.get("glowColor") || initialControls.glowColor,
        rimColor: searchParams.get("rimColor") || initialControls.rimColor,
        grayColor: searchParams.get("grayColor") || initialControls.grayColor,
      });
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
      setRenderControls({
        title: payload.title || initialControls.title,
        subtitle: payload.subtitle || initialControls.subtitle,
        ctaLabel: payload.ctaLabel || initialControls.badgeLabel,
        badgePrefix: payload.badgePrefix || initialControls.badgePrefix,
        iconUrl: payload.iconUrl || undefined,
        badgeIconUrl: payload.badgeIconUrl || undefined,
        iconCornerRadius: Number(
          payload.iconCornerRadius || initialControls.iconCornerRadius,
        ),
        durationMs: Number(payload.durationMs || initialControls.durationMs),
        playbackRate: Number(
          payload.playbackRate || initialControls.playbackRate,
        ),
        glowColor: payload.glowColor || initialControls.glowColor,
        rimColor: payload.rimColor || initialControls.rimColor,
        grayColor: payload.grayColor || initialControls.grayColor,
      });
      window.sessionStorage.removeItem(EXPORT_PAYLOAD_STORAGE_KEY);
      setIsReady(true);
    } catch (error) {
      window.__EXPORT_ERROR__ =
        error instanceof Error ? error.message : "Invalid export payload.";
      window.__EXPORT_DONE__ = true;
    }
  }, [searchParams]);

  const {
    title,
    subtitle,
    ctaLabel,
    badgePrefix,
    iconUrl,
    badgeIconUrl,
    iconCornerRadius,
    durationMs,
    playbackRate,
    glowColor,
    rimColor,
    grayColor,
  } = renderControls;

  useEffect(() => {
    if (!isReady) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    const timer = setTimeout(async () => {
      const node = captureRef.current;
      if (!node) {
        window.__EXPORT_ERROR__ = "Capture node not found.";
        window.__EXPORT_DONE__ = true;
        return;
      }

      try {
        const timelineControl = timelineRef.current;
        const buffer = await generateVideo(node, durationMs, timelineControl);
        window.__EXPORT_RESULT__ = buffer;
        window.__EXPORT_DONE__ = true;
      } catch (err) {
        window.__EXPORT_ERROR__ =
          err instanceof Error ? err.message : "Export failed.";
        window.__EXPORT_DONE__ = true;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [durationMs, isReady]);

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
            rimColor={rimColor}
            grayColor={grayColor}
            timelineRef={timelineRef}
          />
        </div>
      ) : null}
    </div>
  );
}

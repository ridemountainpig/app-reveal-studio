"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AppReveal } from "../../components/AppReveal";
import { generateVideo } from "../../lib/exportVideo";
import { initialControls } from "../../utils/revealControls";

declare global {
  interface Window {
    __EXPORT_DONE__?: boolean;
    __EXPORT_RESULT__?: ArrayBuffer;
    __EXPORT_ERROR__?: string;
    __REVEAL_TIMELINE__?: {
      set: (value: number) => void;
    };
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

  const title = searchParams.get("title") || initialControls.title;
  const subtitle = searchParams.get("subtitle") || initialControls.subtitle;
  const ctaLabel = searchParams.get("ctaLabel") || initialControls.badgeLabel;
  const badgePrefix =
    searchParams.get("badgePrefix") || initialControls.badgePrefix;
  const iconUrl = searchParams.get("iconUrl") || undefined;
  const badgeIconUrl = searchParams.get("badgeIconUrl") || undefined;
  const iconCornerRadius = Number(
    searchParams.get("iconCornerRadius") || initialControls.iconCornerRadius,
  );
  const durationMs = Number(
    searchParams.get("durationMs") || initialControls.durationMs,
  );
  const playbackRate = Number(
    searchParams.get("playbackRate") || initialControls.playbackRate,
  );
  const glowColor = searchParams.get("glowColor") || initialControls.glowColor;
  const rimColor = searchParams.get("rimColor") || initialControls.rimColor;
  const grayColor = searchParams.get("grayColor") || initialControls.grayColor;

  useEffect(() => {
    window.__REVEAL_TIMELINE__ = timelineRef.current ?? undefined;
  }, []);

  useEffect(() => {
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
        const buffer = await generateVideo(node, durationMs);
        window.__EXPORT_RESULT__ = buffer;
        window.__EXPORT_DONE__ = true;
      } catch (err) {
        window.__EXPORT_ERROR__ =
          err instanceof Error ? err.message : "Export failed.";
        window.__EXPORT_DONE__ = true;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black"
      style={{ width: 1080, height: 1920 }}
    >
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
    </div>
  );
}

"use client";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useMemo } from "react";
import {
  DEFAULT_GRAY_RGB,
  TOTAL_DURATION_MS,
  WHITE_RGB,
  buildMaskImage,
  buildSurfaceSweep,
  clamp,
  getBloomShadow,
  getBrightness,
  getRimChrome,
  parseHexColor,
} from "../utils/revealMath";
import {
  RevealBadge,
  RevealHeader,
  RevealIcon,
  RevealSurface,
} from "./RevealPieces";
import type { AppRevealProps } from "../types/reveal";
import { useAnimationValues, useTimeline } from "../hooks/useRevealMotion";

const stageClassName =
  "flex w-full max-w-[24rem] flex-col items-center gap-y-20 text-center max-[480px]:max-w-[20rem]";
const iconLayerClassName = "absolute inset-0 rounded-[inherit]";
const iconSizePx = 176;

export function AppReveal({
  title,
  subtitle,
  ctaLabel = "App Store",
  badgePrefix = "Manage Subscription on the",
  iconCornerRadius = 60,
  restartToken = 0,
  durationMs = TOTAL_DURATION_MS,
  playbackRate = 1,
  iconUrl,
  iconAlt = "App icon",
  badgeIconUrl,
  badgeIconAlt = "Badge icon",
  glowColor = "#ffffff",
  rimColor = "#ffffff",
  grayColor = "#c5cbd5",
  timelineRef,
}: AppRevealProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const normalizedDuration = clamp(durationMs, 1800, 30000);
  const normalizedPlaybackRate = clamp(playbackRate, 0.45, 2.4);
  const normalizedIconCornerRadius = clamp(iconCornerRadius, 10, 100);
  // 100% radius can trigger visible aliasing jitter during masked animation.
  // Keep the control value as 100 for UX, but render with a near-circle radius.
  const stableIconCornerRadius =
    normalizedIconCornerRadius >= 100 ? 99.6 : normalizedIconCornerRadius;
  const iconCornerRadiusPx = (stableIconCornerRadius / 100) * (iconSizePx / 2);
  const iconCornerRadiusValue = `${iconCornerRadiusPx.toFixed(2)}px`;
  const glowRgb = useMemo(
    () => parseHexColor(glowColor, WHITE_RGB),
    [glowColor],
  );
  const rimRgb = useMemo(() => parseHexColor(rimColor, WHITE_RGB), [rimColor]);
  const grayRgb = useMemo(
    () => parseHexColor(grayColor, DEFAULT_GRAY_RGB),
    [grayColor],
  );
  const restartKey = `${normalizedDuration}:${normalizedPlaybackRate}:${restartToken}`;

  const timeline = useTimeline(
    normalizedDuration,
    prefersReducedMotion,
    restartKey,
    timelineRef,
  );
  const {
    revealProgress,
    delayedReveal,
    bloomProgress,
    iconRevealProgress,
    iconDelayedReveal,
  } = useAnimationValues(
    timeline,
    prefersReducedMotion,
    normalizedPlaybackRate,
  );

  const maskImage = useTransform(iconRevealProgress, buildMaskImage);
  const surfaceSweepImage = useTransform(revealProgress, (value: number) =>
    buildSurfaceSweep(value, grayRgb),
  );
  const surfaceSweepOpacity = useTransform(
    revealProgress,
    [0, 0.32, 0.76, 1],
    [0.22, 0.7, 0.92, 0.48],
  );
  const brightness = useTransform(delayedReveal, getBrightness);
  const saturation = useTransform(delayedReveal, [0, 0.7, 1], [0.45, 1.12, 1]);
  const bloomShadow = useTransform(bloomProgress, (value: number) =>
    getBloomShadow(value, glowRgb),
  );

  const contentOpacity = useTransform(
    revealProgress,
    [0, 0.32, 0.8],
    [0.06, 0.2, 1],
  );
  const rimOpacity = useTransform(revealProgress, [0, 0.5, 1], [0.2, 0.8, 1]);

  const iconFilter = useMotionTemplate`brightness(${brightness}) saturate(${saturation})`;

  return (
    <section className={stageClassName} aria-label="App reveal animation">
      <RevealHeader title={title} subtitle={subtitle} />

      <motion.div
        className="relative aspect-square w-44"
        style={{ borderRadius: iconCornerRadiusValue }}
      >
        <motion.div
          className={`${iconLayerClassName} z-0 bg-transparent`}
          style={{
            boxShadow: bloomShadow,
            willChange: "box-shadow, opacity",
          }}
        />

        <div
          className={`${iconLayerClassName} bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_48px_rgba(0,0,0,0.72)]`}
        />

        <RevealSurface
          contentOpacity={contentOpacity}
          iconFilter={iconFilter}
          rimColor={rimRgb}
          grayColor={grayRgb}
          surfaceSweepOpacity={surfaceSweepOpacity}
          surfaceSweepImage={surfaceSweepImage}
        >
          <RevealIcon
            glowColor={glowRgb}
            iconCornerRadius={iconCornerRadiusValue}
            iconUrl={iconUrl}
            iconAlt={iconAlt}
            iconRevealProgress={iconRevealProgress}
            iconDelayedReveal={iconDelayedReveal}
            maskImage={maskImage}
          />
        </RevealSurface>

        <motion.div
          className={`${iconLayerClassName} pointer-events-none z-20 rounded-[inherit] border`}
          style={{
            ...getRimChrome(rimRgb),
            opacity: rimOpacity,
          }}
        />
      </motion.div>

      <RevealBadge
        prefix={badgePrefix}
        label={ctaLabel}
        iconUrl={badgeIconUrl}
        iconAlt={badgeIconAlt}
      />
    </section>
  );
}

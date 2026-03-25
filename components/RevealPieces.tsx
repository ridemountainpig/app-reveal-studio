"use client";

import { motion, useMotionTemplate, useTransform } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import {
  blendRgb,
  getSurfaceChrome,
  toRgbString,
  toRgba,
  WHITE_RGB,
} from "../utils/revealMath";
import { ANIMATION_KEYFRAMES } from "../constants/animations";
import type {
  NumericMotionValue,
  RgbColor,
  StringMotionValue,
} from "../types/reveal";

interface RevealHeaderProps {
  title: string;
  subtitle: string;
}

export function RevealHeader({ title, subtitle }: RevealHeaderProps) {
  const titleLength = title.trim().length;
  const titleFontSize =
    titleLength > 42
      ? "clamp(1.05rem, 3.8vw, 1.8rem)"
      : titleLength > 30
        ? "clamp(1.35rem, 4.8vw, 2.35rem)"
        : titleLength > 18
          ? "clamp(1.8rem, 5.8vw, 3rem)"
          : "clamp(2.35rem, 7vw, 3.65rem)";

  return (
    <header className="flex flex-col items-center gap-[0.45rem]">
      <h1
        className="m-0 px-2 text-center leading-[0.95] font-bold tracking-[-0.05em] text-[rgba(255,255,255,0.96)] [text-shadow:0_0_26px_rgba(255,255,255,0.08)]"
        style={{ fontSize: titleFontSize }}
      >
        {title}
      </h1>
      <p className="m-0 text-[clamp(0.95rem,2.8vw,1.3rem)] font-semibold tracking-[-0.02em] text-[rgba(227,230,235,0.8)]">
        {subtitle}
      </p>
    </header>
  );
}

interface RevealBadgeProps {
  prefix: string;
  label: string;
  iconUrl?: string;
  iconAlt?: string;
}

export function RevealBadge({
  prefix,
  label,
  iconUrl,
  iconAlt,
}: RevealBadgeProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="inline-flex items-center gap-[0.8rem] rounded-2xl border border-white/18 bg-[linear-gradient(180deg,rgba(12,12,14,0.92),rgba(2,2,3,0.98))] px-[1.05rem] py-[0.78rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_26px_rgba(0,0,0,0.35)]">
      {iconUrl && !imageError ? (
        <img
          className="h-6 w-6 rounded-[0.6rem] object-cover shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_12px_rgba(255,255,255,0.08)]"
          src={iconUrl}
          alt={iconAlt ?? ""}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onError={() => setImageError(true)}
        />
      ) : (
        <span
          className="h-6 w-6 rounded-[0.45rem] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.95),rgba(255,255,255,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_0_12px_rgba(255,255,255,0.08)]"
          aria-hidden="true"
        />
      )}
      <span className="flex flex-col items-start text-left leading-none">
        <span className="block text-left text-[0.62rem] font-semibold tracking-[0.05em] text-white/[0.58] uppercase">
          {prefix}
        </span>
        <span className="mt-[0.2rem] block text-left text-[0.96rem] font-bold tracking-[-0.02em] text-white/96">
          {label}
        </span>
      </span>
    </div>
  );
}

interface RevealSurfaceProps {
  contentOpacity: NumericMotionValue;
  iconFilter: StringMotionValue;
  rimColor: RgbColor;
  grayColor: RgbColor;
  surfaceSweepOpacity: NumericMotionValue;
  surfaceSweepImage: StringMotionValue;
  children: ReactNode;
}

export function RevealSurface({
  contentOpacity,
  iconFilter,
  rimColor,
  grayColor,
  surfaceSweepOpacity,
  surfaceSweepImage,
  children,
}: RevealSurfaceProps) {
  const { brightGray, deepGray } = useMemo(
    () => ({
      brightGray: blendRgb(grayColor, WHITE_RGB, 0.38),
      deepGray: blendRgb(grayColor, { r: 0, g: 0, b: 0 }, 0.38),
    }),
    [grayColor],
  );
  const backgroundImage = useMemo(
    () =>
      `linear-gradient(180deg, ${toRgba(brightGray, 0.18)}, ${toRgba(deepGray, 0.08)}), radial-gradient(circle at 68% 18%, rgba(255,255,255,0.08), transparent 34%)`,
    [brightGray, deepGray],
  );

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-hidden rounded-[inherit] border"
      style={{
        ...getSurfaceChrome(rimColor),
        opacity: contentOpacity,
        filter: iconFilter,
        backgroundImage,
      }}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(45deg,rgba(255,255,255,0.14),transparent_32%),linear-gradient(225deg,rgba(255,255,255,0.08),transparent_28%)] mix-blend-screen" />

      <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_48%_38%,rgba(255,255,255,0.05),transparent_28%),radial-gradient(circle_at_46%_72%,rgba(0,0,0,0.32),transparent_38%)]" />

      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{
          opacity: surfaceSweepOpacity,
          backgroundImage: surfaceSweepImage,
        }}
      />

      {children}
    </motion.div>
  );
}

interface RevealIconProps {
  glowColor: RgbColor;
  iconCornerRadius: string;
  iconUrl?: string;
  iconAlt?: string;
  iconRevealProgress: NumericMotionValue;
  iconDelayedReveal: NumericMotionValue;
  maskImage: StringMotionValue;
}

export function RevealIcon({
  glowColor,
  iconCornerRadius,
  iconUrl,
  iconAlt,
  iconRevealProgress,
  iconDelayedReveal,
  maskImage,
}: RevealIconProps) {
  const [imageError, setImageError] = useState(false);
  const glyphShellOpacity = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphShell.opacityInput,
    ANIMATION_KEYFRAMES.glyphShell.opacityOutput,
  );
  const glyphAuraOpacity = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphAura.opacityInput,
    ANIMATION_KEYFRAMES.glyphAura.opacityOutput,
  );
  const glyphAuraScale = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphAura.scaleInput,
    ANIMATION_KEYFRAMES.glyphAura.scaleOutput,
  );
  const glyphGlowOpacity = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphGlow.opacityInput,
    ANIMATION_KEYFRAMES.glyphGlow.opacityOutput,
  );
  const glyphGlowScale = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphGlow.scaleInput,
    ANIMATION_KEYFRAMES.glyphGlow.scaleOutput,
  );
  const glyphGlowBlur = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphGlow.blurInput,
    ANIMATION_KEYFRAMES.glyphGlow.blurOutput,
  );
  const glyphGlowBrightness = useTransform(
    iconDelayedReveal,
    ANIMATION_KEYFRAMES.glyphGlow.brightnessInput,
    ANIMATION_KEYFRAMES.glyphGlow.brightnessOutput,
  );
  const glyphCoreOpacity = useTransform(
    iconRevealProgress,
    ANIMATION_KEYFRAMES.glyphCore.opacityInput,
    ANIMATION_KEYFRAMES.glyphCore.opacityOutput,
  );
  const glyphCoreBrightness = useTransform(
    iconDelayedReveal,
    ANIMATION_KEYFRAMES.glyphCore.brightnessInput,
    ANIMATION_KEYFRAMES.glyphCore.brightnessOutput,
  );

  const { glowAuraBackground, glowShadowColor, coreShadowColor } =
    useMemo(() => {
      const glowRgb = toRgbString(glowColor);

      return {
        glowAuraBackground: `radial-gradient(circle at 50% 52%, rgba(${glowRgb}, 0.95), rgba(${glowRgb}, 0.5) 46%, transparent 80%)`,
        glowShadowColor: `rgba(${glowRgb}, 0.85)`,
        coreShadowColor: `rgba(${glowRgb}, 0.4)`,
      };
    }, [glowColor]);
  const glyphGlowFilter = useMotionTemplate`blur(${glyphGlowBlur}px) brightness(${glyphGlowBrightness}) saturate(1.18) drop-shadow(0 0 168px ${glowShadowColor})`;
  const glyphCoreFilter = useMotionTemplate`brightness(${glyphCoreBrightness}) saturate(1.04) drop-shadow(0 0 24px ${coreShadowColor}) drop-shadow(0 10px 14px rgba(0, 0, 0, 0.2))`;

  return (
    <motion.div
      className="absolute inset-0 isolate z-20 grid place-items-center filter-[drop-shadow(0_16px_18px_rgba(0,0,0,0.46))]"
      style={{
        opacity: glyphShellOpacity,
        maskImage,
        WebkitMaskImage: maskImage,
        willChange:
          "transform, opacity, filter, mask-image, -webkit-mask-image",
      }}
    >
      <motion.div
        className="absolute inset-[-30%] rounded-[32%] blur-[120px]"
        style={{
          opacity: glyphAuraOpacity,
          scale: glyphAuraScale,
          backgroundImage: glowAuraBackground,
        }}
      />

      {iconUrl && !imageError && (
        <>
          <motion.img
            className="absolute inset-0 z-10 h-full w-full object-cover mix-blend-screen"
            src={iconUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            onError={() => setImageError(true)}
            style={{
              borderRadius: iconCornerRadius,
              opacity: glyphGlowOpacity,
              scale: glyphGlowScale,
              filter: glyphGlowFilter,
            }}
          />
          <motion.img
            className="absolute inset-0 z-20 h-full w-full object-cover"
            src={iconUrl}
            alt={iconAlt}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            style={{
              borderRadius: iconCornerRadius,
              opacity: glyphCoreOpacity,
              filter: glyphCoreFilter,
            }}
          />
        </>
      )}
    </motion.div>
  );
}

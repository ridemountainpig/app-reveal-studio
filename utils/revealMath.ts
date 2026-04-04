import { cubicBezier } from "framer-motion";
import type { RgbColor } from "../types/reveal";

export const TOTAL_DURATION_MS = 7000;
const FEATHER_PERCENT = 20;
const MASK_START_PERCENT = -18;
const MASK_END_PERCENT = 124;

export const WHITE_RGB = { r: 255, g: 255, b: 255 };
export const DEFAULT_GRAY_RGB = { r: 197, g: 203, b: 213 };

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

export const parseHexColor = (
  value: string | undefined,
  fallback: RgbColor,
): RgbColor => {
  if (!value) {
    return fallback;
  }

  const compactHex = value.trim().replace(/^#/, "");
  const normalizedHex =
    compactHex.length === 3
      ? compactHex
          .split("")
          .map((segment) => `${segment}${segment}`)
          .join("")
      : compactHex;

  if (!/^[\da-f]{6}$/i.test(normalizedHex)) {
    return fallback;
  }

  const parsed = Number.parseInt(normalizedHex, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

export const toRgba = (color: RgbColor, alpha: number) =>
  `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha.toFixed(3)})`;

export const toRgbString = (color: RgbColor) =>
  `${color.r}, ${color.g}, ${color.b}`;

export const blendRgb = (
  from: RgbColor,
  to: RgbColor,
  amount: number,
): RgbColor => ({
  r: Math.round(mix(from.r, to.r, amount)),
  g: Math.round(mix(from.g, to.g, amount)),
  b: Math.round(mix(from.b, to.b, amount)),
});

const fluidEase = cubicBezier(0.1, 0, 0.1, 1);

export const getSegmentProgress = (value: number) =>
  fluidEase(clamp(value, 0, 1));

export const buildMaskImage = (progress: number) => {
  const hardStop = mix(MASK_START_PERCENT, MASK_END_PERCENT, progress);
  const softStop = hardStop - FEATHER_PERCENT;

  return [
    "linear-gradient(45deg,",
    `rgba(0, 0, 0, 1) 0%,`,
    `rgba(0, 0, 0, 1) ${softStop.toFixed(2)}%,`,
    `rgba(0, 0, 0, 0) ${hardStop.toFixed(2)}%,`,
    "rgba(0, 0, 0, 0) 100%)",
  ].join(" ");
};

export const buildSurfaceSweep = (progress: number, grayColor: RgbColor) => {
  const phase = clamp(progress, 0, 1);
  const brightGray = blendRgb(grayColor, WHITE_RGB, 0.24);
  const deepGray = blendRgb(grayColor, { r: 0, g: 0, b: 0 }, 0.14);
  const leadingRadius = mix(4, 68, phase);
  const leadingFadeStop = leadingRadius + 14;
  const leadingAlpha = mix(0.05, 0.24, phase);
  const trailingPhase = clamp((phase - 0.26) / 0.74, 0, 1);
  const trailingRadius = mix(0, 44, trailingPhase);
  const trailingFadeStop = trailingRadius + 18;
  const trailingAlpha = mix(0, 0.11, trailingPhase);
  const diagonalPhase = clamp((phase - 0.18) / 0.82, 0, 1);
  const diagonalAlpha = mix(0, 0.07, diagonalPhase);
  const diagonalInset = mix(18, 30, phase);

  return [
    `radial-gradient(circle at 4% 96%, ${toRgba(brightGray, leadingAlpha)} 0%, ${toRgba(deepGray, leadingAlpha * 0.72)} ${leadingRadius.toFixed(2)}%, rgba(0, 0, 0, 0) ${leadingFadeStop.toFixed(2)}%)`,
    `radial-gradient(circle at 90% 10%, ${toRgba(brightGray, trailingAlpha)} 0%, ${toRgba(deepGray, trailingAlpha * 0.72)} ${trailingRadius.toFixed(2)}%, rgba(0, 0, 0, 0) ${trailingFadeStop.toFixed(2)}%)`,
    `linear-gradient(135deg, rgba(255, 255, 255, 0) ${diagonalInset.toFixed(2)}%, ${toRgba(grayColor, diagonalAlpha)} 50%, rgba(255, 255, 255, 0) ${(100 - diagonalInset).toFixed(2)}%)`,
  ].join(", ");
};

export const getBrightness = (progress: number) => {
  if (progress <= 0.78) {
    return mix(0, 1.2, progress / 0.78);
  }

  return mix(1.2, 1, (progress - 0.78) / 0.22);
};

export const getBloomShadow = (
  progress: number,
  glowColor: RgbColor,
  glowScale = 1,
) => {
  const bounded = clamp(progress, 0, 1);
  const scale = clamp(glowScale, 0.25, 3);
  const coreBlur = mix(32, 82, bounded) * scale;
  const coreSpread = mix(8, 22, bounded) * scale;
  const hazeBlur = mix(64, 180, bounded) * scale;
  const hazeSpread = mix(22, 68, bounded) * scale;
  const liftShadow = mix(18, 32, bounded);

  return [
    `0 0 ${coreBlur.toFixed(1)}px ${coreSpread.toFixed(1)}px ${toRgba(glowColor, 0.2 + bounded * 0.28)}`,
    `0 0 ${hazeBlur.toFixed(1)}px ${hazeSpread.toFixed(1)}px ${toRgba(glowColor, 0.08 + bounded * 0.16)}`,
    `0 ${mix(16, 10, bounded).toFixed(1)}px ${liftShadow.toFixed(1)}px rgba(0, 0, 0, ${(0.48 - bounded * 0.16).toFixed(3)})`,
  ].join(", ");
};

export const getSurfaceChrome = (rimColor: RgbColor) => ({
  borderColor: toRgba(rimColor, 0.4),
  boxShadow: [
    `inset 0 1px 0 ${toRgba(rimColor, 0.5)}`,
    `inset 0 -10px 22px ${toRgba(rimColor, 0.15)}`,
  ].join(", "),
});

export const getRimChrome = (rimColor: RgbColor) => ({
  borderColor: toRgba(rimColor, 0.62),
  boxShadow: [
    `inset 0 1px 0 ${toRgba(rimColor, 0.9)}`,
    `inset 0 -4px 10px ${toRgba(rimColor, 0.4)}`,
    `0 0 16px ${toRgba(rimColor, 0.3)}`,
  ].join(", "),
});

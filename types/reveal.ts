import type { MotionValue } from "framer-motion";
import type { MutableRefObject } from "react";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type NumericMotionValue = MotionValue<number>;
export type StringMotionValue = MotionValue<string>;

export type AppRevealProps = {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  badgePrefix?: string;
  iconCornerRadius?: number;
  restartToken?: number;
  durationMs?: number;
  playbackRate?: number;
  iconUrl?: string;
  iconAlt?: string;
  badgeIconUrl?: string;
  badgeIconAlt?: string;
  glowColor?: string;
  rimColor?: string;
  grayColor?: string;
  timelineRef?: MutableRefObject<{ set: (value: number) => void } | null>;
};

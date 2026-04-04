import type { MotionValue } from "framer-motion";
import type { MutableRefObject } from "react";
import type {
  BadgeVariant,
  EditableLayerId,
  LayerTransform,
  LayerTransforms,
} from "./revealControls";

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
  badgeVariant?: BadgeVariant;
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
  glowSize?: number;
  rimColor?: string;
  grayColor?: string;
  editable?: boolean;
  layerTransforms?: LayerTransforms;
  onLayerTransformChange?: (
    layerId: EditableLayerId,
    nextTransform: LayerTransform,
  ) => void;
  timelineRef?: MutableRefObject<{ set: (value: number) => void } | null>;
};

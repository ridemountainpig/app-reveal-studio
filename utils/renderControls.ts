import type { BadgeVariant, LayerTransforms } from "../types/revealControls";
import { initialControls, sanitizeLayerTransforms } from "./revealControls";
import { isBadgeVariant } from "./badgeOptions";

export type RenderControls = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  badgeVariant: BadgeVariant;
  badgePrefix: string;
  iconUrl?: string;
  badgeIconUrl?: string;
  iconCornerRadius: number;
  durationMs: number;
  playbackRate: number;
  glowColor: string;
  rimColor: string;
  grayColor: string;
  layerTransforms: LayerTransforms;
};

function parseLayerTransforms(value?: string): LayerTransforms {
  if (!value) {
    return initialControls.layers;
  }

  try {
    return sanitizeLayerTransforms(JSON.parse(value));
  } catch {
    return initialControls.layers;
  }
}

export function readRenderControls(
  readValue: (key: string) => string | undefined,
): RenderControls {
  const badgeVariant = readValue("badgeVariant");

  return {
    title: readValue("title") || initialControls.title,
    subtitle: readValue("subtitle") || initialControls.subtitle,
    ctaLabel: readValue("ctaLabel") || initialControls.badgeLabel,
    badgeVariant:
      badgeVariant && isBadgeVariant(badgeVariant)
        ? badgeVariant
        : initialControls.badgeVariant,
    badgePrefix: readValue("badgePrefix") || initialControls.badgePrefix,
    iconUrl: readValue("iconUrl") || undefined,
    badgeIconUrl: readValue("badgeIconUrl") || undefined,
    iconCornerRadius: Number(
      readValue("iconCornerRadius") || initialControls.iconCornerRadius,
    ),
    durationMs: Number(readValue("durationMs") || initialControls.durationMs),
    playbackRate: Number(
      readValue("playbackRate") || initialControls.playbackRate,
    ),
    glowColor: readValue("glowColor") || initialControls.glowColor,
    rimColor: readValue("rimColor") || initialControls.rimColor,
    grayColor: readValue("grayColor") || initialControls.grayColor,
    layerTransforms: parseLayerTransforms(readValue("layerTransforms")),
  };
}

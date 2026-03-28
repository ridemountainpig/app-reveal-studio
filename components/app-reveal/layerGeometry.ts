import type {
  EditableLayerId,
  LayerTransform,
} from "../../types/revealControls";
import { clamp } from "../../utils/revealMath";

export const iconSizePx = 176;
export const stageWidthPx = 384;
export const stageHeightPx = 640;

const minimumScale = 0.45;
const maximumScale = 2.8;

export const layerAnchors: Record<EditableLayerId, { x: number; y: number }> = {
  title: { x: 50, y: 12.5 },
  subtitle: { x: 50, y: 23 },
  icon: { x: 50, y: 53 },
  badge: { x: 50, y: 87.5 },
  /**
   * Both stores: horizontal centers; inset vs 27/73 so the pair sits slightly closer.
   */
  badgeAppStore: { x: 29, y: 87.5 },
  badgeGooglePlay: { x: 71, y: 87.5 },
};

export const layerLabelMap: Record<EditableLayerId, string> = {
  title: "Title",
  subtitle: "Subtitle",
  icon: "Icon",
  badge: "Badge",
  badgeAppStore: "App Store badge",
  badgeGooglePlay: "Google Play badge",
};

/** Keeps scaled layer bounds within the stage (video frame); caps max scale by fit. */
function clampScaleToStageBounds(
  layoutWidth: number,
  layoutHeight: number,
  stageWidth: number,
  stageHeight: number,
  desiredScale: number,
): number {
  if (layoutWidth <= 0 || layoutHeight <= 0) {
    return clamp(desiredScale, minimumScale, maximumScale);
  }

  const fitMax = Math.min(
    maximumScale,
    stageWidth / layoutWidth,
    stageHeight / layoutHeight,
  );
  const scaleMax = Math.max(0, fitMax);
  const scaleMin = Math.min(minimumScale, scaleMax);

  return clamp(desiredScale, scaleMin, scaleMax);
}

export function toOffsetPx(value: number, size: number) {
  return (value / 100) * size;
}

export function toPercent(value: number, size: number) {
  if (size <= 0) {
    return 0;
  }

  return (value / size) * 100;
}

export function getBaseLayerTransform(
  stageWidth: number,
  stageHeight: number,
  transform: LayerTransform,
) {
  const offsetX = toOffsetPx(transform.x, stageWidth);
  const offsetY = toOffsetPx(transform.y, stageHeight);

  return `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${transform.scale})`;
}

export type LayerClampOptions = {
  /** Badge store presets align to top of anchor; custom badge stays center-anchored. */
  badgeVerticalAnchor?: "center" | "top";
};

/** Hot path: avoids reading el.offsetWidth/offsetHeight every frame (layout thrash). */
export function clampLayerTransformWithLayout(
  layerId: EditableLayerId,
  nextTransform: LayerTransform,
  stageWidth: number,
  stageHeight: number,
  layoutWidth: number,
  layoutHeight: number,
  clampOptions?: LayerClampOptions,
): LayerTransform {
  if (stageWidth <= 0 || stageHeight <= 0) {
    return nextTransform;
  }

  const scale = clampScaleToStageBounds(
    layoutWidth,
    layoutHeight,
    stageWidth,
    stageHeight,
    nextTransform.scale,
  );
  const targetWidth = layoutWidth * scale;
  const targetHeight = layoutHeight * scale;
  const anchor = layerAnchors[layerId];
  const anchorX = (anchor.x / 100) * stageWidth;
  const anchorY = (anchor.y / 100) * stageHeight;
  const offsetX = toOffsetPx(nextTransform.x, stageWidth);
  const offsetY = toOffsetPx(nextTransform.y, stageHeight);
  const nextCenterX = anchorX + offsetX;

  const minCenterX =
    targetWidth >= stageWidth ? stageWidth / 2 : targetWidth / 2;
  const maxCenterX =
    targetWidth >= stageWidth ? stageWidth / 2 : stageWidth - targetWidth / 2;

  const centerX = clamp(nextCenterX, minCenterX, maxCenterX);

  const useTopBadgeAnchor =
    (layerId === "badge" ||
      layerId === "badgeAppStore" ||
      layerId === "badgeGooglePlay") &&
    clampOptions?.badgeVerticalAnchor === "top";

  if (useTopBadgeAnchor) {
    const nextTopY = anchorY + offsetY;
    const maxTopY = Math.max(0, stageHeight - targetHeight);
    const topY = clamp(nextTopY, 0, maxTopY);

    return {
      x: toPercent(centerX - anchorX, stageWidth),
      y: toPercent(topY - anchorY, stageHeight),
      scale,
    };
  }

  const nextCenterY = anchorY + offsetY;

  const minCenterY =
    targetHeight >= stageHeight ? stageHeight / 2 : targetHeight / 2;
  const maxCenterY =
    targetHeight >= stageHeight
      ? stageHeight / 2
      : stageHeight - targetHeight / 2;

  const centerY = clamp(nextCenterY, minCenterY, maxCenterY);

  return {
    x: toPercent(centerX - anchorX, stageWidth),
    y: toPercent(centerY - anchorY, stageHeight),
    scale,
  };
}

export function clampLayerTransform(
  layerId: EditableLayerId,
  nextTransform: LayerTransform,
  stageWidth: number,
  stageHeight: number,
  target: HTMLElement | null,
  clampOptions?: LayerClampOptions,
) {
  if (!target || stageWidth <= 0 || stageHeight <= 0) {
    return nextTransform;
  }

  return clampLayerTransformWithLayout(
    layerId,
    nextTransform,
    stageWidth,
    stageHeight,
    target.offsetWidth,
    target.offsetHeight,
    clampOptions,
  );
}

/** Use the last coalesced sample so fast strokes match the cursor (Chromium / some pointers). */
export function getPointerClient(ev: PointerEvent): { x: number; y: number } {
  const coalesced = ev.getCoalescedEvents?.();
  if (coalesced && coalesced.length > 0) {
    const last = coalesced[coalesced.length - 1];
    return { x: last.clientX, y: last.clientY };
  }

  return { x: ev.clientX, y: ev.clientY };
}

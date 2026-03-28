"use client";

import { flushSync } from "react-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  EditableLayerId,
  LayerTransform,
  LayerTransforms,
} from "../types/revealControls";
import type { ScaleCorner } from "../components/LayerSelectionOverlay";
import {
  clampLayerTransform,
  clampLayerTransformWithLayout,
  getBaseLayerTransform,
  getPointerClient,
  stageHeightPx,
  stageWidthPx,
  toOffsetPx,
  toPercent,
  type LayerClampOptions,
} from "../components/app-reveal/layerGeometry";

type UseLayerGesturesOptions = {
  editable: boolean;
  layerTransforms: LayerTransforms;
  onLayerTransformChange?: (
    layerId: EditableLayerId,
    nextTransform: LayerTransform,
  ) => void;
  /** Store badge (App / Play) uses top-of-anchor layout; custom badge uses center anchor. */
  badgeVerticalAnchor?: "center" | "top";
};

const baseTransformOriginStyle = { transformOrigin: "center center" as const };
const touchCalloutStyle = { WebkitTouchCallout: "none" as const };

export function useLayerGestures({
  editable,
  layerTransforms,
  onLayerTransformChange,
  badgeVerticalAnchor = "center",
}: UseLayerGesturesOptions) {
  const badgeClampOptions: LayerClampOptions | undefined =
    badgeVerticalAnchor === "top" ? { badgeVerticalAnchor: "top" } : undefined;
  const [selectedLayerId, setSelectedLayerId] =
    useState<EditableLayerId | null>(null);
  const [gesturingLayerId, setGesturingLayerId] =
    useState<EditableLayerId | null>(null);
  const [stageSize, setStageSize] = useState({
    width: stageWidthPx,
    height: stageHeightPx,
  });
  const stageSizeRef = useRef(stageSize);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<Record<EditableLayerId, HTMLDivElement | null>>({
    title: null,
    subtitle: null,
    icon: null,
    badge: null,
    badgeAppStore: null,
    badgeGooglePlay: null,
  });
  const layerTransformsRef = useRef(layerTransforms);
  const activeGestureCleanupRef = useRef<(() => void) | null>(null);
  /** While gesturing, React style omits `transform` so pointermove can own it. */
  const liveLayerTransformRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    stageSizeRef.current = stageSize;
  }, [stageSize]);

  useLayoutEffect(() => {
    layerTransformsRef.current = layerTransforms;
  }, [layerTransforms]);

  useLayoutEffect(() => {
    if (!gesturingLayerId) {
      return;
    }

    const el = layerRefs.current[gesturingLayerId];
    const live = liveLayerTransformRef.current;
    if (el && live) {
      el.style.transform = live;
    }
  });

  useEffect(() => {
    return () => {
      activeGestureCleanupRef.current?.();
      activeGestureCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editable) {
      activeGestureCleanupRef.current?.();
      activeGestureCleanupRef.current = null;
      liveLayerTransformRef.current = null;

      const frameId = window.requestAnimationFrame(() => {
        setSelectedLayerId(null);
        setGesturingLayerId(null);
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [editable]);

  useEffect(() => {
    const stageNode = stageRef.current;
    if (!stageNode || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateStageSize = () => {
      setStageSize({
        width: stageNode.clientWidth || stageWidthPx,
        height: stageNode.clientHeight || stageHeightPx,
      });
    };

    updateStageSize();

    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stageNode);

    return () => observer.disconnect();
  }, []);

  const handleLayerTransformChange = (
    layerId: EditableLayerId,
    nextTransform: LayerTransform,
  ) => {
    const target = layerRefs.current[layerId];
    const clampedTransform = clampLayerTransform(
      layerId,
      nextTransform,
      stageSize.width,
      stageSize.height,
      target,
      badgeClampOptions,
    );

    onLayerTransformChange?.(layerId, clampedTransform);
  };

  const clearActiveGesture = () => {
    activeGestureCleanupRef.current?.();
    activeGestureCleanupRef.current = null;
  };

  const handleLayerPointerDown = (
    layerId: EditableLayerId,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!editable || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    clearActiveGesture();

    const el = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const transform = layerTransformsRef.current[layerId];
    const stageWidth = stageSizeRef.current.width;
    const stageHeight = stageSizeRef.current.height;
    const initialTransform = getBaseLayerTransform(
      stageWidth,
      stageHeight,
      transform,
    );
    el.style.transform = initialTransform;
    liveLayerTransformRef.current = initialTransform;

    flushSync(() => {
      setSelectedLayerId(layerId);
      setGesturingLayerId(layerId);
    });

    const layoutWidth = el.offsetWidth;
    const layoutHeight = el.offsetHeight;
    el.style.willChange = "transform";

    const startOffsetX = toOffsetPx(transform.x, stageWidth);
    const startOffsetY = toOffsetPx(transform.y, stageHeight);

    el.setPointerCapture(pointerId);

    let lastClamped: LayerTransform | null = null;

    const cleanupGesture = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      el.style.removeProperty("will-change");
      liveLayerTransformRef.current = null;
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) {
        return;
      }

      ev.preventDefault();
      const { x: clientX, y: clientY } = getPointerClient(ev);
      const dx = clientX - startX;
      const dy = clientY - startY;
      const base = layerTransformsRef.current[layerId];
      const width = stageSizeRef.current.width;
      const height = stageSizeRef.current.height;
      const raw: LayerTransform = {
        x: toPercent(startOffsetX + dx, width),
        y: toPercent(startOffsetY + dy, height),
        scale: base.scale,
      };

      lastClamped = clampLayerTransformWithLayout(
        layerId,
        raw,
        width,
        height,
        layoutWidth,
        layoutHeight,
        badgeClampOptions,
      );

      const nextTransform = getBaseLayerTransform(width, height, lastClamped);
      el.style.transform = nextTransform;
      liveLayerTransformRef.current = nextTransform;
    };

    const onEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) {
        return;
      }

      cleanupGesture();
      if (activeGestureCleanupRef.current === cleanupGesture) {
        activeGestureCleanupRef.current = null;
      }
      if (lastClamped) {
        handleLayerTransformChange(layerId, lastClamped);
      }
      setGesturingLayerId(null);
    };

    activeGestureCleanupRef.current = cleanupGesture;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const handleScalePointerDown = (
    _corner: ScaleCorner,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!editable || !selectedLayerId || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    clearActiveGesture();

    const layerId = selectedLayerId;
    const layerEl = layerRefs.current[layerId];
    if (!layerEl) {
      return;
    }

    const rect = layerEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startDistance = Math.hypot(
      event.clientX - centerX,
      event.clientY - centerY,
    );
    if (startDistance < 8) {
      return;
    }

    const startTransform = getBaseLayerTransform(
      stageSizeRef.current.width,
      stageSizeRef.current.height,
      layerTransformsRef.current[layerId],
    );
    layerEl.style.transform = startTransform;
    liveLayerTransformRef.current = startTransform;

    flushSync(() => {
      setGesturingLayerId(layerId);
    });

    const layoutWidth = layerEl.offsetWidth;
    const layoutHeight = layerEl.offsetHeight;
    layerEl.style.willChange = "transform";

    const startScale = layerTransformsRef.current[layerId].scale;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);

    let lastClamped: LayerTransform | null = null;

    const cleanupGesture = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      layerEl.style.removeProperty("will-change");
      liveLayerTransformRef.current = null;
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) {
        return;
      }

      ev.preventDefault();
      const { x: clientX, y: clientY } = getPointerClient(ev);
      const ratio =
        Math.hypot(clientX - centerX, clientY - centerY) / startDistance;
      const raw: LayerTransform = {
        ...layerTransformsRef.current[layerId],
        scale: startScale * ratio,
      };
      const width = stageSizeRef.current.width;
      const height = stageSizeRef.current.height;

      lastClamped = clampLayerTransformWithLayout(
        layerId,
        raw,
        width,
        height,
        layoutWidth,
        layoutHeight,
        badgeClampOptions,
      );

      const nextTransform = getBaseLayerTransform(width, height, lastClamped);
      layerEl.style.transform = nextTransform;
      liveLayerTransformRef.current = nextTransform;
    };

    const onEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) {
        return;
      }

      cleanupGesture();
      if (activeGestureCleanupRef.current === cleanupGesture) {
        activeGestureCleanupRef.current = null;
      }
      if (lastClamped) {
        handleLayerTransformChange(layerId, lastClamped);
      }
      setGesturingLayerId(null);
    };

    activeGestureCleanupRef.current = cleanupGesture;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable) {
      return;
    }

    if (event.target === event.currentTarget) {
      setSelectedLayerId(null);
    }
  };

  const handleLayerContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const setLayerRef = (
    layerId: EditableLayerId,
    node: HTMLDivElement | null,
  ) => {
    layerRefs.current[layerId] = node;
  };

  const getLayerInteractiveStyle = (
    layerId: EditableLayerId,
  ): CSSProperties => {
    const baseStyle =
      gesturingLayerId === layerId
        ? baseTransformOriginStyle
        : {
            ...baseTransformOriginStyle,
            transform: getBaseLayerTransform(
              stageSize.width,
              stageSize.height,
              layerTransforms[layerId],
            ),
          };

    return editable ? { ...baseStyle, ...touchCalloutStyle } : baseStyle;
  };

  return {
    stageRef,
    selectedLayerId,
    gesturingLayerId,
    handleStagePointerDown,
    handleLayerPointerDown,
    handleLayerContextMenu,
    handleScalePointerDown,
    setLayerRef,
    getLayerInteractiveStyle,
  };
}

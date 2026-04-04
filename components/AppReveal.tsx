"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo } from "react";
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
  RevealIcon,
  RevealSubtitle,
  RevealSurface,
  RevealTitle,
} from "./RevealPieces";
import type { AppRevealProps } from "../types/reveal";
import { useAnimationValues, useTimeline } from "../hooks/useRevealMotion";
import { useLayerGestures } from "../hooks/useLayerGestures";
import { getBadgePreset, getStoreBadgePresets } from "../utils/badgeOptions";
import { createDefaultLayerTransforms } from "../utils/revealControls";
import {
  iconSizePx,
  layerAnchors,
  layerLabelMap,
} from "./app-reveal/layerGeometry";
import { EditableLayer } from "./app-reveal/EditableLayer";

const iconLayerClassName = "absolute inset-0 rounded-[inherit]";

function getLayerClassName({
  editable,
  isSelected,
  isGesturing,
  baseClassName,
  selectedClassName,
}: {
  editable: boolean;
  isSelected: boolean;
  isGesturing: boolean;
  baseClassName: string;
  selectedClassName: string;
}) {
  return `${baseClassName} ${
    isGesturing ? "transition-none cursor-grabbing" : "transition"
  } ${
    editable
      ? isGesturing
        ? "touch-none select-none"
        : "cursor-move touch-none select-none"
      : "cursor-default"
  } ${
    isSelected
      ? selectedClassName
      : editable
        ? "hover:border-white/12 hover:bg-white/[0.03]"
        : ""
  }`;
}

export function AppReveal({
  title,
  subtitle,
  ctaLabel = "App Store",
  badgeVariant = "custom",
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
  glowSize = 100,
  rimColor = "#ffffff",
  grayColor = "#c5cbd5",
  editable = false,
  layerTransforms = createDefaultLayerTransforms(),
  onLayerTransformChange,
  timelineRef,
}: AppRevealProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const normalizedDuration = clamp(durationMs, 1800, 30000);
  const normalizedPlaybackRate = clamp(playbackRate, 0.45, 2.4);
  const normalizedIconCornerRadius = clamp(iconCornerRadius, 10, 100);
  const normalizedGlowSize = clamp(glowSize, 40, 300);
  const glowSizeMultiplier = normalizedGlowSize / 100;
  const storeBadgePresets = getStoreBadgePresets(badgeVariant);
  const appStorePreset = getBadgePreset("appStore");
  const googlePlayPreset = getBadgePreset("googlePlay");
  const badgeAnchorVerticalAlign = badgeVariant !== "custom" ? "top" : "center";
  const {
    stageRef,
    selectedLayerId,
    gesturingLayerId,
    alignmentGuides,
    handleStagePointerDown,
    handleLayerPointerDown,
    handleLayerContextMenu,
    handleScalePointerDown,
    setLayerRef,
    getLayerInteractiveStyle,
  } = useLayerGestures({
    editable,
    layerTransforms,
    onLayerTransformChange,
    badgeVerticalAnchor: badgeAnchorVerticalAlign,
  });

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
  const glowSizeMotion = useMotionValue(glowSizeMultiplier);
  useEffect(() => {
    glowSizeMotion.set(glowSizeMultiplier);
  }, [glowSizeMotion, glowSizeMultiplier]);
  const bloomShadow = useTransform([bloomProgress, glowSizeMotion], ([p, s]) =>
    getBloomShadow(p as number, glowRgb, s as number),
  );

  const contentOpacity = useTransform(
    revealProgress,
    [0, 0.32, 0.8],
    [0.16, 0.24, 1],
  );
  const rimOpacity = useTransform(revealProgress, [0, 0.5, 1], [0.2, 0.8, 1]);

  const iconFilter = useMotionTemplate`brightness(${brightness}) saturate(${saturation})`;

  return (
    <section
      className="flex w-full justify-center"
      aria-label="App reveal animation"
    >
      <div
        ref={stageRef}
        className="relative isolate h-[40rem] w-[24rem] shrink-0"
        onPointerDown={handleStagePointerDown}
      >
        {editable && gesturingLayerId !== null ? (
          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            aria-hidden="true"
          >
            <div className="absolute inset-0 rounded-[inherit] border-2 border-dashed border-white/32" />
            {alignmentGuides.vertical ? (
              <div className="absolute top-0 bottom-0 left-1/2 z-[1] w-0 -translate-x-1/2 border-l-2 border-dashed border-[#facc15]" />
            ) : null}
            {alignmentGuides.horizontal ? (
              <div className="absolute top-1/2 right-0 left-0 z-[1] h-0 -translate-y-1/2 border-t-2 border-dashed border-[#facc15]" />
            ) : null}
          </div>
        ) : null}
        <EditableLayer
          anchor={layerAnchors.title}
          label={layerLabelMap.title}
          editable={editable}
          isSelected={selectedLayerId === "title"}
          isGesturing={gesturingLayerId === "title"}
          className={getLayerClassName({
            editable,
            isSelected: selectedLayerId === "title",
            isGesturing: gesturingLayerId === "title",
            baseClassName:
              "pointer-events-auto relative inline-block w-max max-w-none min-w-0 rounded-lg border border-transparent px-1.5 py-0.5 text-center outline-none",
            selectedClassName:
              "border-white/20 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          })}
          style={getLayerInteractiveStyle("title")}
          setRef={(node) => setLayerRef("title", node)}
          onPointerDown={(event) => handleLayerPointerDown("title", event)}
          onContextMenu={handleLayerContextMenu}
          onScalePointerDown={handleScalePointerDown}
        >
          <RevealTitle title={title} />
        </EditableLayer>

        <EditableLayer
          anchor={layerAnchors.subtitle}
          label={layerLabelMap.subtitle}
          editable={editable}
          isSelected={selectedLayerId === "subtitle"}
          isGesturing={gesturingLayerId === "subtitle"}
          className={getLayerClassName({
            editable,
            isSelected: selectedLayerId === "subtitle",
            isGesturing: gesturingLayerId === "subtitle",
            baseClassName:
              "pointer-events-auto relative inline-block w-max max-w-none min-w-0 rounded-lg border border-transparent px-1.5 py-0.5 text-center outline-none",
            selectedClassName:
              "border-white/20 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          })}
          style={getLayerInteractiveStyle("subtitle")}
          setRef={(node) => setLayerRef("subtitle", node)}
          onPointerDown={(event) => handleLayerPointerDown("subtitle", event)}
          onContextMenu={handleLayerContextMenu}
          onScalePointerDown={handleScalePointerDown}
        >
          <RevealSubtitle subtitle={subtitle} />
        </EditableLayer>

        <EditableLayer
          anchor={layerAnchors.icon}
          label={layerLabelMap.icon}
          editable={editable}
          isSelected={selectedLayerId === "icon"}
          isGesturing={gesturingLayerId === "icon"}
          className={getLayerClassName({
            editable,
            isSelected: selectedLayerId === "icon",
            isGesturing: gesturingLayerId === "icon",
            baseClassName:
              "pointer-events-auto relative inline-block h-44 w-44 rounded-[3.35rem] border border-transparent bg-transparent p-0 text-left outline-none",
            selectedClassName:
              "border-white/22 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          })}
          style={getLayerInteractiveStyle("icon")}
          setRef={(node) => setLayerRef("icon", node)}
          onPointerDown={(event) => handleLayerPointerDown("icon", event)}
          onContextMenu={handleLayerContextMenu}
          onScalePointerDown={handleScalePointerDown}
        >
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
                glowSize={glowSizeMultiplier}
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
        </EditableLayer>

        {badgeVariant === "bothStores" ? (
          <>
            <EditableLayer
              anchor={layerAnchors.badgeAppStore}
              anchorVerticalAlign={badgeAnchorVerticalAlign}
              label={layerLabelMap.badgeAppStore}
              editable={editable}
              isSelected={selectedLayerId === "badgeAppStore"}
              isGesturing={gesturingLayerId === "badgeAppStore"}
              className={getLayerClassName({
                editable,
                isSelected: selectedLayerId === "badgeAppStore",
                isGesturing: gesturingLayerId === "badgeAppStore",
                baseClassName:
                  "pointer-events-auto relative inline-flex w-max max-w-none items-center rounded-lg border border-transparent bg-transparent p-1.5 text-left leading-none outline-none",
                selectedClassName:
                  "border-white/20 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
              })}
              style={getLayerInteractiveStyle("badgeAppStore")}
              setRef={(node) => setLayerRef("badgeAppStore", node)}
              onPointerDown={(event) =>
                handleLayerPointerDown("badgeAppStore", event)
              }
              onContextMenu={handleLayerContextMenu}
              onScalePointerDown={handleScalePointerDown}
            >
              <RevealBadge
                variant="appStore"
                prefix={badgePrefix}
                label={ctaLabel}
                iconUrl={badgeIconUrl}
                iconAlt={badgeIconAlt}
                presetImages={appStorePreset ? [appStorePreset] : undefined}
              />
            </EditableLayer>
            <EditableLayer
              anchor={layerAnchors.badgeGooglePlay}
              anchorVerticalAlign={badgeAnchorVerticalAlign}
              label={layerLabelMap.badgeGooglePlay}
              editable={editable}
              isSelected={selectedLayerId === "badgeGooglePlay"}
              isGesturing={gesturingLayerId === "badgeGooglePlay"}
              className={getLayerClassName({
                editable,
                isSelected: selectedLayerId === "badgeGooglePlay",
                isGesturing: gesturingLayerId === "badgeGooglePlay",
                baseClassName:
                  "pointer-events-auto relative inline-flex w-max max-w-none items-center rounded-lg border border-transparent bg-transparent p-1.5 text-left leading-none outline-none",
                selectedClassName:
                  "border-white/20 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
              })}
              style={getLayerInteractiveStyle("badgeGooglePlay")}
              setRef={(node) => setLayerRef("badgeGooglePlay", node)}
              onPointerDown={(event) =>
                handleLayerPointerDown("badgeGooglePlay", event)
              }
              onContextMenu={handleLayerContextMenu}
              onScalePointerDown={handleScalePointerDown}
            >
              <RevealBadge
                variant="googlePlay"
                prefix={badgePrefix}
                label={ctaLabel}
                iconUrl={badgeIconUrl}
                iconAlt={badgeIconAlt}
                presetImages={googlePlayPreset ? [googlePlayPreset] : undefined}
              />
            </EditableLayer>
          </>
        ) : (
          <EditableLayer
            anchor={layerAnchors.badge}
            anchorVerticalAlign={badgeAnchorVerticalAlign}
            label={layerLabelMap.badge}
            editable={editable}
            isSelected={selectedLayerId === "badge"}
            isGesturing={gesturingLayerId === "badge"}
            className={getLayerClassName({
              editable,
              isSelected: selectedLayerId === "badge",
              isGesturing: gesturingLayerId === "badge",
              baseClassName:
                "pointer-events-auto relative inline-flex w-max max-w-none items-center rounded-lg border border-transparent bg-transparent p-1.5 text-left leading-none outline-none",
              selectedClassName:
                "border-white/20 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
            })}
            style={getLayerInteractiveStyle("badge")}
            setRef={(node) => setLayerRef("badge", node)}
            onPointerDown={(event) => handleLayerPointerDown("badge", event)}
            onContextMenu={handleLayerContextMenu}
            onScalePointerDown={handleScalePointerDown}
          >
            <RevealBadge
              variant={badgeVariant}
              prefix={badgePrefix}
              label={ctaLabel}
              iconUrl={badgeIconUrl}
              iconAlt={badgeIconAlt}
              presetImages={
                storeBadgePresets.length > 0 ? storeBadgePresets : undefined
              }
            />
          </EditableLayer>
        )}
      </div>
    </section>
  );
}

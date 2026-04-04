"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useEffectEvent, useRef } from "react";
import type {
  ColorControlKey,
  RangeControlKey,
  TextControlKey,
} from "../hooks/useRevealControls";
import type { BadgeVariant, RevealControls } from "../types/revealControls";
import { panelStyles, mediaQueries } from "../utils/styles";
import { AnimationControlsSection } from "./reveal-controls/AnimationControlsSection";
import { BadgeControlsSection } from "./reveal-controls/BadgeControlsSection";
import { ColorControlsSection } from "./reveal-controls/ColorControlsSection";
import { ContentControlsSection } from "./reveal-controls/ContentControlsSection";

type RevealControlsPanelProps = {
  controls: RevealControls;
  isCollapsed: boolean;
  iconFileInputKey: number;
  badgeIconFileInputKey: number;
  uploadedIconName: string;
  uploadedIconUrl: string | null;
  uploadedBadgeIconName: string;
  uploadedBadgeIconUrl: string | null;
  onToggleCollapsed: () => void;
  onRequestCollapse: () => void;
  onTextChange: (key: TextControlKey, value: string) => void;
  onRangeChange: (key: RangeControlKey, value: number) => void;
  onColorChange: (key: ColorControlKey, value: string) => void;
  onBadgeVariantChange: (value: BadgeVariant) => void;
  onIconFileChange: (file?: File) => void;
  onBadgeIconFileChange: (file?: File) => void;
  onClearUploadedIcon: () => void;
  onClearUploadedBadgeIcon: () => void;
};

export const RevealControlsPanel = memo(function RevealControlsPanel({
  controls,
  isCollapsed,
  iconFileInputKey,
  badgeIconFileInputKey,
  uploadedIconName,
  uploadedIconUrl,
  uploadedBadgeIconName,
  uploadedBadgeIconUrl,
  onToggleCollapsed,
  onRequestCollapse,
  onTextChange,
  onRangeChange,
  onColorChange,
  onBadgeVariantChange,
  onIconFileChange,
  onBadgeIconFileChange,
  onClearUploadedIcon,
  onClearUploadedBadgeIcon,
}: RevealControlsPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const handleOutsidePointerDown = useEffectEvent((event: PointerEvent) => {
    const targetNode = event.target as Node | null;

    if (!targetNode || panelRef.current?.contains(targetNode)) {
      return;
    }

    onRequestCollapse();
  });

  useEffect(() => {
    if (isCollapsed) {
      return;
    }

    const mediaQueryList = window.matchMedia(mediaQueries.tabletMax);

    if (!mediaQueryList.matches) {
      return;
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown, {
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [isCollapsed]);

  if (isCollapsed) {
    return (
      <section className="fixed top-3 right-3 z-50">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onToggleCollapsed}
          className={panelStyles.toggleButton}
          aria-expanded={!isCollapsed}
          aria-controls="reveal-controls-panel"
        >
          Reveal Controls
          <motion.svg
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-[1.2rem] w-[1.2rem] shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5 12.5L10 7.5L15 12.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.button>
      </section>
    );
  }

  return (
    <section
      ref={panelRef}
      className="reveal-panel-scrollbar fixed top-3 right-3 z-50 max-h-[calc(100vh-1.5rem)] w-[min(30rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,12,0.94),rgba(3,3,4,0.96))] p-4 text-left shadow-[0_22px_60px_rgba(0,0,0,0.52),0_4px_14px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.76rem] font-extrabold tracking-[0.14em] text-white/42 uppercase sm:text-[0.8rem]">
          Reveal Controls
        </p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onToggleCollapsed}
          className={panelStyles.toggleButton}
          aria-expanded={!isCollapsed}
          aria-controls="reveal-controls-panel"
        >
          Collapse
          <motion.svg
            animate={{ rotate: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-[1.05rem] w-[1.05rem] shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5 12.5L10 7.5L15 12.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          id="reveal-controls-panel"
          key="expanded-panel"
          initial={{ height: 0, opacity: 0, marginTop: 0 }}
          animate={{ height: "auto", opacity: 1, marginTop: 16 }}
          exit={{ height: 0, opacity: 0, marginTop: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="space-y-3.5 overflow-hidden"
        >
          <ContentControlsSection
            title={controls.title}
            subtitle={controls.subtitle}
            iconUrl={controls.iconUrl}
            iconFileInputKey={iconFileInputKey}
            uploadedIconName={uploadedIconName}
            uploadedIconUrl={uploadedIconUrl}
            onTextChange={onTextChange}
            onIconFileChange={onIconFileChange}
            onClearUploadedIcon={onClearUploadedIcon}
          />

          <BadgeControlsSection
            badgeVariant={controls.badgeVariant}
            badgePrefix={controls.badgePrefix}
            badgeLabel={controls.badgeLabel}
            badgeIconUrl={controls.badgeIconUrl}
            badgeIconFileInputKey={badgeIconFileInputKey}
            uploadedBadgeIconName={uploadedBadgeIconName}
            uploadedBadgeIconUrl={uploadedBadgeIconUrl}
            onTextChange={onTextChange}
            onBadgeVariantChange={onBadgeVariantChange}
            onBadgeIconFileChange={onBadgeIconFileChange}
            onClearUploadedBadgeIcon={onClearUploadedBadgeIcon}
          />

          <AnimationControlsSection
            durationMs={controls.durationMs}
            playbackRate={controls.playbackRate}
            iconCornerRadius={controls.iconCornerRadius}
            onRangeChange={onRangeChange}
          />

          <ColorControlsSection
            glowColor={controls.glowColor}
            glowSize={controls.glowSize}
            rimColor={controls.rimColor}
            grayColor={controls.grayColor}
            onColorChange={onColorChange}
            onRangeChange={onRangeChange}
          />
        </motion.div>
      </AnimatePresence>
    </section>
  );
});

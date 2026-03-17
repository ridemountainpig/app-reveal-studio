"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useEffectEvent, useRef } from "react";
import type {
  ColorControlKey,
  RangeControlKey,
  TextControlKey,
} from "../hooks/useRevealControls";
import type { RevealControls } from "../types/revealControls";
import { panelStyles, mediaQueries } from "../utils/styles";

type RevealControlsPanelProps = {
  controls: RevealControls;
  isCollapsed: boolean;
  iconFileInputKey: number;
  uploadedIconName: string;
  uploadedIconUrl: string | null;
  onToggleCollapsed: () => void;
  onRequestCollapse: () => void;
  onTextChange: (key: TextControlKey, value: string) => void;
  onRangeChange: (key: RangeControlKey, value: number) => void;
  onColorChange: (key: ColorControlKey, value: string) => void;
  onIconFileChange: (file?: File) => void;
  onClearUploadedIcon: () => void;
};

export const RevealControlsPanel = memo(function RevealControlsPanel({
  controls,
  isCollapsed,
  iconFileInputKey,
  uploadedIconName,
  uploadedIconUrl,
  onToggleCollapsed,
  onRequestCollapse,
  onTextChange,
  onRangeChange,
  onColorChange,
  onIconFileChange,
  onClearUploadedIcon,
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
          <label className="block">
            <span className={panelStyles.label}>Title</span>
            <input
              className={`${panelStyles.input} mt-1.5`}
              type="text"
              value={controls.title}
              onChange={(event) => onTextChange("title", event.target.value)}
              placeholder="Now Available"
            />
          </label>

          <label className="block">
            <span className={panelStyles.label}>Subtitle</span>
            <input
              className={`${panelStyles.input} mt-1.5`}
              type="text"
              value={controls.subtitle}
              onChange={(event) => onTextChange("subtitle", event.target.value)}
              placeholder="Subflow - Manage Your Subscriptions"
            />
          </label>

          <label className="block">
            <span className={panelStyles.label}>App Icon URL</span>
            <input
              className={`${panelStyles.input} mt-1.5`}
              type="url"
              value={controls.iconUrl}
              onChange={(event) => onTextChange("iconUrl", event.target.value)}
              placeholder="https://example.com/icon.png"
            />
          </label>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className={panelStyles.label}>Icon File</span>
              {uploadedIconUrl ? (
                <button
                  type="button"
                  onClick={onClearUploadedIcon}
                  className="rounded-[0.65rem] border border-white/10 bg-white/4 px-2.5 py-1 text-[0.72rem] font-semibold text-white/62 transition hover:border-white/16 hover:text-white/86"
                >
                  Clear File
                </button>
              ) : (
                <span className="text-[0.72rem] font-semibold text-white/36">
                  Uploaded file takes priority
                </span>
              )}
            </div>
            <input
              key={iconFileInputKey}
              className={`${panelStyles.fileInput} mt-2.5`}
              type="file"
              accept="image/*"
              onChange={(event) => onIconFileChange(event.target.files?.[0])}
            />
            <p className="mt-2 text-[0.76rem] font-medium text-white/38">
              {uploadedIconName || "No file selected. Using the URL above."}
            </p>
          </div>

          <label className="block">
            <span className={panelStyles.label}>Badge Prefix</span>
            <input
              className={`${panelStyles.input} mt-1.5`}
              type="text"
              value={controls.badgePrefix}
              onChange={(event) =>
                onTextChange("badgePrefix", event.target.value)
              }
              placeholder="Manage Subscription on the"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={panelStyles.label}>Badge Label</span>
              <input
                className={`${panelStyles.input} mt-1.5`}
                type="text"
                value={controls.badgeLabel}
                onChange={(event) =>
                  onTextChange("badgeLabel", event.target.value)
                }
                placeholder="subflow.ing"
              />
            </label>

            <label className="block">
              <span className={panelStyles.label}>Badge Icon URL</span>
              <input
                className={`${panelStyles.input} mt-1.5`}
                type="url"
                value={controls.badgeIconUrl}
                onChange={(event) =>
                  onTextChange("badgeIconUrl", event.target.value)
                }
                placeholder="https://example.com/badge.png"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className={panelStyles.label}>Animation Duration</span>
              <span className="text-[0.82rem] font-semibold text-white/62">
                {(controls.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              className={`${panelStyles.range} mt-2.5`}
              type="range"
              min="3000"
              max="18000"
              step="250"
              value={controls.durationMs}
              onChange={(event) =>
                onRangeChange("durationMs", Number(event.target.value))
              }
            />
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className={panelStyles.label}>Playback Speed</span>
              <span className="text-[0.82rem] font-semibold text-white/62">
                {controls.playbackRate.toFixed(2)}x
              </span>
            </div>
            <input
              className={`${panelStyles.range} mt-2.5`}
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={controls.playbackRate}
              onChange={(event) =>
                onRangeChange("playbackRate", Number(event.target.value))
              }
            />
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className={panelStyles.label}>Square Radius</span>
              <span className="text-[0.82rem] font-semibold text-white/62">
                {controls.iconCornerRadius}%
              </span>
            </div>
            <input
              className={`${panelStyles.range} mt-2.5`}
              type="range"
              min="10"
              max="100"
              step="1"
              value={controls.iconCornerRadius}
              onChange={(event) =>
                onRangeChange("iconCornerRadius", Number(event.target.value))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="block rounded-2xl border border-white/8 bg-white/3 p-3">
              <span className={`${panelStyles.label} whitespace-nowrap`}>
                Glow Blur Color
              </span>
              <div className="mt-2 flex items-center gap-3">
                <label className="block" aria-label="Choose glow blur color">
                  <input
                    className="sr-only"
                    type="color"
                    value={controls.glowColor}
                    onChange={(event) =>
                      onColorChange("glowColor", event.target.value)
                    }
                  />
                  <span
                    className={panelStyles.colorButton}
                    style={{
                      backgroundColor: controls.glowColor,
                    }}
                  />
                </label>
                <span className="text-[0.86rem] font-semibold whitespace-nowrap text-white/62">
                  {controls.glowColor}
                </span>
              </div>
            </div>

            <div className="block rounded-2xl border border-white/8 bg-white/3 p-3">
              <span className={`${panelStyles.label} whitespace-nowrap`}>
                Outline Color
              </span>
              <div className="mt-2 flex items-center gap-3">
                <label className="block" aria-label="Choose outline color">
                  <input
                    className="sr-only"
                    type="color"
                    value={controls.rimColor}
                    onChange={(event) =>
                      onColorChange("rimColor", event.target.value)
                    }
                  />
                  <span
                    className={panelStyles.colorButton}
                    style={{
                      backgroundColor: controls.rimColor,
                    }}
                  />
                </label>
                <span className="text-[0.86rem] font-semibold whitespace-nowrap text-white/62">
                  {controls.rimColor}
                </span>
              </div>
            </div>

            <div className="block rounded-2xl border border-white/8 bg-white/3 p-3">
              <span className={`${panelStyles.label} whitespace-nowrap`}>
                Gray Sweep Color
              </span>
              <div className="mt-2 flex items-center gap-3">
                <label className="block" aria-label="Choose gray sweep color">
                  <input
                    className="sr-only"
                    type="color"
                    value={controls.grayColor}
                    onChange={(event) =>
                      onColorChange("grayColor", event.target.value)
                    }
                  />
                  <span
                    className={panelStyles.colorButton}
                    style={{
                      backgroundColor: controls.grayColor,
                    }}
                  />
                </label>
                <span className="text-[0.86rem] font-semibold whitespace-nowrap text-white/62">
                  {controls.grayColor}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
});

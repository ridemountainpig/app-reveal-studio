"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

export type ScaleCorner = "nw" | "ne" | "sw" | "se";

type LayerSelectionOverlayProps = {
  onScalePointerDown: (
    corner: ScaleCorner,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  /** Thicker highlight while dragging/scaling; selection frame is always visible */
  showGestureFrame?: boolean;
};

const handleClass =
  "absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#4af] shadow-[0_0_0_1px_rgba(0,0,0,0.35)] touch-none";

const cornerCursor: Record<ScaleCorner, string> = {
  nw: "cursor-nwse-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  se: "cursor-nwse-resize",
};

/**
 * Renders inside the layer node (same element that has translate/scale transform)
 * so the dashed frame and handles stay aligned without getBoundingClientRect sync.
 */
export function LayerSelectionOverlay({
  onScalePointerDown,
  showGestureFrame,
}: LayerSelectionOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className={`absolute inset-0 rounded-[inherit] border-dashed border-[#4af] ${
            showGestureFrame
              ? "border-2 border-[#6cf]"
              : "border border-[#4af]/90"
          }`}
        />
      </div>
      {(
        [
          ["nw", 0, 0],
          ["ne", 100, 0],
          ["sw", 0, 100],
          ["se", 100, 100],
        ] as const
      ).map(([corner, lx, ly]) => (
        <button
          key={corner}
          type="button"
          tabIndex={-1}
          className={`${handleClass} ${cornerCursor[corner]} pointer-events-auto`}
          style={{ left: `${lx}%`, top: `${ly}%` }}
          aria-label={`Scale ${corner}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onScalePointerDown(corner, e);
          }}
        />
      ))}
    </div>
  );
}

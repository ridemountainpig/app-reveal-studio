"use client";

import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  LayerSelectionOverlay,
  type ScaleCorner,
} from "../LayerSelectionOverlay";

type EditableLayerProps = {
  anchor: { x: number; y: number };
  /** `center`: layer box centered on anchor (default). `top`: top edge at anchor, horizontally centered. */
  anchorVerticalAlign?: "center" | "top";
  label: string;
  editable: boolean;
  isSelected: boolean;
  isGesturing: boolean;
  shellClassName?: string;
  className: string;
  style: CSSProperties;
  setRef: (node: HTMLDivElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onScalePointerDown: (
    corner: ScaleCorner,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  children: ReactNode;
};

export function EditableLayer({
  anchor,
  anchorVerticalAlign = "center",
  label,
  editable,
  isSelected,
  isGesturing,
  shellClassName = "w-max",
  className,
  style,
  setRef,
  onPointerDown,
  onContextMenu,
  onScalePointerDown,
  children,
}: EditableLayerProps) {
  const shellTranslateClassName =
    anchorVerticalAlign === "top"
      ? "-translate-x-1/2"
      : "-translate-x-1/2 -translate-y-1/2";

  return (
    <div
      className={`pointer-events-none absolute top-0 left-1/2 ${isSelected && editable ? "z-20" : "z-10"} ${shellClassName} ${shellTranslateClassName}`}
      style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
    >
      <div
        ref={setRef}
        role="button"
        tabIndex={editable ? 0 : -1}
        className={className}
        style={style}
        onPointerDown={onPointerDown}
        onContextMenu={editable ? onContextMenu : undefined}
        aria-label={`${label} layer`}
      >
        {children}
        {editable && isSelected ? (
          <LayerSelectionOverlay
            onScalePointerDown={onScalePointerDown}
            showGestureFrame={isGesturing}
          />
        ) : null}
      </div>
    </div>
  );
}

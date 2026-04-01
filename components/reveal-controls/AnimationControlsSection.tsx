"use client";

import type { RangeControlKey } from "../../hooks/useRevealControls";
import { panelStyles } from "../../utils/styles";

type SliderControlProps = {
  label: string;
  valueLabel: string;
  value: number;
  min: string;
  max: string;
  step: string;
  controlKey: RangeControlKey;
  onRangeChange: (key: RangeControlKey, value: number) => void;
};

export function SliderControl({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  controlKey,
  onRangeChange,
}: SliderControlProps) {
  return (
    <div className={panelStyles.card}>
      <div className="flex items-center justify-between gap-3">
        <span className={panelStyles.label}>{label}</span>
        <span className="text-[0.82rem] font-semibold text-white/62">
          {valueLabel}
        </span>
      </div>
      <input
        className={`${panelStyles.range} mt-2.5`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onRangeChange(controlKey, Number(event.target.value))
        }
      />
    </div>
  );
}

type AnimationControlsSectionProps = {
  durationMs: number;
  playbackRate: number;
  iconCornerRadius: number;
  onRangeChange: (key: RangeControlKey, value: number) => void;
};

export function AnimationControlsSection({
  durationMs,
  playbackRate,
  iconCornerRadius,
  onRangeChange,
}: AnimationControlsSectionProps) {
  return (
    <>
      <SliderControl
        label="Animation Duration"
        valueLabel={`${(durationMs / 1000).toFixed(1)}s`}
        value={durationMs}
        min="3000"
        max="18000"
        step="250"
        controlKey="durationMs"
        onRangeChange={onRangeChange}
      />

      <SliderControl
        label="Playback Speed"
        valueLabel={`${playbackRate.toFixed(2)}x`}
        value={playbackRate}
        min="0.5"
        max="1.8"
        step="0.05"
        controlKey="playbackRate"
        onRangeChange={onRangeChange}
      />

      <SliderControl
        label="Square Radius"
        valueLabel={`${iconCornerRadius}%`}
        value={iconCornerRadius}
        min="10"
        max="100"
        step="1"
        controlKey="iconCornerRadius"
        onRangeChange={onRangeChange}
      />
    </>
  );
}

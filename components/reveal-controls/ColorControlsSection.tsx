"use client";

import type { ColorControlKey } from "../../hooks/useRevealControls";
import { panelStyles } from "../../utils/styles";

type ColorPickerCardProps = {
  label: string;
  value: string;
  controlKey: ColorControlKey;
  ariaLabel: string;
  onColorChange: (key: ColorControlKey, value: string) => void;
};

function ColorPickerCard({
  label,
  value,
  controlKey,
  ariaLabel,
  onColorChange,
}: ColorPickerCardProps) {
  return (
    <div className={panelStyles.card}>
      <span className={`${panelStyles.label} whitespace-nowrap`}>{label}</span>
      <div className="mt-2 flex items-center gap-3">
        <label className="block" aria-label={ariaLabel}>
          <input
            className="sr-only"
            type="color"
            value={value}
            onChange={(event) => onColorChange(controlKey, event.target.value)}
          />
          <span
            className={panelStyles.colorButton}
            style={{ backgroundColor: value }}
          />
        </label>
        <span className="text-[0.86rem] font-semibold whitespace-nowrap text-white/62">
          {value}
        </span>
      </div>
    </div>
  );
}

type ColorControlsSectionProps = {
  glowColor: string;
  rimColor: string;
  grayColor: string;
  onColorChange: (key: ColorControlKey, value: string) => void;
};

export function ColorControlsSection({
  glowColor,
  rimColor,
  grayColor,
  onColorChange,
}: ColorControlsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ColorPickerCard
        label="Glow Blur Color"
        value={glowColor}
        controlKey="glowColor"
        ariaLabel="Choose glow blur color"
        onColorChange={onColorChange}
      />
      <ColorPickerCard
        label="Outline Color"
        value={rimColor}
        controlKey="rimColor"
        ariaLabel="Choose outline color"
        onColorChange={onColorChange}
      />
      <ColorPickerCard
        label="Gray Sweep Color"
        value={grayColor}
        controlKey="grayColor"
        ariaLabel="Choose gray sweep color"
        onColorChange={onColorChange}
      />
    </div>
  );
}

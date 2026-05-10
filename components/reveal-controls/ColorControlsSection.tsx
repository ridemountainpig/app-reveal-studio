"use client";

import { useEffect, useState } from "react";
import type {
  ColorControlKey,
  RangeControlKey,
} from "../../hooks/useRevealControls";
import { panelStyles } from "../../utils/styles";
import { SliderControl } from "./AnimationControlsSection";

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/;

function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_PATTERN.test(withHash)) return null;
  return `#${withHash.slice(1).toLowerCase()}`;
}

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
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitDraft = (raw: string) => {
    const normalized = normalizeHex(raw);
    if (normalized) {
      setDraft(normalized);
      if (normalized !== value) onColorChange(controlKey, normalized);
    } else {
      setDraft(value);
    }
  };

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
        <input
          type="text"
          spellCheck={false}
          aria-label={`${ariaLabel} hex code`}
          value={draft}
          maxLength={7}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commitDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft(event.currentTarget.value);
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
          className="w-20 rounded-md bg-white/8 px-2 py-1 font-mono text-[0.82rem] font-semibold whitespace-nowrap text-white/80 uppercase outline-none focus:bg-white/12 focus:ring-1 focus:ring-white/30"
        />
      </div>
    </div>
  );
}

type ColorControlsSectionProps = {
  glowColor: string;
  glowSize: number;
  rimColor: string;
  grayColor: string;
  onColorChange: (key: ColorControlKey, value: string) => void;
  onRangeChange: (key: RangeControlKey, value: number) => void;
};

export function ColorControlsSection({
  glowColor,
  glowSize,
  rimColor,
  grayColor,
  onColorChange,
  onRangeChange,
}: ColorControlsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <SliderControl
          label="Glow Size"
          valueLabel={`${glowSize}%`}
          value={glowSize}
          min="40"
          max="300"
          step="5"
          controlKey="glowSize"
          onRangeChange={onRangeChange}
        />
      </div>
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

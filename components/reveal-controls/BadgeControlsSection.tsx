"use client";

import type { TextControlKey } from "../../hooks/useRevealControls";
import type { BadgeVariant } from "../../types/revealControls";
import { badgeVariantOptions } from "../../utils/badgeOptions";
import { panelStyles } from "../../utils/styles";
import { UploadField } from "./UploadField";

type BadgeControlsSectionProps = {
  badgeVariant: BadgeVariant;
  badgePrefix: string;
  badgeLabel: string;
  badgeIconUrl: string;
  badgeIconFileInputKey: number;
  uploadedBadgeIconName: string;
  uploadedBadgeIconUrl: string | null;
  onTextChange: (key: TextControlKey, value: string) => void;
  onBadgeVariantChange: (value: BadgeVariant) => void;
  onBadgeIconFileChange: (file?: File) => void;
  onClearUploadedBadgeIcon: () => void;
};

export function BadgeControlsSection({
  badgeVariant,
  badgePrefix,
  badgeLabel,
  badgeIconUrl,
  badgeIconFileInputKey,
  uploadedBadgeIconName,
  uploadedBadgeIconUrl,
  onTextChange,
  onBadgeVariantChange,
  onBadgeIconFileChange,
  onClearUploadedBadgeIcon,
}: BadgeControlsSectionProps) {
  return (
    <>
      <div className={panelStyles.card}>
        <div className="flex items-center justify-between gap-3">
          <span className={panelStyles.label}>Badge Type</span>
          <span className="text-[0.72rem] font-semibold text-white/36">
            Choose custom or store badge
          </span>
        </div>
        <div
          className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3"
          role="tablist"
          aria-label="Badge type"
        >
          {badgeVariantOptions.map((option) => {
            const isActive = badgeVariant === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onBadgeVariantChange(option.value)}
                className={`rounded-[0.9rem] border px-3 py-2.5 text-left transition ${
                  isActive
                    ? "border-white/22 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border-white/8 bg-white/4 text-white/62 hover:border-white/16 hover:text-white/84"
                }`}
              >
                <span className="block text-[0.84rem] font-semibold">
                  {option.label}
                </span>
                <span
                  className={`mt-1 block text-[0.72rem] leading-snug ${
                    isActive ? "text-white/68" : "text-white/42"
                  }`}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {badgeVariant === "custom" ? (
        <>
          <label className="block">
            <span className={panelStyles.label}>Badge Prefix</span>
            <input
              className={`${panelStyles.input} mt-1.5`}
              type="text"
              value={badgePrefix}
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
                value={badgeLabel}
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
                value={badgeIconUrl}
                onChange={(event) =>
                  onTextChange("badgeIconUrl", event.target.value)
                }
                placeholder="https://example.com/badge.png"
              />
            </label>
          </div>

          <UploadField
            label="Badge Icon File"
            inputKey={badgeIconFileInputKey}
            uploadedName={uploadedBadgeIconName}
            uploadedUrl={uploadedBadgeIconUrl}
            onFileChange={onBadgeIconFileChange}
            onClear={onClearUploadedBadgeIcon}
          />
        </>
      ) : null}
    </>
  );
}

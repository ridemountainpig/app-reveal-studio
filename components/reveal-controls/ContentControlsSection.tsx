"use client";

import type { TextControlKey } from "../../hooks/useRevealControls";
import { panelStyles } from "../../utils/styles";
import { UploadField } from "./UploadField";

type ContentControlsSectionProps = {
  title: string;
  subtitle: string;
  iconUrl: string;
  iconFileInputKey: number;
  uploadedIconName: string;
  uploadedIconUrl: string | null;
  onTextChange: (key: TextControlKey, value: string) => void;
  onIconFileChange: (file?: File) => void;
  onClearUploadedIcon: () => void;
};

export function ContentControlsSection({
  title,
  subtitle,
  iconUrl,
  iconFileInputKey,
  uploadedIconName,
  uploadedIconUrl,
  onTextChange,
  onIconFileChange,
  onClearUploadedIcon,
}: ContentControlsSectionProps) {
  return (
    <>
      <label className="block">
        <span className={panelStyles.label}>Title</span>
        <input
          className={`${panelStyles.input} mt-1.5`}
          type="text"
          value={title}
          onChange={(event) => onTextChange("title", event.target.value)}
          placeholder="Now Available"
        />
      </label>

      <label className="block">
        <span className={panelStyles.label}>Subtitle</span>
        <input
          className={`${panelStyles.input} mt-1.5`}
          type="text"
          value={subtitle}
          onChange={(event) => onTextChange("subtitle", event.target.value)}
          placeholder="Subflow - Manage Your Subscriptions"
        />
      </label>

      <label className="block">
        <span className={panelStyles.label}>App Icon URL</span>
        <input
          className={`${panelStyles.input} mt-1.5`}
          type="url"
          value={iconUrl}
          onChange={(event) => onTextChange("iconUrl", event.target.value)}
          placeholder="https://example.com/icon.png"
        />
      </label>

      <UploadField
        label="Icon File"
        inputKey={iconFileInputKey}
        uploadedName={uploadedIconName}
        uploadedUrl={uploadedIconUrl}
        onFileChange={onIconFileChange}
        onClear={onClearUploadedIcon}
      />
    </>
  );
}

"use client";

import { memo } from "react";
import { panelStyles } from "../../utils/styles";

type UploadFieldProps = {
  label: string;
  inputKey: number;
  uploadedName: string;
  uploadedUrl: string | null;
  onFileChange: (file?: File) => void;
  onClear: () => void;
};

export const UploadField = memo(function UploadField({
  label,
  inputKey,
  uploadedName,
  uploadedUrl,
  onFileChange,
  onClear,
}: UploadFieldProps) {
  return (
    <div className={panelStyles.card}>
      <div className="flex items-center justify-between gap-3">
        <span className={panelStyles.label}>{label}</span>
        {uploadedUrl ? (
          <button
            type="button"
            onClick={onClear}
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
        key={inputKey}
        className={`${panelStyles.fileInput} mt-2.5`}
        type="file"
        accept="image/*"
        onChange={(event) => onFileChange(event.target.files?.[0])}
      />
      <p className="mt-2 text-[0.76rem] font-medium text-white/38">
        {uploadedName || "No file selected. Using the URL above."}
      </p>
    </div>
  );
});

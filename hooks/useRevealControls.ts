import { useCallback, useEffect, useRef, useState } from "react";
import { initialControls } from "../utils/revealControls";
import { readImageFileAsDataURL } from "../utils/fileReader";

export type TextControlKey =
  | "title"
  | "subtitle"
  | "iconUrl"
  | "badgePrefix"
  | "badgeLabel"
  | "badgeIconUrl";

export type RangeControlKey =
  | "durationMs"
  | "playbackRate"
  | "iconCornerRadius";
export type ColorControlKey = "glowColor" | "rimColor" | "grayColor";

function useDataUrlUpload(errorLabel: string) {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const setUploadedFile = useCallback(
    async (file?: File) => {
      if (!file) {
        return;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setUploadedName(file.name);

      try {
        const dataUrl = await readImageFileAsDataURL(file);

        if (!abortControllerRef.current?.signal.aborted) {
          setUploadedUrl(dataUrl);
        }
      } catch (error) {
        console.error(`Failed to read ${errorLabel}:`, error);
        setUploadedUrl(null);
      }
    },
    [errorLabel],
  );

  const clearUploadedFile = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setUploadedUrl(null);
    setUploadedName("");
    setFileInputKey((current) => current + 1);
  }, []);

  return {
    fileInputKey,
    uploadedUrl,
    uploadedName,
    setUploadedFile,
    clearUploadedFile,
  };
}

export function useRevealControls() {
  const [controls, setControls] = useState(initialControls);
  const previewControls = controls;
  const iconUpload = useDataUrlUpload("icon file");
  const badgeIconUpload = useDataUrlUpload("badge icon file");

  const updateTextControl = useCallback(
    (key: TextControlKey, value: string) => {
      setControls((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const updateRangeControl = useCallback(
    (key: RangeControlKey, value: number) => {
      setControls((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const updateColorControl = useCallback(
    (key: ColorControlKey, value: string) => {
      setControls((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const safeTitle = previewControls.title.trim() || initialControls.title;
  const safeSubtitle =
    previewControls.subtitle.trim() || initialControls.subtitle;
  const safeBadgeLabel =
    previewControls.badgeLabel.trim() || initialControls.badgeLabel;
  const safeBadgePrefix =
    previewControls.badgePrefix.trim() || initialControls.badgePrefix;
  const safeIconUrl =
    iconUpload.uploadedUrl ?? (previewControls.iconUrl.trim() || undefined);
  const safeBadgeIconUrl =
    badgeIconUpload.uploadedUrl ??
    (previewControls.badgeIconUrl.trim() || undefined);

  return {
    controls,
    previewControls,
    iconFileInputKey: iconUpload.fileInputKey,
    badgeIconFileInputKey: badgeIconUpload.fileInputKey,
    uploadedIconName: iconUpload.uploadedName,
    uploadedIconUrl: iconUpload.uploadedUrl,
    uploadedBadgeIconName: badgeIconUpload.uploadedName,
    uploadedBadgeIconUrl: badgeIconUpload.uploadedUrl,
    updateTextControl,
    updateRangeControl,
    updateColorControl,
    setUploadedIconFile: iconUpload.setUploadedFile,
    setUploadedBadgeIconFile: badgeIconUpload.setUploadedFile,
    clearUploadedIcon: iconUpload.clearUploadedFile,
    clearUploadedBadgeIcon: badgeIconUpload.clearUploadedFile,
    safeTitle,
    safeSubtitle,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
  };
}
